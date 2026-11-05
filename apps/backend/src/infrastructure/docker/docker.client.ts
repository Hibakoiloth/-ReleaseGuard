import Dockerode from "dockerode";
import { createWriteStream } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { DockerBuildError, DockerStartError, DockerInspectError } from "./docker.errors";
import type { DockerAdapter, BuildImageOptions, StartContainerOptions, ContainerInfo } from "./docker.types";

const DEFAULT_MEMORY_MB = 512;
const DEFAULT_CPU_SHARES = 512;
const RELEASEGUARD_NETWORK = "releaseguard-net";
const CONTAINER_PORT = 3000;

const docker = new Dockerode();

async function ensureNetwork(): Promise<void> {
  const networks = await docker.listNetworks({ filters: { name: [RELEASEGUARD_NETWORK] } });
  if (networks.length === 0) {
    await docker.createNetwork({
      Name: RELEASEGUARD_NETWORK,
      Driver: "bridge",
      Internal: false,
    });
  }
}

export const dockerClient: DockerAdapter = {
  async buildImage(options: BuildImageOptions): Promise<string> {
    const { contextPath, dockerfilePath, tag } = options;
    const logPath = join(tmpdir(), `rg-docker-build-${Date.now()}.log`);

    const stream = await docker.buildImage(
      { context: contextPath, src: ["."] },
      { dockerfile: dockerfilePath, t: tag }
    );

    await new Promise<void>((resolve, reject) => {
      docker.modem.followProgress(
        stream,
        (err: Error | null, output: Array<{ error?: string }>) => {
          if (err) return reject(new DockerBuildError(err.message));
          const buildError = output.find((o) => o.error);
          if (buildError) return reject(new DockerBuildError(buildError.error!));
          resolve();
        }
      );
    });

    return tag;
  },

  async startContainer(options: StartContainerOptions): Promise<ContainerInfo> {
    await ensureNetwork();
    const {
      imageTag,
      memoryMb = DEFAULT_MEMORY_MB,
      cpuShares = DEFAULT_CPU_SHARES,
    } = options;

    const container = await docker.createContainer({
      Image: imageTag,
      ExposedPorts: { [`${CONTAINER_PORT}/tcp`]: {} },
      HostConfig: {
        PortBindings: {
          [`${CONTAINER_PORT}/tcp`]: [{ HostIp: "127.0.0.1", HostPort: "" }],
        },
        Memory: memoryMb * 1024 * 1024,
        CpuShares: cpuShares,
        NetworkMode: RELEASEGUARD_NETWORK,
        Privileged: false,
        ReadonlyRootfs: false,
        CapDrop: ["ALL"],
        SecurityOpt: ["no-new-privileges"],
      },
      NetworkingConfig: {
        EndpointsConfig: {
          [RELEASEGUARD_NETWORK]: {},
        },
      },
    });

    await container.start();

    const info = await container.inspect();
    const portBindings = info.NetworkSettings?.Ports?.[`${CONTAINER_PORT}/tcp`];
    const hostPort = portBindings?.[0]?.HostPort
      ? parseInt(portBindings[0].HostPort, 10)
      : 0;

    return {
      containerId: container.id,
      imageTag,
      hostPort,
      status: info.State?.Status ?? "running",
      startedAt: info.State?.StartedAt ?? null,
    };
  },

  async stopContainer(containerId: string): Promise<void> {
    const container = docker.getContainer(containerId);
    await container.stop({ t: 10 }).catch(() => {});
    await container.remove({ force: true }).catch(() => {});
  },

  async inspectContainer(containerId: string): Promise<ContainerInfo> {
    const container = docker.getContainer(containerId);
    let info: Awaited<ReturnType<typeof container.inspect>>;
    try {
      info = await container.inspect();
    } catch {
      throw new DockerInspectError(containerId);
    }

    const portBindings = info.NetworkSettings?.Ports?.[`${CONTAINER_PORT}/tcp`];
    const hostPort = portBindings?.[0]?.HostPort
      ? parseInt(portBindings[0].HostPort, 10)
      : 0;

    return {
      containerId: container.id,
      imageTag: info.Config?.Image ?? "",
      hostPort,
      status: info.State?.Status ?? "unknown",
      startedAt: info.State?.StartedAt ?? null,
    };
  },

  async getLogs(containerId: string): Promise<string> {
    const container = docker.getContainer(containerId);
    const stream = await container.logs({ stdout: true, stderr: true, tail: 200 });
    return stream.toString("utf8");
  },
};

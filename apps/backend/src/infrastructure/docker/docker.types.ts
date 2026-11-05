export interface BuildImageOptions {
  contextPath: string;
  dockerfilePath: string;
  tag: string;
}

export interface StartContainerOptions {
  imageTag: string;
  releaseId: string;
  memoryMb?: number;
  cpuShares?: number;
}

export interface ContainerInfo {
  containerId: string;
  imageTag: string;
  hostPort: number;
  status: string;
  startedAt: string | null;
}

export interface DockerAdapter {
  buildImage(options: BuildImageOptions): Promise<string>;
  startContainer(options: StartContainerOptions): Promise<ContainerInfo>;
  stopContainer(containerId: string): Promise<void>;
  inspectContainer(containerId: string): Promise<ContainerInfo>;
  getLogs(containerId: string): Promise<string>;
}

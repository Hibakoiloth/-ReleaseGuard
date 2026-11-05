-- profiles: one row per auth user, auto-created on signup
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  configuration jsonb not null default '{}',
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- releases
create table public.releases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  version text not null,
  status text not null default 'CREATED',
  commit_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- build_executions
create table public.build_executions (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  status text not null default 'PENDING',
  output text,
  exit_code integer,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- test_executions
create table public.test_executions (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  status text not null default 'PENDING',
  output text,
  exit_code integer,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- deployments
create table public.deployments (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  container_id text,
  image_tag text,
  status text not null default 'PENDING',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- monitoring_records
create table public.monitoring_records (
  id uuid primary key default gen_random_uuid(),
  deployment_id uuid not null references public.deployments(id) on delete cascade,
  response_time_ms integer,
  status text not null,
  recorded_at timestamptz not null default now()
);

-- incidents
create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  deployment_id uuid not null references public.deployments(id) on delete cascade,
  severity text not null,
  description text not null,
  status text not null default 'OPEN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ai_analyses
create table public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  summary text not null,
  probable_cause text,
  recommendation text,
  created_at timestamptz not null default now()
);

-- policies
create table public.policies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  conditions jsonb not null default '{}',
  action text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- recovery_actions
create table public.recovery_actions (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  action_type text not null,
  status text not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- approvals
create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  recovery_action_id uuid not null references public.recovery_actions(id) on delete cascade,
  decision text not null,
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Indexes
create index on public.projects(owner_id);
create index on public.releases(project_id, status);
create index on public.build_executions(release_id);
create index on public.test_executions(release_id);
create index on public.deployments(release_id);
create index on public.monitoring_records(deployment_id, recorded_at);
create index on public.incidents(deployment_id, status);
create index on public.ai_analyses(incident_id);
create index on public.policies(project_id);
create index on public.recovery_actions(incident_id);
create index on public.approvals(recovery_action_id);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.releases enable row level security;
alter table public.build_executions enable row level security;
alter table public.test_executions enable row level security;
alter table public.deployments enable row level security;
alter table public.monitoring_records enable row level security;
alter table public.incidents enable row level security;
alter table public.ai_analyses enable row level security;
alter table public.policies enable row level security;
alter table public.recovery_actions enable row level security;
alter table public.approvals enable row level security;

-- profiles: own row only
create policy "Users manage own profile" on public.profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- projects: owned directly
create policy "Users manage own projects" on public.projects for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- releases: via project
create policy "Users manage own releases" on public.releases for all to authenticated
  using (project_id in (select id from public.projects where owner_id = auth.uid()))
  with check (project_id in (select id from public.projects where owner_id = auth.uid()));

-- build_executions: via release → project
create policy "Users manage own build_executions" on public.build_executions for all to authenticated
  using (release_id in (
    select id from public.releases where project_id in (
      select id from public.projects where owner_id = auth.uid()
    )
  ))
  with check (release_id in (
    select id from public.releases where project_id in (
      select id from public.projects where owner_id = auth.uid()
    )
  ));

-- test_executions: via release → project
create policy "Users manage own test_executions" on public.test_executions for all to authenticated
  using (release_id in (
    select id from public.releases where project_id in (
      select id from public.projects where owner_id = auth.uid()
    )
  ))
  with check (release_id in (
    select id from public.releases where project_id in (
      select id from public.projects where owner_id = auth.uid()
    )
  ));

-- deployments: via release → project
create policy "Users manage own deployments" on public.deployments for all to authenticated
  using (release_id in (
    select id from public.releases where project_id in (
      select id from public.projects where owner_id = auth.uid()
    )
  ))
  with check (release_id in (
    select id from public.releases where project_id in (
      select id from public.projects where owner_id = auth.uid()
    )
  ));

-- monitoring_records: via deployment → release → project
create policy "Users manage own monitoring_records" on public.monitoring_records for all to authenticated
  using (deployment_id in (
    select id from public.deployments where release_id in (
      select id from public.releases where project_id in (
        select id from public.projects where owner_id = auth.uid()
      )
    )
  ))
  with check (deployment_id in (
    select id from public.deployments where release_id in (
      select id from public.releases where project_id in (
        select id from public.projects where owner_id = auth.uid()
      )
    )
  ));

-- incidents: via deployment → release → project
create policy "Users manage own incidents" on public.incidents for all to authenticated
  using (deployment_id in (
    select id from public.deployments where release_id in (
      select id from public.releases where project_id in (
        select id from public.projects where owner_id = auth.uid()
      )
    )
  ))
  with check (deployment_id in (
    select id from public.deployments where release_id in (
      select id from public.releases where project_id in (
        select id from public.projects where owner_id = auth.uid()
      )
    )
  ));

-- ai_analyses: via incident → deployment → release → project
create policy "Users manage own ai_analyses" on public.ai_analyses for all to authenticated
  using (incident_id in (
    select id from public.incidents where deployment_id in (
      select id from public.deployments where release_id in (
        select id from public.releases where project_id in (
          select id from public.projects where owner_id = auth.uid()
        )
      )
    )
  ))
  with check (incident_id in (
    select id from public.incidents where deployment_id in (
      select id from public.deployments where release_id in (
        select id from public.releases where project_id in (
          select id from public.projects where owner_id = auth.uid()
        )
      )
    )
  ));

-- policies: via project
create policy "Users manage own policies" on public.policies for all to authenticated
  using (project_id in (select id from public.projects where owner_id = auth.uid()))
  with check (project_id in (select id from public.projects where owner_id = auth.uid()));

-- recovery_actions: via incident → deployment → release → project
create policy "Users manage own recovery_actions" on public.recovery_actions for all to authenticated
  using (incident_id in (
    select id from public.incidents where deployment_id in (
      select id from public.deployments where release_id in (
        select id from public.releases where project_id in (
          select id from public.projects where owner_id = auth.uid()
        )
      )
    )
  ))
  with check (incident_id in (
    select id from public.incidents where deployment_id in (
      select id from public.deployments where release_id in (
        select id from public.releases where project_id in (
          select id from public.projects where owner_id = auth.uid()
        )
      )
    )
  ));

-- approvals: via recovery_action → incident → deployment → release → project
create policy "Users manage own approvals" on public.approvals for all to authenticated
  using (recovery_action_id in (
    select id from public.recovery_actions where incident_id in (
      select id from public.incidents where deployment_id in (
        select id from public.deployments where release_id in (
          select id from public.releases where project_id in (
            select id from public.projects where owner_id = auth.uid()
          )
        )
      )
    )
  ))
  with check (recovery_action_id in (
    select id from public.recovery_actions where incident_id in (
      select id from public.incidents where deployment_id in (
        select id from public.deployments where release_id in (
          select id from public.releases where project_id in (
            select id from public.projects where owner_id = auth.uid()
          )
        )
      )
    )
  ));

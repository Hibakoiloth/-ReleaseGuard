create table public.system_health (
  id bigint generated always as identity primary key,
  status text not null,
  created_at timestamptz not null default now()
);

insert into public.system_health (status)
values ('ReleaseGuard database connected');

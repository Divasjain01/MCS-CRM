do $$
begin
  if not exists (select 1 from pg_type where typname = 'sample_dispatch_method') then
    create type public.sample_dispatch_method as enum (
      'handed_over',
      'courier',
      'pickup',
      'showroom_visit',
      'other'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'sample_return_status') then
    create type public.sample_return_status as enum (
      'with_customer',
      'awaiting_return',
      'returned',
      'consumed',
      'lost',
      'completed'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'sample_activity_type') then
    create type public.sample_activity_type as enum (
      'dispatch_created',
      'dispatch_updated',
      'status_changed',
      'note_added'
    );
  end if;
end $$;

create table if not exists public.sample_dispatches (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  enquiry_reference text,
  customer_name text not null,
  customer_phone text not null,
  company_name text,
  issued_at timestamptz not null default now(),
  expected_return_at timestamptz,
  actual_returned_at timestamptz,
  material_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  category text,
  amount_collected numeric(12,2),
  remarks text,
  assigned_to uuid references public.profiles(id) on delete set null,
  dispatch_method public.sample_dispatch_method not null default 'handed_over',
  return_status public.sample_return_status not null default 'with_customer',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sample_dispatch_activities (
  id uuid primary key default gen_random_uuid(),
  sample_dispatch_id uuid not null references public.sample_dispatches(id) on delete cascade,
  type public.sample_activity_type not null,
  description text not null,
  metadata jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

drop trigger if exists trg_sample_dispatches_updated_at on public.sample_dispatches;
create trigger trg_sample_dispatches_updated_at
before update on public.sample_dispatches
for each row
execute function public.set_updated_at();

create index if not exists idx_sample_dispatches_lead_id
on public.sample_dispatches(lead_id);

create index if not exists idx_sample_dispatches_assigned_to
on public.sample_dispatches(assigned_to);

create index if not exists idx_sample_dispatches_return_status
on public.sample_dispatches(return_status);

create index if not exists idx_sample_dispatches_dispatch_method
on public.sample_dispatches(dispatch_method);

create index if not exists idx_sample_dispatches_issued_at
on public.sample_dispatches(issued_at desc);

create index if not exists idx_sample_dispatches_expected_return_at
on public.sample_dispatches(expected_return_at);

create index if not exists idx_sample_dispatches_customer_phone
on public.sample_dispatches(customer_phone);

create index if not exists idx_sample_dispatches_customer_name
on public.sample_dispatches(customer_name);

create index if not exists idx_sample_dispatches_material_name
on public.sample_dispatches(material_name);

alter table public.sample_dispatches
add column if not exists amount_collected numeric(12,2);

create index if not exists idx_sample_dispatch_activities_dispatch_id
on public.sample_dispatch_activities(sample_dispatch_id);

create index if not exists idx_sample_dispatch_activities_created_at
on public.sample_dispatch_activities(created_at desc);

alter table public.sample_dispatches enable row level security;
alter table public.sample_dispatch_activities enable row level security;

drop policy if exists "sample_dispatches_select_permitted" on public.sample_dispatches;
create policy "sample_dispatches_select_permitted"
on public.sample_dispatches
for select
to authenticated
using (
  public.is_admin(auth.uid())
  or assigned_to = auth.uid()
  or created_by = auth.uid()
  or exists (
    select 1
    from public.leads l
    where l.id = sample_dispatches.lead_id
      and (
        l.assigned_to = auth.uid()
        or l.created_by = auth.uid()
      )
  )
);

drop policy if exists "sample_dispatches_insert_permitted" on public.sample_dispatches;
create policy "sample_dispatches_insert_permitted"
on public.sample_dispatches
for insert
to authenticated
with check (
  auth.uid() is not null
  and (
    public.is_admin(auth.uid())
    or created_by = auth.uid()
    or assigned_to = auth.uid()
    or exists (
      select 1
      from public.leads l
      where l.id = sample_dispatches.lead_id
        and (
          l.assigned_to = auth.uid()
          or l.created_by = auth.uid()
        )
    )
  )
);

drop policy if exists "sample_dispatches_update_permitted" on public.sample_dispatches;
create policy "sample_dispatches_update_permitted"
on public.sample_dispatches
for update
to authenticated
using (
  public.is_admin(auth.uid())
  or assigned_to = auth.uid()
  or created_by = auth.uid()
  or exists (
    select 1
    from public.leads l
    where l.id = sample_dispatches.lead_id
      and (
        l.assigned_to = auth.uid()
        or l.created_by = auth.uid()
      )
  )
)
with check (
  public.is_admin(auth.uid())
  or assigned_to = auth.uid()
  or created_by = auth.uid()
  or exists (
    select 1
    from public.leads l
    where l.id = sample_dispatches.lead_id
      and (
        l.assigned_to = auth.uid()
        or l.created_by = auth.uid()
      )
  )
);

drop policy if exists "sample_dispatch_activities_select_permitted" on public.sample_dispatch_activities;
create policy "sample_dispatch_activities_select_permitted"
on public.sample_dispatch_activities
for select
to authenticated
using (
  exists (
    select 1
    from public.sample_dispatches sd
    where sd.id = sample_dispatch_activities.sample_dispatch_id
      and (
        public.is_admin(auth.uid())
        or sd.assigned_to = auth.uid()
        or sd.created_by = auth.uid()
        or exists (
          select 1
          from public.leads l
          where l.id = sd.lead_id
            and (
              l.assigned_to = auth.uid()
              or l.created_by = auth.uid()
            )
        )
      )
  )
);

drop policy if exists "sample_dispatch_activities_insert_permitted" on public.sample_dispatch_activities;
create policy "sample_dispatch_activities_insert_permitted"
on public.sample_dispatch_activities
for insert
to authenticated
with check (
  exists (
    select 1
    from public.sample_dispatches sd
    where sd.id = sample_dispatch_activities.sample_dispatch_id
      and (
        public.is_admin(auth.uid())
        or sd.assigned_to = auth.uid()
        or sd.created_by = auth.uid()
        or exists (
          select 1
          from public.leads l
          where l.id = sd.lead_id
            and (
              l.assigned_to = auth.uid()
              or l.created_by = auth.uid()
            )
        )
      )
  )
);

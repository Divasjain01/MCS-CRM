create extension if not exists "pgcrypto";

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'user_role'
  ) then
    create type public.user_role as enum (
      'admin',
      'sales',
      'store_manager',
      'furniture_specialist'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'lead_stage'
  ) then
    create type public.lead_stage as enum (
      'new',
      'attempting_contact',
      'connected',
      'qualified',
      'visit_booked',
      'visit_done',
      'quotation_sent',
      'negotiation',
      'won',
      'lost',
      'dormant'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'lead_source'
  ) then
    create type public.lead_source as enum (
      'shopify',
      'meta',
      'instagram',
      'whatsapp',
      'referral',
      'walk_in',
      'website',
      'manual'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'lead_type'
  ) then
    create type public.lead_type as enum (
      'homeowner',
      'architect',
      'interior_designer',
      'contractor',
      'builder'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'lead_priority'
  ) then
    create type public.lead_priority as enum ('low', 'medium', 'high');
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'showroom_visit_status'
  ) then
    create type public.showroom_visit_status as enum (
      'not_scheduled',
      'scheduled',
      'completed',
      'no_show'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'activity_type'
  ) then
    create type public.activity_type as enum (
      'lead_created',
      'lead_updated',
      'stage_changed',
      'assignment_changed',
      'note_added',
      'follow_up_added',
      'follow_up_completed',
      'call',
      'email',
      'whatsapp',
      'meeting'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'follow_up_status'
  ) then
    create type public.follow_up_status as enum (
      'scheduled',
      'completed',
      'missed',
      'cancelled'
    );
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role public.user_role not null default 'sales',
  is_active boolean not null default true,
  avatar_url text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text not null,
  alternate_phone text,
  company_name text,
  lead_type public.lead_type not null default 'homeowner',
  source public.lead_source not null default 'manual',
  source_detail text,
  stage public.lead_stage not null default 'new',
  assigned_to uuid references public.profiles (id) on delete set null,
  project_location text,
  city text,
  requirement_summary text,
  product_interest text,
  showroom_visit_status public.showroom_visit_status not null default 'not_scheduled',
  showroom_visit_date timestamptz,
  quotation_required boolean not null default false,
  quotation_value numeric(12, 2),
  budget numeric(12, 2),
  priority public.lead_priority not null default 'medium',
  notes_summary text,
  next_follow_up_at timestamptz,
  last_contacted_at timestamptz,
  lost_reason text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  type public.activity_type not null,
  description text not null,
  metadata jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  assigned_to uuid references public.profiles (id) on delete set null,
  due_at timestamptz not null,
  completed_at timestamptz,
  status public.follow_up_status not null default 'scheduled',
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_assignments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  assigned_to uuid references public.profiles (id) on delete set null,
  assigned_by uuid references public.profiles (id) on delete set null,
  assigned_at timestamptz not null default now(),
  note text
);

create index if not exists idx_leads_assigned_to on public.leads (assigned_to);
create index if not exists idx_leads_stage on public.leads (stage);
create index if not exists idx_leads_product_interest on public.leads (product_interest);
create index if not exists idx_leads_next_follow_up_at on public.leads (next_follow_up_at);
create index if not exists idx_lead_activities_lead_id on public.lead_activities (lead_id, created_at desc);
create index if not exists idx_follow_ups_lead_id on public.follow_ups (lead_id, due_at asc);
create index if not exists idx_follow_ups_status on public.follow_ups (status, due_at asc);
create index if not exists idx_lead_assignments_lead_id on public.lead_assignments (lead_id, assigned_at desc);

alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;
alter table public.follow_ups enable row level security;
alter table public.lead_assignments enable row level security;

create policy "profiles readable by authenticated users"
on public.profiles
for select
to authenticated
using (true);

create policy "admins manage profiles"
on public.profiles
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles current_profile
    where current_profile.id = auth.uid()
      and current_profile.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles current_profile
    where current_profile.id = auth.uid()
      and current_profile.role = 'admin'
  )
);

create policy "users can read permitted leads"
on public.leads
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles current_profile
    where current_profile.id = auth.uid()
      and (
        current_profile.role = 'admin'
        or public.leads.assigned_to = auth.uid()
        or public.leads.created_by = auth.uid()
      )
  )
);

create policy "users can insert leads"
on public.leads
for insert
to authenticated
with check (created_by = auth.uid() or created_by is null);

create policy "users can update permitted leads"
on public.leads
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles current_profile
    where current_profile.id = auth.uid()
      and (
        current_profile.role = 'admin'
        or public.leads.assigned_to = auth.uid()
        or public.leads.created_by = auth.uid()
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles current_profile
    where current_profile.id = auth.uid()
      and (
        current_profile.role = 'admin'
        or public.leads.assigned_to = auth.uid()
        or public.leads.created_by = auth.uid()
      )
  )
);

create policy "users can read permitted activities"
on public.lead_activities
for select
to authenticated
using (
  exists (
    select 1
    from public.leads
    join public.profiles current_profile on current_profile.id = auth.uid()
    where public.leads.id = public.lead_activities.lead_id
      and (
        current_profile.role = 'admin'
        or public.leads.assigned_to = auth.uid()
        or public.leads.created_by = auth.uid()
      )
  )
);

create policy "users can insert permitted activities"
on public.lead_activities
for insert
to authenticated
with check (
  exists (
    select 1
    from public.leads
    join public.profiles current_profile on current_profile.id = auth.uid()
    where public.leads.id = public.lead_activities.lead_id
      and (
        current_profile.role = 'admin'
        or public.leads.assigned_to = auth.uid()
        or public.leads.created_by = auth.uid()
      )
  )
);

create policy "users can read permitted follow_ups"
on public.follow_ups
for select
to authenticated
using (
  exists (
    select 1
    from public.leads
    join public.profiles current_profile on current_profile.id = auth.uid()
    where public.leads.id = public.follow_ups.lead_id
      and (
        current_profile.role = 'admin'
        or public.leads.assigned_to = auth.uid()
        or public.leads.created_by = auth.uid()
        or public.follow_ups.assigned_to = auth.uid()
      )
  )
);

create policy "users can insert permitted follow_ups"
on public.follow_ups
for insert
to authenticated
with check (
  exists (
    select 1
    from public.leads
    join public.profiles current_profile on current_profile.id = auth.uid()
    where public.leads.id = public.follow_ups.lead_id
      and (
        current_profile.role = 'admin'
        or public.leads.assigned_to = auth.uid()
        or public.leads.created_by = auth.uid()
      )
  )
);

create policy "users can update permitted follow_ups"
on public.follow_ups
for update
to authenticated
using (
  exists (
    select 1
    from public.leads
    join public.profiles current_profile on current_profile.id = auth.uid()
    where public.leads.id = public.follow_ups.lead_id
      and (
        current_profile.role = 'admin'
        or public.leads.assigned_to = auth.uid()
        or public.leads.created_by = auth.uid()
        or public.follow_ups.assigned_to = auth.uid()
      )
  )
)
with check (
  exists (
    select 1
    from public.leads
    join public.profiles current_profile on current_profile.id = auth.uid()
    where public.leads.id = public.follow_ups.lead_id
      and (
        current_profile.role = 'admin'
        or public.leads.assigned_to = auth.uid()
        or public.leads.created_by = auth.uid()
        or public.follow_ups.assigned_to = auth.uid()
      )
  )
);

create policy "users can read permitted lead_assignments"
on public.lead_assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.leads
    join public.profiles current_profile on current_profile.id = auth.uid()
    where public.leads.id = public.lead_assignments.lead_id
      and (
        current_profile.role = 'admin'
        or public.leads.assigned_to = auth.uid()
        or public.leads.created_by = auth.uid()
      )
  )
);

create policy "users can insert permitted lead_assignments"
on public.lead_assignments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.leads
    join public.profiles current_profile on current_profile.id = auth.uid()
    where public.leads.id = public.lead_assignments.lead_id
      and (
        current_profile.role = 'admin'
        or public.leads.assigned_to = auth.uid()
        or public.leads.created_by = auth.uid()
      )
  )
);

-- =========================================================
-- PATCH EXISTING DATABASES TO MATCH CURRENT FRONTEND
-- =========================================================

alter table public.leads
add column if not exists product_interest text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'leads'
      and column_name = 'product_interests'
  ) then
    execute '
      update public.leads
      set product_interest = coalesce(product_interest, product_interests[1]::text)
      where product_interests is not null
        and array_length(product_interests, 1) > 0
    ';

    execute 'alter table public.leads drop column if exists product_interests';
  end if;
end $$;

alter table public.leads
drop column if exists utm_source,
drop column if exists utm_medium,
drop column if exists utm_campaign;

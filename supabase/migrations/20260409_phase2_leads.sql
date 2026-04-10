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
  login_uid text,
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
create index if not exists idx_profiles_login_uid on public.profiles (login_uid);
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

alter table public.profiles
add column if not exists login_uid text;

create unique index if not exists idx_profiles_login_uid_unique
on public.profiles (login_uid)
where login_uid is not null;

-- =========================================================
-- PATCH: PHONE-AWARE PROFILES + SAFE POLICY HELPERS
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = _user_id
      and p.role = 'admin'
      and p.is_active = true
  );
$$;

create or replace function public.normalize_login_uid(raw_value text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(lower(coalesce(raw_value, '')), '[^a-z0-9]+', '', 'g'), '');
$$;

create or replace function public.resolve_login_email(requested_login_uid text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.email
  from public.profiles p
  where p.login_uid = public.normalize_login_uid(requested_login_uid)
    and p.is_active = true
    and p.email is not null
  limit 1;
$$;

grant execute on function public.resolve_login_email(text) to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    login_uid,
    full_name,
    role,
    is_active,
    phone
  )
  values (
    new.id,
    new.email,
    public.normalize_login_uid(
      coalesce(
        new.raw_user_meta_data->>'login_uid',
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name'
      )
    ),
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, new.phone, 'user'), '@', 1)
    ),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'sales'),
    true,
    new.phone
  )
  on conflict (id) do update
  set
    email = excluded.email,
    login_uid = coalesce(public.profiles.login_uid, excluded.login_uid),
    phone = coalesce(excluded.phone, public.profiles.phone),
    full_name = coalesce(public.profiles.full_name, excluded.full_name);

  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists trg_leads_updated_at on public.leads;
create trigger trg_leads_updated_at
before update on public.leads
for each row
execute function public.set_updated_at();

drop trigger if exists trg_follow_ups_updated_at on public.follow_ups;
create trigger trg_follow_ups_updated_at
before update on public.follow_ups
for each row
execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

drop policy if exists "profiles readable by authenticated users" on public.profiles;
drop policy if exists "admins manage profiles" on public.profiles;
drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_update_self_or_admin" on public.profiles;
drop policy if exists "profiles_insert_admin_only" on public.profiles;

create policy "profiles_select_authenticated"
on public.profiles
for select
to authenticated
using (true);

create policy "profiles_update_self_or_admin"
on public.profiles
for update
to authenticated
using (auth.uid() = id or public.is_admin(auth.uid()))
with check (auth.uid() = id or public.is_admin(auth.uid()));

create policy "profiles_insert_admin_only"
on public.profiles
for insert
to authenticated
with check (public.is_admin(auth.uid()));

drop policy if exists "lead_activities_delete_admin_only" on public.lead_activities;
create policy "lead_activities_delete_admin_only"
on public.lead_activities
for delete
to authenticated
using (public.is_admin(auth.uid()));

update public.profiles p
set phone = u.phone
from auth.users u
where p.id = u.id
  and p.phone is distinct from u.phone;

update public.profiles p
set login_uid = public.normalize_login_uid(
  coalesce(
    u.raw_user_meta_data->>'login_uid',
    p.full_name
  )
)
from auth.users u
where p.id = u.id
  and p.login_uid is null
  and p.role <> 'admin'
  and coalesce(u.raw_user_meta_data->>'login_uid', p.full_name) is not null;

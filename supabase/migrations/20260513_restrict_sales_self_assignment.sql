create or replace function public.validate_lead_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role public.user_role;
  assignee_role public.user_role;
  assignee_active boolean;
begin
  if new.assigned_to is null then
    return new;
  end if;

  select role
  into actor_role
  from public.profiles
  where id = auth.uid();

  select role, is_active
  into assignee_role, assignee_active
  from public.profiles
  where id = new.assigned_to;

  if assignee_role is null then
    raise exception 'Selected assignee does not exist in profiles';
  end if;

  if assignee_active is not true then
    raise exception 'Selected assignee is inactive';
  end if;

  if actor_role = 'sales' and new.assigned_to <> auth.uid() then
    raise exception 'Sales users can only assign leads to themselves';
  end if;

  return new;
end;
$$;

create or replace function public.validate_follow_up_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role public.user_role;
  assignee_role public.user_role;
  assignee_active boolean;
begin
  if new.assigned_to is null then
    return new;
  end if;

  select role
  into actor_role
  from public.profiles
  where id = auth.uid();

  select role, is_active
  into assignee_role, assignee_active
  from public.profiles
  where id = new.assigned_to;

  if assignee_role is null then
    raise exception 'Selected follow-up assignee does not exist in profiles';
  end if;

  if assignee_active is not true then
    raise exception 'Selected follow-up assignee is inactive';
  end if;

  if actor_role = 'sales' and new.assigned_to <> auth.uid() then
    raise exception 'Sales users can only assign follow-ups to themselves';
  end if;

  return new;
end;
$$;

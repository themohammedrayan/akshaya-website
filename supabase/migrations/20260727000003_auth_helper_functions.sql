-- Helper functions used inside RLS policies. security definer + a pinned
-- search_path lets these read `profiles` without recursing into the RLS
-- policies defined on `profiles` itself.
create function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner', 'staff')
  );
$$;

create function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner'
  );
$$;

revoke all on function public.is_staff() from public;
revoke all on function public.is_owner() from public;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_owner() to authenticated;

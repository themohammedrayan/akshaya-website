-- Generates a short, human-shareable tracking code like AKS-7F3K.
-- Alphabet excludes 0/O/1/I/L to avoid characters that are easy to mis-key
-- or misread when read aloud over the phone or WhatsApp.
create function public.generate_tracking_code()
returns text
language plpgsql
as $$
declare
  alphabet text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  candidate text;
  attempt int := 0;
begin
  loop
    candidate := 'AKS-';
    for i in 1..4 loop
      candidate := candidate || substr(alphabet, (floor(random() * length(alphabet)) + 1)::int, 1);
    end loop;

    exit when not exists (select 1 from public.requests where tracking_code = candidate);

    attempt := attempt + 1;
    if attempt > 5 then
      raise exception 'Could not generate a unique tracking code after % attempts', attempt;
    end if;
  end loop;

  return candidate;
end;
$$;

-- Tracking codes are always server-generated, never client-supplied, so the
-- public insert path (see requests_rls) can't spoof or collide on one.
create function public.set_tracking_code()
returns trigger
language plpgsql
as $$
begin
  new.tracking_code := public.generate_tracking_code();
  return new;
end;
$$;

create trigger requests_set_tracking_code
  before insert on public.requests
  for each row
  execute function public.set_tracking_code();

create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id text not null,
  user_key text not null,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_key, emoji)
);

alter table public.message_reactions enable row level security;

drop policy if exists "Public can read message reactions" on public.message_reactions;
drop policy if exists "Authenticated can add own reactions" on public.message_reactions;

create policy "Public can read message reactions"
on public.message_reactions
for select
to anon, authenticated
using (true);

create policy "Authenticated can add own reactions"
on public.message_reactions
for insert
to authenticated
with check (user_key = auth.uid()::text or user_key = auth.email());

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'message_reactions'
  ) then
    alter publication supabase_realtime add table public.message_reactions;
  end if;
end $$;

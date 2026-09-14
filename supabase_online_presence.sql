-- Защищённый счётчик онлайна для зарегистрированных пользователей.
-- Выполните этот скрипт один раз в Supabase Dashboard → SQL Editor.
-- Клиент подключается к topic `online-users` как private channel.

drop policy if exists "Registered users can read online presence" on realtime.messages;
drop policy if exists "Registered users can publish online presence" on realtime.messages;

-- Позволяем получать только Presence-состояние канала онлайна.
create policy "Registered users can read online presence"
on realtime.messages
for select
to authenticated
using (
  (select realtime.topic()) = 'online-users'
  and realtime.messages.extension = 'presence'
  and (select auth.uid()) is not null
);

-- Позволяем отправлять Presence-состояние только для того же защищённого канала.
create policy "Registered users can publish online presence"
on realtime.messages
for insert
to authenticated
with check (
  (select realtime.topic()) = 'online-users'
  and realtime.messages.extension = 'presence'
  and (select auth.uid()) is not null
);

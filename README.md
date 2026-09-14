# respublika-steam-a-plus

## Защищённый счётчик онлайна

После публикации выполните один раз [supabase_online_presence.sql](supabase_online_presence.sql) в **Supabase Dashboard → SQL Editor**. Скрипт разрешает Presence только авторизованным пользователям для канала `online-users`; клиент также использует проверенную Auth-сессию и один ключ на пользователя, поэтому гость и несколько вкладок одного аккаунта не увеличивают счётчик.

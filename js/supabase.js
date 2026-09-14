// Настройка подключения к Supabase
const SUPABASE_URL = "https://bhuhpkwxymnrochxndaj.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_kpJHpzz0TFvF0j7pUliekw_bD7UmQc8";

// Переименовываем переменную в dbClient, чтобы избежать конфликта с CDN-библиотекой
let dbClient = null;
const realtimeChannels = new Map();
let presenceChannel = null;
let presenceSetupPromise = null;
let onlinePresenceListener = null;

if (window.supabase && window.supabase.createClient) {
  dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.dbClient = dbClient;
  console.log("✅ Supabase успешно подключен!");
} else {
  console.log("⚠️ Ошибка: библиотека Supabase SDK не загрузилась из CDN.");
}

// Отслеживание онлайна через Supabase Realtime Presence.
// В канал попадает только пользователь с действующей сессией Supabase Auth.
function publishOnlineCount(count) {
  if (onlinePresenceListener) onlinePresenceListener(count);
}

async function stopOnlinePresence() {
  const channel = presenceChannel;
  presenceChannel = null;
  publishOnlineCount(0);

  if (channel && dbClient) {
    await dbClient.removeChannel(channel);
  }
}

async function setupOnlinePresence(onUpdate) {
  if (typeof onUpdate === "function") onlinePresenceListener = onUpdate;

  if (!dbClient) {
    publishOnlineCount(0);
    return;
  }

  if (presenceChannel) return;
  if (presenceSetupPromise) return presenceSetupPromise;

  presenceSetupPromise = (async () => {
    // Не доверяем localStorage: только getUser() подтверждает действующую Auth-сессию.
    const { data: authData, error } = await dbClient.auth.getUser();
    const authUser = authData?.user;
    if (error || !authUser?.id) {
      publishOnlineCount(0);
      return;
    }

    const room = dbClient.channel('online-users', {
      config: {
        private: true,
        // Один ключ на Auth user id: несколько вкладок одного аккаунта считаются как один человек.
        presence: { key: `user:${authUser.id}` }
      }
    });
    presenceChannel = room;

    room
      .on('presence', { event: 'sync' }, () => {
        const onlineCount = Object.keys(room.presenceState()).length;
        publishOnlineCount(onlineCount);
      })
      .subscribe(async (status, subscribeError) => {
        if (status === 'SUBSCRIBED') {
          await room.track({ online_at: new Date().toISOString() });
          return;
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Не вдалося підключити захищений канал онлайна:', subscribeError);
          if (presenceChannel === room) {
            presenceChannel = null;
            publishOnlineCount(0);
          }
        }
      });
  })().finally(() => {
    presenceSetupPromise = null;
  });

  return presenceSetupPromise;
}

// После входа канал подключается, после выхода — немедленно исключается из онлайна.
if (dbClient) {
  dbClient.auth.onAuthStateChange((event, session) => {
    window.setTimeout(() => {
      if (event === 'SIGNED_OUT' || !session) {
        stopOnlinePresence();
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setupOnlinePresence();
      }
    }, 0);
  });
}

// Загрузка сообщений из таблицы "messages"
async function fetchSupabaseMessages() {
  if (!dbClient) return [];
  
  const { data, error } = await dbClient
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error("Ошибка при загрузке сообщений из Supabase:", error);
    return [];
  }
  return data || [];
}

async function sendSupabaseMessage(text, replyToText = null) {
  if (!dbClient) return null;

  const savedUser = JSON.parse(localStorage.getItem("aplus_user") || "{}");
  const authorName = savedUser.first_name 
    ? `${savedUser.first_name} ${savedUser.last_name ? savedUser.last_name[0] + '.' : ''}` 
    : '';
  const authorAvatar = savedUser.avatar || null;

  const { data, error } = await dbClient
    .from('messages')
    .insert([
      { 
        text: text, 
        reply_to: replyToText,
        author: authorName,
        avatar: authorAvatar,
        author_email: savedUser.email || null,
        author_first_name: savedUser.first_name || null,
        author_last_name: savedUser.last_name || null,
        author_grade: savedUser.grade || null,
        author_username: savedUser.username || null,
        created_at: new Date().toISOString()
      }
    ])
    .select();

  if (error) {
    console.error("Помилка при відправці повідомлення:", error);
    return null;
  }
  return data ? data[0] : null;
}

// Подписка на новые сообщения в реальном времени (Realtime)
function subscribeToRealtimeMessages(onNewMessage) {
  if (!dbClient) return;

  dbClient
    .channel('public:messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
      onNewMessage(payload.new);
    })
    .subscribe();
}


// Перевірка чи юзер є адміном (Юра Z.)
function isUserAdmin() {
  const savedUser = JSON.parse(localStorage.getItem("aplus_user") || "{}");
  const email = (savedUser.email || "").toLowerCase().trim();
  return email === "yury.zahorsky@gmail.com" || email === "yury.zagorsky@gmail.com";
}

// Новини
async function fetchSupabaseNews() {
  if (!dbClient) return [];
  const { data, error } = await dbClient.from('news').select('*').order('created_at', { ascending: false });
  if (error) console.error("Помилка завантаження новин:", error);
  return data || [];
}

async function addSupabaseNews(title, description, isHot) {
  if (!dbClient) return null;
  const { data, error } = await dbClient.from('news').insert([{ title, description, is_hot: isHot }]).select();
  if (error) {
    console.error("Помилка додавання новини:", error);
    return null;
  }
  return data ? data[0] : null;
}

async function deleteSupabaseNews(newsId) {
  if (!dbClient) return;
  await dbClient.from('news').delete().eq('id', newsId);
}

// Розклад
async function fetchSupabaseLessons() {
  if (!dbClient) return [];
  const { data, error } = await dbClient.from('lessons').select('*').order('lesson_num', { ascending: true });
  if (error) console.error("Помилка завантаження розкладу:", error);
  return data || [];
}

async function addSupabaseLesson(dayName, lessonNum, subject, room, timeStart, grade = "8-Д") {
  if (!dbClient) return null;
  const { data, error } = await dbClient
    .from('lessons')
    .insert([{ day_name: dayName, lesson_num: lessonNum, subject, room, time_start: timeStart, grade: grade }])
    .select();
  if (error) {
    console.error("Помилка додавання уроку:", error);
    return null;
  }
  return data ? data[0] : null;
}

async function deleteSupabaseLesson(lessonId) {
  if (!dbClient) return;
  await dbClient.from('lessons').delete().eq('id', lessonId);
}

// Видалення повідомлень форуму
async function deleteSupabaseMessage(msgId) {
  if (!dbClient) return;
  await dbClient.from('messages').delete().eq('id', msgId);
}

function subscribeToRealtimeTable(table, onChange, filter = undefined) {
  if (!dbClient || realtimeChannels.has(table)) return;

  const channel = dbClient
    .channel(`realtime-${table}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table,
      ...(filter ? { filter } : {})
    }, onChange)
    .subscribe();

  realtimeChannels.set(table, channel);
}

async function fetchSupabaseReactionCounts(messageIds) {
  if (!dbClient || !messageIds.length) return new Map();

  const { data, error } = await dbClient
    .from('message_reactions')
    .select('message_id')
    .in('message_id', messageIds.map(String));

  if (error) {
    console.error("Помилка завантаження реакцій:", error);
    return new Map();
  }

  return data.reduce((counts, reaction) => {
    const messageId = String(reaction.message_id);
    counts.set(messageId, (counts.get(messageId) || 0) + 1);
    return counts;
  }, new Map());
}

async function saveSupabaseReaction(messageId, emoji) {
  if (!dbClient) return false;

  const { data: authData } = await dbClient.auth.getUser();
  const savedUser = JSON.parse(localStorage.getItem("aplus_user") || "{}");
  const userKey = authData.user?.id || savedUser.email;
  if (!userKey) return false;

  const { error } = await dbClient
    .from('message_reactions')
    .insert([{ message_id: String(messageId), user_key: userKey, emoji }]);

  if (error && error.code !== '23505') {
    console.error("Помилка збереження реакції:", error);
    return false;
  }

  return !error;
}

function subscribeToRealtimeReactions(onChange) {
  subscribeToRealtimeTable('message_reactions', onChange);
}

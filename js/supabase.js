// Настройка подключения к Supabase
const SUPABASE_URL = "https://bhuhpkwxymnrochxndaj.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_kpJHpzz0TFvF0j7pUliekw_bD7UmQc8";

// Переименовываем переменную в dbClient, чтобы избежать конфликта с CDN-библиотекой
let dbClient = null;
const realtimeChannels = new Map();

if (window.supabase && window.supabase.createClient) {
  dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.dbClient = dbClient;
  console.log("✅ Supabase успешно подключен!");
} else {
  console.log("⚠️ Ошибка: библиотека Supabase SDK не загрузилась из CDN.");
}

// Отслеживание онлайна через Supabase Realtime Presence
function setupOnlinePresence(onUpdate) {
  if (!dbClient) {
    onUpdate(1);
    return;
  }

  const room = dbClient.channel('online-users');
  
  room
    .on('presence', { event: 'sync' }, () => {
      const newState = room.presenceState();
      const onlineCount = Object.keys(newState).length;
      onUpdate(onlineCount);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await room.track({ online_at: new Date().toISOString() });
      }
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
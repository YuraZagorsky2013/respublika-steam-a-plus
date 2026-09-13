// Нормализация текста класса (например: "8 d" -> "8-Д", "8Б" -> "8-Б")
function normalizeGrade(input) {
  if (!input) return "8-Д";
  
  let str = input.trim().toUpperCase().replace(/[\s\-_]/g, "");
  str = str.replace("D", "Д").replace("B", "Б").replace("A", "А").replace("C", "С");
  
  const match = str.match(/^(\d+)([А-ЯA-Z])$/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }
  return str;
}

let selectedGrade = "8-Д";

async function loadSchedule() {
  const container = document.getElementById("schedule-container");
  if (!container) return;

  // Авто-выбор класса пользователя из профиля
  const savedUser = JSON.parse(localStorage.getItem("aplus_user") || "{}");
  if (savedUser.grade && !window.hasUserSelectedGrade) {
    selectedGrade = normalizeGrade(savedUser.grade);
    window.hasUserSelectedGrade = true;
  }

  // Обновление подсветки кнопок классов
  document.querySelectorAll(".grade-pill").forEach(pill => {
    const pillGrade = normalizeGrade(pill.getAttribute("data-grade"));
    if (pillGrade === selectedGrade) {
      pill.classList.add("active");
    } else {
      pill.classList.remove("active");
    }
  });

  const lessons = window.fetchSupabaseLessons ? await window.fetchSupabaseLessons() : [];
  const isAdmin = window.isUserAdmin ? window.isUserAdmin() : false;

  // Фильтрация уроков с нормализацией класса из Supabase
  const classLessons = lessons.filter(l => normalizeGrade(l.grade) === selectedGrade);

  const days = ["Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця"];
  container.innerHTML = "";

  days.forEach(day => {
    const dayLessons = classLessons.filter(l => l.day_name === day);

    const dayCard = document.createElement("div");
    dayCard.className = "schedule-day-card glass-panel";

    let rowsHTML = "";
    if (dayLessons.length === 0) {
      rowsHTML = `<tr><td colspan="5" style="opacity:0.6;">Уроків для ${selectedGrade} немає</td></tr>`;
    } else {
      dayLessons.forEach(l => {
        const delBtn = isAdmin 
          ? `<button class="btn-delete-item btn-del-lesson" data-id="${l.id}">🗑️</button>` 
          : '';

        rowsHTML += `
          <tr>
            <td><strong>#${l.lesson_num}</strong></td>
            <td>${l.time_start || ''}</td>
            <td>${l.subject || ''}</td>
            <td>🚪 ${l.room || ''}</td>
            <td>${delBtn}</td>
          </tr>
        `;
      });
    }

    dayCard.innerHTML = `
      <div class="schedule-day-title">${day}</div>
      <table class="schedule-table">
        <thead>
          <tr>
            <th>№</th>
            <th>Час</th>
            <th>Предмет</th>
            <th>Кабінет</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rowsHTML}
        </tbody>
      </table>
    `;

    container.appendChild(dayCard);
  });

  // Обработка удаления уроков админом (e.currentTarget)
  document.querySelectorAll(".btn-del-lesson").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      if (confirm("Видалити цей урок з розкладу?") && window.deleteSupabaseLesson) {
        await window.deleteSupabaseLesson(id);
        loadSchedule();
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadSchedule();

  if (window.subscribeToRealtimeTable) {
    subscribeToRealtimeTable("lessons", () => loadSchedule());
  }

  // Выбор класса при клике по плашке
  document.querySelectorAll(".grade-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      selectedGrade = normalizeGrade(pill.getAttribute("data-grade"));
      window.hasUserSelectedGrade = true;
      loadSchedule();
    });
  });
});
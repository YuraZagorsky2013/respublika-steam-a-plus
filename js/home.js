async function loadHomeNews() {
  const hotSlider = document.getElementById("hot-news-slider");
  const weekSlider = document.getElementById("week-news-slider");
  if (!hotSlider || !weekSlider) return;

  const newsList = window.fetchSupabaseNews ? await fetchSupabaseNews() : [];

  hotSlider.innerHTML = "";
  weekSlider.innerHTML = "";

  const isAdmin = window.isUserAdmin ? isUserAdmin() : false;

  newsList.forEach(item => {
    const card = document.createElement("div");
    card.className = `news-card card-yellow ${item.is_hot ? 'is-today' : ''}`;
    
    const deleteBtnHTML = isAdmin 
      ? `<button class="btn-delete-item btn-del-news" data-id="${item.id}" style="position:absolute; bottom:10px; right:10px;">🗑️</button>` 
      : '';

    // Безопасное экранирование текста
    const safeTitle = escapeHTML(item.title || '');
    const safeDesc = escapeHTML(item.description || '');

    card.innerHTML = `
      ${item.is_hot ? '<div class="badge-today" data-i18n="today_badge">СЬОГОДНІ</div>' : ''}
      <div class="card-date">${new Date(item.created_at).toLocaleDateString()}</div>
      <h3 class="card-title">${safeTitle}</h3>
      <p class="card-desc">${safeDesc}</p>
      ${deleteBtnHTML}
    `;

    if (item.is_hot) {
      hotSlider.appendChild(card);
    } else {
      weekSlider.appendChild(card);
    }
  });

  // Обробка видалення новини адміном (e.currentTarget)
  document.querySelectorAll(".btn-del-news").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const newsId = e.currentTarget.getAttribute("data-id");
      if (confirm("Видалити цю новину?") && window.deleteSupabaseNews) {
        await deleteSupabaseNews(newsId);
        loadHomeNews();
      }
    });
  });
}

// Ініціалізація та клікабельність аккордеонів (вкладок)
function initAccordions() {
  const accordionHeaders = document.querySelectorAll('.accordion-header');
  accordionHeaders.forEach(header => {
    header.addEventListener('click', (e) => {
      const item = e.currentTarget.closest('.accordion-item');
      if (item) {
        item.classList.toggle('open');
      }
    });
  });
}

// Захист від XSS
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

document.addEventListener("DOMContentLoaded", () => {
  loadHomeNews();
  initAccordions();

  if (window.subscribeToRealtimeTable) {
    subscribeToRealtimeTable("news", () => loadHomeNews());
  }
});
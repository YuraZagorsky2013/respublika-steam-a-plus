document.addEventListener("DOMContentLoaded", () => {
  // Инициализация Lucide Icons
  if (window.lucide) {
    lucide.createIcons();
  }

  // Эмуляция/отслеживание сбоя сети для Dynamic Island
  const dynamicIsland = document.getElementById("dynamic-island");

  window.addEventListener("offline", () => {
    dynamicIsland.classList.remove("hidden");
  });

  window.addEventListener("online", () => {
    dynamicIsland.classList.add("hidden");
  });

  window.checkSiteLock = () => {
    const overlay = document.getElementById("maintenance-overlay");
    const timer = document.getElementById("maintenance-timer");
    const lockUntil = Number(localStorage.getItem("aplus_site_lock") || 0);

    if (!overlay || !timer) return;

    if (lockUntil <= Date.now()) {
      localStorage.removeItem("aplus_site_lock");
      overlay.classList.add("hidden");
      window.clearInterval(window.siteLockTimer);
      window.siteLockTimer = null;
      return;
    }

    overlay.classList.remove("hidden");

    const updateTimer = () => {
      const remaining = Math.max(0, lockUntil - Date.now());
      const totalSeconds = Math.ceil(remaining / 1000);
      const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
      const seconds = String(totalSeconds % 60).padStart(2, "0");
      timer.textContent = `${minutes}:${seconds}`;

      if (remaining <= 0) {
        window.checkSiteLock();
      }
    };

    updateTimer();
    window.clearInterval(window.siteLockTimer);
    window.siteLockTimer = window.setInterval(updateTimer, 1000);
  };

  window.checkSiteLock();
});


document.addEventListener("DOMContentLoaded", () => {
  const btnAdminDrawerOpen = document.getElementById("btn-admin-drawer-open");
  const btnAdminDrawerClose = document.getElementById("btn-admin-drawer-close");
  const drawerAdmin = document.getElementById("drawer-admin");

  // Перевірка прав адміна для показу кнопки 👑
  if (btnAdminDrawerOpen && window.isUserAdmin) {
    if (isUserAdmin()) {
      btnAdminDrawerOpen.classList.remove("hidden");
    } else {
      btnAdminDrawerOpen.classList.add("hidden");
    }
  }

  if (btnAdminDrawerOpen && drawerAdmin) {
    btnAdminDrawerOpen.addEventListener("click", () => {
      drawerAdmin.classList.remove("hidden");
    });
  }

  if (btnAdminDrawerClose && drawerAdmin) {
    btnAdminDrawerClose.addEventListener("click", () => {
      drawerAdmin.classList.add("hidden");
    });
  }
});
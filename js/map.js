document.addEventListener("DOMContentLoaded", () => {
  const btnFloorToggle = document.getElementById("btn-floor-toggle");
  const currentFloorNum = document.getElementById("current-floor-num");
  const floorOpts = document.querySelectorAll(".floor-opt");
  const btnMapMode = document.getElementById("btn-map-mode");
  const mapModeText = document.getElementById("map-mode-text");
  
  const mapSearchInput = document.getElementById("map-search-input");
  const mapZones = document.querySelectorAll(".map-zone");
  const mapInfoDetails = document.getElementById("map-info-details");
  const infoEmpty = document.querySelector(".info-empty");
  const infoTitle = document.getElementById("info-title");
  const infoBody = document.getElementById("info-body");

  // Если элементов карты нет на странице, прекращаем выполнение
  if (!btnFloorToggle && !mapSearchInput) return;

  let currentFloor = 3;
  const mapModes = ["Чертеж", "Цветной чертеж", "Фото 360"];
  let modeIndex = 0;

  // Безопасная привязка через ?.
  btnFloorToggle?.addEventListener("click", () => {
    currentFloor = currentFloor >= 4 ? 1 : currentFloor + 1;
    updateFloorUI(currentFloor);
  });

  floorOpts.forEach(opt => {
    opt.addEventListener("click", () => {
      currentFloor = parseInt(opt.getAttribute("data-floor"));
      updateFloorUI(currentFloor);
    });
  });

  function updateFloorUI(floor) {
    if (currentFloorNum) currentFloorNum.textContent = floor;
    floorOpts.forEach(o => o.classList.remove("active"));
    const activeOpt = document.querySelector(`.floor-opt[data-floor="${floor}"]`);
    if (activeOpt) activeOpt.classList.add("active");
  }

  btnMapMode?.addEventListener("click", () => {
    modeIndex = (modeIndex + 1) % mapModes.length;
    if (mapModeText) mapModeText.textContent = mapModes[modeIndex];
  });

  mapZones.forEach(zone => {
    zone.addEventListener("click", () => selectZone(zone));
  });

  function selectZone(zone) {
    mapZones.forEach(z => z.classList.remove("selected"));
    zone.classList.add("selected");

    const name = zone.getAttribute("data-name");
    const type = zone.getAttribute("data-type");

    infoEmpty?.classList.add("hidden");
    mapInfoDetails?.classList.remove("hidden");
    if (infoTitle) infoTitle.textContent = name;

    if (type === "lockers") {
      if (infoBody) {
        infoBody.innerHTML = `
          <p style="margin-top:8px;">👥 <strong>Владельцы ближайших шкафчиков:</strong></p>
          <ul style="padding-left:20px; margin-top:6px; font-size:0.9rem;">
            <li>Шкафчик 325: Юра Z. (7-А)</li>
            <li>Шкафчик 326: Максим К. (7-А)</li>
            <li>Шкафчик 327: Алина М. (8-Б)</li>
          </ul>
        `;
      }
    } else if (type === "wc") {
      if (infoBody) infoBody.innerHTML = `<p style="margin-top:8px;">🚻 Расположение туалетов на ${currentFloor} этаже.</p>`;
    } else {
      if (infoBody) {
        infoBody.innerHTML = `
          <p style="margin-top:8px;">📅 <strong>Ближайший урок:</strong> Робототехника</p>
          <p style="font-size:0.85rem; opacity:0.8;">Класс: 7-А | Время: 10:30 - 11:15</p>
        `;
      }
    }
  }

  mapSearchInput?.addEventListener("input", (e) => {
    const val = e.target.value.trim().toLowerCase();
    if (!val) return;

    mapZones.forEach(zone => {
      const name = (zone.getAttribute("data-name") || "").toLowerCase();
      const id = (zone.getAttribute("data-id") || "").toLowerCase();
      const isLocker = val >= 306 && val <= 369 && zone.classList.contains("locker-zone");
      const isWC = (val === "wc" || val === "туалет") && zone.classList.contains("wc-zone");

      if (name.includes(val) || id === val || isLocker || isWC) {
        selectZone(zone);
      }
    });
  });
});
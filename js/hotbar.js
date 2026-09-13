document.addEventListener("DOMContentLoaded", () => {
  const hotbar = document.getElementById("hotbar-container");
  const glider = document.getElementById("hotbar-glider");
  const hotbarItems = document.querySelectorAll(".hotbar-item");
  const pageSections = document.querySelectorAll(".page-section");

  function moveGlider(activeItem) {
    if (!activeItem) return;

    // Внутренние координаты относительно родительского hotbar
    const left = activeItem.offsetLeft;
    const width = activeItem.offsetWidth;

    glider.classList.add("stretching");
    glider.style.left = `${left}px`;
    glider.style.width = `${width}px`;

    setTimeout(() => {
      glider.classList.remove("stretching");
    }, 200);
  }

  const initialActive = document.querySelector(".hotbar-item.active");
  if (initialActive) {
    setTimeout(() => moveGlider(initialActive), 50);
  }

  hotbarItems.forEach(item => {
    item.addEventListener("click", () => {
      const targetTab = item.getAttribute("data-tab");

      hotbarItems.forEach(i => i.classList.remove("active"));
      item.classList.add("active");

      moveGlider(item);

      pageSections.forEach(section => {
        if (section.id === `page-${targetTab}`) {
          section.classList.add("active");
        } else {
          section.classList.remove("active");
        }
      });
    });
  });

  window.addEventListener("resize", () => {
    const currentActive = document.querySelector(".hotbar-item.active");
    if (currentActive) moveGlider(currentActive);
  });
});
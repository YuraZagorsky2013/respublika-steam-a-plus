document.addEventListener("DOMContentLoaded", () => {
  const faqItems = document.querySelectorAll(".faq-item");

  faqItems.forEach(item => {
    const questionBtn = item.querySelector(".faq-question");
    const answerDiv = item.querySelector(".faq-answer");

    if (questionBtn && answerDiv) {
      questionBtn.addEventListener("click", () => {
        const isOpen = item.classList.contains("open");

        // Закрываем все остальные открытые вкладки
        faqItems.forEach(otherItem => {
          otherItem.classList.remove("open");
          const otherAnswer = otherItem.querySelector(".faq-answer");
          if (otherAnswer) otherAnswer.classList.add("hidden");
        });

        // Переключаем текущую вкладку
        if (!isOpen) {
          item.classList.add("open");
          answerDiv.classList.remove("hidden");
        }
      });
    }
  });
});
document.addEventListener("DOMContentLoaded", async () => {
  const btnSend = document.getElementById("btn-forum-send");
  const forumInput = document.getElementById("forum-input-text");
  const forumFeed = document.getElementById("forum-feed");
  const forumMessagesCount = document.getElementById("forum-messages-count");
  const forumOnlineCount = document.getElementById("forum-online-count");
  
  const btnStickerToggle = document.getElementById("btn-sticker-toggle");
  const stickerPicker = document.getElementById("sticker-picker");
  
  const replyBanner = document.getElementById("reply-preview-banner");
  const replyPreviewText = document.getElementById("reply-preview-text");
  const btnCancelReply = document.getElementById("btn-cancel-reply");

  let activeReplyText = null;
  let totalMsgCount = 0;

  // 1. Онлайн-присутствие
  if (window.setupOnlinePresence) {
    setupOnlinePresence((count) => {
      if (forumOnlineCount) forumOnlineCount.textContent = count;
    });
  }

  // 2. Отрисовка сообщения
  function renderMessage(msgData, isAnimated = false) {
    if (!forumFeed) return;

    const msgCard = document.createElement("div");
    msgCard.className = `forum-msg-card glass-panel ${isAnimated ? 'morph-enter' : ''}`;
    msgCard.dataset.messageId = msgData.id || "";
    
    let replyHTML = "";
    if (msgData.reply_to) {
      replyHTML = `<div class="reply-quote-box">💬 ${msgData.reply_to}</div>`;
    }

    const timeStr = msgData.created_at 
      ? new Date(msgData.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      : 'Щойно';

    let avatarHTML = "";
    if (msgData.avatar) {
      avatarHTML = `<img src="${msgData.avatar}" class="msg-avatar-img" alt="Avatar">`;
    } else {
      const initial = msgData.author ? msgData.author.charAt(0).toUpperCase() : 'Ю';
      avatarHTML = `<div class="msg-avatar" style="background:#007aff;">${initial}</div>`;
    }

    msgCard.innerHTML = `
      ${replyHTML}
      <div class="msg-header">
        <div class="msg-author">
          ${avatarHTML}
          <div>
            <div class="author-name">${msgData.author || 'Учень'}</div>
            <div class="msg-time">${timeStr}</div>
          </div>
        </div>
      </div>
      <div class="msg-text">${msgData.text}</div>
      <div class="msg-actions">
        <div class="reaction-wrapper">
          <button class="react-btn main-react-btn" data-emoji="❤️">
            ❤️ <span class="count">${msgData.reaction_count || 0}</span>
          </button>
          <div class="reactions-popup">
            <span class="popup-emoji" data-emoji="❤️">❤️</span>
            <span class="popup-emoji" data-emoji="🔥">🔥</span>
            <span class="popup-emoji" data-emoji="👍">👍</span>
            <span class="popup-emoji" data-emoji="🚀">🚀</span>
            <span class="popup-emoji" data-emoji="😎">😎</span>
            <span class="popup-emoji" data-emoji="🎉">🎉</span>
            <span class="popup-emoji" data-emoji="💡">💡</span>
            <span class="popup-emoji" data-emoji="👏">👏</span>
            <span class="popup-emoji" data-emoji="😮">😮</span>
            <span class="popup-emoji" data-emoji="💯">💯</span>
          </div>
        </div>
        <div class="msg-tools">
          <button class="tool-btn btn-reply" title="Відповісти"><i data-lucide="reply"></i></button>
          <button class="tool-btn btn-copy" title="Копіювати"><i data-lucide="copy"></i></button>
        </div>
      </div>
    `;

    forumFeed.appendChild(msgCard);
    totalMsgCount++;
    if (forumMessagesCount) forumMessagesCount.textContent = totalMsgCount;

    if (window.lucide) lucide.createIcons();
  }

  // 3. Загрузка сообщений
  if (window.fetchSupabaseMessages) {
    const existingMessages = await fetchSupabaseMessages();
    const reactionCounts = window.fetchSupabaseReactionCounts
      ? await fetchSupabaseReactionCounts(existingMessages.map(message => message.id))
      : new Map();
    if (forumFeed) forumFeed.innerHTML = "";
    existingMessages.forEach(msg => renderMessage({
      ...msg,
      reaction_count: reactionCounts.get(String(msg.id)) || 0
    }, false));
  }

  // 4. Подписка Realtime
  if (window.subscribeToRealtimeMessages) {
    subscribeToRealtimeMessages((newMsg) => {
      renderMessage(newMsg, true);
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });
  }

  if (window.subscribeToRealtimeReactions) {
    subscribeToRealtimeReactions(({ eventType, new: reaction }) => {
      if (eventType !== "INSERT") return;
      const card = forumFeed?.querySelector(`[data-message-id="${reaction.message_id}"]`);
      const countSpan = card?.querySelector(".main-react-btn .count");
      if (countSpan) countSpan.textContent = Number(countSpan.textContent || 0) + 1;
    });
  }

  // Панель стикеров
  if (btnStickerToggle && stickerPicker) {
    btnStickerToggle.addEventListener("click", () => {
      stickerPicker.classList.toggle("hidden");
    });

    document.querySelectorAll(".sticker-item").forEach(sticker => {
      sticker.addEventListener("click", () => {
        if (forumInput) forumInput.value += sticker.textContent;
        stickerPicker.classList.add("hidden");
      });
    });
  }

  // Отмена ответа
  if (btnCancelReply && replyBanner) {
    btnCancelReply.addEventListener("click", () => {
      activeReplyText = null;
      replyBanner.classList.add("hidden");
    });
  }

  // Отправка
  async function sendMessage() {
    if (!forumInput) return;
    const text = forumInput.value.trim();
    if (!text) return;

    const currentReply = activeReplyText;

    forumInput.value = "";
    activeReplyText = null;
    if (replyBanner) replyBanner.classList.add("hidden");

    if (window.sendSupabaseMessage) {
      const sentMessage = await sendSupabaseMessage(text, currentReply);
      if (!sentMessage) {
        forumInput.value = text;
        activeReplyText = currentReply;
        if (replyBanner && currentReply) replyBanner.classList.remove("hidden");
        alert("Не вдалося надіслати повідомлення.");
        return;
      }
    } else {
      renderMessage({ text: text, reply_to: currentReply, author: 'Ви (Учень)' }, true);
    }

    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  if (btnSend) btnSend.addEventListener("click", sendMessage);
  if (forumInput) {
    forumInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendMessage();
    });
  }

  // Обработка кликов
  document.addEventListener("click", (e) => {
    const reactBtn = e.target.closest(".react-btn") || e.target.closest(".popup-emoji");
    if (reactBtn) {
      const emoji = reactBtn.getAttribute("data-emoji");
      const card = reactBtn.closest(".forum-msg-card");
      if (card) {
          const messageId = card.getAttribute("data-message-id");
        const countSpan = card.querySelector(".main-react-btn .count");
          if (window.saveSupabaseReaction && messageId) {
            window.saveSupabaseReaction(messageId, emoji).then(saved => {
              if (!saved) alert("Не вдалося зберегти реакцію.");
            });
          } else if (countSpan) {
            countSpan.textContent = parseInt(countSpan.textContent || "0") + 1;
          }
          if (btnStickerToggle) animateFlyingEmoji(emoji, btnStickerToggle, reactBtn);
      }
    }

    const replyBtn = e.target.closest(".btn-reply");
    if (replyBtn) {
      const card = replyBtn.closest(".forum-msg-card");
      if (card) {
        const rawText = card.querySelector(".msg-text").textContent.trim();
        activeReplyText = rawText.length > 30 ? rawText.substring(0, 30) + "..." : rawText;
        if (replyPreviewText) replyPreviewText.textContent = activeReplyText;
        if (replyBanner) replyBanner.classList.remove("hidden");
        if (forumInput) forumInput.focus();
      }
    }

    const copyBtn = e.target.closest(".btn-copy");
    if (copyBtn) {
      const card = copyBtn.closest(".forum-msg-card");
      if (card) {
        const text = card.querySelector(".msg-text").textContent.trim();
        navigator.clipboard.writeText(text);
        alert("Повідомлення скопійовано!");
      }
    }
  });

  function animateFlyingEmoji(emoji, sourceEl, targetEl) {
    const sourceRect = sourceEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();

    const particle = document.createElement("div");
    particle.className = "flying-emoji-particle";
    particle.textContent = emoji;

    const startX = sourceRect.left + sourceRect.width / 2;
    const startY = sourceRect.top + sourceRect.height / 2;
    const endX = targetRect.left + targetRect.width / 2;
    const endY = targetRect.top + targetRect.height / 2;

    const dx = endX - startX;
    const dy = endY - startY;

    particle.style.left = `${startX}px`;
    particle.style.top = `${startY}px`;
    particle.style.setProperty('--dx', `${dx}px`);
    particle.style.setProperty('--dy', `${dy}px`);

    document.body.appendChild(particle);

    setTimeout(() => {
      particle.remove();
    }, 650);
  }
});
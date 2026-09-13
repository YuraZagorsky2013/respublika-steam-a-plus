document.addEventListener("DOMContentLoaded", () => {
  const btnProfileOpen = document.getElementById("btn-profile-open");
  const btnProfileClose = document.getElementById("btn-profile-close");
  const modalProfile = document.getElementById("modal-profile");
  const modalTitle = document.getElementById("modal-profile-title");

  const viewProfileInfo = document.getElementById("view-profile-info");
  const viewRegister = document.getElementById("view-auth-register");
  const viewLogin = document.getElementById("view-auth-login");
  const viewVerify = document.getElementById("view-auth-verify");

  const btnToLogin = document.getElementById("btn-to-login");
  const btnToRegister = document.getElementById("btn-to-register");
  const btnResendCode = document.getElementById("btn-resend-code");
  const btnCancelVerification = document.getElementById("btn-cancel-verification");

  const formRegister = document.getElementById("form-register");
  const formLogin = document.getElementById("form-login");
  const formVerifyEmail = document.getElementById("form-verify-email");
  const formEditProfile = document.getElementById("form-edit-profile");
  const btnLogout = document.getElementById("btn-logout");

  let regAvatarBase64 = "https://api.dicebear.com/7.x/bottts/svg?seed=aplus1";
  let editAvatarBase64 = null;

  let currentUser = JSON.parse(localStorage.getItem("aplus_user") || "null");
  let pendingVerification = null;

  if (currentUser && currentUser.password) {
    delete currentUser.password;
    localStorage.setItem("aplus_user", JSON.stringify(currentUser));
  }

  if (!currentUser) {
    btnProfileOpen.classList.add("bounce-attention");
  }

  // Переключение строго одного экрана
  function showView(viewToShow) {
    viewProfileInfo.classList.add("hidden");
    viewRegister.classList.add("hidden");
    viewLogin.classList.add("hidden");
    viewVerify.classList.add("hidden");

    viewToShow.classList.remove("hidden");
  }

  function updateModalViews() {
    if (currentUser) {
      modalTitle.textContent = "Редактирование профиля";
      showView(viewProfileInfo);

      document.getElementById("edit-firstname").value = currentUser.first_name || "";
      document.getElementById("edit-lastname").value = currentUser.last_name || "";
      document.getElementById("edit-username").value = "@" + (currentUser.username || "");
      document.getElementById("edit-grade").value = currentUser.grade || "";
      document.getElementById("edit-email").value = currentUser.email || "";

      if (currentUser.avatar) {
        document.getElementById("edit-avatar-preview").src = currentUser.avatar;
      }

      const roleTag = document.getElementById("p-role-tag");
      if (currentUser.email && (currentUser.email.includes("admin") || currentUser.email.includes("teacher") || currentUser.email.includes("tutor"))) {
        roleTag.classList.remove("hidden");
        roleTag.textContent = "Преподаватель";
      } else {
        roleTag.classList.add("hidden");
      }
    } else {
      modalTitle.textContent = "Регистрация";
      showView(viewRegister);
    }
  }

  function setFormBusy(form, isBusy) {
    form.querySelectorAll("button").forEach(button => {
      button.disabled = isBusy;
    });
  }

  async function sendVerificationCode(email) {
    if (!window.dbClient) throw new Error("Supabase недоступний.");
    const { error } = await window.dbClient.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false }
    });
    if (error) throw error;
  }

  async function finishAuthentication() {
    const { data: profile, error } = await window.dbClient
      .from("profiles")
      .select("first_name,last_name,username,grade,email,avatar")
      .eq("email", pendingVerification.email)
      .maybeSingle();

    if (error) throw error;

    if (pendingVerification.mode === "register") {
      const { data: savedProfile, error: profileError } = await window.dbClient
        .from("profiles")
        .insert([pendingVerification.profile])
        .select("first_name,last_name,username,grade,email,avatar")
        .single();

      if (profileError) throw profileError;
      currentUser = savedProfile;
    } else {
      if (!profile) throw new Error("Профіль для цієї пошти не знайдено.");
      currentUser = profile;
    }

    localStorage.setItem("aplus_user", JSON.stringify(currentUser));
    pendingVerification = null;
    modalProfile.classList.add("hidden");
  }

  async function verifyCode(code) {
    if (!pendingVerification || !window.dbClient) return;
    const { error } = await window.dbClient.auth.verifyOtp({
      email: pendingVerification.email,
      token: code,
      type: "email"
    });
    if (error) throw error;
    await finishAuthentication();
  }

  if (window.dbClient) {
    window.dbClient.auth.getSession().then(({ data }) => {
      if (!data.session) {
        currentUser = null;
        localStorage.removeItem("aplus_user");
        btnProfileOpen.classList.add("bounce-attention");
      }
    });

    window.dbClient.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        currentUser = null;
        localStorage.removeItem("aplus_user");
        btnProfileOpen.classList.add("bounce-attention");
      }
    });
  }

  if (window.subscribeToRealtimeTable) {
    subscribeToRealtimeTable("profiles", ({ eventType, new: updatedProfile }) => {
      if (!currentUser || eventType === "DELETE" || updatedProfile.email !== currentUser.email) return;

      currentUser = {
        first_name: updatedProfile.first_name,
        last_name: updatedProfile.last_name,
        username: updatedProfile.username,
        grade: updatedProfile.grade,
        email: updatedProfile.email,
        avatar: updatedProfile.avatar
      };
      localStorage.setItem("aplus_user", JSON.stringify(currentUser));

      if (!viewProfileInfo.classList.contains("hidden")) {
        updateModalViews();
      }
    });
  }

  btnProfileOpen.addEventListener("click", () => {
    btnProfileOpen.classList.remove("bounce-attention");
    updateModalViews();
    modalProfile.classList.remove("hidden");
  });

  btnProfileClose.addEventListener("click", () => {
    modalProfile.classList.add("hidden");
  });

  btnToLogin.addEventListener("click", () => {
    modalTitle.textContent = "Вход в аккаунт";
    showView(viewLogin);
  });

  btnToRegister.addEventListener("click", () => {
    modalTitle.textContent = "Регистрация";
    showView(viewRegister);
  });

  btnCancelVerification.addEventListener("click", () => {
    pendingVerification = null;
    modalTitle.textContent = "Вхід в акаунт";
    showView(viewLogin);
  });

  // Загрузка фото при регистрации
  document.getElementById("reg-avatar-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        regAvatarBase64 = event.target.result;
        document.getElementById("reg-avatar-preview").src = regAvatarBase64;
      };
      reader.readAsDataURL(file);
    }
  });

  // Загрузка фото при редактировании
  document.getElementById("edit-avatar-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        editAvatarBase64 = event.target.result;
        document.getElementById("edit-avatar-preview").src = editAvatarBase64;
      };
      reader.readAsDataURL(file);
    }
  });

  // Регистрация с подтверждением email кодом
  formRegister.addEventListener("submit", async (e) => {
    e.preventDefault();
    setFormBusy(formRegister, true);

    const email = document.getElementById("reg-email").value.trim().toLowerCase();
    const password = document.getElementById("reg-password").value;
    const profile = {
      first_name: document.getElementById("reg-firstname").value.trim(),
      last_name: document.getElementById("reg-lastname").value.trim(),
      username: document.getElementById("reg-username").value.trim().replace(/^@/, ""),
      grade: document.getElementById("reg-grade").value.trim(),
      email,
      avatar: regAvatarBase64
    };

    try {
      if (!window.dbClient) throw new Error("Supabase недоступний.");
      if (password.length < 8) throw new Error("Пароль має містити щонайменше 8 символів.");

      const { error } = await window.dbClient.auth.signUp({ email, password });
      if (error) throw error;
      await sendVerificationCode(email);
      pendingVerification = { mode: "register", email, profile };
      document.getElementById("verification-hint").textContent = `Введіть 6-значний код з листа для ${email}.`;
      modalTitle.textContent = "Підтвердження пошти";
      showView(viewVerify);
    } catch (error) {
      alert(`Не вдалося зареєструватися: ${error.message}`);
    } finally {
      setFormBusy(formRegister, false);
    }
  });

  // Вхід: email -> пароль -> одноразовий код
  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    setFormBusy(formLogin, true);
    const email = document.getElementById("login-email").value.trim().toLowerCase();
    const password = document.getElementById("login-password").value;

    try {
      if (!window.dbClient) throw new Error("Supabase недоступний.");
      const { error } = await window.dbClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await sendVerificationCode(email);
      pendingVerification = { mode: "login", email };
      document.getElementById("verification-hint").textContent = `Введіть 6-значний код з листа для ${email}.`;
      modalTitle.textContent = "Підтвердження пошти";
      showView(viewVerify);
    } catch (error) {
      alert(`Не вдалося увійти: ${error.message}`);
    } finally {
      setFormBusy(formLogin, false);
    }
  });

  formVerifyEmail.addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = document.getElementById("verification-code").value.trim();
    if (!/^\d{6}$/.test(code)) {
      alert("Введіть рівно 6 цифр.");
      return;
    }

    setFormBusy(formVerifyEmail, true);
    try {
      await verifyCode(code);
    } catch (error) {
      alert("Код неправильний або застарів. Введіть його ще раз 😂");
    } finally {
      setFormBusy(formVerifyEmail, false);
    }
  });

  btnResendCode.addEventListener("click", async () => {
    if (!pendingVerification) return;
    btnResendCode.disabled = true;
    try {
      await sendVerificationCode(pendingVerification.email);
      alert("Новий код надіслано на пошту.");
    } catch (error) {
      alert(`Не вдалося надіслати код: ${error.message}`);
    } finally {
      btnResendCode.disabled = false;
    }
  });

  // Сохранение изменений
  formEditProfile.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    currentUser.first_name = document.getElementById("edit-firstname").value.trim();
    currentUser.last_name = document.getElementById("edit-lastname").value.trim();
    currentUser.grade = document.getElementById("edit-grade").value.trim();
    if (editAvatarBase64) {
      currentUser.avatar = editAvatarBase64;
    }

    if (window.dbClient) {
      await window.dbClient
        .from("profiles")
        .update({
          first_name: currentUser.first_name,
          last_name: currentUser.last_name,
          grade: currentUser.grade,
          avatar: currentUser.avatar
        })
        .eq("email", currentUser.email);
    }

    localStorage.setItem("aplus_user", JSON.stringify(currentUser));
    modalProfile.classList.add("hidden");
  });

  // Выход
  btnLogout.addEventListener("click", async () => {
    if (window.dbClient) await window.dbClient.auth.signOut();
    localStorage.removeItem("aplus_user");
    currentUser = null;
    btnProfileOpen.classList.add("bounce-attention");
    modalProfile.classList.add("hidden");
  });
});
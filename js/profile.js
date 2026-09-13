document.addEventListener("DOMContentLoaded", () => {
  const btnProfileOpen = document.getElementById("btn-profile-open");
  const btnProfileClose = document.getElementById("btn-profile-close");
  const modalProfile = document.getElementById("modal-profile");
  const modalTitle = document.getElementById("modal-profile-title");

  const viewProfileInfo = document.getElementById("view-profile-info");
  const viewRegister = document.getElementById("view-auth-register");
  const viewLogin = document.getElementById("view-auth-login");

  const btnToLogin = document.getElementById("btn-to-login");
  const btnToRegister = document.getElementById("btn-to-register");
  const formRegister = document.getElementById("form-register");
  const formLogin = document.getElementById("form-login");
  const formEditProfile = document.getElementById("form-edit-profile");
  const btnLogout = document.getElementById("btn-logout");

  const pendingProfileKey = "aplus_pending_profile";
  const redirectUrl = `${window.location.origin}${window.location.pathname}`;
  let regAvatarBase64 = "https://api.dicebear.com/7.x/bottts/svg?seed=aplus1";
  let editAvatarBase64 = null;
  let currentUser = JSON.parse(localStorage.getItem("aplus_user") || "null");

  if (currentUser && currentUser.password) {
    delete currentUser.password;
    localStorage.setItem("aplus_user", JSON.stringify(currentUser));
  }

  if (!currentUser) btnProfileOpen.classList.add("bounce-attention");

  function showView(viewToShow) {
    [viewProfileInfo, viewRegister, viewLogin].forEach(view => view.classList.add("hidden"));
    viewToShow.classList.remove("hidden");
  }

  function updateModalViews() {
    if (!currentUser) {
      modalTitle.textContent = "Реєстрація";
      showView(viewRegister);
      return;
    }

    modalTitle.textContent = "Редагування профілю";
    showView(viewProfileInfo);
    document.getElementById("edit-firstname").value = currentUser.first_name || "";
    document.getElementById("edit-lastname").value = currentUser.last_name || "";
    document.getElementById("edit-username").value = "@" + (currentUser.username || "");
    document.getElementById("edit-grade").value = currentUser.grade || "";
    document.getElementById("edit-email").value = currentUser.email || "";
    if (currentUser.avatar) document.getElementById("edit-avatar-preview").src = currentUser.avatar;
  }

  function setFormBusy(form, isBusy) {
    form.querySelectorAll("button").forEach(button => {
      button.disabled = isBusy;
    });
  }

  function showMessage(message) {
    alert(message);
  }

  async function sendMagicLink(email, shouldCreateUser = false) {
    if (!window.dbClient) throw new Error("Supabase недоступний.");
    const { error } = await window.dbClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
        shouldCreateUser
      }
    });
    if (error) throw error;
  }

  async function loadAuthenticatedProfile(authUser) {
    if (!authUser?.email || !window.dbClient) return;

    const { data: existingProfile, error: profileError } = await window.dbClient
      .from("profiles")
      .select("first_name,last_name,username,grade,email,avatar")
      .eq("email", authUser.email)
      .maybeSingle();

    if (profileError) {
      console.error("Помилка завантаження профілю:", profileError);
      return;
    }

    let profile = existingProfile;
    const pendingProfile = JSON.parse(sessionStorage.getItem(pendingProfileKey) || "null");

    if (!profile && pendingProfile && pendingProfile.email === authUser.email) {
      const { data: savedProfile, error: saveError } = await window.dbClient
        .from("profiles")
        .insert([pendingProfile])
        .select("first_name,last_name,username,grade,email,avatar")
        .single();

      if (saveError) {
        console.error("Помилка створення профілю:", saveError);
        showMessage(`Не вдалося створити профіль: ${saveError.message}`);
        return;
      }
      profile = savedProfile;
      sessionStorage.removeItem(pendingProfileKey);
    }

    if (!profile) {
      showMessage("Профіль для цієї пошти ще не створено.");
      return;
    }

    currentUser = profile;
    localStorage.setItem("aplus_user", JSON.stringify(currentUser));
    btnProfileOpen.classList.remove("bounce-attention");
    modalProfile.classList.add("hidden");
  }

  if (window.dbClient) {
    window.dbClient.auth.getSession().then(({ data }) => {
      if (data.session) {
        loadAuthenticatedProfile(data.session.user);
      } else if (!currentUser) {
        btnProfileOpen.classList.add("bounce-attention");
      }
    });

    window.dbClient.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setTimeout(() => loadAuthenticatedProfile(session.user), 0);
      }
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
      if (!viewProfileInfo.classList.contains("hidden")) updateModalViews();
    });
  }

  btnProfileOpen.addEventListener("click", () => {
    updateModalViews();
    modalProfile.classList.remove("hidden");
  });

  btnProfileClose.addEventListener("click", () => modalProfile.classList.add("hidden"));

  btnToLogin.addEventListener("click", () => {
    modalTitle.textContent = "Вхід за посиланням";
    showView(viewLogin);
  });

  btnToRegister.addEventListener("click", () => {
    modalTitle.textContent = "Реєстрація";
    showView(viewRegister);
  });

  document.getElementById("reg-avatar-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      regAvatarBase64 = event.target.result;
      document.getElementById("reg-avatar-preview").src = regAvatarBase64;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("edit-avatar-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      editAvatarBase64 = event.target.result;
      document.getElementById("edit-avatar-preview").src = editAvatarBase64;
    };
    reader.readAsDataURL(file);
  });

  formRegister.addEventListener("submit", async (e) => {
    e.preventDefault();
    setFormBusy(formRegister, true);

    const email = document.getElementById("reg-email").value.trim().toLowerCase();
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
      sessionStorage.setItem(pendingProfileKey, JSON.stringify(profile));

      await sendMagicLink(email, true);
      modalProfile.classList.add("hidden");
      showMessage("Посилання для входу надіслано на вашу електронну пошту.");
    } catch (error) {
      sessionStorage.removeItem(pendingProfileKey);
      showMessage(`Не вдалося зареєструватися: ${error.message}`);
    } finally {
      setFormBusy(formRegister, false);
    }
  });

  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    setFormBusy(formLogin, true);
    const email = document.getElementById("login-email").value.trim().toLowerCase();

    try {
      await sendMagicLink(email);
      modalProfile.classList.add("hidden");
      showMessage("Посилання для входу надіслано на вашу електронну пошту.");
    } catch (error) {
      showMessage(`Не вдалося надіслати посилання: ${error.message}`);
    } finally {
      setFormBusy(formLogin, false);
    }
  });

  formEditProfile.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser || !window.dbClient) return;

    currentUser.first_name = document.getElementById("edit-firstname").value.trim();
    currentUser.last_name = document.getElementById("edit-lastname").value.trim();
    currentUser.grade = document.getElementById("edit-grade").value.trim();
    if (editAvatarBase64) currentUser.avatar = editAvatarBase64;

    const { error } = await window.dbClient.from("profiles").update({
      first_name: currentUser.first_name,
      last_name: currentUser.last_name,
      grade: currentUser.grade,
      avatar: currentUser.avatar
    }).eq("email", currentUser.email);

    if (error) {
      showMessage(`Не вдалося зберегти профіль: ${error.message}`);
      return;
    }

    localStorage.setItem("aplus_user", JSON.stringify(currentUser));
    modalProfile.classList.add("hidden");
  });

  btnLogout.addEventListener("click", async () => {
    if (window.dbClient) await window.dbClient.auth.signOut();
    localStorage.removeItem("aplus_user");
    currentUser = null;
    btnProfileOpen.classList.add("bounce-attention");
    modalProfile.classList.add("hidden");
  });
});
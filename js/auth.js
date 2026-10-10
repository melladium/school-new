(function () {
  'use strict';

  /* РЕГИСТРАЦИЯ */
  async function signUp(email, password, role, name) {
    try {
      const { data, error } = await window.supabaseClient.auth.signUp({ email, password });

      if (error) return { error: { message: error.message } };

      if (!data || !data.user) {
        return { error: { message: 'Не удалось создать аккаунт. Попробуйте другой email.' } };
      }

      const userId = data.user.id;

      const { error: profileError } = await window.supabaseClient.from('profiles').insert({
        id: userId,
        email: email,
        role: role,
        name: name || email.split('@')[0]
      });
      if (profileError) return { error: { message: 'Профиль: ' + profileError.message } };

      if (role === 'teacher') {
        const { error: teacherError } = await window.supabaseClient.from('teachers').insert({
          id: userId,
          subject: 'math',
          price: 1000,
          bio: '',
          rating: 0,
          reviews_count: 0,
          is_active: true
        });
        if (teacherError) return { error: { message: 'Репетитор: ' + teacherError.message } };
      }

      if (role === 'student') {
        const { error: studentError } = await window.supabaseClient.from('students').insert({
          id: userId,
          phone: '',
          grade: ''
        });
        if (studentError) return { error: { message: 'Ученик: ' + studentError.message } };
      }

      return { data };
    } catch (e) {
      return { error: { message: 'Критическая ошибка: ' + (e.message || 'неизвестная') } };
    }
  }

  /* ВХОД */
  async function signIn(email, password) {
    try {
      const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
      if (error) return { error: { message: error.message } };

      const { data: profile, error: profileError } = await window.supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError) return { error: { message: 'Профиль не найден' } };

      return { data, role: profile.role };
    } catch (e) {
      return { error: { message: 'Критическая ошибка: ' + (e.message || 'неизвестная') } };
    }
  }

  /* ВЫХОД */
  async function signOut() {
    await window.supabaseClient.auth.signOut();
    window.location.href = 'index.html';
  }

  /* ТЕКУЩИЙ ЮЗЕР */
  async function getCurrentUser() {
    try {
      const { data: { user } } = await window.supabaseClient.auth.getUser();
      if (!user) return null;

      const { data: profile } = await window.supabaseClient
        .from('profiles')
        .select('role, name, email')
        .eq('id', user.id)
        .single();

      return { user, profile };
    } catch (e) {
      return null;
    }
  }

  /* ЗАЩИТА СТРАНИЦЫ */
  async function requireAuth(requiredRole) {
    const current = await getCurrentUser();
    if (!current) {
      window.location.href = 'login.html';
      return null;
    }
    if (requiredRole && current.profile.role !== requiredRole) {
      window.location.href = 'index.html';
      return null;
    }
    return current;
  }

  /* РЕДИРЕКТ ПО РОЛИ */
  function redirectByRole(role) {
    if (role === 'teacher') window.location.href = 'cabinet-teacher.html';
    else window.location.href = 'cabinet-student.html';
  }

  /* ПОКАЗ ПАРОЛЯ */
  function initPasswordToggles() {
    document.querySelectorAll('[data-toggle-password]').forEach(btn => {
      btn.addEventListener('click', () => {
        const inputId = btn.dataset.togglePassword;
        const input = document.getElementById(inputId);
        if (!input) return;

        if (input.type === 'password') {
          input.type = 'text';
          btn.textContent = '🙈';
        } else {
          input.type = 'password';
          btn.textContent = '👁';
        }
      });
    });
  }

  /* ЛОГИН ФОРМА */
  function initLoginForm() {
    const form = document.querySelector('[data-login-form]');
    if (!form) return;

    const errorEl = form.querySelector('[data-error]');
    const submitBtn = form.querySelector('[type="submit"]');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.textContent = '';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Входим…';

      const email = form.email.value.trim();
      const password = form.password.value;

      const result = await signIn(email, password);

      if (result.error) {
        errorEl.textContent = result.error.message || 'Неверный email или пароль';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Войти';
        return;
      }

      redirectByRole(result.role);
    });
  }

  /* РЕГИСТРАЦИЯ ФОРМА */
  function initRegisterForm() {
    const roleScreen = document.querySelector('[data-role-screen]');
    const formScreen = document.querySelector('[data-form-screen]');
    const form = document.querySelector('[data-register-form]');
    const roleLabel = document.querySelector('[data-role-label]');
    const backBtn = document.querySelector('[data-back-to-roles]');

    if (!form || !roleScreen || !formScreen) return;

    const errorEl = form.querySelector('[data-error]');
    const submitBtn = form.querySelector('[type="submit"]');
    let selectedRole = null;

    roleScreen.querySelectorAll('[data-pick-role]').forEach(card => {
      card.addEventListener('click', () => {
        selectedRole = card.dataset.pickRole;

        if (roleLabel) {
          roleLabel.textContent = selectedRole === 'teacher' ? 'репетитор' : 'ученик';
        }

        roleScreen.hidden = true;
        formScreen.hidden = false;

        const nameInput = form.querySelector('#name');
        if (nameInput) setTimeout(() => nameInput.focus(), 200);
      });
    });

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        selectedRole = null;
        formScreen.hidden = true;
        roleScreen.hidden = false;
        errorEl.textContent = '';
        form.reset();
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.textContent = '';

      if (!selectedRole) {
        errorEl.textContent = 'Сначала выберите роль';
        return;
      }

      const email = form.email.value.trim();
      const password = form.password.value;
      const password2 = form.password2 ? form.password2.value : password;
      const name = form.name.value.trim();

      if (!name) {
        errorEl.textContent = 'Введите имя';
        return;
      }
      if (password.length < 6) {
        errorEl.textContent = 'Пароль минимум 6 символов';
        return;
      }
      if (form.password2 && password !== password2) {
        errorEl.textContent = 'Пароли не совпадают';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Создаём аккаунт…';

      const result = await signUp(email, password, selectedRole, name);

      if (result.error) {
        errorEl.textContent = result.error.message || 'Ошибка регистрации';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Зарегистрироваться';
        return;
      }

      redirectByRole(selectedRole);
    });
  }

  /* ШАПКА — не трогает, если колокольчик есть */
  async function initHeaderAuth() {
    const navActions = document.querySelector('.nav__actions');
    if (!navActions) return;

    if (navActions.querySelector('[data-notif-bell]')) return;

    const current = await getCurrentUser();
    if (!current) return;

    const cabinetHref = current.profile.role === 'teacher'
      ? 'cabinet-teacher.html'
      : 'cabinet-student.html';

    navActions.innerHTML = `
      <a href="${cabinetHref}" class="btn btn--ghost">${current.profile.name || 'Кабинет'}</a>
      <button class="btn btn--primary" data-logout>Выйти</button>
    `;

    navActions.querySelector('[data-logout]').addEventListener('click', signOut);
  }

  /* СТАРТ */
  document.addEventListener('DOMContentLoaded', () => {
    initPasswordToggles();
    initLoginForm();
    initRegisterForm();
    initHeaderAuth();
  });

  window.authAPI = { signUp, signIn, signOut, getCurrentUser, requireAuth, redirectByRole };

})();

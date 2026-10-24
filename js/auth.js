(function () {
  'use strict';

  if (window.authAPI) return;

  async function signUp(email, password, role, name, gender) {
    const { data, error } = await window.supabaseClient.auth.signUp({ email, password });
    if (error) return { error: { message: error.message } };
    if (!data || !data.user) return { error: { message: 'Не удалось создать аккаунт.' } };

    const userId = data.user.id;

    // Ученик — null, Репетитор — выбранный пол
    const finalGender = role === 'teacher' ? gender : null;

    await window.supabaseClient.from('profiles').insert({
      id: userId, email: email, role: role, name: name || email.split('@')[0], gender: finalGender
    });

    if (role === 'teacher') {
      await window.supabaseClient.from('teachers').insert({
        id: userId, subject: 'math', price: 1000, bio: '', rating: 0, reviews_count: 0, goals: [], is_active: false, gender: finalGender
      });
    } else {
      await window.supabaseClient.from('students').insert({ id: userId, phone: '', grade: '' });
    }

    return { data };
  }

  async function signIn(email, password) {
    const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return { error: { message: error.message } };

    const { data: profile } = await window.supabaseClient
      .from('profiles').select('role').eq('id', data.user.id).single();

    return { data, role: profile.role };
  }

  async function signOut() {
    await window.supabaseClient.auth.signOut();
    window.location.href = 'index.html';
  }

  async function getCurrentUser() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) return null;

    const { data: profile } = await window.supabaseClient
      .from('profiles').select('role, name, email, gender').eq('id', session.user.id).single();

    return { user: session.user, profile };
  }

  async function requireAuth(requiredRole) {
    const current = await getCurrentUser();
    if (!current) { window.location.href = 'login.html'; return null; }
    if (requiredRole && current.profile.role !== requiredRole) {
      window.location.href = 'index.html'; return null;
    }
    return current;
  }

  function redirectByRole(role) {
    window.location.href = role === 'teacher' ? 'cabinet-teacher.html' : 'cabinet-student.html';
  }

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

      const result = await signIn(form.email.value.trim(), form.password.value);

      if (result.error) {
        errorEl.textContent = result.error.message || 'Неверный email или пароль';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Войти';
        return;
      }
      redirectByRole(result.role);
    });
  }

  function initRegisterForm() {
    const form = document.querySelector('[data-register-form]');
    if (!form) return; // Если это не страница регистрации — выходим.

    const roleScreen = document.querySelector('[data-role-screen]');
    const formScreen = document.querySelector('[data-form-screen]');
    const roleLabel = document.querySelector('[data-role-label]');
    const backBtn = document.querySelector('[data-back-to-roles]');
    const genderField = form.querySelector('[data-gender-field]');
    const genderSelect = form.querySelector('#gender');
    
    const errorEl = form.querySelector('[data-error]');
    const submitBtn = form.querySelector('[type="submit"]');
    const agree = form.querySelector('[data-agree]');
    let selectedRole = null;

    function updateBtn() {
      const agreeOk = agree ? agree.checked : true;
      const genderOk = selectedRole === 'teacher' ? (genderSelect && genderSelect.value) : true;
      submitBtn.disabled = !(agreeOk && genderOk);
    }

    document.querySelectorAll('[data-pick-role]').forEach(card => {
      card.addEventListener('click', () => {
        selectedRole = card.dataset.pickRole;
        if (roleLabel) roleLabel.textContent = selectedRole === 'teacher' ? 'репетитор' : 'ученик';
        roleScreen.hidden = true;
        formScreen.hidden = false;
        
        if (genderField) genderField.hidden = selectedRole !== 'teacher';
        if (genderSelect) genderSelect.value = '';
        updateBtn();
      });
    });

    if (agree) agree.addEventListener('change', updateBtn);
    if (genderSelect) genderSelect.addEventListener('change', updateBtn);

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        selectedRole = null;
        formScreen.hidden = true;
        roleScreen.hidden = false;
        form.reset();
        if (genderField) genderField.hidden = true;
        updateBtn();
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.textContent = '';

      if (selectedRole === 'teacher' && !genderSelect.value) {
        errorEl.textContent = 'Выберите пол'; return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Создаём аккаунт…';

      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const password = form.password.value;
      const gender = selectedRole === 'teacher' ? genderSelect.value : null;

      const result = await signUp(email, password, selectedRole, name, gender);

      if (result.error) {
        errorEl.textContent = result.error.message || 'Ошибка регистрации';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Зарегистрироваться';
        return;
      }
      redirectByRole(selectedRole);
    });

    updateBtn();
  }

  function initPasswordToggles() {
    document.querySelectorAll('[data-toggle-password]').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.togglePassword);
        if (!input) return;
        input.type = input.type === 'password' ? 'text' : 'password';
        btn.textContent = input.type === 'password' ? '👁' : '🙈';
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initPasswordToggles();
    initLoginForm();
    initRegisterForm();
  });

  window.authAPI = { signUp, signIn, signOut, getCurrentUser, requireAuth, redirectByRole };
})();

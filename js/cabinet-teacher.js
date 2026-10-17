(function () {
  'use strict';

  let currentUser = null;
  let avatarFile = null;
  let portfolioFile = null;
  let portfolioFile2 = null;
  let currentRequestId = null;

  let bookingsExpanded = false;
  let bookingsAllRows = [];

  const DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

  const STATUS_LABELS = { free: 'Свободно', busy: 'Занято', off: 'Не работает' };

  const SUBJECT_LABELS = {
    math: 'Математика', russian: 'Русский', physics: 'Физика',
    chemistry: 'Химия', biology: 'Биология', it: 'Информатика',
    english: 'Английский', history: 'История', social: 'Обществознание',
    geography: 'География'
  };

  const SUBJECT_GOALS = {
    math: [
      { value: 'school',  label: 'Подтянуть школу' }, { value: 'oge',  label: 'ОГЭ' },
      { value: 'ege',     label: 'ЕГЭ' }, { value: 'olymp', label: 'Олимпиады' },
      { value: 'vuz',     label: 'Подготовка к вузу' }
    ],
    russian: [
      { value: 'school',   label: 'Подтянуть школу' }, { value: 'oge',      label: 'ОГЭ' },
      { value: 'ege',      label: 'ЕГЭ' }, { value: 'essay',    label: 'Сочинение' },
      { value: 'literacy', label: 'Грамотность' }
    ],
    physics: [
      { value: 'school',  label: 'Подтянуть школу' }, { value: 'oge',  label: 'ОГЭ' },
      { value: 'ege',     label: 'ЕГЭ' }, { value: 'olymp', label: 'Олимпиады' },
      { value: 'vuz',     label: 'Подготовка к вузу' }
    ],
    chemistry: [
      { value: 'school',  label: 'Подтянуть школу' }, { value: 'oge',  label: 'ОГЭ' },
      { value: 'ege',     label: 'ЕГЭ' }, { value: 'med',   label: 'Медвуз' },
      { value: 'olymp',   label: 'Олимпиады' }
    ],
    biology: [
      { value: 'school',  label: 'Подтянуть школу' }, { value: 'oge',  label: 'ОГЭ' },
      { value: 'ege',     label: 'ЕГЭ' }, { value: 'med',   label: 'Медвуз' },
      { value: 'olymp',   label: 'Олимпиады' }
    ],
    it: [
      { value: 'school',  label: 'Школьная информатика' }, { value: 'oge',    label: 'ОГЭ' },
      { value: 'ege',     label: 'ЕГЭ' }, { value: 'python', label: 'Python' },
      { value: 'web',     label: 'Веб-разработка' }, { value: 'olymp',   label: 'Олимпиады' }
    ],
    english: [
      { value: 'school',       label: 'Школьная программа' }, { value: 'oge',          label: 'ОГЭ' },
      { value: 'ege',          label: 'ЕГЭ' }, { value: 'conversation', label: 'Разговорный' },
      { value: 'business',     label: 'Бизнес-английский' }, { value: 'ielts',        label: 'IELTS / TOEFL' }
    ],
    history: [
      { value: 'school',  label: 'Подтянуть школу' }, { value: 'oge',  label: 'ОГЭ' },
      { value: 'ege',     label: 'ЕГЭ' }, { value: 'olymp', label: 'Олимпиады' },
      { value: 'vuz',     label: 'Подготовка к вузу' }
    ],
    social: [
      { value: 'school',  label: 'Подтянуть школу' }, { value: 'oge',  label: 'ОГЭ' },
      { value: 'ege',     label: 'ЕГЭ' }, { value: 'olymp', label: 'Олимпиады' }
    ],
    geography: [
      { value: 'school',  label: 'Подтянуть школу' }, { value: 'oge',  label: 'ОГЭ' },
      { value: 'ege',     label: 'ЕГЭ' }, { value: 'olymp', label: 'Олимпиады' }
    ]
  };

  let cellsMap = {};
  let editingKey = null;
  let personalMap = {};
  let personalEditingKey = null;

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function cellDateTime(weekday, time) {
    const now = new Date();
    const [hh, mm] = (time || '00:00').split(':').map(Number);
    const currentDay = now.getDay();
    let diff = weekday - currentDay;
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
    d.setDate(d.getDate() + diff);
    if (diff === 0 && d.getTime() < now.getTime()) d.setDate(d.getDate() + 7);
    if (diff < 0) d.setDate(d.getDate() + 7);
    return d;
  }

  function isPast(weekday, time) { return cellDateTime(weekday, time).getTime() < Date.now(); }

  function getSmartDefaults(existingKeys) {
    const now = new Date();
    let hour = now.getHours();
    const minutes = now.getMinutes();
    if (minutes > 30) hour += 1;

    let dayShift = 0;
    if (hour >= 22) { dayShift = 1; hour = 10; }
    else if (hour < 10) { hour = 10; }
    if (hour > 22) { hour = 10; dayShift += 1; }

    const counts = {};
    DAY_ORDER.forEach(d => counts[d] = 0);
    if (Array.isArray(existingKeys)) {
      existingKeys.forEach(k => {
        const d = parseInt(k.split('|')[0], 10);
        if (counts[d] !== undefined) counts[d]++;
      });
    }

    const today = now.getDay();
    const startDay = (today + dayShift) % 7;
    const startIdx = DAY_ORDER.indexOf(startDay);
    const orderedDays = [...DAY_ORDER.slice(startIdx), ...DAY_ORDER.slice(0, startIdx)];

    let bestDay = startDay, bestCount = Infinity;
    orderedDays.forEach(d => { if (counts[d] < bestCount) { bestCount = counts[d]; bestDay = d; } });

    return { day: String(bestDay), time: String(hour).padStart(2, '0') + ':00' };
  }

  async function init() {
    currentUser = await window.authAPI.requireAuth('teacher');
    if (!currentUser) return;

    const nameEl = document.querySelector('[data-user-name]');
    if (nameEl) nameEl.textContent = currentUser.profile.name || currentUser.profile.email;

    const logoutBtn = document.querySelector('[data-logout]');
    if (logoutBtn) logoutBtn.addEventListener('click', window.authAPI.signOut);

    initModals();
    initBurger();
    initTabs();
    initNotifications();
    initProfileSection();
    initCellModal();
    initPersonalCellModal();
    initRequestLinkModal();
    initBookingsToggle();

    const addBtn = document.querySelector('[data-add-cell]');
    if (addBtn) addBtn.addEventListener('click', () => openCellModal(null));
    const addPersonalBtn = document.querySelector('[data-add-personal-cell]');
    if (addPersonalBtn) addPersonalBtn.addEventListener('click', () => openPersonalCellModal(null));

    document.querySelectorAll('[data-open-profile]').forEach(btn => btn.addEventListener('click', openProfileModal));
    document.querySelectorAll('[data-open-preview]').forEach(btn => btn.addEventListener('click', openPreview));

    await Promise.all([loadProfile(), loadCells(), loadPersonal(), loadRequests()]);
  }

  function initBookingsToggle() {
    const btn = document.querySelector('[data-bookings-toggle]');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      bookingsExpanded = !bookingsExpanded;
      renderBookingsList();
    });
  }

  function initBurger() {
    const burger = document.querySelector('.nav__burger');
    const mobileMenu = document.querySelector('[data-nav-mobile]');
    if (burger && mobileMenu) {
      burger.addEventListener('click', () => {
        mobileMenu.hidden = !mobileMenu.hidden;
        burger.classList.toggle('is-active', !mobileMenu.hidden);
      });
    }
    const logoutMobile = document.querySelector('[data-logout-mobile]');
    if (logoutMobile) logoutMobile.addEventListener('click', window.authAPI.signOut);
  }

  function initTabs() {
    const tabs = document.querySelectorAll('.teacher-tab');
    const panels = document.querySelectorAll('.teacher-tab-panel');
    const addCellBtn = document.querySelector('[data-add-cell]');
    const addPersonalCellBtn = document.querySelector('[data-add-personal-cell]');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const t = tab.dataset.tab;
        tabs.forEach(x => x.classList.toggle('is-active', x.dataset.tab === t));
        panels.forEach(p => p.classList.toggle('is-active', p.dataset.tabPanel === t));
        
        // Переключаем видимость кнопок + Ячейка
        if (t === 'public') {
          if (addCellBtn) addCellBtn.hidden = false;
          if (addPersonalCellBtn) addPersonalCellBtn.hidden = true;
        } else {
          if (addCellBtn) addCellBtn.hidden = true;
          if (addPersonalCellBtn) addPersonalCellBtn.hidden = false;
        }
      });
    });
  }

  function initModals() {
    document.querySelectorAll('[data-modal-close]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const modal = el.closest('.modal');
        if (modal) modal.hidden = true;
        document.body.style.overflow = '';
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal:not([hidden])').forEach(m => { m.hidden = true; });
        document.body.style.overflow = '';
      }
    });
  }

  function openModal(name) {
    const m = document.querySelector(`[data-modal="${name}"]`);
    if (!m) return;
    m.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal(name) {
    const m = document.querySelector(`[data-modal="${name}"]`);
    if (!m) return;
    m.hidden = true;
    document.body.style.overflow = '';
  }

  function openProfileModal() { openModal('profile'); }

  function initNotifications() {
    const bell = document.querySelector('[data-notif-bell]');
    const panel = document.querySelector('[data-notif-panel]');
    if (!bell || !panel) return;
    bell.addEventListener('click', async (e) => {
      e.stopPropagation();
      panel.hidden = !panel.hidden;
      if (!panel.hidden) await renderNotifications();
    });
    document.addEventListener('click', (e) => {
      if (!panel.contains(e.target) && !bell.contains(e.target)) panel.hidden = true;
    });
    loadUnreadCount();
  }

  async function loadUnreadCount() {
    const countEl = document.querySelector('[data-notif-count]');
    if (!countEl) return;
    const { count } = await window.supabaseClient
      .from('notifications').select('*', { count: 'exact', head: true })
      .eq('user_id', currentUser.user.id).eq('read', false);
    if (count && count > 0) { countEl.textContent = count; countEl.hidden = false; }
    else { countEl.hidden = true; }
  }

  async function renderNotifications() {
    const panel = document.querySelector('[data-notif-panel]');
    if (!panel) return;
    const { data } = await window.supabaseClient
      .from('notifications').select('id, text, link, read, created_at')
      .eq('user_id', currentUser.user.id)
      .order('created_at', { ascending: false }).limit(20);

    if (!data || !data.length) {
      panel.innerHTML = '<div class="notif-empty">Пока нет уведомлений</div>';
      return;
    }

    panel.innerHTML = data.map(n => `
      <div class="notif-item ${n.read ? '' : 'is-unread'}" data-notif-id="${escapeHtml(n.id)}" data-link="${escapeHtml(n.link || '')}">
        <span class="notif-item__text">${escapeHtml(n.text)}</span>
        <span class="notif-item__time">${escapeHtml(formatTime(n.created_at))}</span>
        <button class="notif-item__del" data-notif-del="${escapeHtml(n.id)}" title="Удалить">✕</button>
      </div>
    `).join('');

    panel.querySelectorAll('[data-notif-id]').forEach(item => {
      item.addEventListener('click', async (e) => {
        if (e.target.closest('[data-notif-del]')) return;
        await window.supabaseClient.from('notifications').update({ read: true }).eq('id', item.dataset.notifId);
        if (item.dataset.link) window.location.href = item.dataset.link;
        else await renderNotifications();
      });
    });

    panel.querySelectorAll('[data-notif-del]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await window.supabaseClient.from('notifications').delete().eq('id', btn.dataset.notifDel);
        await renderNotifications();
        await loadUnreadCount();
      });
    });
  }

  function formatTime(iso) {
    const d = new Date(iso), now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'только что';
    if (diff < 3600) return Math.floor(diff / 60) + ' мин назад';
    if (diff < 86400) return Math.floor(diff / 3600) + ' ч назад';
    return d.getDate() + '.' + (d.getMonth() + 1);
  }

  async function loadProfile() {
    const { data, error } = await window.supabaseClient
      .from('teachers')
      .select('subject, price, bio, phone, telegram, whatsapp, is_active, avatar_url, portfolio_url, portfolio_url_2, goals, rating, reviews_count')
      .eq('id', currentUser.user.id).single();
    if (error || !data) return;

    const initials = (currentUser.profile.name || 'Р').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const ap = document.querySelector('[data-avatar-preview]');
    if (ap) {
      if (data.avatar_url) ap.innerHTML = `<img src="${escapeHtml(data.avatar_url)}" style="width:100%;height:100%;object-fit:cover;" alt="">`;
      else ap.textContent = '👤';
    }

    const pp = document.querySelector('[data-portfolio-preview]');
    if (pp) {
      if (data.portfolio_url) pp.innerHTML = `<img src="${escapeHtml(data.portfolio_url)}" style="width:100%;height:100%;object-fit:cover;" alt="">`;
      else pp.textContent = '🖼';
    }

    const pp2 = document.querySelector('[data-portfolio-preview-2]');
    if (pp2) {
      if (data.portfolio_url_2) pp2.innerHTML = `<img src="${escapeHtml(data.portfolio_url_2)}" style="width:100%;height:100%;object-fit:cover;" alt="">`;
      else pp2.textContent = '🖼';
    }

    const navAvatar = document.querySelector('[data-user-avatar]');
    if (navAvatar) {
      if (data.avatar_url) navAvatar.innerHTML = `<img src="${escapeHtml(data.avatar_url)}" alt="">`;
      else navAvatar.textContent = initials;
    }

    const toggleBtn = document.querySelector('[data-toggle-visibility]');
    if (toggleBtn) {
      if (data.is_active === false) { toggleBtn.textContent = 'Показать анкету'; toggleBtn.dataset.active = 'false'; }
      else { toggleBtn.textContent = 'Скрыть анкету'; toggleBtn.dataset.active = 'true'; }
    }

    const setVal = (sel, val) => { const el = document.querySelector(sel); if (el) el.value = val || ''; };
    setVal('[data-edit-subject]', data.subject || 'math');
    setVal('[data-edit-price]', data.price || '');
    setVal('[data-edit-phone]', data.phone || '');
    setVal('[data-edit-telegram]', data.telegram || '');
    setVal('[data-edit-whatsapp]', data.whatsapp || '');
    setVal('[data-edit-bio]', data.bio || '');

    renderGoalsCheckboxes(data.subject || 'math', Array.isArray(data.goals) ? data.goals : []);
  }

  function renderGoalsCheckboxes(subject, selected) {
    const container = document.querySelector('[data-goals-list]');
    if (!container) return;
    const goals = SUBJECT_GOALS[subject] || [];
    if (!goals.length) {
      container.innerHTML = '<div class="profile-goals__loading">Для этого предмета целей нет</div>';
      return;
    }
    container.innerHTML = goals.map(g => `
      <label class="profile-goal">
        <input type="checkbox" value="${escapeHtml(g.value)}" ${selected.includes(g.value) ? 'checked' : ''}>
        <span>${escapeHtml(g.label)}</span>
      </label>
    `).join('');
  }

  function collectSelectedGoals() {
    const c = document.querySelector('[data-goals-list]');
    if (!c) return [];
    return Array.from(c.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
  }

  function initProfileSection() {
    const saveBtn = document.querySelector('[data-profile-save]');
    const cancelBtn = document.querySelector('[data-profile-cancel]');
    const errorEl = document.querySelector('[data-profile-error]');
    const visibilityBtn = document.querySelector('[data-toggle-visibility]');
    const deleteBtn = document.querySelector('[data-delete-account]');
    const subjectSelect = document.querySelector('[data-edit-subject]');
    const avatarInput = document.querySelector('[data-avatar-input]');
    const avatarButton = document.querySelector('[data-avatar-button]');
    const avatarPreview = document.querySelector('[data-avatar-preview]');
    const portfolioInput = document.querySelector('[data-portfolio-input]');
    const portfolioButton = document.querySelector('[data-portfolio-button]');
    const portfolioPreview = document.querySelector('[data-portfolio-preview]');
    const portfolioInput2 = document.querySelector('[data-portfolio-input-2]');
    const portfolioButton2 = document.querySelector('[data-portfolio-button-2]');
    const portfolioPreview2 = document.querySelector('[data-portfolio-preview-2]');

    if (subjectSelect) {
      subjectSelect.addEventListener('change', () => renderGoalsCheckboxes(subjectSelect.value, []));
    }

    if (avatarButton && avatarInput) {
      avatarButton.addEventListener('click', () => avatarInput.click());
      avatarInput.addEventListener('change', () => {
        const file = avatarInput.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { alert('Максимум 2 МБ.'); return; }
        avatarFile = file;
        const r = new FileReader();
        r.onload = (ev) => { if (avatarPreview) avatarPreview.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;" alt="">`; };
        r.readAsDataURL(file);
      });
    }

    if (portfolioButton && portfolioInput) {
      portfolioButton.addEventListener('click', () => portfolioInput.click());
      portfolioInput.addEventListener('change', () => {
        const file = portfolioInput.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert('Максимум 5 МБ.'); return; }
        portfolioFile = file;
        const r = new FileReader();
        r.onload = (ev) => { if (portfolioPreview) portfolioPreview.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;" alt="">`; };
        r.readAsDataURL(file);
      });
    }

    if (portfolioButton2 && portfolioInput2) {
      portfolioButton2.addEventListener('click', () => portfolioInput2.click());
      portfolioInput2.addEventListener('change', () => {
        const file = portfolioInput2.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert('Максимум 5 МБ.'); return; }
        portfolioFile2 = file;
        const r = new FileReader();
        r.onload = (ev) => { if (portfolioPreview2) portfolioPreview2.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;" alt="">`; };
        r.readAsDataURL(file);
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (errorEl) errorEl.textContent = '';
        avatarFile = null; portfolioFile = null; portfolioFile2 = null;
        closeModal('profile');
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        if (errorEl) errorEl.textContent = '';
        saveBtn.disabled = true;
        saveBtn.textContent = 'Сохраняем…';

        const goalsValue = collectSelectedGoals();
        const bioValue = document.querySelector('[data-edit-bio]').value.trim();
        const priceValue = parseInt(document.querySelector('[data-edit-price]').value, 10) || 0;
        const shouldBeActive = !!bioValue && priceValue > 0 && goalsValue.length > 0;

        let avatar_url, portfolio_url, portfolio_url_2;

        try {
          if (avatarFile) {
            const ext = avatarFile.name.split('.').pop();
            const path = `${currentUser.user.id}/avatar.${ext}`;
            const { error } = await window.supabaseClient.storage.from('avatars').upload(path, avatarFile, { upsert: true });
            if (error) throw new Error('Аватар: ' + error.message);
            avatar_url = window.supabaseClient.storage.from('avatars').getPublicUrl(path).data.publicUrl + '?t=' + Date.now();
          }
          if (portfolioFile) {
            const ext = portfolioFile.name.split('.').pop();
            const path = `${currentUser.user.id}/portfolio.${ext}`;
            const { error } = await window.supabaseClient.storage.from('avatars').upload(path, portfolioFile, { upsert: true });
            if (error) throw new Error('Достижение 1: ' + error.message);
            portfolio_url = window.supabaseClient.storage.from('avatars').getPublicUrl(path).data.publicUrl + '?t=' + Date.now();
          }
          if (portfolioFile2) {
            const ext = portfolioFile2.name.split('.').pop();
            const path = `${currentUser.user.id}/portfolio-2.${ext}`;
            const { error } = await window.supabaseClient.storage.from('avatars').upload(path, portfolioFile2, { upsert: true });
            if (error) throw new Error('Достижение 2: ' + error.message);
            portfolio_url_2 = window.supabaseClient.storage.from('avatars').getPublicUrl(path).data.publicUrl + '?t=' + Date.now();
          }

          const payload = {
            subject: document.querySelector('[data-edit-subject]').value,
            price: priceValue,
            phone: document.querySelector('[data-edit-phone]').value.trim(),
            telegram: document.querySelector('[data-edit-telegram]').value.trim(),
            whatsapp: document.querySelector('[data-edit-whatsapp]').value.trim(),
            bio: bioValue,
            goals: goalsValue,
            is_active: shouldBeActive
          };
          if (avatar_url !== undefined) payload.avatar_url = avatar_url;
          if (portfolio_url !== undefined) payload.portfolio_url = portfolio_url;
          if (portfolio_url_2 !== undefined) payload.portfolio_url_2 = portfolio_url_2;

          const { error } = await window.supabaseClient.from('teachers').update(payload).eq('id', currentUser.user.id);
          if (error) throw new Error(error.message);

          avatarFile = null; portfolioFile = null; portfolioFile2 = null;
          await loadProfile();
          closeModal('profile');
        } catch (e) {
          if (errorEl) errorEl.textContent = 'Ошибка: ' + e.message;
        } finally {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Сохранить';
        }
      });
    }

    if (visibilityBtn) {
      visibilityBtn.addEventListener('click', async () => {
        const isActive = visibilityBtn.dataset.active === 'true';
        if (isActive) {
          if (!confirm('Скрыть анкету?')) return;
          await window.supabaseClient.from('teachers').update({ is_active: false }).eq('id', currentUser.user.id);
        } else {
          await window.supabaseClient.from('teachers').update({ is_active: true }).eq('id', currentUser.user.id);
        }
        await loadProfile();
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (!confirm('Удалить аккаунт НАВСЕГДА?')) return;
        if (!confirm('Точно? Это последнее предупреждение.')) return;
        deleteBtn.disabled = true;
        deleteBtn.textContent = 'Удаляем…';
        const { error } = await window.supabaseClient.rpc('delete_user');
        if (error) { alert('Ошибка: ' + error.message); deleteBtn.disabled = false; deleteBtn.textContent = 'Удалить аккаунт навсегда'; return; }
        alert('Аккаунт удалён.');
        await window.authAPI.signOut();
      });
    }
  }

  async function openPreview() { openModal('preview'); await loadPreview(); }

  async function loadPreview() {
    const { data, error } = await window.supabaseClient
      .from('teachers')
      .select('subject, price, bio, phone, telegram, whatsapp, rating, reviews_count, avatar_url, portfolio_url, portfolio_url_2, goals')
      .eq('id', currentUser.user.id).single();
    if (error || !data) return;
    renderPreviewFromData(data);
    await renderPreviewSchedule();
  }

  function renderPreviewFromData(data) {
    const initials = (currentUser.profile.name || 'Р').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const setText = (sel, val) => { const el = document.querySelector(sel); if (el) el.textContent = val || '—'; };

    const avEl = document.querySelector('[data-preview-avatar]');
    if (avEl) {
      if (data.avatar_url) avEl.innerHTML = `<img src="${escapeHtml(data.avatar_url)}" style="width:100%;height:100%;object-fit:cover;" alt="" loading="lazy">`;
      else avEl.textContent = initials;
    }

    setText('[data-preview-name]', currentUser.profile.name || 'Репетитор');
    setText('[data-preview-subject]', SUBJECT_LABELS[data.subject] || data.subject || '—');
    setText('[data-preview-price]', data.price ? data.price + ' ₽ / урок' : '—');
    setText('[data-preview-rating]', data.rating || '—');
    setText('[data-preview-reviews]', `· ${data.reviews_count || 0} отзывов`);

    const bioBlock = document.querySelector('[data-preview-bio-block]');
    const bioEl = document.querySelector('[data-preview-bio]');
    if (data.bio && bioEl) { bioEl.textContent = data.bio; if (bioBlock) bioBlock.hidden = false; }
    else if (bioBlock) bioBlock.hidden = true;

    const cBlock = document.querySelector('[data-preview-contacts-block]');
    const cTg = document.querySelector('[data-preview-contact="telegram"]');
    const cWa = document.querySelector('[data-preview-contact="whatsapp"]');
    const cPh = document.querySelector('[data-preview-contact="phone"]');
    let hasContacts = false;
    if (cTg) { cTg.hidden = !data.telegram; if (data.telegram) hasContacts = true; }
    if (cWa) { cWa.hidden = !data.whatsapp; if (data.whatsapp) hasContacts = true; }
    if (cPh) { cPh.hidden = !data.phone; if (data.phone) hasContacts = true; }
    if (cBlock) cBlock.hidden = !hasContacts;

    const pb = document.querySelector('[data-preview-portfolio-block]');
    const p1 = document.querySelector('[data-preview-portfolio-image]');
    const p2 = document.querySelector('[data-preview-portfolio-image-2]');
    let hasPortfolio = false;
    if (p1) { if (data.portfolio_url) { p1.src = data.portfolio_url; p1.hidden = false; hasPortfolio = true; } else p1.hidden = true; }
    if (p2) { if (data.portfolio_url_2) { p2.src = data.portfolio_url_2; p2.hidden = false; hasPortfolio = true; } else p2.hidden = true; }
    if (pb) pb.hidden = !hasPortfolio;
  }

  async function renderPreviewSchedule() {
    const el = document.querySelector('[data-preview-schedule]');
    if (!el) return;
    const { data, error } = await window.supabaseClient
      .from('schedule_template').select('weekday, time, status, student_name')
      .eq('teacher_id', currentUser.user.id)
      .order('weekday', { ascending: true }).order('time', { ascending: true });

    if (error) { el.innerHTML = '<div class="preview-schedule__loading">Ошибка загрузки</div>'; return; }
    if (!data || !data.length) { el.innerHTML = '<div class="preview-schedule__loading">Расписание пока пустое</div>'; return; }

    const map = {};
    data.forEach(item => {
      map[item.weekday + '|' + item.time] = {
        status: item.status || 'free',
        time: item.time,
        studentName: item.student_name || ''
      };
    });

    let maxRows = 1;
    DAY_ORDER.forEach(day => {
      const count = Object.keys(map).filter(k => k.startsWith(day + '|')).length;
      if (count > maxRows) maxRows = count;
    });

    let html = '';
    DAY_ORDER.forEach(day => {
      const dayCells = Object.keys(map).filter(k => k.startsWith(day + '|'))
        .map(k => ({ key: k, ...map[k] })).sort((a, b) => a.time.localeCompare(b.time));

      const cellsHtml = dayCells.length
        ? dayCells.map(c => {
            const statusText = (c.status === 'busy' && c.studentName) ? c.studentName : (STATUS_LABELS[c.status] || c.status);
            return `
              <div class="week-cell week-cell--${escapeHtml(c.status)} week-cell--preview">
                <div class="week-cell__time">${escapeHtml(c.time)}</div>
                <div class="week-cell__status">${escapeHtml(statusText)}</div>
              </div>
            `;
          }).join('')
        : '<div class="week-day__empty">—</div>';

      html += `<div class="week-day"><div class="week-day__head">${DAYS[day]}</div><div class="week-day__body" style="--week-rows:${maxRows}">${cellsHtml}</div></div>`;
    });
    el.innerHTML = `<div class="week-board">${html}</div>`;
  }

  document.addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-preview-edit]');
    if (editBtn) { closeModal('preview'); openProfileModal(); }
  });

  async function loadCells() {
    const board = document.querySelector('[data-week-board]');
    if (!board) return;
    const { data, error } = await window.supabaseClient
      .from('schedule_template').select('id, weekday, time, text_content, status, student_name')
      .eq('teacher_id', currentUser.user.id)
      .order('weekday', { ascending: true }).order('time', { ascending: true });
    if (error) { board.innerHTML = '<div class="week-board__loading">Ошибка: ' + escapeHtml(error.message) + '</div>'; return; }

    cellsMap = {};
    (data || []).forEach(item => {
      const key = item.weekday + '|' + item.time;
      cellsMap[key] = {
        id: item.id,
        status: item.status || 'free',
        note: item.text_content || '',
        studentName: item.student_name || ''
      };
    });
    renderWeekBoard();
  }

  function renderWeekBoard() {
    const board = document.querySelector('[data-week-board]');
    if (!board) return;
    let maxRows = 1;
    DAY_ORDER.forEach(day => {
      const count = Object.keys(cellsMap).filter(k => k.startsWith(day + '|')).length;
      if (count > maxRows) maxRows = count;
    });

    let html = '';
    DAY_ORDER.forEach(day => {
      const dayCells = Object.keys(cellsMap).filter(key => key.startsWith(day + '|'))
        .map(key => ({ key, ...cellsMap[key] })).sort((a, b) => a.key.localeCompare(b.key));

      const cellsHtml = dayCells.length
        ? dayCells.map(c => renderCell(day, c)).join('')
        : '<div class="week-day__empty">Нет ячеек</div>';

      html += `<div class="week-day"><div class="week-day__head">${DAYS[day]}</div><div class="week-day__body" style="--week-rows:${maxRows}">${cellsHtml}</div></div>`;
    });

    board.innerHTML = html;
    board.querySelectorAll('[data-cell-key]').forEach(el => el.addEventListener('click', () => openCellModal(el.dataset.cellKey)));
  }

  function renderCell(day, cell) {
    const time = cell.key.split('|')[1];
    const statusClass = 'week-cell--' + escapeHtml(cell.status);

    let displayText;
    let textClass = 'week-cell__status';
    if (cell.status === 'busy' && cell.studentName) {
      displayText = cell.studentName;
      textClass = 'week-cell__status week-cell__status--name';
    } else {
      displayText = STATUS_LABELS[cell.status] || cell.status;
    }

    return `
      <div class="week-cell ${statusClass}" data-cell-key="${escapeHtml(cell.key)}">
        <div class="week-cell__time">${escapeHtml(time)}</div>
        <div class="${textClass}">${escapeHtml(displayText)}</div>
      </div>
    `;
  }

  function initCellModal() {
    const modal = document.querySelector('[data-modal="cell-edit"]');
    if (!modal) return;
    const saveBtn = modal.querySelector('[data-cell-save]');
    const deleteBtn = modal.querySelector('[data-cell-delete]');
    const daySelect = modal.querySelector('[data-cell-day]');
    const timeInput = modal.querySelector('[data-cell-time]');
    const statusSelect = modal.querySelector('[data-cell-status]');
    const nameInput = modal.querySelector('[data-cell-student-name]');
    const noteInput = modal.querySelector('[data-cell-note]');

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const errorEl = modal.querySelector('[data-cell-error]');
        errorEl.textContent = '';
        const day = parseInt(daySelect.value, 10);
        const time = timeInput.value.trim();
        const status = statusSelect.value;
        const studentName = nameInput.value.trim();
        const note = noteInput.value.trim();
        if (!time) { errorEl.textContent = 'Укажите время'; return; }
        saveBtn.disabled = true; saveBtn.textContent = 'Сохраняем…';

        if (editingKey) {
          const [oldDay, oldTime] = editingKey.split('|');
          await window.supabaseClient.from('schedule_template').delete()
            .eq('teacher_id', currentUser.user.id).eq('weekday', parseInt(oldDay, 10)).eq('time', oldTime);
        }

        const { error } = await window.supabaseClient.from('schedule_template').upsert({
          teacher_id: currentUser.user.id,
          weekday: day,
          time,
          text_content: note,
          student_name: studentName,
          status
        }, { onConflict: 'teacher_id,weekday,time' });

        saveBtn.disabled = false; saveBtn.textContent = 'Сохранить';
        if (error) { errorEl.textContent = 'Ошибка: ' + error.message; return; }
        closeModal('cell-edit'); editingKey = null; await loadCells();
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (!editingKey) return;
        if (!confirm('Удалить эту ячейку?')) return;
        const [oldDay, oldTime] = editingKey.split('|');
        await window.supabaseClient.from('schedule_template').delete()
          .eq('teacher_id', currentUser.user.id).eq('weekday', parseInt(oldDay, 10)).eq('time', oldTime);
        closeModal('cell-edit'); editingKey = null; await loadCells();
      });
    }
  }

  function openCellModal(key) {
    const modal = document.querySelector('[data-modal="cell-edit"]');
    if (!modal) return;
    const title = modal.querySelector('[data-cell-title]');
    const daySelect = modal.querySelector('[data-cell-day]');
    const timeInput = modal.querySelector('[data-cell-time]');
    const statusSelect = modal.querySelector('[data-cell-status]');
    const nameInput = modal.querySelector('[data-cell-student-name]');
    const noteInput = modal.querySelector('[data-cell-note]');
    const deleteBtn = modal.querySelector('[data-cell-delete]');
    const errorEl = modal.querySelector('[data-cell-error]');
    errorEl.textContent = '';

    if (key) {
      editingKey = key;
      const [day, time] = key.split('|');
      const cell = cellsMap[key] || {};
      if (title) title.textContent = 'Редактировать ячейку';
      daySelect.value = day; timeInput.value = time;
      statusSelect.value = cell.status || 'free';
      nameInput.value = cell.studentName || '';
      noteInput.value = cell.note || '';
      if (deleteBtn) deleteBtn.hidden = false;
    } else {
      editingKey = null;
      if (title) title.textContent = 'Новая ячейка';
      const d = getSmartDefaults(Object.keys(cellsMap));
      daySelect.value = d.day; timeInput.value = d.time;
      statusSelect.value = 'free';
      nameInput.value = '';
      noteInput.value = '';
      if (deleteBtn) deleteBtn.hidden = true;
    }

    openModal('cell-edit');
    setTimeout(() => timeInput && timeInput.focus(), 150);
  }

  async function loadPersonal() {
    personalMap = {};
    const { data, error } = await window.supabaseClient
      .from('personal_schedule').select('id, weekday, time, text_content, student_name')
      .eq('teacher_id', currentUser.user.id)
      .order('weekday', { ascending: true }).order('time', { ascending: true });
    if (error) return;
    (data || []).forEach(item => {
      personalMap[item.weekday + '|' + item.time] = {
        id: item.id,
        note: item.text_content || '',
        studentName: item.student_name || ''
      };
    });
    renderPersonalBoard();
  }

  function renderPersonalBoard() {
    const board = document.querySelector('[data-personal-board]');
    if (!board) return;
    let maxRows = 1;
    DAY_ORDER.forEach(day => {
      const count = Object.keys(personalMap).filter(k => k.startsWith(day + '|')).length;
      if (count > maxRows) maxRows = count;
    });

    let html = '';
    DAY_ORDER.forEach(day => {
      const dayCells = Object.keys(personalMap).filter(key => key.startsWith(day + '|'))
        .map(key => ({ key, ...personalMap[key] })).sort((a, b) => a.key.localeCompare(b.key));

      const cellsHtml = dayCells.length
        ? dayCells.map(c => renderPersonalCell(day, c)).join('')
        : '<div class="week-day__empty">Нет ячеек</div>';

      html += `<div class="week-day"><div class="week-day__head">${DAYS[day]}</div><div class="week-day__body" style="--week-rows:${maxRows}">${cellsHtml}</div></div>`;
    });

    board.innerHTML = html;
    board.querySelectorAll('[data-personal-cell-key]').forEach(el => el.addEventListener('click', () => openPersonalCellModal(el.dataset.personalCellKey)));
  }

  function renderPersonalCell(day, cell) {
    const time = cell.key.split('|')[1];
    const display = cell.studentName || STATUS_LABELS.free;
    return `<div class="week-cell week-cell--personal" data-personal-cell-key="${escapeHtml(cell.key)}"><div class="week-cell__time">${escapeHtml(time)}</div><div class="week-cell__status">${escapeHtml(display)}</div></div>`;
  }

  function initPersonalCellModal() {
    const modal = document.querySelector('[data-modal="personal-cell-edit"]');
    if (!modal) return;
    const saveBtn = modal.querySelector('[data-personal-cell-save]');
    const deleteBtn = modal.querySelector('[data-personal-cell-delete]');
    const daySelect = modal.querySelector('[data-personal-cell-day]');
    const timeInput = modal.querySelector('[data-personal-cell-time]');
    const nameInput = modal.querySelector('[data-personal-cell-student-name]');
    const textInput = modal.querySelector('[data-personal-cell-text]');

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const errorEl = modal.querySelector('[data-personal-cell-error]');
        errorEl.textContent = '';
        const day = parseInt(daySelect.value, 10);
        const time = timeInput.value.trim();
        const studentName = nameInput.value.trim();
        const text = textInput.value.trim();
        if (!time) { errorEl.textContent = 'Укажите время'; return; }
        saveBtn.disabled = true; saveBtn.textContent = 'Сохраняем…';

        if (personalEditingKey) {
          const [oldDay, oldTime] = personalEditingKey.split('|');
          await window.supabaseClient.from('personal_schedule').delete()
            .eq('teacher_id', currentUser.user.id).eq('weekday', parseInt(oldDay, 10)).eq('time', oldTime);
        }

        const { error } = await window.supabaseClient.from('personal_schedule').upsert({
          teacher_id: currentUser.user.id,
          weekday: day,
          time,
          text_content: text,
          student_name: studentName
        }, { onConflict: 'teacher_id,weekday,time' });

        saveBtn.disabled = false; saveBtn.textContent = 'Сохранить';
        if (error) { errorEl.textContent = 'Ошибка: ' + error.message; return; }
        closeModal('personal-cell-edit'); personalEditingKey = null; await loadPersonal();
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (!personalEditingKey) return;
        if (!confirm('Удалить эту ячейку?')) return;
        const [oldDay, oldTime] = personalEditingKey.split('|');
        await window.supabaseClient.from('personal_schedule').delete()
          .eq('teacher_id', currentUser.user.id).eq('weekday', parseInt(oldDay, 10)).eq('time', oldTime);
        closeModal('personal-cell-edit'); personalEditingKey = null; await loadPersonal();
      });
    }
  }

  function openPersonalCellModal(key) {
    const modal = document.querySelector('[data-modal="personal-cell-edit"]');
    if (!modal) return;
    const title = modal.querySelector('[data-personal-cell-title]');
    const daySelect = modal.querySelector('[data-personal-cell-day]');
    const timeInput = modal.querySelector('[data-personal-cell-time]');
    const nameInput = modal.querySelector('[data-personal-cell-student-name]');
    const textInput = modal.querySelector('[data-personal-cell-text]');
    const deleteBtn = modal.querySelector('[data-personal-cell-delete]');
    const errorEl = modal.querySelector('[data-personal-cell-error]');
    errorEl.textContent = '';

    if (key) {
      personalEditingKey = key;
      const [day, time] = key.split('|');
      const cell = personalMap[key] || {};
      if (title) title.textContent = 'Редактировать ячейку';
      daySelect.value = day; timeInput.value = time;
      nameInput.value = cell.studentName || '';
      textInput.value = cell.note || '';
      if (deleteBtn) deleteBtn.hidden = false;
    } else {
      personalEditingKey = null;
      if (title) title.textContent = 'Новая ячейка';
      const d = getSmartDefaults(Object.keys(personalMap));
      daySelect.value = d.day; timeInput.value = d.time;
      nameInput.value = '';
      textInput.value = '';
      if (deleteBtn) deleteBtn.hidden = true;
    }

    openModal('personal-cell-edit');
    setTimeout(() => timeInput && timeInput.focus(), 150);
  }

  async function loadRequests() {
    const listEl = document.querySelector('[data-bookings-list]');
    if (!listEl) return;
    listEl.innerHTML = '<div class="cabinet__loading">Загружаем…</div>';

    const { data, error } = await window.supabaseClient
      .from('booking_requests').select('id, status, weekday, time, student_id, meeting_link, created_at')
      .eq('teacher_id', currentUser.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      listEl.innerHTML = '<div class="cabinet__empty"><div class="cabinet__empty-title">Ошибка</div><div class="cabinet__empty-desc">' + escapeHtml(error.message) + '</div></div>';
      updateStats(0, 0);
      const toggle = document.querySelector('[data-bookings-toggle]');
      if (toggle) { toggle.disabled = true; toggle.classList.add('is-disabled'); }
      return;
    }

    if (!data || !data.length) {
      listEl.innerHTML = `
        <div class="cabinet__empty">
          <div class="cabinet__empty-icon">📩</div>
          <div class="cabinet__empty-title">Заявок пока нет</div>
          <div class="cabinet__empty-desc">Когда ученик попросит место — заявка появится здесь</div>
        </div>`;
      updateStats(0, 0);
      const toggle = document.querySelector('[data-bookings-toggle]');
      if (toggle) { toggle.disabled = true; toggle.classList.add('is-disabled'); }
      return;
    }

    const studentIds = [...new Set(data.map(b => b.student_id).filter(Boolean))];
    const { data: profiles } = studentIds.length
      ? await window.supabaseClient.from('profiles').select('id, name, email').in('id', studentIds)
      : { data: [] };

    const studentsMap = {};
    (profiles || []).forEach(p => studentsMap[p.id] = p);

    const upcoming = [], done = [];
    const rows = data.map(b => {
      const s = studentsMap[b.student_id] || {};
      const item = { ...b, studentName: s.name || s.email || 'Ученик' };
      if (b.status === 'approved' && isPast(b.weekday, b.time)) done.push(item);
      else if (b.status === 'pending' || b.status === 'approved') upcoming.push(item);
      return item;
    });

    bookingsAllRows = rows;
    renderBookingsList();
    updateStats(upcoming.length, done.length);
  }

  function renderBookingsList() {
    const listEl = document.querySelector('[data-bookings-list]');
    const toggle = document.querySelector('[data-bookings-toggle]');
    if (!listEl) return;

    const total = bookingsAllRows.length;
    const showToggle = total > 2;

    if (toggle) {
      if (!showToggle) {
        toggle.disabled = true;
        toggle.classList.add('is-disabled');
      } else {
        toggle.disabled = false;
        toggle.classList.remove('is-disabled');
        toggle.textContent = bookingsExpanded ? 'Свернуть' : 'Развернуть';
      }
    }

    const visible = bookingsExpanded ? bookingsAllRows : bookingsAllRows.slice(0, 2);
    listEl.innerHTML = visible.map(b => renderBookingCard(b)).join('');

    listEl.querySelectorAll('[data-approve-request]').forEach(btn => {
      btn.addEventListener('click', () => approveRequest(btn.dataset.approveRequest, parseInt(btn.dataset.weekday, 10), btn.dataset.time, btn.dataset.student));
    });
    listEl.querySelectorAll('[data-reject-request]').forEach(btn => {
      btn.addEventListener('click', () => rejectRequest(btn.dataset.rejectRequest));
    });
    listEl.querySelectorAll('[data-delete-request]').forEach(btn => {
      btn.addEventListener('click', () => deleteRequest(btn.dataset.deleteRequest));
    });
    listEl.querySelectorAll('[data-open-request-link]').forEach(btn => {
      btn.addEventListener('click', () => openRequestLinkModal(
        btn.dataset.openRequestLink,
        btn.dataset.studentName,
        btn.dataset.weekday,
        btn.dataset.time,
        btn.dataset.currentLink || ''
      ));
    });
  }

  function renderBookingCard(b) {
    const dateLabel = `${DAYS[b.weekday]} · ${b.time}`;
    const safeName = escapeHtml(b.studentName);
    const hasLink = !!(b.meeting_link && b.meeting_link.trim());
    let statusClass, statusLabel, statusEmoji, actionHtml = '';

    if (b.status === 'pending') {
      statusClass = 'pending'; statusLabel = 'Ожидает'; statusEmoji = '⏳';
      actionHtml = `
        <button class="booking-card__action booking-card__action--primary" data-approve-request="${escapeHtml(b.id)}" data-weekday="${escapeHtml(b.weekday)}" data-time="${escapeHtml(b.time)}" data-student="${escapeHtml(b.student_id)}">Одобрить</button>
        <button class="booking-card__action booking-card__action--danger" data-reject-request="${escapeHtml(b.id)}">Отклонить</button>
        <button class="booking-card__action booking-card__action--remove" data-delete-request="${escapeHtml(b.id)}">✕ Удалить</button>
      `;
    } else if (b.status === 'approved') {
      statusClass = 'approved'; statusLabel = 'Одобрена'; statusEmoji = '✅';
      const linkBtn = hasLink
        ? `<button class="booking-card__action booking-card__action--primary" data-open-request-link="${escapeHtml(b.id)}" data-student-name="${safeName}" data-weekday="${escapeHtml(b.weekday)}" data-time="${escapeHtml(b.time)}" data-current-link="${escapeHtml(b.meeting_link)}">✓ Ссылка добавлена</button>`
        : `<button class="booking-card__action booking-card__action--ghost" data-open-request-link="${escapeHtml(b.id)}" data-student-name="${safeName}" data-weekday="${escapeHtml(b.weekday)}" data-time="${escapeHtml(b.time)}" data-current-link="">Добавить ссылку на урок</button>`;
      actionHtml = `
        ${linkBtn}
        <button class="booking-card__action booking-card__action--danger" data-reject-request="${escapeHtml(b.id)}">Отменить</button>
        <button class="booking-card__action booking-card__action--remove" data-delete-request="${escapeHtml(b.id)}">✕ Удалить</button>
      `;
    } else if (b.status === 'rejected') {
      statusClass = 'rejected'; statusLabel = 'Отклонена'; statusEmoji = '❌';
      actionHtml = `<button class="booking-card__action booking-card__action--remove" data-delete-request="${escapeHtml(b.id)}">✕ Удалить</button>`;
    } else if (b.status === 'cancelled') {
      statusClass = 'cancelled'; statusLabel = 'Отменена'; statusEmoji = '✕';
      actionHtml = `<button class="booking-card__action booking-card__action--remove" data-delete-request="${escapeHtml(b.id)}">✕ Удалить</button>`;
    }

    return `
      <div class="booking-card">
        <div class="booking-card__head">
          <div class="booking-card__date">${escapeHtml(dateLabel)}</div>
          <div class="booking-card__info"><span class="booking-card__name">${safeName}</span></div>
        </div>
        <div class="booking-card__status booking-card__status--${statusClass}">${statusEmoji} ${statusLabel}</div>
        <div class="booking-card__actions">${actionHtml}</div>
      </div>
    `;
  }

  function updateStats(upcoming, done) {
    const u = document.querySelector('[data-stat="upcoming"]');
    const d = document.querySelector('[data-stat="done"]');
    if (u) u.textContent = upcoming;
    if (d) d.textContent = done;
  }

  async function approveRequest(id, weekday, time, studentId) {
    if (!confirm('Одобрить заявку? Место станет занятым.')) return;
    const { error: reqError } = await window.supabaseClient.from('booking_requests').update({ status: 'approved' }).eq('id', id);
    if (reqError) { alert('Ошибка: ' + reqError.message); return; }

    const { data: profile } = await window.supabaseClient.from('profiles').select('name').eq('id', studentId).single();
    const studentName = (profile && profile.name) || 'Ученик';

    await window.supabaseClient.from('schedule_template').upsert({
      teacher_id: currentUser.user.id, weekday, time,
      text_content: '', student_name: studentName, status: 'busy'
    }, { onConflict: 'teacher_id,weekday,time' });

    await Promise.all([loadRequests(), loadCells()]);
  }

  async function rejectRequest(id) {
    if (!confirm('Отклонить заявку?')) return;
    const { error } = await window.supabaseClient.from('booking_requests').update({ status: 'rejected' }).eq('id', id);
    if (error) { alert('Ошибка: ' + error.message); return; }
    await loadRequests();
  }

  async function deleteRequest(id) {
    if (!confirm('Удалить заявку навсегда?')) return;
    const { error } = await window.supabaseClient.from('booking_requests').delete().eq('id', id);
    if (error) { alert('Ошибка: ' + error.message); return; }
    bookingsAllRows = bookingsAllRows.filter(b => b.id !== id);
    renderBookingsList();
    updateStats(bookingsAllRows.filter(b => b.status === 'pending' || b.status === 'approved').length, bookingsAllRows.filter(b => b.status === 'approved' && isPast(b.weekday, b.time)).length);
  }

  function initRequestLinkModal() {
    const modal = document.querySelector('[data-modal="request-link"]');
    if (!modal) return;
    const saveBtn = modal.querySelector('[data-request-link-save]');
    const removeBtn = modal.querySelector('[data-request-link-remove]');
    const input = modal.querySelector('[data-request-link-input]');
    const errorEl = modal.querySelector('[data-request-link-error]');

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        errorEl.textContent = '';
        const url = input.value.trim();
        if (!url) { errorEl.textContent = 'Введите ссылку'; return; }
        if (!/^https:\/\/.+/i.test(url)) { errorEl.textContent = 'Ссылка должна начинаться с https://'; return; }

        saveBtn.disabled = true; saveBtn.textContent = 'Сохраняем…';
        const { error } = await window.supabaseClient.from('booking_requests').update({ meeting_link: url }).eq('id', currentRequestId);
        saveBtn.disabled = false; saveBtn.textContent = 'Сохранить';
        if (error) { errorEl.textContent = 'Ошибка: ' + error.message; return; }
        closeModal('request-link'); currentRequestId = null; await loadRequests();
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', async () => {
        if (!confirm('Удалить ссылку из этой заявки?')) return;
        removeBtn.disabled = true; removeBtn.textContent = 'Удаляем…';
        const { error } = await window.supabaseClient.from('booking_requests').update({ meeting_link: null }).eq('id', currentRequestId);
        removeBtn.disabled = false; removeBtn.textContent = 'Удалить ссылку';
        if (error) { errorEl.textContent = 'Ошибка: ' + error.message; return; }
        closeModal('request-link'); currentRequestId = null; await loadRequests();
      });
    }
  }

  function openRequestLinkModal(id, studentName, weekday, time, currentLink) {
    const modal = document.querySelector('[data-modal="request-link"]');
    if (!modal) return;
    currentRequestId = id;
    const studentEl = modal.querySelector('[data-request-link-student]');
    const timeEl = modal.querySelector('[data-request-link-time]');
    const input = modal.querySelector('[data-request-link-input]');
    const errorEl = modal.querySelector('[data-request-link-error]');
    const removeBtn = modal.querySelector('[data-request-link-remove]');
    const wd = parseInt(weekday, 10);
    if (studentEl) studentEl.textContent = studentName || 'Ученик';
    if (timeEl) timeEl.textContent = `${DAYS[wd] || '—'} · ${time || '—'}`;
    if (input) input.value = currentLink || '';
    if (errorEl) errorEl.textContent = '';
    if (removeBtn) removeBtn.hidden = !currentLink;
    openModal('request-link');
    setTimeout(() => input && input.focus(), 150);
  }

  document.addEventListener('DOMContentLoaded', init);
})();

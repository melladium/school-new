(function () {
  'use strict';

  let currentUser = null;
  let avatarFile = null;
  let portfolioFile = null;
  let portfolioFile2 = null;

  let currentRequestId = null;

  const DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

  const STATUS_LABELS = {
    free: 'Свободно',
    busy: 'Занято',
    off: 'Не работает'
  };

  const SUBJECT_LABELS = {
    math: 'Математика', russian: 'Русский', physics: 'Физика',
    chemistry: 'Химия', biology: 'Биология', it: 'Информатика',
    english: 'Английский', history: 'История', social: 'Обществознание',
    geography: 'География'
  };

  const SUBJECT_GOALS = {
    math: [
      { value: 'school',  label: 'Подтянуть школу' },
      { value: 'oge',     label: 'ОГЭ' },
      { value: 'ege',     label: 'ЕГЭ' },
      { value: 'olymp',   label: 'Олимпиады' },
      { value: 'vuz',     label: 'Подготовка к вузу' }
    ],
    russian: [
      { value: 'school',   label: 'Подтянуть школу' },
      { value: 'oge',      label: 'ОГЭ' },
      { value: 'ege',      label: 'ЕГЭ' },
      { value: 'essay',    label: 'Сочинение / изложение' },
      { value: 'literacy', label: 'Грамотность' }
    ],
    physics: [
      { value: 'school',  label: 'Подтянуть школу' },
      { value: 'oge',     label: 'ОГЭ' },
      { value: 'ege',     label: 'ЕГЭ' },
      { value: 'olymp',   label: 'Олимпиады' },
      { value: 'vuz',     label: 'Подготовка к вузу' }
    ],
    chemistry: [
      { value: 'school',  label: 'Подтянуть школу' },
      { value: 'oge',     label: 'ОГЭ' },
      { value: 'ege',     label: 'ЕГЭ' },
      { value: 'med',     label: 'Медвуз' },
      { value: 'olymp',   label: 'Олимпиады' }
    ],
    biology: [
      { value: 'school',  label: 'Подтянуть школу' },
      { value: 'oge',     label: 'ОГЭ' },
      { value: 'ege',     label: 'ЕГЭ' },
      { value: 'med',     label: 'Медвуз' },
      { value: 'olymp',   label: 'Олимпиады' }
    ],
    it: [
      { value: 'school',  label: 'Школьная информатика' },
      { value: 'oge',     label: 'ОГЭ' },
      { value: 'ege',     label: 'ЕГЭ' },
      { value: 'python',  label: 'Python' },
      { value: 'web',     label: 'Веб-разработка' },
      { value: 'olymp',   label: 'Олимпиады' }
    ],
    english: [
      { value: 'school',       label: 'Школьная программа' },
      { value: 'oge',          label: 'ОГЭ' },
      { value: 'ege',          label: 'ЕГЭ' },
      { value: 'conversation', label: 'Разговорный' },
      { value: 'business',     label: 'Бизнес-английский' },
      { value: 'ielts',        label: 'IELTS / TOEFL' }
    ],
    history: [
      { value: 'school',  label: 'Подтянуть школу' },
      { value: 'oge',     label: 'ОГЭ' },
      { value: 'ege',     label: 'ЕГЭ' },
      { value: 'olymp',   label: 'Олимпиады' },
      { value: 'vuz',     label: 'Подготовка к вузу' }
    ],
    social: [
      { value: 'school',  label: 'Подтянуть школу' },
      { value: 'oge',     label: 'ОГЭ' },
      { value: 'ege',     label: 'ЕГЭ' },
      { value: 'olymp',   label: 'Олимпиады' }
    ],
    geography: [
      { value: 'school',  label: 'Подтянуть школу' },
      { value: 'oge',     label: 'ОГЭ' },
      { value: 'ege',     label: 'ЕГЭ' },
      { value: 'olymp',   label: 'Олимпиады' }
    ]
  };

  let cellsMap = {};
  let editingKey = null;

  let personalMap = {};
  let personalEditingKey = null;

  let currentGoals = [];

  /* ─────────── УТИЛИТЫ ─────────── */

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isValidHttps(url) {
    if (!url) return true;
    return /^https:\/\/.+/i.test(url.trim());
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

  function isPast(weekday, time) {
    return cellDateTime(weekday, time).getTime() < Date.now();
  }

  function getSmartDefaults(existingKeys) {
    const now = new Date();
    let hour = now.getHours();
    const minutes = now.getMinutes();

    if (minutes > 30) hour += 1;

    let dayShift = 0;
    if (hour >= 22) {
      dayShift = 1;
      hour = 10;
    } else if (hour < 10) {
      hour = 10;
    }
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
    const orderedDays = [
      ...DAY_ORDER.slice(startIdx),
      ...DAY_ORDER.slice(0, startIdx)
    ];

    let bestDay = startDay;
    let bestCount = Infinity;
    orderedDays.forEach(d => {
      if (counts[d] < bestCount) {
        bestCount = counts[d];
        bestDay = d;
      }
    });

    const timeStr = String(hour).padStart(2, '0') + ':00';

    return { day: String(bestDay), time: timeStr };
  }

  /* ─────────── INIT ─────────── */

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

    const addBtn = document.querySelector('[data-add-cell]');
    if (addBtn) addBtn.addEventListener('click', () => openCellModal(null));

    const addPersonalBtn = document.querySelector('[data-add-personal-cell]');
    if (addPersonalBtn) addPersonalBtn.addEventListener('click', () => openPersonalCellModal(null));

    document.querySelectorAll('[data-open-profile]').forEach(btn => {
      btn.addEventListener('click', openProfileModal);
    });

    document.querySelectorAll('[data-open-preview]').forEach(btn => {
      btn.addEventListener('click', openPreview);
    });

    await Promise.all([
      loadProfile(),
      loadCells(),
      loadPersonal(),
      loadRequests()
    ]);
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
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const t = tab.dataset.tab;
        tabs.forEach(x => x.classList.toggle('is-active', x.dataset.tab === t));
        panels.forEach(p => p.classList.toggle('is-active', p.dataset.tabPanel === t));
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
    const modal = document.querySelector(`[data-modal="${name}"]`);
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal(name) {
    const modal = document.querySelector(`[data-modal="${name}"]`);
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  function openProfileModal() {
    openModal('profile');
  }

  /* ─────────── УВЕДОМЛЕНИЯ ─────────── */

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
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'только что';
    if (diff < 3600) return Math.floor(diff / 60) + ' мин назад';
    if (diff < 86400) return Math.floor(diff / 3600) + ' ч назад';
    return d.getDate() + '.' + (d.getMonth() + 1);
  }

  /* ─────────── ПРОФИЛЬ ─────────── */

  async function loadProfile() {
    const { data, error } = await window.supabaseClient
      .from('teachers')
      .select('subject, price, bio, phone, telegram, whatsapp, is_active, avatar_url, portfolio_url, portfolio_url_2, goals, rating, reviews_count')
      .eq('id', currentUser.user.id)
      .single();
    if (error || !data) return;

    currentGoals = Array.isArray(data.goals) ? data.goals.slice() : [];

    const initials = (currentUser.profile.name || 'Р').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const avatarPreview = document.querySelector('[data-avatar-preview]');
    if (avatarPreview) {
      if (data.avatar_url) avatarPreview.innerHTML = `<img src="${escapeHtml(data.avatar_url)}" style="width:100%;height:100%;object-fit:cover;" alt="">`;
      else avatarPreview.textContent = '👤';
    }

    const portfolioPreview = document.querySelector('[data-portfolio-preview]');
    if (portfolioPreview) {
      if (data.portfolio_url) portfolioPreview.innerHTML = `<img src="${escapeHtml(data.portfolio_url)}" style="width:100%;height:100%;object-fit:cover;" alt="">`;
      else portfolioPreview.textContent = '🖼';
    }

    const portfolioPreview2 = document.querySelector('[data-portfolio-preview-2]');
    if (portfolioPreview2) {
      if (data.portfolio_url_2) portfolioPreview2.innerHTML = `<img src="${escapeHtml(data.portfolio_url_2)}" style="width:100%;height:100%;object-fit:cover;" alt="">`;
      else portfolioPreview2.textContent = '🖼';
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

    const setVal = (sel, val) => {
      const el = document.querySelector(sel);
      if (el) el.value = val || '';
    };
    setVal('[data-edit-subject]', data.subject || 'math');
    setVal('[data-edit-price]', data.price || '');
    setVal('[data-edit-phone]', data.phone || '');
    setVal('[data-edit-telegram]', data.telegram || '');
    setVal('[data-edit-whatsapp]', data.whatsapp || '');
    setVal('[data-edit-bio]', data.bio || '');

    renderGoalsCheckboxes(data.subject || 'math', currentGoals);

    const previewModal = document.querySelector('[data-modal="preview"]');
    if (previewModal && !previewModal.hidden) {
      renderPreviewFromData(data);
    }
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
    const container = document.querySelector('[data-goals-list]');
    if (!container) return [];
    return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
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
      subjectSelect.addEventListener('change', () => {
        renderGoalsCheckboxes(subjectSelect.value, []);
      });
    }

    if (avatarButton && avatarInput) {
      avatarButton.addEventListener('click', () => avatarInput.click());
      avatarInput.addEventListener('change', () => {
        const file = avatarInput.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { alert('Фото слишком большое. Максимум 2 МБ.'); return; }
        avatarFile = file;
        const reader = new FileReader();
        reader.onload = (ev) => { if (avatarPreview) avatarPreview.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;" alt="">`; };
        reader.readAsDataURL(file);
      });
    }

    if (portfolioButton && portfolioInput) {
      portfolioButton.addEventListener('click', () => portfolioInput.click());
      portfolioInput.addEventListener('change', () => {
        const file = portfolioInput.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert('Фото слишком большое. Максимум 5 МБ.'); return; }
        portfolioFile = file;
        const reader = new FileReader();
        reader.onload = (ev) => { if (portfolioPreview) portfolioPreview.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;" alt="">`; };
        reader.readAsDataURL(file);
      });
    }

    if (portfolioButton2 && portfolioInput2) {
      portfolioButton2.addEventListener('click', () => portfolioInput2.click());
      portfolioInput2.addEventListener('change', () => {
        const file = portfolioInput2.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert('Фото слишком большое. Максимум 5 МБ.'); return; }
        portfolioFile2 = file;
        const reader = new FileReader();
        reader.onload = (ev) => { if (portfolioPreview2) portfolioPreview2.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;" alt="">`; };
        reader.readAsDataURL(file);
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (errorEl) errorEl.textContent = '';
        avatarFile = null;
        portfolioFile = null;
        portfolioFile2 = null;
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
        if (!confirm('Удалить аккаунт НАВСЕГДА? Все данные будут удалены. Это нельзя отменить.')) return;
        if (!confirm('Точно? Это последнее предупреждение.')) return;
        deleteBtn.disabled = true;
        deleteBtn.textContent = 'Удаляем…';
        const { error } = await window.supabaseClient.rpc('delete_user');
        if (error) {
          alert('Ошибка: ' + error.message);
          deleteBtn.disabled = false;
          deleteBtn.textContent = 'Удалить аккаунт навсегда';
          return;
        }
        alert('Аккаунт удалён. Сейчас вы выйдете.');
        await window.authAPI.signOut();
      });
    }
  }

  /* ─────────── ПРЕДПРОСМОТР ─────────── */

  async function openPreview() {
    openModal('preview');
    await loadPreview();
  }

  async function loadPreview() {
    const { data, error } = await window.supabaseClient
      .from('teachers')
      .select('subject, price, bio, phone, telegram, whatsapp, rating, reviews_count, avatar_url, portfolio_url, portfolio_url_2, goals')
      .eq('id', currentUser.user.id)
      .single();
    if (error || !data) return;

    renderPreviewFromData(data);
    await renderPreviewSchedule();
  }

  function renderPreviewFromData(data) {
    const initials = (currentUser.profile.name || 'Р').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const setText = (sel, val) => {
      const el = document.querySelector(sel);
      if (el) el.textContent = val || '—';
    };

    const avEl = document.querySelector('[data-preview-avatar]');
    if (avEl) {
      if (data.avatar_url) avEl.innerHTML = `<img src="${escapeHtml(data.avatar_url)}" style="width:100%;height:100%;object-fit:cover;" alt="">`;
      else avEl.textContent = initials;
    }

    setText('[data-preview-name]', currentUser.profile.name || 'Репетитор');
    setText('[data-preview-subject]', SUBJECT_LABELS[data.subject] || data.subject || '—');
    setText('[data-preview-price]', data.price ? data.price + ' ₽ / урок' : '—');
    setText('[data-preview-rating]', data.rating || '—');
    setText('[data-preview-reviews]', `· ${data.reviews_count || 0} отзывов`);

    const bioBlock = document.querySelector('[data-preview-bio-block]');
    const bioEl = document.querySelector('[data-preview-bio]');
    if (data.bio && bioEl) {
      bioEl.textContent = data.bio;
      if (bioBlock) bioBlock.hidden = false;
    } else if (bioBlock) {
      bioBlock.hidden = true;
    }

    const contactsBlock = document.querySelector('[data-preview-contacts-block]');
    const cTg = document.querySelector('[data-preview-contact="telegram"]');
    const cWa = document.querySelector('[data-preview-contact="whatsapp"]');
    const cPh = document.querySelector('[data-preview-contact="phone"]');

    let hasContacts = false;
    if (cTg) { cTg.hidden = !data.telegram; if (data.telegram) hasContacts = true; }
    if (cWa) { cWa.hidden = !data.whatsapp; if (data.whatsapp) hasContacts = true; }
    if (cPh) { cPh.hidden = !data.phone; if (data.phone) hasContacts = true; }
    if (contactsBlock) contactsBlock.hidden = !hasContacts;

    const portfolioBlock = document.querySelector('[data-preview-portfolio-block]');
    const pImg1 = document.querySelector('[data-preview-portfolio-image]');
    const pImg2 = document.querySelector('[data-preview-portfolio-image-2]');
    let hasPortfolio = false;
    if (pImg1) {
      if (data.portfolio_url) { pImg1.src = data.portfolio_url; pImg1.hidden = false; hasPortfolio = true; }
      else pImg1.hidden = true;
    }
    if (pImg2) {
      if (data.portfolio_url_2) { pImg2.src = data.portfolio_url_2; pImg2.hidden = false; hasPortfolio = true; }
      else pImg2.hidden = true;
    }
    if (portfolioBlock) portfolioBlock.hidden = !hasPortfolio;
  }

  async function renderPreviewSchedule() {
    const el = document.querySelector('[data-preview-schedule]');
    if (!el) return;

    const { data, error } = await window.supabaseClient
      .from('schedule_template')
      .select('weekday, time, status')
      .eq('teacher_id', currentUser.user.id)
      .order('weekday', { ascending: true })
      .order('time', { ascending: true });

    if (error) { el.innerHTML = '<div class="preview-schedule__loading">Ошибка загрузки</div>'; return; }
    if (!data || !data.length) { el.innerHTML = '<div class="preview-schedule__loading">Расписание пока пустое</div>'; return; }

    const map = {};
    data.forEach(item => { map[item.weekday + '|' + item.time] = { status: item.status || 'free', time: item.time }; });

    let maxRows = 1;
    DAY_ORDER.forEach(day => {
      const count = Object.keys(map).filter(k => k.startsWith(day + '|')).length;
      if (count > maxRows) maxRows = count;
    });

    let html = '';
    DAY_ORDER.forEach(day => {
      const dayCells = Object.keys(map)
        .filter(k => k.startsWith(day + '|'))
        .map(k => ({ key: k, ...map[k] }))
        .sort((a, b) => a.time.localeCompare(b.time));

      const cellsHtml = dayCells.length
        ? dayCells.map(c => `
            <div class="week-cell week-cell--${escapeHtml(c.status)} week-cell--preview">
              <div class="week-cell__time">${escapeHtml(c.time)}</div>
              <div class="week-cell__status">${escapeHtml(STATUS_LABELS[c.status] || c.status)}</div>
            </div>
          `).join('')
        : '<div class="week-day__empty">—</div>';

      html += `
        <div class="week-day">
          <div class="week-day__head">${DAYS[day]}</div>
          <div class="week-day__body" style="--week-rows:${maxRows}">${cellsHtml}</div>
        </div>
      `;
    });

    el.innerHTML = `<div class="week-board">${html}</div>`;
  }

  document.addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-preview-edit]');
    if (editBtn) {
      closeModal('preview');
      openProfileModal();
    }
  });

  /* ─────────── ПУБЛИЧНОЕ РАСПИСАНИЕ ─────────── */

  async function loadCells() {
    const board = document.querySelector('[data-week-board]');
    if (!board) return;
    const { data, error } = await window.supabaseClient
      .from('schedule_template')
      .select('id, weekday, time, text_content, status')
      .eq('teacher_id', currentUser.user.id)
      .order('weekday', { ascending: true })
      .order('time', { ascending: true });
    if (error) { board.innerHTML = '<div class="week-board__loading">Ошибка: ' + escapeHtml(error.message) + '</div>'; return; }

    cellsMap = {};
    (data || []).forEach(item => {
      const key = item.weekday + '|' + item.time;
      cellsMap[key] = { id: item.id, status: item.status || 'free', note: item.text_content || '' };
    });
    renderWeekBoard();
  }

  function renderWeek

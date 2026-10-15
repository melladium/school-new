(function () {
  'use strict';

  let currentUser = null;
  let avatarFile = null;
  let portfolioFile = null;
  let portfolioFile2 = null;

  const DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

  const STATUS_LABELS = {
    free: 'Свободно',
    busy: 'Занято',
    off: 'Не работает'
  };

  const SUBJECT_LABELS = {
    math: 'Математика', english: 'Английский', physics: 'Физика',
    russian: 'Русский', chemistry: 'Химия', it: 'Информатика'
  };

  let cellsMap = {};
  let editingKey = null;

  let personalMap = {};
  let personalEditingKey = null;

  /* ─────────── ДАТА/ВРЕМЯ ─────────── */

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

    const addBtn = document.querySelector('[data-add-cell]');
    if (addBtn) addBtn.addEventListener('click', () => openCellModal(null));

    const addPersonalBtn = document.querySelector('[data-add-personal-cell]');
    if (addPersonalBtn) addPersonalBtn.addEventListener('click', () => openPersonalCellModal(null));

    document.querySelectorAll('[data-open-profile]').forEach(btn => {
      btn.addEventListener('click', openProfileModal);
    });

    const previewLink = document.querySelector('[data-preview-link]');
    if (previewLink) {
      previewLink.href = 'teacher.html?id=' + currentUser.user.id + '&preview=1';
    }

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

  /* ─────────── МОДАЛКИ (общее закрытие) ─────────── */

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
      <div class="notif-item ${n.read ? '' : 'is-unread'}" data-notif-id="${n.id}" data-link="${n.link || ''}">
        <span class="notif-item__text">${n.text}</span>
        <span class="notif-item__time">${formatTime(n.created_at)}</span>
        <button class="notif-item__del" data-notif-del="${n.id}" title="Удалить">✕</button>
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
      .select('subject, price, bio, phone, telegram, whatsapp, meeting_link, is_active, avatar_url, portfolio_url, portfolio_url_2')
      .eq('id', currentUser.user.id)
      .single();
    if (error || !data) return;

    const initials = (currentUser.profile.name || 'Р').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const avatarPreview = document.querySelector('[data-avatar-preview]');
    if (avatarPreview) {
      if (data.avatar_url) avatarPreview.innerHTML = `<img src="${data.avatar_url}" style="width:100%;height:100%;object-fit:cover;" alt="">`;
      else avatarPreview.textContent = '👤';
    }

    const portfolioPreview = document.querySelector('[data-portfolio-preview]');
    if (portfolioPreview) {
      if (data.portfolio_url) portfolioPreview.innerHTML = `<img src="${data.portfolio_url}" style="width:100%;height:100%;object-fit:cover;" alt="">`;
      else portfolioPreview.textContent = '🖼';
    }

    const portfolioPreview2 = document.querySelector('[data-portfolio-preview-2]');
    if (portfolioPreview2) {
      if (data.portfolio_url_2) portfolioPreview2.innerHTML = `<img src="${data.portfolio_url_2}" style="width:100%;height:100%;object-fit:cover;" alt="">`;
      else portfolioPreview2.textContent = '🖼';
    }

    const navAvatar = document.querySelector('[data-user-avatar]');
    if (navAvatar) {
      if (data.avatar_url) navAvatar.innerHTML = `<img src="${data.avatar_url}" alt="">`;
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
    setVal('[data-edit-link]', data.meeting_link || '');
    setVal('[data-edit-bio]', data.bio || '');
  }

  function initProfileSection() {
    const saveBtn = document.querySelector('[data-profile-save]');
    const cancelBtn = document.querySelector('[data-profile-cancel]');
    const errorEl = document.querySelector('[data-profile-error]');
    const visibilityBtn = document.querySelector('[data-toggle-visibility]');
    const deleteBtn = document.querySelector('[data-delete-account]');

    const avatarInput = document.querySelector('[data-avatar-input]');
    const avatarButton = document.querySelector('[data-avatar-button]');
    const avatarPreview = document.querySelector('[data-avatar-preview]');

    const portfolioInput = document.querySelector('[data-portfolio-input]');
    const portfolioButton = document.querySelector('[data-portfolio-button]');
    const portfolioPreview = document.querySelector('[data-portfolio-preview]');

    const portfolioInput2 = document.querySelector('[data-portfolio-input-2]');
    const portfolioButton2 = document.querySelector('[data-portfolio-button-2]');
    const portfolioPreview2 = document.querySelector('[data-portfolio-preview-2]');

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
            price: parseInt(document.querySelector('[data-edit-price]').value, 10) || 0,
            phone: document.querySelector('[data-edit-phone]').value.trim(),
            telegram: document.querySelector('[data-edit-telegram]').value.trim(),
            whatsapp: document.querySelector('[data-edit-whatsapp]').value.trim(),
            meeting_link: document.querySelector('[data-edit-link]').value.trim(),
            bio: document.querySelector('[data-edit-bio]').value.trim()
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
    if (error) { board.innerHTML = '<div class="week-board__loading">Ошибка: ' + error.message + '</div>'; return; }

    cellsMap = {};
    (data || []).forEach(item => {
      const key = item.weekday + '|' + item.time;
      cellsMap[key] = { id: item.id, status: item.status || 'free', note: item.text_content || '' };
    });
    renderWeekBoard();
  }

  function renderWeekBoard() {
    const board = document.querySelector('[data-week-board]');
    if (!board) return;
    let html = '';
    DAY_ORDER.forEach(day => {
      const dayCells = Object.keys(cellsMap)
        .filter(key => key.startsWith(day + '|'))
        .map(key => ({ key, ...cellsMap[key] }))
        .sort((a, b) => a.key.localeCompare(b.key));
      html += `
        <div class="week-day">
          <div class="week-day__head">${DAYS[day]}</div>
          <div class="week-day__body">
            ${dayCells.length ? dayCells.map(c => renderCell(day, c)).join('') : '<div class="week-day__empty">Нет ячеек</div>'}
          </div>
        </div>
      `;
    });
    board.innerHTML = html;
    board.querySelectorAll('[data-cell-key]').forEach(el => {
      el.addEventListener('click', () => openCellModal(el.dataset.cellKey));
    });
  }

  function renderCell(day, cell) {
    const time = cell.key.split('|')[1];
    const statusClass = 'week-cell--' + cell.status;
    const statusLabel = STATUS_LABELS[cell.status] || cell.status;
    return `
      <div class="week-cell ${statusClass}" data-cell-key="${cell.key}">
        <div class="week-cell__time">${time}</div>
        <div class="week-cell__status">${statusLabel}</div>
        ${cell.note ? `<div class="week-cell__note">${cell.note}</div>` : ''}
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
    const noteInput = modal.querySelector('[data-cell-note]');

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const errorEl = modal.querySelector('[data-cell-error]');
        errorEl.textContent = '';
        const day = parseInt(daySelect.value, 10);
        const time = timeInput.value.trim();
        const status = statusSelect.value;
        const note = noteInput.value.trim();
        if (!time) { errorEl.textContent = 'Укажите время'; return; }
        saveBtn.disabled = true;
        saveBtn.textContent = 'Сохраняем…';

        if (editingKey) {
          const [oldDay, oldTime] = editingKey.split('|');
          await window.supabaseClient.from('schedule_template').delete()
            .eq('teacher_id', currentUser.user.id)
            .eq('weekday', parseInt(oldDay, 10))
            .eq('time', oldTime);
        }

        const { error } = await window.supabaseClient.from('schedule_template').upsert({
          teacher_id: currentUser.user.id, weekday: day, time, text_content: note, status
        }, { onConflict: 'teacher_id,weekday,time' });

        saveBtn.disabled = false;
        saveBtn.textContent = 'Сохранить';
        if (error) { errorEl.textContent = 'Ошибка: ' + error.message; return; }
        closeModal('cell-edit');
        editingKey = null;
        await loadCells();
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (!editingKey) return;
        if (!confirm('Удалить эту ячейку?')) return;
        const [oldDay, oldTime] = editingKey.split('|');
        await window.supabaseClient.from('schedule_template').delete()
          .eq('teacher_id', currentUser.user.id)
          .eq('weekday', parseInt(oldDay, 10))
          .eq('time', oldTime);
        closeModal('cell-edit');
        editingKey = null;
        await loadCells();
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
    const noteInput = modal.querySelector('[data-cell-note]');
    const deleteBtn = modal.querySelector('[data-cell-delete]');
    const errorEl = modal.querySelector('[data-cell-error]');

    errorEl.textContent = '';

    if (key) {
      editingKey = key;
      const [day, time] = key.split('|');
      const cell = cellsMap[key] || {};
      if (title) title.textContent = 'Редактировать ячейку';
      daySelect.value = day;
      timeInput.value = time;
      statusSelect.value = cell.status || 'free';
      noteInput.value = cell.note || '';
      if (deleteBtn) deleteBtn.hidden = false;
    } else {
      editingKey = null;
      if (title) title.textContent = 'Новая ячейка';
      daySelect.value = '1';
      timeInput.value = '18:00';
      statusSelect.value = 'free';
      noteInput.value = '';
      if (deleteBtn) deleteBtn.hidden = true;
    }

    openModal('cell-edit');
    setTimeout(() => timeInput && timeInput.focus(), 150);
  }

  /* ─────────── ЛИЧНОЕ РАСПИСАНИЕ ─────────── */

  async function loadPersonal() {
    personalMap = {};
    const { data, error } = await window.supabaseClient
      .from('personal_schedule')
      .select('id, weekday, time, text_content')
      .eq('teacher_id', currentUser.user.id)
      .order('weekday', { ascending: true })
      .order('time', { ascending: true });
    if (error) return;
    (data || []).forEach(item => {
      const key = item.weekday + '|' + item.time;
      personalMap[key] = { id: item.id, note: item.text_content || '' };
    });
    renderPersonalBoard();
  }

  function renderPersonalBoard() {
    const board = document.querySelector('[data-personal-board]');
    if (!board) return;
    let html = '';
    DAY_ORDER.forEach(day => {
      const dayCells = Object.keys(personalMap)
        .filter(key => key.startsWith(day + '|'))
        .map(key => ({ key, ...personalMap[key] }))
        .sort((a, b) => a.key.localeCompare(b.key));
      html += `
        <div class="week-day">
          <div class="week-day__head">${DAYS[day]}</div>
          <div class="week-day__body">
            ${dayCells.length ? dayCells.map(c => renderPersonalCell(day, c)).join('') : '<div class="week-day__empty">Нет ячеек</div>'}
          </div>
        </div>
      `;
    });
    board.innerHTML = html;
    board.querySelectorAll('[data-personal-cell-key]').forEach(el => {
      el.addEventListener('click', () => openPersonalCellModal(el.dataset.personalCellKey));
    });
  }

  function renderPersonalCell(day, cell) {
    const time = cell.key.split('|')[1];
    return `
      <div class="week-cell week-cell--personal" data-personal-cell-key="${cell.key}">
        <div class="week-cell__time">${time}</div>
        ${cell.note ? `<div class="week-cell__note">${cell.note}</div>` : ''}
      </div>
    `;
  }

  function initPersonalCellModal() {
    const modal = document.querySelector('[data-modal="personal-cell-edit"]');
    if (!modal) return;

    const saveBtn = modal.querySelector('[data-personal-cell-save]');
    const deleteBtn = modal.querySelector('[data-personal-cell-delete]');
    const daySelect = modal.querySelector('[data-personal-cell-day]');
    const timeInput = modal.querySelector('[data-personal-cell-time]');
    const textInput = modal.querySelector('[data-personal-cell-text]');

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const errorEl = modal.querySelector('[data-personal-cell-error]');
        errorEl.textContent = '';
        const day = parseInt(daySelect.value, 10);
        const time = timeInput.value.trim();
        const text = textInput.value.trim();
        if (!time) { errorEl.textContent = 'Укажите время'; return; }
        saveBtn.disabled = true;
        saveBtn.textContent = 'Сохраняем…';

        if (personalEditingKey) {
          const [oldDay, oldTime] = personalEditingKey.split('|');
          await window.supabaseClient.from('personal_schedule').delete()
            .eq('teacher_id', currentUser.user.id)
            .eq('weekday', parseInt(oldDay, 10))
            .eq('time', oldTime);
        }

        const { error } = await window.supabaseClient.from('personal_schedule').upsert({
          teacher_id: currentUser.user.id, weekday: day, time, text_content: text
        }, { onConflict: 'teacher_id,weekday,time' });

        saveBtn.disabled = false;
        saveBtn.textContent = 'Сохранить';
        if (error) { errorEl.textContent = 'Ошибка: ' + error.message; return; }
        closeModal('personal-cell-edit');
        personalEditingKey = null;
        await loadPersonal();
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (!personalEditingKey) return;
        if (!confirm('Удалить эту ячейку?')) return;
        const [oldDay, oldTime] = personalEditingKey.split('|');
        await window.supabaseClient.from('personal_schedule').delete()
          .eq('teacher_id', currentUser.user.id)
          .eq('weekday', parseInt(oldDay, 10))
          .eq('time', oldTime);
        closeModal('personal-cell-edit');
        personalEditingKey = null;
        await loadPersonal();
      });
    }
  }

  function openPersonalCellModal(key) {
    const modal = document.querySelector('[data-modal="personal-cell-edit"]');
    if (!modal) return;
    const title = modal.querySelector('[data-personal-cell-title]');
    const daySelect = modal.querySelector('[data-personal-cell-day]');
    const timeInput = modal.querySelector('[data-personal-cell-time]');
    const textInput = modal.querySelector('[data-personal-cell-text]');
    const deleteBtn = modal.querySelector('[data-personal-cell-delete]');
    const errorEl = modal.querySelector('[data-personal-cell-error]');

    errorEl.textContent = '';

    if (key) {
      personalEditingKey = key;
      const [day, time] = key.split('|');
      const cell = personalMap[key] || {};
      if (title) title.textContent = 'Редактировать ячейку';
      daySelect.value = day;
      timeInput.value = time;
      textInput.value = cell.note || '';
      if (deleteBtn) deleteBtn.hidden = false;
    } else {
      personalEditingKey = null;
      if (title) title.textContent = 'Новая ячейка';
      daySelect.value = '1';
      timeInput.value = '18:00';
      textInput.value = '';
      if (deleteBtn) deleteBtn.hidden = true;
    }

    openModal('personal-cell-edit');
    setTimeout(() => timeInput && timeInput.focus(), 150);
  }

  /* ─────────── ЗАЯВКИ ─────────── */

  async function loadRequests() {
    const listEl = document.querySelector('[data-bookings-list]');
    if (!listEl) return;

    listEl.innerHTML = '<div class="cabinet__loading">Загружаем…</div>';

    const { data, error } = await window.supabaseClient
      .from('booking_requests')
      .select('id, status, weekday, time, student_id, created_at')
      .eq('teacher_id', currentUser.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      listEl.innerHTML = '<div class="cabinet__empty"><div class="cabinet__empty-title">Ошибка</div><div class="cabinet__empty-desc">' + error.message + '</div></div>';
      updateStats(0, 0);
      return;
    }

    if (!data || !data.length) {
      listEl.innerHTML = `
        <div class="cabinet__empty">
          <div class="cabinet__empty-icon">📩</div>
          <div class="cabinet__empty-title">Заявок пока нет</div>
          <div class="cabinet__empty-desc">Когда ученик попросит место — заявка появится здесь</div>
        </div>
      `;
      updateStats(0, 0);
      return;
    }

    const studentIds = [...new Set(data.map(b => b.student_id).filter(Boolean))];
    const { data: profiles } = studentIds.length
      ? await window.supabaseClient.from('profiles').select('id, name, email').in('id', studentIds)
      : { data: [] };

    const studentsMap = {};
    (profiles || []).forEach(p => studentsMap[p.id] = p);

    const upcoming = [];
    const done = [];

    const rows = data.map(b => {
      const s = studentsMap[b.student_id] || {};
      const item = { ...b, studentName: s.name || s.email || 'Ученик' };
      if (b.status === 'approved' && isPast(b.weekday, b.time)) done.push(item);
      else if (b.status === 'pending' || b.status === 'approved') upcoming.push(item);
      return item;
    });

    listEl.innerHTML = rows.map(b => renderBookingCard(b)).join('');

    listEl.querySelectorAll('[data-approve-request]').forEach(btn => {
      btn.addEventListener('click', () => approveRequest(
        btn.dataset.approveRequest,
        parseInt(btn.dataset.weekday, 10),
        btn.dataset.time,
        btn.dataset.student
      ));
    });
    listEl.querySelectorAll('[data-reject-request]').forEach(btn => {
      btn.addEventListener('click', () => rejectRequest(btn.dataset.rejectRequest));
    });
    listEl.querySelectorAll('[data-delete-request]').forEach(btn => {
      btn.addEventListener('click', () => deleteRequest(btn.dataset.deleteRequest));
    });

    updateStats(upcoming.length, done.length);
  }

  function renderBookingCard(b) {
    const dateLabel = `${DAYS[b.weekday]} · ${b.time}`;
    let statusClass, statusLabel, statusEmoji, actionHtml = '';

    if (b.status === 'pending') {
      statusClass = 'pending'; statusLabel = 'Ожидает'; statusEmoji = '⏳';
      actionHtml = `
        <button class="booking-card__action booking-card__action--primary" data-approve-request="${b.id}" data-weekday="${b.weekday}" data-time="${b.time}" data-student="${b.student_id}">Одобрить</button>
        <button class="booking-card__action booking-card__action--danger" data-reject-request="${b.id}">Отклонить</button>
        <button class="booking-card__action booking-card__action--remove" data-delete-request="${b.id}">✕ Удалить</button>
      `;
    } else if (b.status === 'approved') {
      statusClass = 'approved'; statusLabel = 'Одобрена'; statusEmoji = '✅';
      actionHtml = `
        <button class="booking-card__action booking-card__action--danger" data-reject-request="${b.id}">Отменить</button>
        <button class="booking-card__action booking-card__action--remove" data-delete-request="${b.id}">✕ Удалить</button>
      `;
    } else if (b.status === 'rejected') {
      statusClass = 'rejected'; statusLabel = 'Отклонена'; statusEmoji = '❌';
      actionHtml = `<button class="booking-card__action booking-card__action--remove" data-delete-request="${b.id}">✕ Удалить</button>`;
    } else if (b.status === 'cancelled') {
      statusClass = 'cancelled'; statusLabel = 'Отменена'; statusEmoji = '✕';
      actionHtml = `<button class="booking-card__action booking-card__action--remove" data-delete-request="${b.id}">✕ Удалить</button>`;
    }

    return `
      <div class="booking-card">
        <div class="booking-card__head">
          <div class="booking-card__date">${dateLabel}</div>
          <div class="booking-card__info"><span class="booking-card__name">${b.studentName}</span></div>
        </div>
        <div class="booking-card__status booking-card__status--${statusClass}">${statusEmoji} ${statusLabel}</div>
        <div class="booking-card__actions">${actionHtml}</div>
      </div>
    `;
  }

  function updateStats(upcoming, done) {
    const uEl = document.querySelector('[data-stat="upcoming"]');
    const dEl = document.querySelector('[data-stat="done"]');
    if (uEl) uEl.textContent = upcoming;
    if (dEl) dEl.textContent = done;
  }

  async function approveRequest(id, weekday, time, studentId) {
    if (!confirm('Одобрить заявку? Место станет занятым.')) return;

    const { error: reqError } = await window.supabaseClient
      .from('booking_requests').update({ status: 'approved' }).eq('id', id);
    if (reqError) { alert('Ошибка: ' + reqError.message); return; }

    const { data: profile } = await window.supabaseClient
      .from('profiles').select('name').eq('id', studentId).single();
    const studentName = (profile && profile.name) || 'Ученик';

    await window.supabaseClient.from('schedule_template').upsert({
      teacher_id: currentUser.user.id, weekday, time, text_content: studentName, status: 'busy'
    }, { onConflict: 'teacher_id,weekday,time' });

    await Promise.all([loadRequests(), loadCells()]);
  }

  async function rejectRequest(id) {
    if (!confirm('Отклонить заявку?')) return;
    const { error } = await window.supabaseClient
      .from('booking_requests').update({ status: 'rejected' }).eq('id', id);
    if (error) { alert('Ошибка: ' + error.message); return; }
    await loadRequests();
  }

  async function deleteRequest(id) {
    if (!confirm('Удалить заявку навсегда?')) return;
    const { error } = await window.supabaseClient
      .from('booking_requests').delete().eq('id', id);
    if (error) { alert('Ошибка: ' + error.message); return; }
    await loadRequests();
  }

  document.addEventListener('DOMContentLoaded', init);
})();

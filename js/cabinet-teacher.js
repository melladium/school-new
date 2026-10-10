(function () {
  'use strict';

  let currentUser = null;
  let avatarFile = null;
  let portfolioFile = null;

  const DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
  const HOURS = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];

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

  async function init() {
    currentUser = await window.authAPI.requireAuth('teacher');
    if (!currentUser) return;

    const nameEl = document.querySelector('[data-user-name]');
    if (nameEl) nameEl.textContent = currentUser.profile.name || currentUser.profile.email;

    const logoutBtn = document.querySelector('[data-logout]');
    if (logoutBtn) logoutBtn.addEventListener('click', window.authAPI.signOut);

    initProfileSection();
    initNotifications();
    initCellModal();
    initPersonalBoard();

    const addBtn = document.querySelector('[data-add-cell]');
    if (addBtn) addBtn.addEventListener('click', () => openCellModal(null));

    await Promise.all([
      loadProfile(),
      loadCells(),
      loadRequests(),
      loadRating()
    ]);
  }

  /* УВЕДОМЛЕНИЯ */
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
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUser.user.id)
      .eq('read', false);

    if (count && count > 0) {
      countEl.textContent = count;
      countEl.hidden = false;
    } else {
      countEl.hidden = true;
    }
  }

  async function renderNotifications() {
    const panel = document.querySelector('[data-notif-panel]');
    if (!panel) return;

    const { data } = await window.supabaseClient
      .from('notifications')
      .select('id, text, link, read, created_at')
      .eq('user_id', currentUser.user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!data || !data.length) {
      panel.innerHTML = '<div class="notif-empty">Пока нет уведомлений</div>';
      return;
    }

    panel.innerHTML = data.map(n => `
      <div class="notif-item ${n.read ? '' : 'is-unread'}" data-notif-id="${n.id}" data-link="${n.link}">
        ${n.text}
        <span class="notif-item__time">${formatTime(n.created_at)}</span>
      </div>
    `).join('');

    panel.querySelectorAll('[data-notif-id]').forEach(item => {
      item.addEventListener('click', async () => {
        await window.supabaseClient
          .from('notifications')
          .update({ read: true })
          .eq('id', item.dataset.notifId);

        if (item.dataset.link) window.location.href = item.dataset.link;
        else await renderNotifications();
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

  /* ПРОФИЛЬ */
  async function loadProfile() {
    const { data, error } = await window.supabaseClient
      .from('teachers')
      .select('subject, price, bio, phone, telegram, whatsapp, meeting_link, is_active, avatar_url, portfolio_url')
      .eq('id', currentUser.user.id)
      .single();

    if (error || !data) return;

    const setText = (sel, val) => {
      const el = document.querySelector(sel);
      if (el) el.textContent = val || '—';
    };

    setText('[data-profile-name]', currentUser.profile.name || currentUser.profile.email);
    setText('[data-profile-email]', currentUser.profile.email);
    setText('[data-profile-subject]', SUBJECT_LABELS[data.subject] || data.subject);
    setText('[data-profile-price]', data.price ? data.price + ' ₽' : '—');
    setText('[data-profile-phone]', data.phone);
    setText('[data-profile-telegram]', data.telegram);
    setText('[data-profile-whatsapp]', data.whatsapp);
    setText('[data-profile-link]', data.meeting_link);
    setText('[data-profile-bio]', data.bio || 'Информация пока не заполнена');

    const initials = (currentUser.profile.name || 'Р').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const avatarEl = document.querySelector('[data-profile-avatar]');
    if (avatarEl) {
      if (data.avatar_url) {
        avatarEl.innerHTML = `<img src="${data.avatar_url}" style="width:100%;height:100%;object-fit:cover;" alt="">`;
      } else {
        avatarEl.textContent = initials;
      }
    }

    const navAvatar = document.querySelector('[data-user-avatar]');
    if (navAvatar) {
      if (data.avatar_url) {
        navAvatar.innerHTML = `<img src="${data.avatar_url}" alt="">`;
      } else {
        navAvatar.textContent = initials;
      }
    }

    const previewEl = document.querySelector('[data-avatar-preview]');
    if (previewEl) {
      if (data.avatar_url) {
        previewEl.innerHTML = `<img src="${data.avatar_url}" style="width:100%;height:100%;object-fit:cover;" alt="">`;
      } else {
        previewEl.textContent = '👤';
      }
    }

    const portfolioPreview = document.querySelector('[data-portfolio-preview]');
    if (portfolioPreview) {
      if (data.portfolio_url) {
        portfolioPreview.innerHTML = `<img src="${data.portfolio_url}" style="width:100%;height:100%;object-fit:cover;" alt="">`;
      } else {
        portfolioPreview.textContent = '🖼';
      }
    }

    const toggleBtn = document.querySelector('[data-toggle-visibility]');
    if (toggleBtn) {
      if (data.is_active === false) {
        toggleBtn.textContent = 'Показать анкету';
        toggleBtn.dataset.active = 'false';
      } else {
        toggleBtn.textContent = 'Скрыть анкету';
        toggleBtn.dataset.active = 'true';
      }
    }

    document.querySelector('[data-edit-subject]').value = data.subject || 'math';
    document.querySelector('[data-edit-price]').value = data.price || '';
    document.querySelector('[data-edit-phone]').value = data.phone || '';
    document.querySelector('[data-edit-telegram]').value = data.telegram || '';
    document.querySelector('[data-edit-whatsapp]').value = data.whatsapp || '';
    document.querySelector('[data-edit-link]').value = data.meeting_link || '';
    document.querySelector('[data-edit-bio]').value = data.bio || '';
  }

  function initProfileSection() {
    const viewEl = document.querySelector('[data-profile-view]');
    const editEl = document.querySelector('[data-profile-edit]');
    const toggleBtn = document.querySelector('[data-toggle-profile]');
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

    if (avatarButton && avatarInput) {
      avatarButton.addEventListener('click', () => avatarInput.click());
      avatarInput.addEventListener('change', () => {
        const file = avatarInput.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
          alert('Фото слишком большое. Максимум 2 МБ.');
          return;
        }
        avatarFile = file;
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (avatarPreview) avatarPreview.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;" alt="">`;
        };
        reader.readAsDataURL(file);
      });
    }

    if (portfolioButton && portfolioInput) {
      portfolioButton.addEventListener('click', () => portfolioInput.click());
      portfolioInput.addEventListener('change', () => {
        const file = portfolioInput.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
          alert('Фото слишком большое. Максимум 5 МБ.');
          return;
        }
        portfolioFile = file;
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (portfolioPreview) portfolioPreview.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;" alt="">`;
        };
        reader.readAsDataURL(file);
      });
    }

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        viewEl.hidden = true;
        editEl.hidden = false;
        toggleBtn.hidden = true;
        editEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        viewEl.hidden = false;
        editEl.hidden = true;
        toggleBtn.hidden = false;
        errorEl.textContent = '';
        avatarFile = null;
        portfolioFile = null;
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        errorEl.textContent = '';
        saveBtn.disabled = true;
        saveBtn.textContent = 'Сохраняем…';

        let avatar_url = undefined;
        let portfolio_url = undefined;

        if (avatarFile) {
          const ext = avatarFile.name.split('.').pop();
          const path = `${currentUser.user.id}/avatar.${ext}`;
          const { error: uploadError } = await window.supabaseClient.storage
            .from('avatars')
            .upload(path, avatarFile, { upsert: true });

          if (uploadError) {
            errorEl.textContent = 'Ошибка загрузки аватара: ' + uploadError.message;
            saveBtn.disabled = false;
            saveBtn.textContent = 'Сохранить';
            return;
          }

          const { data: urlData } = window.supabaseClient.storage.from('avatars').getPublicUrl(path);
          avatar_url = urlData.publicUrl + '?t=' + Date.now();
        }

        if (portfolioFile) {
          const ext = portfolioFile.name.split('.').pop();
          const path = `${currentUser.user.id}/portfolio.${ext}`;
          const { error: uploadError } = await window.supabaseClient.storage
            .from('avatars')
            .upload(path, portfolioFile, { upsert: true });

          if (uploadError) {
            errorEl.textContent = 'Ошибка загрузки портфолио: ' + uploadError.message;
            saveBtn.disabled = false;
            saveBtn.textContent = 'Сохранить';
            return;
          }

          const { data: urlData } = window.supabaseClient.storage.from('avatars').getPublicUrl(path);
          portfolio_url = urlData.publicUrl + '?t=' + Date.now();
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

        const { error } = await window.supabaseClient
          .from('teachers')
          .update(payload)
          .eq('id', currentUser.user.id);

        saveBtn.disabled = false;
        saveBtn.textContent = 'Сохранить';

        if (error) {
          errorEl.textContent = 'Ошибка: ' + error.message;
          return;
        }

        avatarFile = null;
        portfolioFile = null;
        await loadProfile();
        viewEl.hidden = false;
        editEl.hidden = true;
        toggleBtn.hidden = false;
      });
    }

    if (visibilityBtn) {
      visibilityBtn.addEventListener('click', async () => {
        const isActive = visibilityBtn.dataset.active === 'true';

        if (isActive) {
          if (!confirm('Скрыть анкету? Вас перестанут показывать в автоподборе.')) return;
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
        if (!confirm('Т

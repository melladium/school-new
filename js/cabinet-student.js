(function () {
  'use strict';

  let currentUser = null;
  let avatarFile = null;
  let portfolioFile = null;

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
        if (!confirm('Точно? Это последнее предупреждение.')) return;

        deleteBtn.disabled = true;
        deleteBtn.textContent = 'Удаляем…';

        const { error } = await window.supabaseClient.rpc('delete_user');

        if (error) {
          alert('Ошибка удаления: ' + error.message);
          deleteBtn.disabled = false;
          deleteBtn.textContent = 'Удалить аккаунт навсегда';
          return;
        }

        alert('Аккаунт удалён. Сейчас вы выйдете.');
        await window.authAPI.signOut();
      });
    }
  }

  /* ЯЧЕЙКИ РАСПИСАНИЯ */
  async function loadCells() {
    const board = document.querySelector('[data-week-board]');
    if (!board) return;

    const { data, error } = await window.supabaseClient
      .from('schedule_template')
      .select('id, weekday, time, text_content, status')
      .eq('teacher_id', currentUser.user.id)
      .order('weekday', { ascending: true })
      .order('time', { ascending: true });

    if (error) {
      board.innerHTML = '<div class="week-board__loading">Ошибка: ' + error.message + '</div>';
      return;
    }

    cellsMap = {};
    (data || []).forEach(item => {
      const key = item.weekday + '|' + item.time;
      cellsMap[key] = {
        id: item.id,
        status: item.status || 'free',
        note: item.text_content || ''
      };
    });

    renderWeekBoard();
    updateSlotsStat(data ? data.length : 0);
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
            ${dayCells.length
              ? dayCells.map(c => renderCell(day, c)).join('')
              : '<div class="week-day__empty">Нет ячеек</div>'
            }
          </div>
        </div>
      `;
    });

    board.innerHTML = html;

    board.querySelectorAll('[data-cell-key]').forEach(el => {
      el.addEventListener('click', () => {
        openCellModal(el.dataset.cellKey);
      });
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

  function updateSlotsStat(n) {
    const el = document.querySelector('[data-stat="slots"]');
    if (el) el.textContent = n;
  }

  /* МОДАЛКА ЯЧЕЙКИ */
  function initCellModal() {
    const modal = document.querySelector('[data-modal="cell-edit"]');
    if (!modal) return;

    modal.querySelectorAll('[data-modal-close]').forEach(el => {
      el.addEventListener('click', () => {
        modal.hidden = true;
        document.body.style.overflow = '';
      });
    });

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

        if (!time) {
          errorEl.textContent = 'Укажите время';
          return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = 'Сохраняем…';

        // Если редактируется — сначала удалим старое
        if (editingKey) {
          const [oldDay, oldTime] = editingKey.split('|');
          await window.supabaseClient
            .from('schedule_template')
            .delete()
            .eq('teacher_id', currentUser.user.id)
            .eq('weekday', parseInt(oldDay, 10))
            .eq('time', oldTime);
        }

        const { error } = await window.supabaseClient
          .from('schedule_template')
          .upsert({
            teacher_id: currentUser.user.id,
            weekday: day,
            time: time,
            text_content: note,
            status: status
          }, { onConflict: 'teacher_id,weekday,time' });

        saveBtn.disabled = false;
        saveBtn.textContent = 'Сохранить';

        if (error) {
          errorEl.textContent = 'Ошибка: ' + error.message;
          return;
        }

        modal.hidden = true;
        document.body.style.overflow = '';
        editingKey = null;
        await loadCells();
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (!editingKey) return;
        if (!confirm('Удалить ячейку?')) return;

        const [oldDay, oldTime] = editingKey.split('|');

        await window.supabaseClient
          .from('schedule_template')
          .delete()
          .eq('teacher_id', currentUser.user.id)
          .eq('weekday', parseInt(oldDay, 10))
          .eq('time', oldTime);

        modal.hidden = true;
        document.body.style.overflow = '';
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

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => timeInput && timeInput.focus(), 150);
  }

  /* ЗАЯВКИ */
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
      return;
    }

    if (!data.length) {
      listEl.innerHTML = `
        <div class="cabinet__empty">
          <div class="cabinet__empty-icon">📩</div>
          <div class="cabinet__empty-title">Заявок пока нет</div>
          <div class="cabinet__empty-desc">Когда ученик попросит место в расписании — заявка появится здесь</div>
        </div>
      `;
      updateBookingsStat(0);
      return;
    }

    const studentIds = [...new Set(data.map(b => b.student_id).filter(Boolean))];

    const { data: profiles } = studentIds.length
      ? await window.supabaseClient.from('profiles').select('id, name, email').in('id', studentIds)
      : { data: [] };

    const studentsMap = {};
    (profiles || []).forEach(p => studentsMap[p.id] = p);

    listEl.innerHTML = data.map(b => {
      const student = studentsMap[b.student_id] || {};
      const statusLabel = {
        pending: 'Ожидает',
        approved: 'Одобрена',
        rejected: 'Отклонена',
        cancelled: 'Отменена'
      }[b.status] || b.status;

      const canApprove = b.status === 'pending';
      const canReject = b.status === 'pending';

      return `
        <div class="booking-row">
          <div class="booking-row__date">${DAYS[b.weekday]} · ${b.time}</div>
          <div class="booking-row__info">
            <div class="booking-row__name">${student.name || student.email || '—'}</div>
            <div class="booking-row__subject">Заявка на место</div>
          </div>
          <div class="booking-row__status booking-row__status--${b.status}">${statusLabel}</div>
          <div class="booking-row__actions">
            ${canApprove ? `<button class="btn btn--primary btn--sm" data-approve-request="${b.id}" data-weekday="${b.weekday}" data-time="${b.time}" data-student="${b.student_id}">Одобрить</button>` : ''}
            ${canReject ? `<button class="btn btn--ghost btn--sm" data-reject-request="${b.id}">Отклонить</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

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

    updateBookingsStat(data.filter(b => b.status === 'pending' || b.status === 'approved').length);
  }

  async function approveRequest(id, weekday, time, studentId) {
    if (!confirm('Одобрить заявку? Место станет занятым.')) return;

    const { error: reqError } = await window.supabaseClient
      .from('booking_requests')
      .update({ status: 'approved' })
      .eq('id', id);

    if (reqError) {
      alert('Ошибка: ' + reqError.message);
      return;
    }

    const { data: profile } = await window.supabaseClient
      .from('profiles')
      .select('name')
      .eq('id', studentId)
      .single();

    const studentName = (profile && profile.name) || 'Ученик';

    await window.supabaseClient
      .from('schedule_template')
      .upsert({
        teacher_id: currentUser.user.id,
        weekday: weekday,
        time: time,
        text_content: studentName,
        status: 'busy'
      }, { onConflict: 'teacher_id,weekday,time' });

    await Promise.all([loadRequests(), loadCells()]);
  }

  async function rejectRequest(id) {
    if (!confirm('Отклонить заявку?')) return;

    const { error } = await window.supabaseClient
      .from('booking_requests')
      .update({ status: 'rejected' })
      .eq('id', id);

    if (error) {
      alert('Ошибка: ' + error.message);
      return;
    }

    await loadRequests();
  }

  function updateBookingsStat(n) {
    const el = document.querySelector('[data-stat="bookings"]');
    if (el) el.textContent = n;
  }

  /* РЕЙТИНГ */
  async function loadRating() {
    const { data } = await window.supabaseClient
      .from('teachers')
      .select('rating')
      .eq('id', currentUser.user.id)
      .single();

    const el = document.querySelector('[data-stat="rating"]');
    if (el) el.textContent = data && data.rating ? data.rating : '—';
  }

  document.addEventListener('DOMContentLoaded', init);
})();

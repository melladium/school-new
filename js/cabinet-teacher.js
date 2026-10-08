(function () {
  'use strict';

  let currentUser = null;
  let avatarFile = null;

  async function init() {
    currentUser = await window.authAPI.requireAuth('teacher');
    if (!currentUser) return;

    const nameEl = document.querySelector('[data-user-name]');
    if (nameEl) nameEl.textContent = currentUser.profile.name || currentUser.profile.email;

    const logoutBtn = document.querySelector('[data-logout]');
    if (logoutBtn) logoutBtn.addEventListener('click', window.authAPI.signOut);

    initAddSlotModal();
    initProfileSection();
    initNotifications();

    await Promise.all([loadProfile(), loadSlots(), loadBookings(), loadRating()]);
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
      .select('subject, price, bio, phone, telegram, whatsapp, meeting_link, is_active, avatar_url')
      .eq('id', currentUser.user.id)
      .single();

    if (error || !data) return;

    const subjectLabels = {
      math: 'Математика', english: 'Английский', physics: 'Физика',
      russian: 'Русский', chemistry: 'Химия', it: 'Информатика'
    };

    const setText = (sel, val) => {
      const el = document.querySelector(sel);
      if (el) el.textContent = val || '—';
    };

    setText('[data-profile-name]', currentUser.profile.name || currentUser.profile.email);
    setText('[data-profile-email]', currentUser.profile.email);
    setText('[data-profile-subject]', subjectLabels[data.subject] || data.subject);
    setText('[data-profile-price]', data.price ? data.price + ' ₽' : '—');
    setText('[data-profile-phone]', data.phone);
    setText('[data-profile-telegram]', data.telegram);
    setText('[data-profile-whatsapp]', data.whatsapp);
    setText('[data-profile-link]', data.meeting_link);
    setText('[data-profile-bio]', data.bio || 'Информация пока не заполнена');

    const avatarEl = document.querySelector('[data-profile-avatar]');
    if (avatarEl) {
      if (data.avatar_url) {
        avatarEl.innerHTML = `<img src="${data.avatar_url}" style="width:100%;height:100%;object-fit:cover;" alt="">`;
      } else {
        const initials = (currentUser.profile.name || 'Р').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        avatarEl.textContent = initials;
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

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        viewEl.hidden = true;
        editEl.hidden = false;
        toggleBtn.hidden = true;
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        viewEl.hidden = false;
        editEl.hidden = true;
        toggleBtn.hidden = false;
        errorEl.textContent = '';
        avatarFile = null;
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        errorEl.textContent = '';
        saveBtn.disabled = true;
        saveBtn.textContent = 'Сохраняем…';

        let avatar_url = undefined;

        if (avatarFile) {
          const ext = avatarFile.name.split('.').pop();
          const path = `${currentUser.user.id}/avatar.${ext}`;

          const { error: uploadError } = await window.supabaseClient.storage
            .from('avatars')
            .upload(path, avatarFile, { upsert: true });

          if (uploadError) {
            errorEl.textContent = 'Ошибка загрузки фото: ' + uploadError.message;
            saveBtn.disabled = false;
            saveBtn.textContent = 'Сохранить';
            return;
          }

          const { data: urlData } = window.supabaseClient.storage
            .from('avatars')
            .getPublicUrl(path);

          avatar_url = urlData.publicUrl + '?t=' + Date.now();
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
        if (!confirm('Удалить аккаунт НАВСЕГДА? Все данные, слоты и брони будут удалены. Это нельзя отменить.')) return;
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

        alert('Аккаунт удалён полностью. Сейчас вы выйдете.');
        await window.authAPI.signOut();
      });
    }
  }

  /* СЛОТЫ */
  async function loadSlots() {
    const listEl = document.querySelector('[data-slots-list]');
    if (!listEl) return;

    listEl.innerHTML = '<div class="cabinet__loading">Загружаем…</div>';

    const { data, error } = await window.supabaseClient
      .from('slots')
      .select('id, date, time, is_booked')
      .eq('teacher_id', currentUser.user.id)
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (error) {
      listEl.innerHTML = '<div class="cabinet__empty"><div class="cabinet__empty-title">Ошибка</div><div class="cabinet__empty-desc">' + error.message + '</div></div>';
      return;
    }

    if (!data.length) {
      listEl.innerHTML = `
        <div class="cabinet__empty">
          <div class="cabinet__empty-icon">🕒</div>
          <div class="cabinet__empty-title">Слотов пока нет</div>
          <div class="cabinet__empty-desc">Добавьте свободное время — ученики смогут бронировать</div>
        </div>
      `;
      updateSlotsStat(0);
      return;
    }

    listEl.innerHTML = data.map(s => `
      <div class="slot-row">
        <div class="slot-row__date">${formatDate(s.date)} · ${(s.time || '').slice(0, 5)}</div>
        <div class="slot-row__status ${s.is_booked ? '' : 'slot-row__status--free'}">
          ${s.is_booked ? 'Занят' : 'Свободен'}
        </div>
        ${!s.is_booked ? `<button class="slot-row__del" data-del-slot="${s.id}" title="Удалить">×</button>` : ''}
      </div>
    `).join('');

    listEl.querySelectorAll('[data-del-slot]').forEach(btn => {
      btn.addEventListener('click', () => deleteSlot(btn.dataset.delSlot));
    });

    updateSlotsStat(data.filter(s => !s.is_booked).length);
  }

  async function deleteSlot(id) {
    if (!confirm('Удалить слот?')) return;
    const { error } = await window.supabaseClient.from('slots').delete().eq('id', id);
    if (error) { alert('Ошибка: ' + error.message); return; }
    await loadSlots();
  }

  function updateSlotsStat(n) {
    const el = document.querySelector('[data-stat="slots"]');
    if (el) el.textContent = n;
  }

  /* МОДАЛКА СЛОТА */
  function initAddSlotModal() {
    const modal = document.querySelector('[data-modal="add-slot"]');
    const openBtn = document.querySelector('[data-add-slot]');
    const saveBtn = document.querySelector('[data-slot-save]');
    const dateInput = document.querySelector('[data-slot-date]');
    const timeInput = document.querySelector('[data-slot-time]');
    const errorEl = document.querySelector('[data-slot-error]');

    if (!modal || !openBtn) return;

    openBtn.addEventListener('click', () => {
      const today = new Date().toISOString().slice(0, 10);
      if (dateInput) dateInput.value = today;
      if (timeInput) timeInput.value = '18:00';
      if (errorEl) errorEl.textContent = '';
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
    });

    modal.querySelectorAll('[data-modal-close]').forEach(el => {
      el.addEventListener('click', () => {
        modal.hidden = true;
        document.body.style.overflow = '';
      });
    });

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const date = dateInput.value;
        const time = timeInput.value;
        if (!date || !time) {
          errorEl.textContent = 'Заполните дату и время';
          return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = 'Сохраняем…';

        const { error } = await window.supabaseClient.from('slots').insert({
          teacher_id: currentUser.user.id,
          date: date,
          time: time,
          is_booked: false
        });

        saveBtn.disabled = false;
        saveBtn.textContent = 'Сохранить';

        if (error) {
          errorEl.textContent = 'Ошибка: ' + error.message;
          return;
        }

        modal.hidden = true;
        document.body.style.overflow = '';
        await loadSlots();
      });
    }
  }

  /* БРОНИ */
  async function loadBookings() {
    const listEl = document.querySelector('[data-bookings-list]');
    if (!listEl) return;

    listEl.innerHTML = '<div class="cabinet__loading">Загружаем…</div>';

    const { data, error } = await window.supabaseClient
      .from('bookings')
      .select('id, status, slot_id, student_id, created_at')
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
          <div class="cabinet__empty-desc">Когда ученик забронирует слот — заявка появится здесь</div>
        </div>
      `;
      updateBookingsStat(0);
      return;
    }

    const slotIds = data.map(b => b.slot_id).filter(Boolean);
    const studentIds = [...new Set(data.map(b => b.student_id).filter(Boolean))];

    const [slotsRes, profilesRes] = await Promise.all([
      slotIds.length ? window.supabaseClient.from('slots').select('id, date, time').in('id', slotIds) : { data: [] },
      studentIds.length ? window.supabaseClient.from('profiles').select('id, name, email').in('id', studentIds) : { data: [] }
    ]);

    const slotsMap = {};
    (slotsRes.data || []).forEach(s => slotsMap[s.id] = s);

    const studentsMap = {};
    (profilesRes.data || []).forEach(p => studentsMap[p.id] = p);

    listEl.innerHTML = data.map(b => {
      const slot = slotsMap[b.slot_id] || {};
      const student = studentsMap[b.student_id] || {};
      const dateStr = slot.date ? formatDate(slot.date) + ' · ' + (slot.time || '').slice(0, 5) : '—';
      const statusLabel = {
        pending: 'Ожидает',
        confirmed: 'Подтверждён',
        cancelled: 'Отменён'
      }[b.status] || b.status;

      const canConfirm = b.status === 'pending';
      const canCancel = b.status === 'pending' || b.status === 'confirmed';

      return `
        <div class="booking-row">
          <div class="booking-row__date">${dateStr}</div>
          <div class="booking-row__info">
            <div class="booking-row__name">${student.name || student.email || '—'}</div>
            <div class="booking-row__subject">Заявка на урок</div>
          </div>
          <div class="booking-row__status booking-row__status--${b.status}">${statusLabel}</div>
          <div style="display:flex;gap:6px;align-items:center;">
            ${canConfirm ? `<button class="btn btn--primary btn--sm" data-confirm-booking="${b.id}">Подтвердить</button>` : ''}
            ${canCancel ? `<button class="slot-row__del" data-cancel-booking="${b.id}" title="Отменить">×</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('[data-confirm-booking]').forEach(btn => {
      btn.addEventListener('click', () => updateBookingStatus(btn.dataset.confirmBooking, 'confirmed'));
    });

    listEl.querySelectorAll('[data-cancel-booking]').forEach(btn => {
      btn.addEventListener('click', () => updateBookingStatus(btn.dataset.cancelBooking, 'cancelled'));
    });

    updateBookingsStat(data.filter(b => b.status !== 'cancelled').length);
  }

  async function updateBookingStatus(id, status) {
    if (status === 'cancelled' && !confirm('Отменить заявку?')) return;

    const { data: booking } = await window.supabaseClient
      .from('bookings')
      .select('slot_id')
      .eq('id', id)
      .single();

    const { error } = await window.supabaseClient
      .from('bookings')
      .update({ status })
      .eq('id', id);

    if (error) {
      alert('Ошибка: ' + error.message);
      return;
    }

    if (booking && booking.slot_id) {
      const isBooked = status === 'confirmed';
      await window.supabaseClient
        .from('slots')
        .update({ is_booked: isBooked })
        .eq('id', booking.slot_id);
    }

    await Promise.all([loadBookings(), loadSlots()]);
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

  /* УТИЛИТЫ */
  function formatDate(iso) {
    const d = new Date(iso);
    const months = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
    return d.getDate() + ' ' + months[d.getMonth()];
  }

  document.addEventListener('DOMContentLoaded', init);
})();
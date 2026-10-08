(function () {
  'use strict';

  let currentUser = null;
  let reviewBookingId = null;
  let reviewTeacherId = null;
  let reviewRating = 0;

  async function init() {
    currentUser = await window.authAPI.requireAuth('student');
    if (!currentUser) return;

    const nameEl = document.querySelector('[data-user-name]');
    if (nameEl) nameEl.textContent = currentUser.profile.name || currentUser.profile.email;

    const logoutBtn = document.querySelector('[data-logout]');
    if (logoutBtn) logoutBtn.addEventListener('click', window.authAPI.signOut);

    const deleteBtn = document.querySelector('[data-delete-account]');
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

    initNotifications();
    initReviewModal();

    await loadBookings(currentUser.user.id);
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

  /* БРОНИ */
  async function loadBookings(studentId) {
    const listEl = document.querySelector('[data-bookings-list]');
    if (!listEl) return;

    listEl.innerHTML = '<div class="cabinet__loading">Загружаем…</div>';

    const { data, error } = await window.supabaseClient
      .from('bookings')
      .select('id, status, created_at, slot_id, teacher_id')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) {
      listEl.innerHTML = '<div class="cabinet__empty"><div class="cabinet__empty-title">Ошибка загрузки</div><div class="cabinet__empty-desc">' + error.message + '</div></div>';
      return;
    }

    if (!data.length) {
      listEl.innerHTML = `
        <div class="cabinet__empty">
          <div class="cabinet__empty-icon">📅</div>
          <div class="cabinet__empty-title">Пока пусто</div>
          <div class="cabinet__empty-desc">Найдите репетитора в каталоге и забронируйте первый урок</div>
          <a href="index.html#podbor" class="btn btn--primary">К репетиторам</a>
        </div>
      `;
      updateStats([]);
      return;
    }

    const slotIds = data.map(b => b.slot_id).filter(Boolean);
    const teacherIds = [...new Set(data.map(b => b.teacher_id).filter(Boolean))];

    const [slotsRes, teachersRes, profilesRes, reviewsRes] = await Promise.all([
      slotIds.length ? window.supabaseClient.from('slots').select('id, date, time').in('id', slotIds) : { data: [] },
      teacherIds.length ? window.supabaseClient.from('teachers').select('id, subject, price, meeting_link, phone, telegram, whatsapp').in('id', teacherIds) : { data: [] },
      teacherIds.length ? window.supabaseClient.from('profiles').select('id, name').in('id', teacherIds) : { data: [] },
      window.supabaseClient.from('reviews').select('booking_id').eq('student_id', studentId)
    ]);

    const slotsMap = {};
    (slotsRes.data || []).forEach(s => slotsMap[s.id] = s);

    const teachersMap = {};
    (teachersRes.data || []).forEach(t => teachersMap[t.id] = t);

    const profilesMap = {};
    (profilesRes.data || []).forEach(p => profilesMap[p.id] = p);

    const reviewedBookings = new Set((reviewsRes.data || []).map(r => r.booking_id).filter(Boolean));

    listEl.innerHTML = data.map(b => {
      const slot = slotsMap[b.slot_id] || {};
      const teacher = teachersMap[b.teacher_id] || {};
      const profile = profilesMap[b.teacher_id] || {};
      const dateStr = slot.date ? formatDate(slot.date) + ' · ' + (slot.time || '').slice(0, 5) : 'Дата уточняется';
      const statusLabel = {
        pending: 'Ожидает',
        confirmed: 'Подтверждён',
        cancelled: 'Отменён'
      }[b.status] || b.status;

      const canCancel = b.status === 'pending' || b.status === 'confirmed';
      const showLink = b.status === 'confirmed' && teacher.meeting_link;
      const canReview = b.status === 'confirmed' && !reviewedBookings.has(b.id);
      const alreadyReviewed = reviewedBookings.has(b.id);

      const contacts = [];
      if (b.status === 'confirmed') {
        if (teacher.phone) contacts.push(`📞 ${teacher.phone}`);
        if (teacher.telegram) contacts.push(`✈️ ${teacher.telegram}`);
        if (teacher.whatsapp) contacts.push(`💬 ${teacher.whatsapp}`);
      }

      return `
        <div class="booking-row">
          <div class="booking-row__date">${dateStr}</div>
          <div class="booking-row__info">
            <div class="booking-row__name">${profile.name || 'Репетитор'}</div>
            <div class="booking-row__subject">${subjectLabel(teacher.subject) || '—'}</div>
            ${contacts.length ? `<div class="booking-row__subject" style="margin-top:6px;font-size:12px;">${contacts.join(' · ')}</div>` : ''}
          </div>
          <div class="booking-row__status booking-row__status--${b.status}">${statusLabel}</div>
          <div style="display:flex;gap:6px;align-items:center;">
            ${showLink ? `<a href="${teacher.meeting_link}" target="_blank" rel="noopener" class="btn btn--primary btn--sm">Подключиться</a>` : ''}
            ${canReview ? `<button class="btn btn--outline btn--sm" data-review-booking="${b.id}" data-teacher-id="${b.teacher_id}">Оставить отзыв</button>` : ''}
            ${alreadyReviewed ? `<span class="btn btn--ghost btn--sm" style="cursor:default;opacity:0.6;">Отзыв оставлен</span>` : ''}
            ${canCancel ? `<button class="slot-row__del" data-cancel-booking="${b.id}" title="Отменить">×</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('[data-cancel-booking]').forEach(btn => {
      btn.addEventListener('click', () => cancelBooking(btn.dataset.cancelBooking));
    });

    listEl.querySelectorAll('[data-review-booking]').forEach(btn => {
      btn.addEventListener('click', () => openReviewModal(btn.dataset.reviewBooking, btn.dataset.teacherId));
    });

    updateStats(data, teachersMap);
  }

  async function cancelBooking(id) {
    if (!confirm('Отменить бронь?')) return;

    const { data: booking } = await window.supabaseClient
      .from('bookings')
      .select('slot_id, status')
      .eq('id', id)
      .single();

    const { error } = await window.supabaseClient
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) {
      alert('Ошибка: ' + error.message);
      return;
    }

    if (booking && booking.slot_id && booking.status === 'confirmed') {
      await window.supabaseClient
        .from('slots')
        .update({ is_booked: false })
        .eq('id', booking.slot_id);
    }

    await loadBookings(currentUser.user.id);
  }

  /* ОТЗЫВ */
  function initReviewModal() {
    const modal = document.querySelector('[data-modal="review"]');
    if (!modal) return;

    modal.querySelectorAll('[data-modal-close]').forEach(el => {
      el.addEventListener('click', () => {
        modal.hidden = true;
        document.body.style.overflow = '';
      });
    });

    const starButtons = modal.querySelectorAll('[data-star]');
    starButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        reviewRating = parseInt(btn.dataset.star, 10);
        starButtons.forEach(b => {
          const val = parseInt(b.dataset.star, 10);
          if (val <= reviewRating) {
            b.style.background = 'var(--accent)';
            b.style.color = '#08080A';
            b.style.borderColor = 'var(--accent)';
          } else {
            b.style.background = '';
            b.style.color = '';
            b.style.borderColor = '';
          }
        });
      });
    });

    const saveBtn = modal.querySelector('[data-review-save]');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const errorEl = modal.querySelector('[data-review-error]');
        const text = modal.querySelector('[data-review-text]').value.trim();

        errorEl.textContent = '';

        if (!reviewRating) {
          errorEl.textContent = 'Поставьте оценку';
          return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = 'Отправляем…';

        const { error } = await window.supabaseClient.from('reviews').insert({
          teacher_id: reviewTeacherId,
          student_id: currentUser.user.id,
          booking_id: reviewBookingId,
          rating: reviewRating,
          text: text || ''
        });

        saveBtn.disabled = false;
        saveBtn.textContent = 'Отправить отзыв';

        if (error) {
          errorEl.textContent = 'Ошибка: ' + error.message;
          return;
        }

        modal.hidden = true;
        document.body.style.overflow = '';
        reviewBookingId = null;
        reviewTeacherId = null;
        reviewRating = 0;

        await loadBookings(currentUser.user.id);
      });
    }
  }

  function openReviewModal(bookingId, teacherId) {
    const modal = document.querySelector('[data-modal="review"]');
    if (!modal) return;

    reviewBookingId = bookingId;
    reviewTeacherId = teacherId;
    reviewRating = 0;

    modal.querySelector('[data-review-text]').value = '';
    modal.querySelector('[data-review-error]').textContent = '';
    modal.querySelectorAll('[data-star]').forEach(b => {
      b.style.background = '';
      b.style.color = '';
      b.style.borderColor = '';
    });

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  /* СТАТИСТИКА */
  function updateStats(bookings, teachersMap) {
    const upcoming = bookings.filter(b => b.status === 'confirmed' || b.status === 'pending').length;
    const done = bookings.filter(b => b.status === 'confirmed').length;
    let spent = 0;
    bookings.forEach(b => {
      const t = teachersMap && teachersMap[b.teacher_id];
      if (t && b.status === 'confirmed') spent += t.price || 0;
    });

    const upcomingEl = document.querySelector('[data-stat="upcoming"]');
    const doneEl = document.querySelector('[data-stat="done"]');
    const spentEl = document.querySelector('[data-stat="spent"]');

    if (upcomingEl) upcomingEl.textContent = upcoming;
    if (doneEl) doneEl.textContent = done;
    if (spentEl) spentEl.textContent = spent + ' ₽';
  }

  function formatDate(iso) {
    const d = new Date(iso);
    const months = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
    return d.getDate() + ' ' + months[d.getMonth()];
  }

  function subjectLabel(code) {
    const map = {
      math: 'Математика', english: 'Английский', physics: 'Физика',
      russian: 'Русский', chemistry: 'Химия', it: 'Информатика'
    };
    return map[code] || code;
  }

  document.addEventListener('DOMContentLoaded', init);
})();
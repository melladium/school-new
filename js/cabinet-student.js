(function () {
  'use strict';

  let currentUser = null;
  let selectedBooking = null;
  let selectedRating = 0;
  let reviewedTeacherIds = new Set();

  const DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const SUBJECT_LABELS = {
    math: 'Математика', english: 'Английский', physics: 'Физика',
    russian: 'Русский', chemistry: 'Химия', it: 'Информатика'
  };
  const STATUS_LABELS = {
    pending: 'Ожидает',
    approved: 'Одобрена',
    rejected: 'Отклонена',
    cancelled: 'Отменена'
  };

  /* ВРЕМЯ */
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

  /* INIT */
  async function init() {
    currentUser = await window.authAPI.requireAuth('student');
    if (!currentUser) return;

    const nameEl = document.querySelector('[data-user-name]');
    if (nameEl) nameEl.textContent = currentUser.profile.name || currentUser.profile.email;

    const initials = (currentUser.profile.name || 'У')
      .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const avatarEl = document.querySelector('[data-user-avatar]');
    if (avatarEl) avatarEl.textContent = initials;

    const logoutBtn = document.querySelector('[data-logout]');
    if (logoutBtn) logoutBtn.addEventListener('click', window.authAPI.signOut);

    const deleteBtn = document.querySelector('[data-delete-account]');
    if (deleteBtn) deleteBtn.addEventListener('click', deleteAccount);

    initBurger();
    initNotifications();
    initReviewModal();

    await Promise.all([
      loadReviewedTeachers(),
      loadBookings()
    ]);
  }

  /* BURGER */
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
      <div class="notif-item ${n.read ? '' : 'is-unread'}" data-notif-id="${n.id}" data-link="${n.link || ''}">
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

  /* ОТЗЫВЫ: КОГО УЖЕ ОЦЕНИЛ */
  async function loadReviewedTeachers() {
    const { data } = await window.supabaseClient
      .from('reviews')
      .select('teacher_id')
      .eq('student_id', currentUser.user.id);
    reviewedTeacherIds = new Set((data || []).map(r => r.teacher_id));
  }

  /* ЗАЯВКИ */
  async function loadBookings() {
    const listEl = document.querySelector('[data-bookings-list]');
    if (!listEl) return;

    listEl.innerHTML = '<div class="cabinet__loading">Загружаем…</div>';

    const { data, error } = await window.supabaseClient
      .from('booking_requests')
      .select('id, status, weekday, time, teacher_id, created_at')
      .eq('student_id', currentUser.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      listEl.innerHTML = `<div class="cabinet__empty"><div class="cabinet__empty-title">Ошибка</div><div class="cabinet__empty-desc">${error.message}</div></div>`;
      updateStats([], []);
      return;
    }

    if (!data.length) {
      listEl.innerHTML = `
        <div class="cabinet__empty">
          <div class="cabinet__empty-icon">📅</div>
          <div class="cabinet__empty-title">Пока пусто</div>
          <div class="cabinet__empty-desc">Найдите репетитора в автоподборе и оставьте первую заявку</div>
          <a href="index.html#podbor" class="btn btn--primary">К репетиторам</a>
        </div>
      `;
      updateStats([], []);
      return;
    }

    const teacherIds = [...new Set(data.map(b => b.teacher_id).filter(Boolean))];

    const [profilesRes, teachersRes] = await Promise.all([
      teacherIds.length
        ? window.supabaseClient.from('profiles').select('id, name').in('id', teacherIds)
        : Promise.resolve({ data: [] }),
      teacherIds.length
        ? window.supabaseClient.from('teachers').select('id, subject, avatar_url').in('id', teacherIds)
        : Promise.resolve({ data: [] })
    ]);

    const profilesMap = {};
    (profilesRes.data || []).forEach(p => profilesMap[p.id] = p);
    const teachersMap = {};
    (teachersRes.data || []).forEach(t => teachersMap[t.id] = t);

    const upcoming = [];
    const done = [];

    data.forEach(b => {
      const t = teachersMap[b.teacher_id] || {};
      const p = profilesMap[b.teacher_id] || {};
      const item = {
        ...b,
        teacherName: p.name || 'Репетитор',
        teacherSubject: SUBJECT_LABELS[t.subject] || t.subject || '',
        teacherAvatar: t.avatar_url || ''
      };

      if (b.status === 'approved' && isPast(b.weekday, b.time)) {
        done.push(item);
      } else if (b.status === 'pending' || b.status === 'approved') {
        upcoming.push(item);
      }
    });

    const all = [...upcoming, ...done, ...data.filter(b =>
      b.status === 'rejected' || b.status === 'cancelled'
    ).map(b => {
      const t = teachersMap[b.teacher_id] || {};
      const p = profilesMap[b.teacher_id] || {};
      return {
        ...b,
        teacherName: p.name || 'Репетитор',
        teacherSubject: SUBJECT_LABELS[t.subject] || t.subject || '',
        teacherAvatar: t.avatar_url || ''
      };
    })];

    listEl.innerHTML = all.map(b => renderBookingRow(b)).join('');

    listEl.querySelectorAll('[data-review-open]').forEach(btn => {
      btn.addEventListener('click', () => openReviewModal(btn.dataset.reviewOpen, btn.dataset.teacherName));
    });

    updateStats(upcoming, done);
  }

  function renderBookingRow(b) {
    const statusLabel = STATUS_LABELS[b.status] || b.status;
    const dateLabel = `${DAYS[b.weekday]} · ${b.time}`;
    const initials = (b.teacherName || 'Р').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const avatarHtml = b.teacherAvatar
      ? `<div class="booking-row__avatar" style="overflow:hidden;padding:0;"><img src="${b.teacherAvatar}" style="width:100%;height:100%;object-fit:cover;" alt=""></div>`
      : `<div class="booking-row__avatar">${initials}</div>`;

    const isDone = b.status === 'approved' && isPast(b.weekday, b.time);
    const canReview = isDone && !reviewedTeacherIds.has(b.teacher_id);

    return `
      <div class="booking-row">
        ${avatarHtml}
        <div class="booking-row__date">${dateLabel}</div>
        <div class="booking-row__info">
          <div class="booking-row__name">${b.teacherName}</div>
          <div class="booking-row__subject">${b.teacherSubject || 'Заявка на место'}</div>
        </div>
        <div class="booking-row__status booking-row__status--${b.status}">${statusLabel}</div>
        <div class="booking-row__actions">
          ${canReview ? `<button class="btn btn--primary btn--sm" data-review-open="${b.teacher_id}" data-teacher-name="${b.teacherName}">Оставить отзыв</button>` : ''}
        </div>
      </div>
    `;
  }

  function updateStats(upcoming, done) {
    const uEl = document.querySelector('[data-stat="upcoming"]');
    const dEl = document.querySelector('[data-stat="done"]');
    if (uEl) uEl.textContent = upcoming.length;
    if (dEl) dEl.textContent = done.length;
  }

  /* МОДАЛКА ОТЗЫВА */
  function initReviewModal() {
    const modal = document.querySelector('[data-modal="review"]');
    if (!modal) return;

    modal.querySelectorAll('[data-modal-close]').forEach(el => {
      el.addEventListener('click', closeReviewModal);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hidden) closeReviewModal();
    });

    modal.querySelectorAll('[data-star]').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedRating = parseInt(btn.dataset.star, 10);
        paintStars(selectedRating);
      });
    });

    const saveBtn = modal.querySelector('[data-review-save]');
    if (saveBtn) saveBtn.addEventListener('click', submitReview);
  }

  function paintStars(n) {
    document.querySelectorAll('[data-star]').forEach(btn => {
      const val = parseInt(btn.dataset.star, 10);
      btn.style.color = val <= n ? 'var(--accent)' : 'var(--text-mute)';
      btn.style.borderColor = val <= n ? 'var(--accent)' : 'var(--border-strong)';
    });
  }

  function openReviewModal(teacherId, teacherName) {
    const modal = document.querySelector('[data-modal="review"]');
    if (!modal) return;

    selectedBooking = { teacherId, teacherName };
    selectedRating = 0;
    paintStars(0);

    const textEl = modal.querySelector('[data-review-text]');
    if (textEl) textEl.value = '';
    const errEl = modal.querySelector('[data-review-error]');
    if (errEl) errEl.textContent = '';

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeReviewModal() {
    const modal = document.querySelector('[data-modal="review"]');
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
    selectedBooking = null;
    selectedRating = 0;
  }

  async function submitReview() {
    const modal = document.querySelector('[data-modal="review"]');
    if (!modal || !selectedBooking) return;

    const errEl = modal.querySelector('[data-review-error]');
    const saveBtn = modal.querySelector('[data-review-save]');
    const textEl = modal.querySelector('[data-review-text]');

    errEl.textContent = '';

    if (selectedRating < 1 || selectedRating > 5) {
      errEl.textContent = 'Поставьте оценку от 1 до 5';
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Отправляем…';

    const text = (textEl.value || '').trim();

    const { error } = await window.supabaseClient
      .from('reviews')
      .insert({
        teacher_id: selectedBooking.teacherId,
        student_id: currentUser.user.id,
        rating: selectedRating,
        text: text
      });

    if (error) {
      errEl.textContent = 'Ошибка: ' + error.message;
      saveBtn.disabled = false;
      saveBtn.textContent = 'Отправить отзыв';
      return;
    }

    await window.supabaseClient.from('notifications').insert({
      user_id: selectedBooking.teacherId,
      type: 'review',
      text: 'Новый отзыв: ★ ' + selectedRating,
      link: 'cabinet-teacher.html'
    });

    await recalcTeacherRating(selectedBooking.teacherId);

    saveBtn.disabled = false;
    saveBtn.textContent = 'Отправить отзыв';
    closeReviewModal();

    reviewedTeacherIds.add(selectedBooking.teacherId);
    await loadBookings();
  }

  async function recalcTeacherRating(teacherId) {
    const { data } = await window.supabaseClient
      .from('reviews')
      .select('rating')
      .eq('teacher_id', teacherId);

    const list = data || [];
    const count = list.length;
    const avg = count
      ? Math.round((list.reduce((s, r) => s + (r.rating || 0), 0) / count) * 10) / 10
      : 0;

    await window.supabaseClient
      .from('teachers')
      .update({ rating: avg, reviews_count: count })
      .eq('id', teacherId);
  }

  /* УДАЛЕНИЕ АККАУНТА */
  async function deleteAccount() {
    if (!confirm('Удалить аккаунт НАВСЕГДА? Все данные будут удалены. Это нельзя отменить.')) return;
    if (!confirm('Точно? Это последнее предупреждение.')) return;

    const { error } = await window.supabaseClient.rpc('delete_user');
    if (error) {
      alert('Ошибка удаления: ' + error.message);
      return;
    }
    alert('Аккаунт удалён. Сейчас вы выйдете.');
    await window.authAPI.signOut();
  }

  document.addEventListener('DOMContentLoaded', init);
})();

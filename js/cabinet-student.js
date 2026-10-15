(function () {
  'use strict';

  let currentUser = null;
  let selectedBooking = null;
  let selectedRating = 0;
  let reviewedTeacherIds = new Set();

  let personalMap = {};
  let personalEditingKey = null;
  let personalExpanded = false;

  const DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

  const SUBJECT_LABELS = {
    math: 'Математика',
    russian: 'Русский',
    physics: 'Физика',
    chemistry: 'Химия',
    biology: 'Биология',
    it: 'Информатика',
    english: 'Английский',
    history: 'История',
    social: 'Обществознание',
    geography: 'География'
  };

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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
    initPersonalCellModal();
    initTogglePersonal();

    const addPersonalBtn = document.querySelector('[data-add-personal-cell]');
    if (addPersonalBtn) addPersonalBtn.addEventListener('click', () => openPersonalCellModal(null));

    await Promise.all([
      loadReviewedTeachers(),
      loadBookings(),
      loadPersonal()
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

  function initTogglePersonal() {
    const btn = document.querySelector('[data-toggle-personal-board]');
    if (!btn) return;
    btn.addEventListener('click', () => {
      personalExpanded = !personalExpanded;
      btn.textContent = personalExpanded ? 'Свернуть' : 'Развернуть';
      renderPersonalBoard();
    });
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
    if (count && count > 0) { countEl.textContent = count; countEl.hidden = false; }
    else { countEl.hidden = true; }
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

  async function loadReviewedTeachers() {
    const { data } = await window.supabaseClient
      .from('reviews').select('teacher_id').eq('student_id', currentUser.user.id);
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
      listEl.innerHTML = `<div class="cabinet__empty"><div class="cabinet__empty-title">Ошибка</div><div class="cabinet__empty-desc">${escapeHtml(error.message)}</div></div>`;
      updateStats(0, 0);
      return;
    }

    if (!data.length) {
      listEl.innerHTML = `
        <div class="cabinet__empty">
          <div class="cabinet__empty-icon">📅</div>
          <div class="cabinet__empty-title">Пока пусто</div>
          <div class="cabinet__empty-desc">Найдите репетитора и оставьте первую заявку</div>
          <a href="index.html#podbor" class="btn btn--primary btn--lg">Найти репетитора</a>
        </div>
      `;
      updateStats(0, 0);
      return;
    }

    const teacherIds = [...new Set(data.map(b => b.teacher_id).filter(Boolean))];

    const [profilesRes, teachersRes] = await Promise.all([
      teacherIds.length
        ? window.supabaseClient.from('profiles').select('id, name').in('id', teacherIds)
        : Promise.resolve({ data: [] }),
      teacherIds.length
        ? window.supabaseClient.from('teachers').select('id, subject').in('id', teacherIds)
        : Promise.resolve({ data: [] })
    ]);

    const profilesMap = {};
    (profilesRes.data || []).forEach(p => profilesMap[p.id] = p);
    const teachersMap = {};
    (teachersRes.data || []).forEach(t => teachersMap[t.id] = t);

    const upcoming = [];
    const done = [];

    const rows = data.map(b => {
      const t = teachersMap[b.teacher_id] || {};
      const p = profilesMap[b.teacher_id] || {};
      const item = {
        ...b,
        teacherName: p.name || 'Репетитор',
        teacherSubject: SUBJECT_LABELS[t.subject] || t.subject || 'Занятие'
      };

      if (b.status === 'approved' && isPast(b.weekday, b.time)) {
        done.push(item);
      } else if (b.status === 'pending' || b.status === 'approved') {
        upcoming.push(item);
      }
      return item;
    });

    listEl.innerHTML = rows.map(b => renderBookingCard(b)).join('');

    listEl.querySelectorAll('[data-action-cancel]').forEach(btn => {
      btn.addEventListener('click', () => cancelBooking(btn.dataset.actionCancel));
    });
    listEl.querySelectorAll('[data-action-review]').forEach(btn => {
      btn.addEventListener('click', () => openReviewModal(btn.dataset.actionReview, btn.dataset.teacherName));
    });
    listEl.querySelectorAll('[data-action-remove]').forEach(btn => {
      btn.addEventListener('click', () => removeBooking(btn.dataset.actionRemove));
    });
    listEl.querySelectorAll('[data-action-add-to-schedule]').forEach(btn => {
      btn.addEventListener('click', () => addToSchedule(btn.dataset.time, btn.dataset.weekday, btn.dataset.teacherName));
    });

    updateStats(upcoming.length, done.length);
  }

  function renderBookingCard(b) {
    const dateLabel = `${DAYS[b.weekday]} · ${b.time}`;
    const isDone = b.status === 'approved' && isPast(b.weekday, b.time);
    const canReview = isDone && !reviewedTeacherIds.has(b.teacher_id);
    const safeName = escapeHtml(b.teacherName);
    const safeNameAttr = escapeHtml(b.teacherName);

    let statusClass, statusLabel, statusEmoji, actionHtml = '';

    if (b.status === 'pending') {
      statusClass = 'pending';
      statusLabel = 'Ожидает';
      statusEmoji = '⏳';
      actionHtml = `
        <button class="booking-card__action booking-card__action--danger" data-action-cancel="${escapeHtml(b.id)}">Отменить</button>
      `;
    }
    else if (b.status === 'approved' && !isDone) {
      statusClass = 'approved';
      statusLabel = 'Одобрена';
      statusEmoji = '✅';
      actionHtml = `
        <button class="booking-card__action booking-card__action--ghost" data-action-add-to-schedule data-weekday="${escapeHtml(b.weekday)}" data-time="${escapeHtml(b.time)}" data-teacher-name="${safeNameAttr}">Добавить в расписание</button>
        <button class="booking-card__action booking-card__action--danger" data-action-cancel="${escapeHtml(b.id)}">Отменить</button>
        <button class="booking-card__action booking-card__action--remove" data-action-remove="${escapeHtml(b.id)}">✕ Удалить</button>
      `;
    }
    else if (b.status === 'approved' && isDone) {
      statusClass = 'done';
      statusLabel = 'Проведено';
      statusEmoji = '✅';
      if (canReview) {
        actionHtml = `
          <button class="booking-card__action booking-card__action--primary" data-action-review="${escapeHtml(b.teacher_id)}" data-teacher-name="${safeNameAttr}">Оценить урок</button>
          <button class="booking-card__action booking-card__action--remove" data-action-remove="${escapeHtml(b.id)}">✕ Удалить</button>
        `;
      } else {
        actionHtml = `<button class="booking-card__action booking-card__action--remove" data-action-remove="${escapeHtml(b.id)}">✕ Удалить</button>`;
      }
    }
    else if (b.status === 'rejected') {
      statusClass = 'rejected';
      statusLabel = 'Отклонена';
      statusEmoji = '❌';
      actionHtml = `<button class="booking-card__action booking-card__action--remove" data-action-remove="${escapeHtml(b.id)}">✕ Удалить</button>`;
    }
    else if (b.status === 'cancelled') {
      statusClass = 'cancelled';
      statusLabel = 'Отменена';
      statusEmoji = '✕';
      actionHtml = `<button class="booking-card__action booking-card__action--remove" data-action-remove="${escapeHtml(b.id)}">✕ Удалить</button>`;
    }

    return `
      <div class="booking-card">
        <div class="booking-card__head">
          <div class="booking-card__date">${escapeHtml(dateLabel)}</div>
          <div class="booking-card__info">
            <span class="booking-card__name">${safeName}</span>
            · ${escapeHtml(b.teacherSubject)}
          </div>
        </div>
        <div class="booking-card__status booking-card__status--${statusClass}">
          ${statusEmoji} ${statusLabel}
        </div>
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

  async function cancelBooking(id) {
    if (!confirm('Отменить заявку?')) return;
    const { error } = await window.supabaseClient
      .from('booking_requests')
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (error) { alert('Ошибка: ' + error.message); return; }
    await loadBookings();
  }

  async function removeBooking(id) {
    if (!confirm('Удалить заявку навсегда?')) return;
    const { error } = await window.supabaseClient
      .from('booking_requests')
      .delete()
      .eq('id', id);
    if (error) { alert('Ошибка: ' + error.message); return; }
    await loadBookings();
  }

  async function addToSchedule(time, weekday, teacherName) {
    const wd = parseInt(weekday, 10);
    const key = wd + '|' + time;
    if (personalMap[key] && personalMap[key].note && personalMap[key].note.trim() !== '') {
      alert('Время занято');
      return;
    }

    const note = 'Урок с ' + teacherName;
    const { error } = await window.supabaseClient
      .from('personal_schedule_student')
      .upsert({
        student_id: currentUser.user.id,
        weekday: wd,
        time: time,
        text_content: note
      }, { onConflict: 'student_id,weekday,time' });

    if (error) { alert('Ошибка: ' + error.message); return; }

    await loadPersonal();
  }

  /* ОТЗЫВ */
  function initReviewModal() {
    const modal = document.querySelector('[data-modal="review"]');
    if (!modal) return;
    modal.querySelectorAll('[data-modal-close]').forEach(el => el.addEventListener('click', closeReviewModal));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeReviewModal(); });
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
      btn.style.color = val <= n ? 'var(--cabinet-accent, var(--accent))' : 'var(--text-mute)';
      btn.style.borderColor = val <= n ? 'var(--cabinet-accent, var(--accent))' : 'var(--border-strong)';
    });
  }

  function openReviewModal(teacherId, teacherName) {
    const modal = document.querySelector('[data-modal="review"]');
    if (!modal) return;
    selectedBooking = { teacherId, teacherName };
    selectedRating = 0;
    paintStars(0);
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
    errEl.textContent = '';
    if (selectedRating < 1 || selectedRating > 5) { errEl.textContent = 'Поставьте оценку от 1 до 5'; return; }
    saveBtn.disabled = true;
    saveBtn.textContent = 'Отправляем…';

    const { error } = await window.supabaseClient.from('reviews').insert({
      teacher_id: selectedBooking.teacherId,
      student_id: currentUser.user.id,
      rating: selectedRating,
      text: ''
    });

    if (error) {
      errEl.textContent = 'Ошибка: ' + error.message;
      saveBtn.disabled = false;
      saveBtn.textContent = 'Отправить';
      return;
    }

    await recalcTeacherRating(selectedBooking.teacherId);

    saveBtn.disabled = false;
    saveBtn.textContent = 'Отправить';
    closeReviewModal();
    reviewedTeacherIds.add(selectedBooking.teacherId);
    await loadBookings();
  }

  async function recalcTeacherRating(teacherId) {
    const { data } = await window.supabaseClient.from('reviews').select('rating').eq('teacher_id', teacherId);
    const list = data || [];
    const count = list.length;
    const avg = count ? Math.round((list.reduce((s, r) => s + (r.rating || 0), 0) / count) * 10) / 10 : 0;
    await window.supabaseClient.from('teachers').update({ rating: avg, reviews_count: count }).eq('id', teacherId);
  }

  /* ЛИЧНОЕ РАСПИСАНИЕ */
  async function loadPersonal() {
    personalMap = {};
    const { data, error } = await window.supabaseClient
      .from('personal_schedule_student')
      .select('id, weekday, time, text_content')
      .eq('student_id', currentUser.user.id)
      .order('weekday', { ascending: true })
      .order('time', { ascending: true });

    if (error) return;

    (data || []).forEach(item => {
      const key = item.weekday + '|' + item.time;
      personalMap[key] = {
        id: item.id,
        note: item.text_content || ''
      };
    });

    renderPersonalBoard();
  }

  function renderPersonalBoard() {
    const board = document.querySelector('[data-personal-student-board]');
    const toggleBtn = document.querySelector('[data-toggle-personal-board]');
    if (!board) return;

    let maxPerDay = 0;
    let html = '';

    DAY_ORDER.forEach(day => {
      const dayCells = Object.keys(personalMap)
        .filter(key => key.startsWith(day + '|'))
        .map(key => ({ key, ...personalMap[key] }))
        .sort((a, b) => a.key.localeCompare(b.key));

      if (dayCells.length > maxPerDay) maxPerDay = dayCells.length;

      const limited = personalExpanded ? dayCells : dayCells.slice(0, 1);
      const moreCount = dayCells.length - limited.length;

      html += `
        <div class="week-day">
          <div class="week-day__head">${DAYS[day]}</div>
          <div class="week-day__body">
            ${limited.length
              ? limited.map(c => renderPersonalCell(day, c)).join('')
              : '<div class="week-day__empty">Нет ячеек</div>'
            }
            ${(!personalExpanded && moreCount > 0) ? `<div class="week-day__more">+${moreCount}</div>` : ''}
          </div>
        </div>
      `;
    });
    board.innerHTML = html;

    if (maxPerDay > 1) {
      if (toggleBtn) toggleBtn.hidden = false;
    } else {
      if (toggleBtn) toggleBtn.hidden = true;
      personalExpanded = false;
    }

    board.querySelectorAll('[data-personal-cell-key]').forEach(el => {
      el.addEventListener('click', () => openPersonalCellModal(el.dataset.personalCellKey));
    });
  }

  function renderPersonalCell(day, cell) {
    const time = cell.key.split('|')[1];
    return `
      <div class="week-cell week-cell--personal" data-personal-cell-key="${escapeHtml(cell.key)}">
        <div class="week-cell__time">${escapeHtml(time)}</div>
        ${cell.note ? `<div class="week-cell__note">${escapeHtml(cell.note)}</div>` : ''}
      </div>
    `;
  }

  function initPersonalCellModal() {
    const modal = document.querySelector('[data-modal="personal-cell-edit"]');
    if (!modal) return;

    modal.querySelectorAll('[data-modal-close]').forEach(el => {
      el.addEventListener('click', () => { modal.hidden = true; document.body.style.overflow = ''; });
    });

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
          await window.supabaseClient.from('personal_schedule_student').delete()
            .eq('student_id', currentUser.user.id)
            .eq('weekday', parseInt(oldDay, 10))
            .eq('time', oldTime);
        }

        const { error } = await window.supabaseClient.from('personal_schedule_student').upsert({
          student_id: currentUser.user.id,
          weekday: day,
          time: time,
          text_content: text
        }, { onConflict: 'student_id,weekday,time' });

        saveBtn.disabled = false;
        saveBtn.textContent = 'Сохранить';
        if (error) { errorEl.textContent = 'Ошибка: ' + error.message; return; }
        modal.hidden = true;
        document.body.style.overflow = '';
        personalEditingKey = null;
        await loadPersonal();
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (!personalEditingKey) return;
        if (!confirm('Удалить эту ячейку?')) return;
        const [oldDay, oldTime] = personalEditingKey.split('|');
        await window.supabaseClient.from('personal_schedule_student').delete()
          .eq('student_id', currentUser.user.id)
          .eq('weekday', parseInt(oldDay, 10))
          .eq('time', oldTime);
        modal.hidden = true;
        document.body.style.overflow = '';
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

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => timeInput && timeInput.focus(), 150);
  }

  async function deleteAccount() {
    if (!confirm('Удалить аккаунт НАВСЕГДА? Все данные будут удалены. Это нельзя отменить.')) return;
    if (!confirm('Точно? Это последнее предупреждение.')) return;
    const { error } = await window.supabaseClient.rpc('delete_user');
    if (error) { alert('Ошибка удаления: ' + error.message); return; }
    alert('Аккаунт удалён. Сейчас вы выйдете.');
    await window.authAPI.signOut();
  }

  document.addEventListener('DOMContentLoaded', init);
})();

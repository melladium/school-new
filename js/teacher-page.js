(function () {
  'use strict';

  let teacher = null;
  let selectedCell = null;
  let currentUser = null;

  const DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

  const SUBJECT_LABELS = {
    math: 'Математика', english: 'Английский', physics: 'Физика',
    russian: 'Русский', chemistry: 'Химия', it: 'Информатика'
  };
  const STATUS_LABELS = { free: 'Свободно', busy: 'Занято', off: 'Не работает' };

  async function init() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) { setText('[data-hero-name]', 'Репетитор не найден'); return; }

    currentUser = window.authAPI ? await window.authAPI.getCurrentUser() : null;
    await loadTeacher(id);
    if (!teacher) { setText('[data-hero-name]', 'Репетитор не найден'); return; }

    renderHero();
    await renderSchedule(id);
    renderBio();
    renderContacts();
    renderPortfolio();
    await renderReviews(id);

    initModals();
    initLightboxes();
  }

  async function loadTeacher(id) {
    const { data, error } = await window.supabaseClient
      .from('teachers')
      .select('id, subject, price, bio, rating, reviews_count, phone, telegram, whatsapp, meeting_link, avatar_url, portfolio_url, portfolio_url_2')
      .eq('id', id)
      .eq('is_active', true)
      .single();
    if (error || !data) return;

    const { data: profile } = await window.supabaseClient
      .from('profiles').select('name').eq('id', id).single();

    teacher = {
      ...data,
      name: (profile && profile.name) || 'Репетитор',
      subjectLabel: SUBJECT_LABELS[data.subject] || data.subject
    };
  }

  function renderHero() {
    document.title = teacher.name + ' — Школа Кузнечевского';
    const initials = teacher.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const avatarEl = document.querySelector('[data-hero-avatar]');
    if (avatarEl) {
      if (teacher.avatar_url) {
        avatarEl.innerHTML = `<img src="${teacher.avatar_url}" alt="">`;
      } else {
        avatarEl.textContent = initials;
      }
    }

    setText('[data-hero-name]', teacher.name);
    setText('[data-hero-subject]', teacher.subjectLabel);
    setText('[data-hero-price]', teacher.price + ' ₽ / урок');
    setText('[data-hero-rating]', teacher.rating || '—');
    setText('[data-hero-reviews]', `· ${teacher.reviews_count || 0} отзывов`);
  }

  function renderBio() {
    if (!teacher.bio) return;
    const el = document.querySelector('[data-section-bio]');
    if (el) el.hidden = false;
    setText('[data-bio-text]', teacher.bio);
  }

  function renderPortfolio() {
    const img1 = document.querySelector('[data-portfolio-image]');
    const img2 = document.querySelector('[data-portfolio-image-2]');
    let hasAny = false;

    if (teacher.portfolio_url && img1) {
      img1.src = teacher.portfolio_url;
      img1.hidden = false;
      hasAny = true;
    }
    if (teacher.portfolio_url_2 && img2) {
      img2.src = teacher.portfolio_url_2;
      img2.hidden = false;
      hasAny = true;
    }

    if (hasAny) {
      const sec = document.querySelector('[data-section-portfolio]');
      if (sec) sec.hidden = false;
    }
  }

  function renderContacts() {
    let hasAny = false;

    if (teacher.telegram) {
      const el = document.querySelector('[data-contact-telegram]');
      if (el) {
        el.hidden = false;
        el.href = 'https://t.me/' + teacher.telegram.replace('@', '');
        hasAny = true;
      }
    }

    if (teacher.whatsapp) {
      const el = document.querySelector('[data-contact-whatsapp]');
      if (el) {
        el.hidden = false;
        el.href = 'https://wa.me/' + teacher.whatsapp.replace(/[^\d]/g, '');
        hasAny = true;
      }
    }

    if (teacher.phone) {
      const el = document.querySelector('[data-contact-phone]');
      if (el) {
        el.hidden = false;
        el.href = 'tel:' + teacher.phone;
        hasAny = true;
      }
    }

    if (teacher.meeting_link) {
      const el = document.querySelector('[data-contact-link]');
      if (el) {
        el.hidden = false;
        el.href = teacher.meeting_link;
        hasAny = true;
      }
    }

    const sec = document.querySelector('[data-section-contacts]');
    if (sec && hasAny) sec.hidden = false;
  }

  async function renderSchedule(teacherId) {
    const el = document.querySelector('[data-schedule]');
    if (!el) return;

    const { data, error } = await window.supabaseClient
      .from('schedule_template')
      .select('weekday, time, status')
      .eq('teacher_id', teacherId)
      .order('weekday', { ascending: true })
      .order('time', { ascending: true });

    if (error) { el.innerHTML = '<div class="tp-schedule__loading">Ошибка загрузки расписания</div>'; return; }
    if (!data || !data.length) { el.innerHTML = '<div class="tp-schedule__empty">Репетитор пока не добавил расписание</div>'; return; }

    const cellsMap = {};
    data.forEach(item => {
      cellsMap[item.weekday + '|' + item.time] = { status: item.status || 'free', time: item.time };
    });

    let html = '<div class="week-board">';
    DAY_ORDER.forEach(day => {
      const dayCells = Object.keys(cellsMap)
        .filter(key => key.startsWith(day + '|'))
        .map(key => ({ key, ...cellsMap[key] }))
        .sort((a, b) => a.time.localeCompare(b.time));

      html += `
        <div class="week-day">
          <div class="week-day__head">${DAYS[day]}</div>
          <div class="week-day__body">
            ${dayCells.length ? dayCells.map(c => renderCell(day, c)).join('') : '<div class="week-day__empty">—</div>'}
          </div>
        </div>
      `;
    });
    html += '</div>';
    el.innerHTML = html;

    el.querySelectorAll('.week-cell--free').forEach(cell => {
      cell.addEventListener('click', () => openRequestModal(cell));
    });
  }

  function renderCell(day, cell) {
    const clickable = cell.status === 'free';
    return `
      <div class="week-cell week-cell--${cell.status} ${clickable ? 'is-clickable' : ''}"
           data-day="${day}" data-time="${cell.time}" data-status="${cell.status}">
        <div class="week-cell__time">${cell.time}</div>
        <div class="week-cell__status">${STATUS_LABELS[cell.status] || cell.status}</div>
      </div>
    `;
  }

  async function renderReviews(teacherId) {
    const { data } = await window.supabaseClient
      .from('reviews')
      .select('rating, text, created_at')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (!data || !data.length) return;

    const sec = document.querySelector('[data-section-reviews]');
    if (sec) sec.hidden = false;
    setText('[data-reviews-count]', data.length);

    const list = document.querySelector('[data-reviews-list]');
    if (list) {
      list.innerHTML = data.map(r => `
        <div class="review">
          <div class="review__head">
            <span class="review__name">Ученик</span>
            <span class="review__rating">★ ${r.rating}</span>
          </div>
          <div class="review__text">${r.text || 'Без комментария'}</div>
        </div>
      `).join('');
    }
  }

  function initModals() {
    document.querySelectorAll('[data-modal-close]').forEach(el => el.addEventListener('click', closeAllModals));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllModals(); });
    const sendBtn = document.querySelector('[data-request-send]');
    if (sendBtn) sendBtn.addEventListener('click', sendRequest);
  }

  function closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.hidden = true);
    document.body.style.overflow = '';
  }

  function openRequestModal(cell) {
    if (!currentUser) { window.location.href = 'login.html'; return; }
    if (currentUser.profile.role !== 'student') { alert('Только ученик может оставить заявку.'); return; }

    const day = parseInt(cell.dataset.day, 10);
    const time = cell.dataset.time;
    selectedCell = { day, time };

    setText('[data-request-teacher]', teacher.name);
    setText('[data-request-subject]', teacher.subjectLabel);
    setText('[data-request-time]', DAYS[day] + ' · ' + time);
    setText('[data-request-price]', teacher.price + ' ₽');

    const errEl = document.querySelector('[data-request-error]');
    if (errEl) errEl.textContent = '';

    document.querySelector('[data-modal="request"]').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  async function sendRequest() {
    if (!selectedCell || !currentUser) return;
    const errEl = document.querySelector('[data-request-error]');
    const btn = document.querySelector('[data-request-send]');
    errEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Отправляем…';

    const { data: existing } = await window.supabaseClient
      .from('booking_requests').select('id')
      .eq('student_id', currentUser.user.id)
      .eq('teacher_id', teacher.id)
      .eq('weekday', selectedCell.day)
      .eq('time', selectedCell.time)
      .in('status', ['pending', 'approved'])
      .maybeSingle();

    if (existing) { errEl.textContent = 'У вас уже есть заявка на это время.'; btn.disabled = false; btn.textContent = 'Отправить заявку'; return; }

    const { error } = await window.supabaseClient.from('booking_requests').insert({
      student_id: currentUser.user.id,
      teacher_id: teacher.id,
      weekday: selectedCell.day,
      time: selectedCell.time,
      status: 'pending'
    });
    btn.disabled = false;
    btn.textContent = 'Отправить заявку';
    if (error) { errEl.textContent = 'Ошибка: ' + error.message; return; }

    closeAllModals();
    document.querySelector('[data-modal="success"]').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function initLightboxes() {
    const hero = document.querySelector('[data-hero-avatar]');
    if (hero) hero.addEventListener('click', () => {
      const img = hero.querySelector('img');
      if (img && img.src) openLightbox(img.src);
    });

    const p1 = document.querySelector('[data-portfolio-image]');
    if (p1) p1.addEventListener('click', () => { if (p1.src) openLightbox(p1.src); });

    const p2 = document.querySelector('[data-portfolio-image-2]');
    if (p2) p2.addEventListener('click', () => { if (p2.src) openLightbox(p2.src); });
  }

  function openLightbox(src) {
    const lb = document.createElement('div');
    lb.className = 'avatar-lightbox';
    lb.innerHTML = `<img src="${src}" alt="">`;
    document.body.appendChild(lb);
    document.body.style.overflow = 'hidden';
    lb.addEventListener('click', () => {
      lb.remove();
      document.body.style.overflow = '';
    });
  }

  function setText(sel, val) {
    const el = document.querySelector(sel);
    if (el) el.textContent = val || '—';
  }

  document.addEventListener('DOMContentLoaded', init);
})();

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

  const STATUS_LABELS = {
    free: 'Свободно',
    busy: 'Занято',
    off: 'Не работает'
  };

  async function init() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
      const nameEl = document.querySelector('[data-hero-name]');
      if (nameEl) nameEl.textContent = 'Репетитор не найден';
      return;
    }

    currentUser = window.authAPI ? await window.authAPI.getCurrentUser() : null;

    await loadTeacher(id);

    if (!teacher) {
      const nameEl = document.querySelector('[data-hero-name]');
      if (nameEl) nameEl.textContent = 'Репетитор не найден';
      return;
    }

    renderHero();
    renderBio();
    renderPortfolio();
    renderContacts();
    await renderSchedule(id);
    await renderReviews(id);

    initModals();
  }

  async function loadTeacher(id) {
    const { data, error } = await window.supabaseClient
      .from('teachers')
      .select('id, subject, price, bio, rating, reviews_count, phone, telegram, whatsapp, meeting_link, avatar_url, portfolio_url')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !data) return;

    const { data: profile } = await window.supabaseClient
      .from('profiles')
      .select('name')
      .eq('id', id)
      .single();

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

    const tgBtn = document.querySelector('[data-hero-telegram]');
    if (tgBtn && teacher.telegram) {
      const handle = teacher.telegram.replace('@', '');
      tgBtn.href = 'https://t.me/' + handle;
      tgBtn.hidden = false;
    }

    const scrollBtn = document.querySelector('[data-scroll-to-schedule]');
    if (scrollBtn) {
      scrollBtn.addEventListener('click', () => {
        const schedule = document.getElementById('schedule');
        if (schedule) schedule.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  function renderBio() {
    if (!teacher.bio) return;
    document.querySelector('[data-section-bio]').hidden = false;
    setText('[data-bio-text]', teacher.bio);
  }

  function renderPortfolio() {
    if (!teacher.portfolio_url) return;
    document.querySelector('[data-section-portfolio]').hidden = false;
    const img = document.querySelector('[data-portfolio-image]');
    if (img) img.src = teacher.portfolio_url;
  }

  function renderContacts() {
    let hasAny = false;

    if (teacher.phone) {
      const el = document.querySelector('[data-contact-phone]');
      if (el) {
        el.hidden = false;
        el.href = 'tel:' + teacher.phone;
        el.querySelector('.tp-contact__value').textContent = teacher.phone;
        hasAny = true;
      }
    }

    if (teacher.telegram) {
      const el = document.querySelector('[data-contact-telegram]');
      if (el) {
        el.hidden = false;
        el.href = 'https://t.me/' + teacher.telegram.replace('@', '');
        el.querySelector('.tp-contact__value').textContent = teacher.telegram;
        hasAny = true;
      }
    }

    if (teacher.whatsapp) {
      const el = document.querySelector('[data-contact-whatsapp]');
      if (el) {
        el.hidden = false;
        el.href = 'https://wa.me/' + teacher.whatsapp.replace(/[^\d]/g, '');
        el.querySelector('.tp-contact__value').textContent = teacher.whatsapp;
        hasAny = true;
      }
    }

    if (teacher.meeting_link) {
      const el = document.querySelector('[data-contact-link]');
      if (el) {
        el.hidden = false;
        el.href = teacher.meeting_link;
        el.querySelector('.tp-contact__value').textContent = teacher.meeting_link;
        hasAny = true;
      }
    }

    if (hasAny) document.querySelector('[data-section-contacts]').hidden = false;
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

    if (error) {
      el.innerHTML = '<div class="tp-schedule__loading">Ошибка загрузки расписания</div>';
      return;
    }

    if (!data || !data.length) {
      el.innerHTML = '<div class="tp-schedule__empty">Репетитор пока не добавил расписание</div>';
      return;
    }

    const cellsMap = {};
    data.forEach(item => {
      const key = item.weekday + '|' + item.time;
      cellsMap[key] = {
        status: item.status || 'free',
        time: item.time
      };
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
            ${dayCells.length
              ? dayCells.map(c => renderCell(day, c)).join('')
              : '<div class="week-day__empty">Нет занятий</div>'
            }
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
    const statusClass = 'week-cell--' + cell.status;
    const statusLabel = STATUS_LABELS[cell.status] || cell.status;
    const clickable = cell.status === 'free';

    return `
      <div class="week-cell ${statusClass} ${clickable ? 'is-clickable' : ''}"
           data-day="${day}"
           data-time="${cell.time}"
           data-status="${cell.status}">
        <div class="week-cell__time">${cell.time}</div>
        <div class="week-cell__status">${statusLabel}</div>
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

    document.querySelector('[data-section-reviews]').hidden = false;
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
    document.querySelectorAll('[data-modal-close]').forEach(el => {
      el.addEventListener('click', closeAllModals);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAllModals();
    });

    const sendBtn = document.querySelector('[data-request-send]');
    if (sendBtn) sendBtn.addEventListener('click', sendRequest);
  }

  function closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.hidden = true);
    document.body.style.overflow = '';
  }

  function openRequestModal(cell) {
    if (!currentUser) {
      window.location.href = 'login.html';
      return;
    }

    if (currentUser.profile.role !== 'student') {
      alert('Только ученик может оставить заявку.');
      return;
    }

    const day = parseInt(cell.dataset.day, 10);
    const time = cell.dataset.time;

    selectedCell = { day, time };

    setText('[data-request-teacher]', teacher.name);
    setText('[data-request-subject]', teacher.subjectLabel);
    setText('[data-request-time]', DAYS[day] + ' · ' + time);
    setText('[data-request-price]', teacher.price + ' ₽');

    const errorEl = document.querySelector('[data-request-error]');
    if (errorEl) errorEl.textContent = '';

    document.querySelector('[data-modal="request"]').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  async function sendRequest() {
    if (!selectedCell || !currentUser) return;

    const errorEl = document.querySelector('[data-request-error]');
    const btn = document.querySelector('[data-request-send]');

    errorEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Отправляем…';

    const { data: existing } = await window.supabaseClient
      .from('booking_requests')
      .select('id')
      .eq('student_id', currentUser.user.id)
      .eq('teacher_id', teacher.id)
      .eq('weekday', selectedCell.day)
      .eq('time', selectedCell.time)
      .in('status', ['pending', 'approved'])
      .maybeSingle();

    if (existing) {
      errorEl.textContent = 'У вас уже есть заявка на это время.';
      btn.disabled = false;
      btn.textContent = 'Отправить заявку';
      return;
    }

    const { error } = await window.supabaseClient.from('booking_requests').insert({
      student_id: currentUser.user.id,
      teacher_id: teacher.id,
      weekday: selectedCell.day,
      time: selectedCell.time,
      status: 'pending'
    });

    btn.disabled = false;
    btn.textContent = 'Отправить заявку';

    if (error) {
      errorEl.textContent = 'Ошибка: ' + error.message;
      return;
    }

    closeAllModals();
    document.querySelector('[data-modal="success"]').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function setText(sel, val) {
    const el = document.querySelector(sel);
    if (el) el.textContent = val || '—';
  }

  document.addEventListener('DOMContentLoaded', init);
})();

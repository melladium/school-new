(function () {
  'use strict';

  let teacher = null;
  let allSlots = [];
  let selectedCell = null;
  let currentUser = null;

  const DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
  const HOURS = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];

  const SUBJECT_LABELS = {
    math: 'Математика', english: 'Английский', physics: 'Физика',
    russian: 'Русский', chemistry: 'Химия', it: 'Информатика'
  };

  async function init() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
      document.querySelector('[data-hero-name]').textContent = 'Репетитор не найден';
      return;
    }

    currentUser = window.authAPI ? await window.authAPI.getCurrentUser() : null;

    await loadTeacher(id);

    if (!teacher) {
      document.querySelector('[data-hero-name]').textContent = 'Репетитор не найден';
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

  /* ЗАГРУЗКА */
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

  /* HERO */
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

  /* О СЕБЕ */
  function renderBio() {
    if (!teacher.bio) return;
    document.querySelector('[data-section-bio]').hidden = false;
    setText('[data-bio-text]', teacher.bio);
  }

  /* ПОРТФОЛИО */
  function renderPortfolio() {
    if (!teacher.portfolio_url) return;
    document.querySelector('[data-section-portfolio]').hidden = false;
    const img = document.querySelector('[data-portfolio-image]');
    if (img) img.src = teacher.portfolio_url;
  }

  /* КОНТАКТЫ */
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

  /* РАСПИСАНИЕ */
  async function renderSchedule(teacherId) {
    const el = document.querySelector('[data-schedule]');
    if (!el) return;

    const { data, error } = await window.supabaseClient
      .from('schedule_template')
      .select('weekday, time, text_content')
      .eq('teacher_id', teacherId);

    if (error) {
      el.innerHTML = '<div class="tp-schedule__loading">Ошибка загрузки расписания</div>';
      return;
    }

    const scheduleMap = {};
    (data || []).forEach(item => {
      scheduleMap[item.weekday + '|' + item.time] = item.text_content || '';
    });

    let html = '<div class="tp-schedule__grid">';
    html += '<div class="tp-schedule__head"></div>';
    DAY_ORDER.forEach(d => {
      html += `<div class="tp-schedule__head">${DAYS[d]}</div>`;
    });

    HOURS.forEach(hour => {
      html += `<div class="tp-schedule__time">${hour}</div>`;
      DAY_ORDER.forEach(d => {
        const key = d + '|' + hour;
        const hasText = scheduleMap.hasOwnProperty(key);

        if (hasText) {
          html += `<div class="tp-schedule__cell tp-schedule__cell--busy" title="${scheduleMap[key]}">занято</div>`;
        } else {
          html += `<div class="tp-schedule__cell tp-schedule__cell--free" data-day="${d}" data-time="${hour}"></div>`;
        }
      });
    });

    html += '</div>';
    el.innerHTML = html;

    el.querySelectorAll('.tp-schedule__cell--free').forEach(cell => {
      cell.addEventListener('click', () => openRequestModal(cell));
    });
  }

  /* ОТЗЫВЫ */
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

  /* МОДАЛКИ */
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

    // Проверка: нет ли уже активной заявки
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

  /* УТИЛИТЫ */
  function setText(sel, val) {
    const el = document.querySelector(sel);
    if (el) el.textContent = val || '—';
  }

  document.addEventListener('DOMContentLoaded', init);
})();

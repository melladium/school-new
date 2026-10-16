(function () {
  'use strict';

  if (window.__teacherPageInit) return;
  window.__teacherPageInit = true;

  let teacher = null;
  let selectedCell = null;
  let currentUser = null;
  let initialized = false;

  const DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

  const SUBJECT_LABELS = {
    math: 'Математика', russian: 'Русский', physics: 'Физика',
    chemistry: 'Химия', biology: 'Биология', it: 'Информатика',
    english: 'Английский', history: 'История', social: 'Обществознание',
    geography: 'География'
  };

  const GOAL_LABELS = {
    school: 'Подтянуть школу', oge: 'ОГЭ', ege: 'ЕГЭ', olymp: 'Олимпиады',
    vuz: 'Подготовка к вузу', essay: 'Сочинение', literacy: 'Грамотность',
    med: 'Медвуз', python: 'Python', web: 'Веб-разработка',
    conversation: 'Разговорный', business: 'Бизнес-английский',
    ielts: 'IELTS / TOEFL'
  };

  const STATUS_LABELS = { free: 'Свободно', busy: 'Занято', off: 'Не работает' };

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  async function init() {
    if (initialized) return;
    initialized = true;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) { setText('[data-hero-name]', 'Репетитор не найден'); return; }

    try {
      currentUser = window.authAPI ? await window.authAPI.getCurrentUser() : null;
    } catch (e) { currentUser = null; }

    await loadTeacher(id);
    if (!teacher) { setText('[data-hero-name]', 'Репетитор не найден'); return; }

    renderHero();
    await renderSchedule(id);
    renderBio();
    renderGoals();
    renderContacts();
    renderPortfolio();

    initModals();
    initPhoneModal();
    initLightboxes();
  }

  async function loadTeacher(id) {
    const { data, error } = await window.supabaseClient
      .from('teachers')
      .select('id, subject, price, bio, rating, reviews_count, phone, telegram, whatsapp, avatar_url, portfolio_url, portfolio_url_2, goals')
      .eq('id', id).eq('is_active', true).single();
    if (error || !data) return;

    const { data: profile } = await window.supabaseClient
      .from('profiles').select('name').eq('id', id).single();

    teacher = {
      ...data,
      name: (profile && profile.name) || 'Репетитор',
      subjectLabel: SUBJECT_LABELS[data.subject] || data.subject,
      goals: Array.isArray(data.goals) ? data.goals : []
    };
  }

  function renderHero() {
    document.title = teacher.name + ' — Школа Кузнечевского';
    const initials = teacher.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const avatarEl = document.querySelector('[data-hero-avatar]');
    if (avatarEl) {
      if (teacher.avatar_url) avatarEl.innerHTML = `<img src="${escapeHtml(teacher.avatar_url)}" alt="" loading="lazy">`;
      else avatarEl.textContent = initials;
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

  function renderGoals() {
    if (!teacher.goals || !teacher.goals.length) return;
    const sec = document.querySelector('[data-section-goals]');
    const list = document.querySelector('[data-goals-list]');
    if (!sec || !list) return;
    const labels = teacher.goals.map(g => GOAL_LABELS[g] || g);
    list.innerHTML = labels.map(l => `<span class="tag">${escapeHtml(l)}</span>`).join('');
    sec.hidden = false;
  }

  function renderPortfolio() {
    const img1 = document.querySelector('[data-portfolio-image]');
    const img2 = document.querySelector('[data-portfolio-image-2]');
    let hasAny = false;

    if (teacher.portfolio_url && img1) {
      img1.src = teacher.portfolio_url; img1.hidden = false; hasAny = true;
    }
    if (teacher.portfolio_url_2 && img2) {
      img2.src = teacher.portfolio_url_2; img2.hidden = false; hasAny = true;
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
        el.href = 'https://t.me/' + encodeURIComponent(teacher.telegram.replace('@', ''));
        hasAny = true;
      }
    }

    if (teacher.whatsapp) {
      const el = document.querySelector('[data-contact-whatsapp]');
      if (el) {
        el.hidden = false;
        const wa = teacher.whatsapp.replace(/[^\d]/g, '');
        el.href = 'https://wa.me/' + encodeURIComponent(wa);
        hasAny = true;
      }
    }

    // Телефон — теперь кнопка, не ссылка
    if (teacher.phone) {
      const el = document.querySelector('[data-contact-phone]');
      if (el) { el.hidden = false; hasAny = true; }
    }

    const sec = document.querySelector('[data-section-contacts]');
    if (sec && hasAny) sec.hidden = false;
  }

  /* ─────────── МОДАЛКА ТЕЛЕФОНА ─────────── */
  function initPhoneModal() {
    const phoneBtn = document.querySelector('[data-contact-phone]');
    const modal = document.querySelector('[data-modal="phone"]');
    if (!phoneBtn || !modal) return;

    const numberEl = modal.querySelector('[data-phone-number]');
    const copyBtn = modal.querySelector('[data-phone-copy]');

    phoneBtn.addEventListener('click', () => {
      if (numberEl) numberEl.textContent = teacher.phone || '—';
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
    });

    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        if (!teacher.phone) return;
        try {
          await navigator.clipboard.writeText(teacher.phone);
          copyBtn.textContent = 'Скопировано ✓';
          setTimeout(() => { copyBtn.textContent = 'Скопировать'; }, 1500);
        } catch (e) {
          // fallback
          const ta = document.createElement('textarea');
          ta.value = teacher.phone;
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); copyBtn.textContent = 'Скопировано ✓'; }
          catch { copyBtn.textContent = 'Не удалось'; }
          ta.remove();
          setTimeout(() => { copyBtn.textContent = 'Скопировать'; }, 1500);
        }
      });
    }
  }

  async function renderSchedule(teacherId) {
    const el = document.querySelector('[data-schedule]');
    if (!el) return;

    const { data, error } = await window.supabaseClient
      .from('schedule_template')
      .select('weekday, time, status, student_name')
      .eq('teacher_id', teacherId)
      .order('weekday', { ascending: true })
      .order('time', { ascending: true });

    if (error) { el.innerHTML = '<div class="tp-schedule__loading">Ошибка загрузки расписания</div>'; return; }
    if (!data || !data.length) { el.innerHTML = '<div class="tp-schedule__empty">Репетитор пока не добавил расписание</div>'; return; }

    const cellsMap = {};
    data.forEach(item => {
      cellsMap[item.weekday + '|' + item.time] = {
        status: item.status || 'free',
        time: item.time,
        studentName: item.student_name || ''
      };
    });

    let maxRows = 1;
    DAY_ORDER.forEach(day => {
      const count = Object.keys(cellsMap).filter(k => k.startsWith(day + '|')).length;
      if (count > maxRows) maxRows = count;
    });

    let html = '<div class="week-board">';
    DAY_ORDER.forEach(day => {
      const dayCells = Object.keys(cellsMap)
        .filter(key => key.startsWith(day + '|'))
        .map(key => ({ key, ...cellsMap[key] }))
        .sort((a, b) => a.time.localeCompare(b.time));

      const cellsHtml = dayCells.length
        ? dayCells.map(c => renderCell(day, c)).join('')
        : '<div class="week-day__empty">—</div>';

      html += `
        <div class="week-day">
          <div class="week-day__head">${DAYS[day]}</div>
          <div class="week-day__body" style="--week-rows:${maxRows}">${cellsHtml}</div>
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
    // В публичном расписании имя ученика НЕ показываем (это видно только учителю)
    // busy без имени → «Занято», busy с именем → тоже «Занято» (не раскрываем личность ученика другим)
    const statusText = STATUS_LABELS[cell.status] || cell.status;

    return `
      <div class="week-cell week-cell--${escapeHtml(cell.status)} ${clickable ? 'is-clickable' : ''}"
           data-day="${escapeHtml(day)}" data-time="${escapeHtml(cell.time)}" data-status="${escapeHtml(cell.status)}">
        <div class="week-cell__time">${escapeHtml(cell.time)}</div>
        <div class="week-cell__status">${escapeHtml(statusText)}</div>
      </div>
    `;
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
      student_id: currentUser.user.id, teacher_id: teacher.id,
      weekday: selectedCell.day, time: selectedCell.time, status: 'pending'
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
    lb.innerHTML = `<img src="${escapeHtml(src)}" alt="">`;
    document.body.appendChild(lb);
    document.body.style.overflow = 'hidden';
    lb.addEventListener('click', () => { lb.remove(); document.body.style.overflow = ''; });
  }

  function setText(sel, val) {
    const el = document.querySelector(sel);
    if (el) el.textContent = val || '—';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

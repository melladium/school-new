(function () {
  'use strict';

  if (window.__teacherPageInit) return;
  window.__teacherPageInit = true;

  let teacher = null;
  let selectedCell = null;
  let currentUser = null;

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
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  async function init() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) { setText('[data-hero-name]', 'Репетитор не найден'); return; }

    try {
      currentUser = window.authAPI ? await window.authAPI.getCurrentUser() : null;
    } catch (e) { currentUser = null; }

    // УБИРАЕМ проверку is_active! Просто ищем по ID.
    const { data, error } = await window.supabaseClient
      .from('teachers')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('Ошибка загрузки учителя:', error);
      setText('[data-hero-name]', 'Репетитор не найден');
      return;
    }

    const { data: profile } = await window.supabaseClient
      .from('profiles').select('name, gender').eq('id', id).single();

    teacher = {
      ...data,
      name: profile ? profile.name : 'Репетитор',
      subjectLabel: SUBJECT_LABELS[data.subject] || data.subject,
      goals: Array.isArray(data.goals) ? data.goals : []
    };

    if (currentUser && currentUser.user && currentUser.user.id !== teacher.id) {
      try {
        await window.supabaseClient.rpc('increment_teacher_view', {
          p_teacher_id: teacher.id,
          p_viewer_id: currentUser.user.id
        });
      } catch (e) {}
    }

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

  function renderHero() {
    document.title = teacher.name + ' — Школа Кузнечевского';
    const initials = teacher.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const avatarEl = document.querySelector('[data-hero-avatar]');
    if (avatarEl) {
      if (teacher.avatar_url) avatarEl.innerHTML = `<img src="${escapeHtml(teacher.avatar_url)}" alt="">`;
      else avatarEl.textContent = initials;
    }

    setText('[data-hero-name]', teacher.name);
    setText('[data-hero-subject]', teacher.subjectLabel);
    setText('[data-hero-price]', teacher.price + ' ₽ / урок');
    setText('[data-hero-rating]', teacher.rating || '—');
    setText('[data-hero-reviews]', `· ${teacher.reviews_count || 0} отзывов`);

    const ratingBlock = document.querySelector('.tp-sidebar__rating');
    if (ratingBlock && !ratingBlock.querySelector('.tp-sidebar__views')) {
      const viewsHtml = document.createElement('span');
      viewsHtml.className = 'tp-sidebar__views';
      viewsHtml.style.cssText = 'margin-left: 8px; color: var(--text-mute); display: inline-flex; align-items: center; gap: 4px;';
      viewsHtml.innerHTML = `· <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> ${teacher.views_count || 0}`;
      ratingBlock.appendChild(viewsHtml);
    }
  }

  function renderBio() {
    if (!teacher.bio) return;
    const section = document.querySelector('[data-section-bio]');
    if (!section) return;

    section.hidden = false;
    section.innerHTML = `
      <h2 class="tp-sidebar__title">О себе</h2>
      <div class="tp-bio-wrap">
        <p class="tp-sidebar__bio tp-bio-text" data-bio-content>${escapeHtml(teacher.bio)}</p>
        <button class="tp-bio-toggle" data-bio-toggle style="display: none;">Развернуть</button>
      </div>
    `;

    const contentEl = section.querySelector('[data-bio-content]');
    const toggleBtn = section.querySelector('[data-bio-toggle]');

    setTimeout(() => {
      if (contentEl.scrollHeight > contentEl.clientHeight) {
        toggleBtn.style.display = 'inline-block';
        toggleBtn.addEventListener('click', () => {
          const isExpanded = contentEl.classList.contains('is-expanded');
          contentEl.classList.toggle('is-expanded');
          toggleBtn.textContent = isExpanded ? 'Развернуть' : 'Свернуть';
        });
      }
    }, 100);
  }

  function renderGoals() {
    if (!teacher.goals.length) return;
    const sec = document.querySelector('[data-section-goals]');
    const list = document.querySelector('[data-goals-list]');
    if (!sec || !list) return;
    list.innerHTML = teacher.goals.map(g => `<span class="tag">${escapeHtml(GOAL_LABELS[g] || g)}</span>`).join('');
    sec.hidden = false;
  }

  function renderPortfolio() {
    const img1 = document.querySelector('[data-portfolio-image]');
    const img2 = document.querySelector('[data-portfolio-image-2]');
    let hasAny = false;

    if (teacher.portfolio_url && img1) { img1.src = teacher.portfolio_url; img1.hidden = false; hasAny = true; }
    if (teacher.portfolio_url_2 && img2) { img2.src = teacher.portfolio_url_2; img2.hidden = false; hasAny = true; }
    
    if (hasAny) {
      const sec = document.querySelector('[data-section-portfolio]');
      if (sec) sec.hidden = false;
    }
  }

  function renderContacts() {
    let hasAny = false;

    if (teacher.telegram) {
      const el = document.querySelector('[data-contact-telegram]');
      if (el) { el.hidden = false; el.href = 'https://t.me/' + encodeURIComponent(teacher.telegram.replace('@', '')); hasAny = true; }
    }
    if (teacher.whatsapp) {
      const el = document.querySelector('[data-contact-whatsapp]');
      if (el) { el.hidden = false; el.href = 'https://wa.me/' + encodeURIComponent(teacher.whatsapp.replace(/[^\d]/g, '')); hasAny = true; }
    }
    if (teacher.phone) {
      const el = document.querySelector('[data-contact-phone]');
      if (el) { el.hidden = false; hasAny = true; }
    }

    const sec = document.querySelector('[data-section-contacts]');
    if (sec && hasAny) sec.hidden = false;
  }

  function initPhoneModal() {
    const phoneBtn = document.querySelector('[data-contact-phone]');
    const modal = document.querySelector('[data-modal="phone"]');
    if (!phoneBtn || !modal) return;

    phoneBtn.addEventListener('click', () => {
      modal.querySelector('[data-phone-number]').textContent = teacher.phone || '—';
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
    });

    modal.querySelector('[data-phone-copy]').addEventListener('click', async () => {
      if (!teacher.phone) return;
      await navigator.clipboard.writeText(teacher.phone);
      const btn = modal.querySelector('[data-phone-copy]');
      btn.textContent = 'Скопировано ✓';
      setTimeout(() => { btn.textContent = 'Скопировать'; }, 1500);
    });
  }

  async function renderSchedule(teacherId) {
    const el = document.querySelector('[data-schedule]');
    if (!el) return;

    const { data } = await window.supabaseClient
      .from('schedule_template').select('weekday, time, status, student_name')
      .eq('teacher_id', teacherId)
      .order('weekday', { ascending: true }).order('time', { ascending: true });

    if (!data || !data.length) { el.innerHTML = '<div class="tp-schedule__empty">Репетитор пока не добавил расписание</div>'; return; }

    const cellsMap = {};
    data.forEach(item => { cellsMap[item.weekday + '|' + item.time] = item; });

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
        ? dayCells.map(c => `
            <div class="week-cell week-cell--${escapeHtml(c.status)} ${c.status === 'free' ? 'is-clickable' : ''}" data-day="${day}" data-time="${c.time}">
              <div class="week-cell__time">${c.time}</div>
              <div class="week-cell__status">${STATUS_LABELS[c.status] || c.status}</div>
            </div>
          `).join('')
        : '<div class="week-day__empty">—</div>';

      html += `<div class="week-day"><div class="week-day__head">${DAYS[day]}</div><div class="week-day__body" style="--week-rows:${maxRows}">${cellsHtml}</div></div>`;
    });
    html += '</div>';
    el.innerHTML = html;

    el.querySelectorAll('.week-cell--free').forEach(cell => {
      cell.addEventListener('click', () => openRequestModal(cell));
    });
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

  async function openRequestModal(cell) {
    if (!currentUser) { window.location.href = 'login.html'; return; }
    if (currentUser.profile.role !== 'student') { alert('Только ученик может оставить заявку.'); return; }

    const day = parseInt(cell.dataset.day, 10);
    const time = cell.dataset.time;
    selectedCell = { day, time };

    setText('[data-request-teacher]', teacher.name);
    setText('[data-request-subject]', teacher.subjectLabel);
    setText('[data-request-time]', DAYS[day] + ' · ' + time);
    setText('[data-request-price]', teacher.price + ' ₽');

    document.querySelector('[data-request-error]').textContent = '';
    document.querySelector('[data-modal="request"]').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  async function sendRequest() {
    if (!selectedCell || !currentUser) return;
    const errEl = document.querySelector('[data-request-error]');
    const btn = document.querySelector('[data-request-send]');
    btn.disabled = true; btn.textContent = 'Отправляем…';

    const { error } = await window.supabaseClient.from('booking_requests').insert({
      student_id: currentUser.user.id, teacher_id: teacher.id,
      weekday: selectedCell.day, time: selectedCell.time, status: 'pending'
    });

    btn.disabled = false; btn.textContent = 'Отправить заявку';
    if (error) { errEl.textContent = 'Ошибка: ' + error.message; return; }

    closeAllModals();
    document.querySelector('[data-modal="success"]').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function initLightboxes() {
    const hero = document.querySelector('[data-hero-avatar]');
    if (hero) hero.addEventListener('click', () => {
      const img = hero.querySelector('img');
      if (img) openLightbox(img.src);
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

  init();
})();

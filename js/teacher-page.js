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

    currentUser = await window.authAPI.getCurrentUser();

    const { data, error } = await window.supabaseClient
      .from('teachers')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
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

    if (currentUser && currentUser.user.id !== teacher.id) {
      await window.supabaseClient.rpc('increment_teacher_view', {
        p_teacher_id: teacher.id,
        p_viewer_id: currentUser.user.id
      });
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
        <p class="tp-sidebar__bio tp-bio-text" data-bio-content>${

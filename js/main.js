(function () {
  'use strict';

  /* ─────────── СПРАВОЧНИКИ ─────────── */

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

  const SUBJECT_GOALS = {
    math: [
      { value: 'school',  label: 'Подтянуть школу' },
      { value: 'oge',     label: 'ОГЭ' },
      { value: 'ege',     label: 'ЕГЭ' },
      { value: 'olymp',   label: 'Олимпиады' },
      { value: 'vuz',     label: 'Подготовка к вузу' }
    ],
    russian: [
      { value: 'school',  label: 'Подтянуть школу' },
      { value: 'oge',     label: 'ОГЭ' },
      { value: 'ege',     label: 'ЕГЭ' },
      { value: 'essay',   label: 'Сочинение / изложение' },
      { value: 'literacy', label: 'Грамотность' }
    ],
    physics: [
      { value: 'school',  label: 'Подтянуть школу' },
      { value: 'oge',     label: 'ОГЭ' },
      { value: 'ege',     label: 'ЕГЭ' },
      { value: 'olymp',   label: 'Олимпиады' },
      { value: 'vuz',     label: 'Подготовка к вузу' }
    ],
    chemistry: [
      { value: 'school',  label: 'Подтянуть школу' },
      { value: 'oge',     label: 'ОГЭ' },
      { value: 'ege',     label: 'ЕГЭ' },
      { value: 'med',     label: 'Медвуз' },
      { value: 'olymp',   label: 'Олимпиады' }
    ],
    biology: [
      { value: 'school',  label: 'Подтянуть школу' },
      { value: 'oge',     label: 'ОГЭ' },
      { value: 'ege',     label: 'ЕГЭ' },
      { value: 'med',     label: 'Медвуз' },
      { value: 'olymp',   label: 'Олимпиады' }
    ],
    it: [
      { value: 'school',  label: 'Школьная информатика' },
      { value: 'oge',     label: 'ОГЭ' },
      { value: 'ege',     label: 'ЕГЭ' },
      { value: 'python',  label: 'Python' },
      { value: 'web',     label: 'Веб-разработка' },
      { value: 'olymp',   label: 'Олимпиады' }
    ],
    english: [
      { value: 'school',       label: 'Школьная программа' },
      { value: 'oge',          label: 'ОГЭ' },
      { value: 'ege',          label: 'ЕГЭ' },
      { value: 'conversation', label: 'Разговорный' },
      { value: 'business',     label: 'Бизнес-английский' },
      { value: 'ielts',        label: 'IELTS / TOEFL' }
    ],
    history: [
      { value: 'school',  label: 'Подтянуть школу' },
      { value: 'oge',     label: 'ОГЭ' },
      { value: 'ege',     label: 'ЕГЭ' },
      { value: 'olymp',   label: 'Олимпиады' },
      { value: 'vuz',     label: 'Подготовка к вузу' }
    ],
    social: [
      { value: 'school',  label: 'Подтянуть школу' },
      { value: 'oge',     label: 'ОГЭ' },
      { value: 'ege',     label: 'ЕГЭ' },
      { value: 'olymp',   label: 'Олимпиады' }
    ],
    geography: [
      { value: 'school',  label: 'Подтянуть школу' },
      { value: 'oge',     label: 'ОГЭ' },
      { value: 'ege',     label: 'ЕГЭ' },
      { value: 'olymp',   label: 'Олимпиады' }
    ]
  };

  const PAGE_SIZE = 9;

  /* ─────────── УТИЛИТЫ ─────────── */

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFinePointer = window.matchMedia('(pointer: fine)').matches;

  document.body.classList.add('is-loading');
  const loader = document.querySelector('[data-loader]');
  const logo = document.querySelector('[data-logo]');

  function hideLoader() {
    if (loader) loader.classList.add('is-done');
    if (logo) logo.classList.add('is-ready');
    document.body.classList.remove('is-loading');
    triggerHero();
  }

  window.addEventListener('load', () => setTimeout(hideLoader, 1100));
  if (document.readyState === 'complete') setTimeout(hideLoader, 1100);

  function triggerHero() {
    document.querySelectorAll('[data-hero-el]').forEach(el => el.classList.add('is-visible'));
  }

  const nav = document.querySelector('.nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('is-scrolled', window.scrollY > 40);
    }, { passive: true });
  }

  /* ─────────── CURSOR GLOW ─────────── */

  const glow = document.querySelector('[data-cursor-glow]');
  if (glow && !prefersReducedMotion && isFinePointer) {
    let gx = 0, gy = 0, tx = 0, ty = 0;
    document.addEventListener('mousemove', (e) => {
      tx = e.clientX;
      ty = e.clientY;
      glow.classList.add('is-active');
    });
    document.addEventListener('mouseleave', () => glow.classList.remove('is-active'));
    (function loop() {
      gx += (tx - gx) * 0.12;
      gy += (ty - gy) * 0.12;
      glow.style.transform = `translate(${gx}px, ${gy}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    })();
  }

  /* ─────────── MAGNETIC ─────────── */

  function initMagnetic() {
    if (prefersReducedMotion || !isFinePointer) return;
    document.querySelectorAll('[data-magnetic]').forEach(btn => {
      if (btn.dataset.magneticBound) return;
      btn.dataset.magneticBound = '1';
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.12}px, ${y * 0.25}px)`;
      });
      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
    });
  }

  /* ─────────── PARALLAX ─────────── */

  const parallaxEl = document.querySelector('[data-parallax]');
  if (parallaxEl && !prefersReducedMotion) {
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (y < window.innerHeight) parallaxEl.style.transform = `translateY(${y * 0.3}px)`;
    }, { passive: true });
  }

  /* ─────────── REVEAL ─────────── */

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

  function observeReveals() {
    document.querySelectorAll('.reveal:not(.is-visible)').forEach(el => revealObserver.observe(el));
  }

  /* ─────────── TEACHER CARD ─────────── */

  function teacherCard(t) {
    const safeName = escapeHtml(t.name || 'Репетитор');
    const safeSubject = escapeHtml(t.subjectLabel || '');
    const initials = (t.name || 'Р').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const freeSlots = (t.slots || []).filter(s => s.free).slice(0, 4);
    const slotsHtml = freeSlots.map(s =>
      `<span class="slot slot--free">${escapeHtml(s.day)} ${escapeHtml(s.time)}</span>`
    ).join('');

    const tagsHtml = (t.tags || []).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('');

    const avatarHtml = t.avatar_url
      ? `<div class="teacher-card__avatar" style="overflow:hidden;padding:0;"><img src="${escapeHtml(t.avatar_url)}" style="width:100%;height:100%;object-fit:cover;" alt=""></div>`
      : `<div class="teacher-card__avatar">${escapeHtml(initials)}</div>`;

    return `
      <a class="teacher-card reveal" href="teacher.html?id=${encodeURIComponent(t.id)}" data-teacher-id="${escapeHtml(t.id)}">
        <div class="teacher-card__head">
          ${avatarHtml}
          <div>
            <div class="teacher-card__name">${safeName}</div>
            <div class="teacher-card__subject">${safeSubject}</div>
          </div>
          <div class="teacher-card__rating">★ ${escapeHtml(t.rating || '—')}</div>
        </div>
        <div class="teacher-card__tags">${tagsHtml}</div>
        <div class="teacher-card__slots">${slotsHtml}</div>
        <div class="teacher-card__foot">
          <div class="teacher-card__price">${escapeHtml(t.price)} ₽<span> / урок</span></div>
          <div class="teacher-card__cta">Подробнее →</div>
        </div>
      </a>
    `;
  }

  /* ─────────── ЗАГРУЗКА УЧИТЕЛЕЙ ─────────── */

  async function loadTeachersFromDB() {
    if (!window.supabaseClient) return [];
    try {
      const { data: teacherRows, error } = await window.supabaseClient
        .from('teachers')
        .select('id, subject, price, bio, rating, reviews_count, avatar_url, goals')
        .eq('is_active', true)
        .order('rating', { ascending: false });

      if (error || !teacherRows || !teacherRows.length) {
        window.TEACHERS = [];
        return [];
      }

      const ids = teacherRows.map(t => t.id);

      const [profilesRes, slotsRes] = await Promise.all([
        window.supabaseClient.from('profiles').select('id, name').in('id', ids),
        window.supabaseClient.from('schedule_template').select('teacher_id, weekday, time, status').in('teacher_id', ids).eq('status', 'free')
      ]);

      const profilesMap = {};
      (profilesRes.data || []).forEach(p => profilesMap[p.id] = p);

      const slotsMap = {};
      (slotsRes.data || []).forEach(s => {
        if (!slotsMap[s.teacher_id]) slotsMap[s.teacher_id] = [];
        slotsMap[s.teacher_id].push(s);
      });

      const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

      const result = teacherRows.map(t => {
        const profile = profilesMap[t.id] || {};
        const slots = (slotsMap[t.id] || []).map(s => ({
          day: days[s.weekday],
          time: (s.time || '').slice(0, 5),
          free: true
        }));

        return {
          id: t.id,
          name: profile.name || 'Репетитор',
          subject: t.subject,
          subjectLabel: SUBJECT_LABELS[t.subject] || t.subject,
          goals: t.goals || [],
          tags: [SUBJECT_LABELS[t.subject] || t.subject],
          price: t.price,
          rating: t.rating || 0,
          reviewsCount: t.reviews_count || 0,
          bio: t.bio || '',
          avatar_url: t.avatar_url || '',
          slots: slots
        };
      });

      window.TEACHERS = result;
      return result;
    } catch (e) {
      console.warn('База недоступна:', e);
      window.TEACHERS = [];
      return [];
    }
  }

  /* ─────────── ПОДБОР ─────────── */

  const podborState = { step: 1, subject: null, goal: null, budget: null, shown: PAGE_SIZE };

  const podborSteps = document.querySelectorAll('.podbor__step');
  const podborBar = document.querySelector('.podbor__bar');
  const podborNext = document.querySelector('[data-podbor-next]');
  const podborBack = document.querySelector('[data-podbor-back]');
  const podborResults = document.querySelector('[data-podbor-results]');
  const podborGrid = document.querySelector('[data-podbor-grid]');
  const podborCard = document.querySelector('.podbor__card');
  const podborReset = document.querySelector('[data-podbor-reset]');
  const goalChips = document.querySelector('[data-goal-chips]');
  const hintSubject = document.querySelector('[data-hint="subject"]');
  const hintGoal = document.querySelector('[data-hint="goal"]');

  function renderGoalChips() {
    if (!goalChips) return;
    if (!podborState.subject) {
      goalChips.innerHTML = '<span style="color:var(--text-mute);font-size:14px;">Сначала выберите предмет</span>';
      return;
    }
    const goals = SUBJECT_GOALS[podborState.subject] || [];
    if (!goals.length) {
      goalChips.innerHTML = '<span style="color:var(--text-mute);font-size:14px;">Сначала выберите предмет</span>';
      return;
    }
    goalChips.innerHTML = goals.map(g =>
      `<button class="chip" data-value="${escapeHtml(g.value)}">${escapeHtml(g.label)}</button>`
    ).join('');
  }

  const podborRoot = document.querySelector('.podbor');
  if (podborRoot) {
    podborRoot.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      const group = chip.closest('.chips');
      if (!group) return;
      const field = group.dataset.field;

      group.querySelectorAll('.chip').forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');

      if (field === 'subject') {
        podborState.subject = chip.dataset.value;
        podborState.goal = null;
        if (hintSubject) hintSubject.hidden = true;
        renderGoalChips();
      } else if (field === 'goal') {
        podborState.goal = chip.dataset.value;
        if (hintGoal) hintGoal.hidden = true;
      } else if (field === 'budget') {
        podborState.budget = chip.dataset.value;
      }
    });
  }

  function updatePodborUI() {
    podborSteps.forEach(s => s.classList.toggle('is-active', +s.dataset.step === podborState.step));
    if (podborBar) podborBar.style.width = (podborState.step / 3 * 100) + '%';
    if (podborBack) podborBack.disabled = podborState.step === 1;
    if (podborNext) podborNext.textContent = podborState.step === 3 ? 'Показать репетиторов' : 'Далее';
  }

  function shakeChips(selector) {
    const chips = document.querySelectorAll(selector + ' .chip');
    if (!chips.length) return;
    chips.forEach(c => {
      c.classList.add('is-shake');
      setTimeout(() => c.classList.remove('is-shake'), 400);
    });
  }

  if (podborBack) {
    podborBack.addEventListener('click', () => {
      if (podborState.step > 1) { podborState.step--; updatePodborUI(); }
    });
  }

  if (podborNext) {
    podborNext.addEventListener('click', async () => {
      if (podborState.step === 1 && !podborState.subject) {
        if (hintSubject) hintSubject.hidden = false;
        shakeChips('.podbor [data-field="subject"]');
        return;
      }
      if (podborState.step === 2 && !podborState.goal) {
        if (hintGoal) hintGoal.hidden = false;
        shakeChips('.podbor [data-field="goal"]');
        return;
      }
      if (podborState.step < 3) {
        podborState.step++;
        updatePodborUI();
      } else {
        await runPodbor();
      }
    });
  }

  let podborAllResults = [];

  async function runPodbor() {
    if (!podborGrid) return;
    podborNext.disabled = true;
    podborNext.textContent = 'Ищем…';

    const all = await loadTeachersFromDB();
    let list = [...all];

    if (podborState.subject) list = list.filter(t => t.subject === podborState.subject);
    if (podborState.goal) list = list.filter(t => Array.isArray(t.goals) && t.goals.includes(podborState.goal));
    if (podborState.budget && podborState.budget !== 'any') {
      const max = +podborState.budget;
      list = list.filter(t => t.price <= max);
    }

    list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    podborAllResults = list;
    podborState.shown = PAGE_SIZE;

    podborNext.disabled = false;
    podborNext.textContent = 'Показать репетиторов';

    renderPodborResults();

    podborCard.style.display = 'none';
    podborResults.hidden = false;
    podborResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
    observeReveals();
    initMagnetic();
  }

  function renderPodborResults() {
    if (!podborGrid) return;
    const total = podborAllResults.length;

    if (!total) {
      podborGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">😕</div>
          <div class="empty-state__title">Пока никого нет</div>
          <div class="empty-state__desc">Попробуйте изменить задачу или увеличить бюджет.</div>
          <button class="btn btn--ghost" data-podbor-reset-inline style="margin-top:16px;">Пройти заново</button>
        </div>
      `;
      const inlineReset = podborGrid.querySelector('[data-podbor-reset-inline]');
      if (inlineReset) inlineReset.addEventListener('click', resetPodbor);
      return;
    }

    const shown = podborAllResults.slice(0, podborState.shown);
    let html = shown.map(teacherCard).join('');

    if (podborState.shown < total) {
      html += `
        <div class="podbor__more" style="grid-column:1/-1;text-align:center;margin-top:16px;">
          <button class="btn btn--ghost" data-podbor-more>Показать ещё (${total - podborState.shown})</button>
        </div>
      `;
    }

    podborGrid.innerHTML = html;

    const moreBtn = podborGrid.querySelector('[data-podbor-more]');
    if (moreBtn) {
      moreBtn.addEventListener('click', () => {
        podborState.shown += PAGE_SIZE;
        renderPodborResults();
        observeReveals();
      });
    }
  }

  function resetPodbor() {
    podborState.step = 1;
    podborState.subject = null;
    podborState.goal = null;
    podborState.budget = null;
    podborState.shown = PAGE_SIZE;
    document.querySelectorAll('.podbor .chip').forEach(c => c.classList.remove('is-active'));
    if (hintSubject) hintSubject.hidden = true;
    if (hintGoal) hintGoal.hidden = true;
    podborCard.style.display = '';
    podborResults.hidden = true;
    renderGoalChips();
    updatePodborUI();
    const podborSection = document.querySelector('#podbor');
    if (podborSection) podborSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (podborReset) podborReset.addEventListener('click', resetPodbor);

  renderGoalChips();
  updatePodborUI();
  observeReveals();
  initMagnetic();

  /* ─────────── BURGER ─────────── */

  const burger = document.querySelector('.nav__burger');
  if (burger) {
    burger.addEventListener('click', () => {
      const links = document.querySelector('.nav__links');
      if (!links) return;
      const isOpen = links.style.display === 'flex';
      links.style.display = isOpen ? '' : 'flex';
      links.style.position = 'absolute';
      links.style.top = '100%';
      links.style.left = '0';
      links.style.right = '0';
      links.style.flexDirection = 'column';
      links.style.padding = '20px';
      links.style.background = 'rgba(8,8,10,0.95)';
      links.style.backdropFilter = 'blur(20px)';
      links.style.borderBottom = '1px solid var(--border)';
    });
  }

  /* ─────────── AUTH HEADER ─────────── */

  async function initAuthHeader() {
    if (!window.authAPI) return;

    const current = await window.authAPI.getCurrentUser();
    if (!current) return;

    const role = current.profile.role;
    const cabinetHref = role === 'teacher' ? 'cabinet-teacher.html' : 'cabinet-student.html';
    const name = current.profile.name || current.profile.email || 'Профиль';
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const actions = document.querySelector('[data-nav-actions]');
    if (actions) actions.hidden = true;

    const userMenu = document.querySelector('[data-user-menu]');
    const link = document.querySelector('[data-user-link]');
    const nameEl = document.querySelector('[data-user-name]');
    const avatarEl = document.querySelector('[data-user-avatar]');

    if (userMenu) userMenu.hidden = false;
    if (link) link.href = cabinetHref;
    if (nameEl) nameEl.textContent = current.profile.name || 'Профиль';
    if (avatarEl) avatarEl.textContent = initials;

    initNotifications(current.user.id);
  }

  /* ─────────── УВЕДОМЛЕНИЯ ─────────── */

  function initNotifications(userId) {
    const bell = document.querySelector('[data-notif-bell]');
    const panel = document.querySelector('[data-notif-panel]');
    if (!bell || !panel) return;

    bell.addEventListener('click', async (e) => {
      e.stopPropagation();
      panel.hidden = !panel.hidden;
      if (!panel.hidden) await renderNotifications(userId, panel);
    });

    document.addEventListener('click', (e) => {
      if (!panel.contains(e.target) && !bell.contains(e.target)) panel.hidden = true;
    });

    loadUnreadCount(userId);
  }

  async function loadUnreadCount(userId) {
    const countEl = document.querySelector('[data-notif-count]');
    if (!countEl) return;
    const { count } = await window.supabaseClient
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (count && count > 0) { countEl.textContent = count; countEl.hidden = false; }
    else { countEl.hidden = true; }
  }

  async function renderNotifications(userId, panel) {
    const { data } = await window.supabaseClient
      .from('notifications')
      .select('id, text, link, read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!data || !data.length) {
      panel.innerHTML = '<div class="notif-empty">Пока нет уведомлений</div>';
      return;
    }

    panel.innerHTML = data.map(n => `
      <div class="notif-item ${n.read ? '' : 'is-unread'}" data-notif-id="${escapeHtml(n.id)}" data-link="${escapeHtml(n.link || '')}">
        ${escapeHtml(n.text)}
        <span class="notif-item__time">${escapeHtml(formatTime(n.created_at))}</span>
      </div>
    `).join('');

    panel.querySelectorAll('[data-notif-id]').forEach(item => {
      item.addEventListener('click', async () => {
        await window.supabaseClient.from('notifications').update({ read: true }).eq('id', item.dataset.notifId);
        if (item.dataset.link) window.location.href = item.dataset.link;
        else await renderNotifications(userId, panel);
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthHeader);
  } else {
    initAuthHeader();
  }

})();

(function () {
  'use strict';

  const SUBJECT_LABELS = {
    math: 'Математика', russian: 'Русский', physics: 'Физика',
    chemistry: 'Химия', biology: 'Биология', it: 'Информатика',
    english: 'Английский', history: 'История', social: 'Обществознание',
    geography: 'География'
  };

  const SUBJECT_GOALS = {
    math: [
      { value: 'school', label: 'Подтянуть школу' }, { value: 'oge', label: 'ОГЭ' },
      { value: 'ege', label: 'ЕГЭ' }, { value: 'olymp', label: 'Олимпиады' },
      { value: 'vuz', label: 'Подготовка к вузу' }
    ],
    russian: [
      { value: 'school', label: 'Подтянуть школу' }, { value: 'oge', label: 'ОГЭ' },
      { value: 'ege', label: 'ЕГЭ' }, { value: 'essay', label: 'Сочинение' },
      { value: 'literacy', label: 'Грамотность' }
    ],
    physics: [
      { value: 'school', label: 'Подтянуть школу' }, { value: 'oge', label: 'ОГЭ' },
      { value: 'ege', label: 'ЕГЭ' }, { value: 'olymp', label: 'Олимпиады' },
      { value: 'vuz', label: 'Подготовка к вузу' }
    ],
    chemistry: [
      { value: 'school', label: 'Подтянуть школу' }, { value: 'oge', label: 'ОГЭ' },
      { value: 'ege', label: 'ЕГЭ' }, { value: 'med', label: 'Медвуз' },
      { value: 'olymp', label: 'Олимпиады' }
    ],
    biology: [
      { value: 'school', label: 'Подтянуть школу' }, { value: 'oge', label: 'ОГЭ' },
      { value: 'ege', label: 'ЕГЭ' }, { value: 'med', label: 'Медвуз' },
      { value: 'olymp', label: 'Олимпиады' }
    ],
    it: [
      { value: 'school', label: 'Школьная информатика' }, { value: 'oge', label: 'ОГЭ' },
      { value: 'ege', label: 'ЕГЭ' }, { value: 'python', label: 'Python' },
      { value: 'web', label: 'Веб-разработка' }, { value: 'olymp', label: 'Олимпиады' }
    ],
    english: [
      { value: 'school', label: 'Школьная программа' }, { value: 'oge', label: 'ОГЭ' },
      { value: 'ege', label: 'ЕГЭ' }, { value: 'conversation', label: 'Разговорный' },
      { value: 'business', label: 'Бизнес-английский' }, { value: 'ielts', label: 'IELTS / TOEFL' }
    ],
    history: [
      { value: 'school', label: 'Подтянуть школу' }, { value: 'oge', label: 'ОГЭ' },
      { value: 'ege', label: 'ЕГЭ' }, { value: 'olymp', label: 'Олимпиады' },
      { value: 'vuz', label: 'Подготовка к вузу' }
    ],
    social: [
      { value: 'school', label: 'Подтянуть школу' }, { value: 'oge', label: 'ОГЭ' },
      { value: 'ege', label: 'ЕГЭ' }, { value: 'olymp', label: 'Олимпиады' }
    ],
    geography: [
      { value: 'school', label: 'Подтянуть школу' }, { value: 'oge', label: 'ОГЭ' },
      { value: 'ege', label: 'ЕГЭ' }, { value: 'olymp', label: 'Олимпиады' }
    ]
  };

  const PAGE_SIZE = 9;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFinePointer = window.matchMedia('(pointer: fine)').matches;
  const isMobile = window.matchMedia('(max-width: 1024px)').matches;

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  document.body.classList.add('is-loading');
  const loader = document.querySelector('[data-loader]');
  const logo = document.querySelector('[data-logo]');

  function hideLoader() {
    if (loader) loader.classList.add('is-done');
    if (logo) logo.classList.add('is-ready');
    document.body.classList.remove('is-loading');
    document.querySelectorAll('[data-hero-el]').forEach(el => el.classList.add('is-visible'));
  }

  if (document.readyState === 'complete') setTimeout(hideLoader, 1100);
  else window.addEventListener('load', () => setTimeout(hideLoader, 1100));

  const nav = document.querySelector('.nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('is-scrolled', window.scrollY > 40);
    }, { passive: true });
  }

  const glow = document.querySelector('[data-cursor-glow]');
  if (glow && !prefersReducedMotion && isFinePointer && !isMobile) {
    let gx = 0, gy = 0, tx = 0, ty = 0, rafId = null, running = false;

    function loop() {
      gx += (tx - gx) * 0.15;
      gy += (ty - gy) * 0.15;
      glow.style.transform = `translate(${gx}px, ${gy}px) translate(-50%, -50%)`;
      if (Math.abs(tx - gx) > 0.5 || Math.abs(ty - gy) > 0.5) {
        rafId = requestAnimationFrame(loop);
      } else {
        running = false;
      }
    }

    document.addEventListener('mousemove', (e) => {
      tx = e.clientX; ty = e.clientY;
      glow.classList.add('is-active');
      if (!running) { running = true; rafId = requestAnimationFrame(loop); }
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
      glow.classList.remove('is-active');
      if (rafId) cancelAnimationFrame(rafId);
      running = false;
    });
  } else if (glow) {
    glow.style.display = 'none';
  }

  function initMagnetic() {
    if (prefersReducedMotion || !isFinePointer || isMobile) return;
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

  const parallaxEl = document.querySelector('[data-parallax]');
  if (parallaxEl && !prefersReducedMotion && !isMobile) {
    let rafPending = false;
    window.addEventListener('scroll', () => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < window.innerHeight) parallaxEl.style.transform = `translateY(${y * 0.3}px)`;
        rafPending = false;
      });
    }, { passive: true });
  }

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

  function teacherCard(t) {
    const safeName = escapeHtml(t.name || 'Репетитор');
    const safeSubject = escapeHtml(t.subjectLabel || '');
    const initials = (t.name || 'Р').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const freeSlots = (t.slots || []).filter(s => s.free).slice(0, 4);
    const slotsHtml = freeSlots.map(s =>
      `<span class="slot slot--free">${escapeHtml(s.day)} ${escapeHtml(s.time)}</span>`
    ).join('');

    const avatarHtml = t.avatar_url
      ? `<div class="teacher-card__avatar" style="overflow:hidden;padding:0;"><img src="${escapeHtml(t.avatar_url)}" style="width:100%;height:100%;object-fit:cover;" alt="" loading="lazy"></div>`
      : `<div class="teacher-card__avatar">${escapeHtml(initials)}</div>`;

    return `
      <a class="teacher-card reveal" href="teacher.html?id=${encodeURIComponent(t.id)}" data-teacher-id="${escapeHtml(t.id)}">
        <div class="teacher-card__head">
          ${avatarHtml}
          <div style="flex:1;">
            <div class="teacher-card__name">${safeName}</div>
            <div class="teacher-card__subject">${safeSubject}</div>
          </div>
          <div class="teacher-card__meta" style="display:flex; flex-direction:column; align-items:flex-end; gap:4px; font-size:11px; color:var(--text-mute); font-family:var(--font-mono);">
            <div class="teacher-card__rating" style="margin-left:0;">★ ${escapeHtml(t.rating || '—')}</div>
            <div class="teacher-card__views" style="display:flex; align-items:center; gap:4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              ${escapeHtml(t.views_count || 0)}
            </div>
          </div>
        </div>
        <div class="teacher-card__slots">${slotsHtml}</div>
        <div class="teacher-card__foot">
          <div class="teacher-card__price">${escapeHtml(t.price)} ₽<span> / урок</span></div>
          <div class="teacher-card__cta">Подробнее →</div>
        </div>
      </a>
    `;
  }

  async function loadTeachersFromDB() {
    if (!window.supabaseClient) return [];
    try {
      const { data: teacherRows, error } = await window.supabaseClient
        .from('teachers')
        .select('id, subject, price, bio, rating, reviews_count, avatar_url, goals, views_count, gender')
        .eq('is_active', true)
        .order('rating', { ascending: false })
        .order('reviews_count', { ascending: false });

      if (error || !teacherRows || !teacherRows.length) { window.TEACHERS = []; return []; }

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
          day: days[s.weekday], time: (s.time || '').slice(0, 5), free: true
        }));
        return {
          id: t.id,
          name: profile.name || 'Репетитор',
          subject: t.subject,
          subjectLabel: SUBJECT_LABELS[t.subject] || t.subject,
          goals: t.goals || [],
          price: t.price,
          rating: t.rating || 0,
          reviewsCount: t.reviews_count || 0,
          views_count: t.views_count || 0,
          gender: t.gender || null,
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

  const podborState = { step: 1, subject: null, goal: null, budget: null, gender: null, shown: PAGE_SIZE };
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
  const hintBudget = document.querySelector('[data-hint="budget"]');
  const hintGender = document.querySelector('[data-hint="gender"]');

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
        if (hintBudget) hintBudget.hidden = true;
      } else if (field === 'gender') {
        podborState.gender = chip.dataset.value;
        if (hintGender) hintGender.hidden = true;
      }
    });
  }

  function

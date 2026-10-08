(function () {
  'use strict';

  const SUBJECT_GOALS = {
    math: [
      { value: 'oge', label: 'ОГЭ' },
      { value: 'ege', label: 'ЕГЭ' },
      { value: 'school', label: 'Подтянуть школу' },
      { value: 'olymp', label: 'Олимпиады' }
    ],
    english: [
      { value: 'school', label: 'Школа' },
      { value: 'ege', label: 'ЕГЭ' },
      { value: 'conversation', label: 'Разговорный' },
      { value: 'business', label: 'Бизнес' }
    ],
    physics: [
      { value: 'oge', label: 'ОГЭ' },
      { value: 'ege', label: 'ЕГЭ' },
      { value: 'school', label: 'Подтянуть школу' },
      { value: 'olymp', label: 'Олимпиады' }
    ],
    russian: [
      { value: 'oge', label: 'ОГЭ' },
      { value: 'ege', label: 'ЕГЭ' },
      { value: 'school', label: 'Подтянуть школу' },
      { value: 'essay', label: 'Сочинение' }
    ],
    chemistry: [
      { value: 'oge', label: 'ОГЭ' },
      { value: 'ege', label: 'ЕГЭ' },
      { value: 'school', label: 'Подтянуть школу' },
      { value: 'med', label: 'Медвуз' }
    ],
    it: [
      { value: 'ege', label: 'ЕГЭ' },
      { value: 'python', label: 'Python' },
      { value: 'olymp', label: 'Олимпиады' },
      { value: 'school', label: 'Школа' }
    ]
  };

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFinePointer = window.matchMedia('(pointer: fine)').matches;

  /* LOADER */
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

  /* NAV */
  const nav = document.querySelector('.nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('is-scrolled', window.scrollY > 40);
    }, { passive: true });
  }

  /* CURSOR GLOW */
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

  /* MAGNETIC */
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

  /* PARALLAX */
  const parallaxEl = document.querySelector('[data-parallax]');
  if (parallaxEl && !prefersReducedMotion) {
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (y < window.innerHeight) parallaxEl.style.transform = `translateY(${y * 0.3}px)`;
    }, { passive: true });
  }

  /* REVEAL */
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

  /* CARD CURSOR */
  document.addEventListener('mousemove', (e) => {
    const card = e.target.closest('.teacher-card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    card.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });

  /* TEACHER CARD */
  function teacherCard(t) {
    const initials = (t.name || 'Р').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const freeSlots = (t.slots || []).filter(s => s.free).slice(0, 4);
    const slotsHtml = freeSlots.map(s =>
      `<span class="slot slot--free" data-slot data-slot-id="${s.id}" data-day="${s.day}" data-time="${s.time}">${s.day} ${s.time}</span>`
    ).join('');
    const tagsHtml = (t.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('');

    const avatarHtml = t.avatar_url
      ? `<div class="teacher-card__avatar" style="overflow:hidden;padding:0;"><img src="${t.avatar_url}" style="width:100%;height:100%;object-fit:cover;" alt=""></div>`
      : `<div class="teacher-card__avatar">${initials}</div>`;

    return `
      <article class="teacher-card reveal" data-teacher-id="${t.id}">
        <div class="teacher-card__head">
          ${avatarHtml}
          <div>
            <div class="teacher-card__name">${t.name}</div>
            <div class="teacher-card__subject">${t.subjectLabel}</div>
          </div>
          <div class="teacher-card__rating">★ ${t.rating || '—'}</div>
        </div>
        <div class="teacher-card__tags">${tagsHtml}</div>
        <div class="teacher-card__slots">${slotsHtml}</div>
        <div class="teacher-card__foot">
          <div class="teacher-card__price">${t.price} ₽<span> / урок</span></div>
          <div class="teacher-card__cta">Подробнее →</div>
        </div>
      </article>
    `;
  }

  /* LOAD TEACHERS */
  async function loadTeachersFromDB() {
    if (!window.supabaseClient) return [];
    try {
      const { data: teacherRows, error } = await window.supabaseClient
        .from('teachers')
        .select('id, subject, price, bio, rating, reviews_count, avatar_url')
        .eq('is_active', true)
        .order('rating', { ascending: false });

      if (error || !teacherRows || !teacherRows.length) {
        window.TEACHERS = [];
        return [];
      }

      const ids = teacherRows.map(t => t.id);

      const [profilesRes, slotsRes, reviewsRes] = await Promise.all([
        window.supabaseClient.from('profiles').select('id, name').in('id', ids),
        window.supabaseClient.from('slots').select('id, teacher_id, date, time, is_booked').in('teacher_id', ids).eq('is_booked', false),
        window.supabaseClient.from('reviews').select('teacher_id, rating, text').in('teacher_id', ids)
      ]);

      const profilesMap = {};
      (profilesRes.data || []).forEach(p => profilesMap[p.id] = p);

      const slotsMap = {};
      (slotsRes.data || []).forEach(s => {
        if (!slotsMap[s.teacher_id]) slotsMap[s.teacher_id] = [];
        slotsMap[s.teacher_id].push(s);
      });

      const reviewsMap = {};
      (reviewsRes.data || []).forEach(r => {
        if (!reviewsMap[r.teacher_id]) reviewsMap[r.teacher_id] = [];
        reviewsMap[r.teacher_id].push(r);
      });

      const subjectLabels = {
        math: 'Математика', english: 'Английский', physics: 'Физика',
        russian: 'Русский', chemistry: 'Химия', it: 'Информатика'
      };

      const days = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];

      const result = teacherRows.map(t => {
        const profile = profilesMap[t.id] || {};
        const slots = (slotsMap[t.id] || []).slice(0, 8).map(s => {
          const d = new Date(s.date);
          return {
            id: s.id,
            day: days[d.getDay()],
            time: (s.time || '').slice(0, 5),
            free: !s.is_booked
          };
        });

        return {
          id: t.id,
          name: profile.name || 'Репетитор',
          subject: t.subject,
          subjectLabel: subjectLabels[t.subject] || t.subject,
          goals: [],
          tags: [subjectLabels[t.subject] || t.subject],
          price: t.price,
          rating: t.rating || 0,
          reviewsCount: t.reviews_count || 0,
          bio: t.bio || '',
          avatar_url: t.avatar_url || '',
          slots: slots,
          reviews: (reviewsMap[t.id] || []).slice(0, 5).map(r => ({
            name: 'Ученик',
            rating: r.rating,
            text: r.text || ''
          }))
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

  /* PODBOR */
  const podborState = { step: 1, subject: null, goal: null, time: null, budget: null };

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
      `<button class="chip" data-value="${g.value}">${g.label}</button>`
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
      } else if (field === 'time') {
        podborState.time = chip.dataset.value;
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

  async function runPodbor() {
    if (!podborGrid) return;
    podborNext.disabled = true;
    podborNext.textContent = 'Ищем…';

    const all = await loadTeachersFromDB();
    let list = [...all];

    if (podborState.subject) list = list.filter(t => t.subject === podborState.subject);
    if (podborState.budget && podborState.budget !== 'any') {
      const max = +podborState.budget;
      list = list.filter(t => t.price <= max);
    }
    if (podborState.time) {
      const timeMap = {
        morning: ['10:00', '11:00', '12:00'],
        day: ['13:00', '14:00', '15:00', '16:00'],
        evening: ['17:00', '18:00', '19:00', '20:00', '21:00'],
        weekend: ['Сб', 'Вс']
      };
      const rule = timeMap[podborState.time];
      list = list.filter(t => (t.slots || []).some(s => {
        if (!s.free) return false;
        if (podborState.time === 'weekend') return rule.includes(s.day);
        return rule.includes(s.time);
      }));
    }

    list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    list = list.slice(0, 3);

    podborNext.disabled = false;
    podborNext.textContent = 'Показать репетиторов';

    if (!list.length) {
      podborGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">😕</div>
          <div class="empty-state__title">Пока никого нет</div>
          <div class="empty-state__desc">Репетиторы появятся здесь после регистрации. Попробуйте позже.</div>
        </div>
      `;
    } else {
      podborGrid.innerHTML = list.map(teacherCard).join('');
    }

    podborCard.style.display = 'none';
    podborResults.hidden = false;
    podborResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
    observeReveals();
    initMagnetic();
  }

  if (podborReset) {
    podborReset.addEventListener('click', () => {
      podborState.step = 1;
      podborState.subject = null;
      podborState.goal = null;
      podborState.time = null;
      podborState.budget = null;
      document.querySelectorAll('.podbor .chip').forEach(c => c.classList.remove('is-active'));
      if (hintSubject) hintSubject.hidden = true;
      if (hintGoal) hintGoal.hidden = true;
      podborCard.style.display = '';
      podborResults.hidden = true;
      renderGoalChips();
      updatePodborUI();
      document.querySelector('#podbor').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  renderGoalChips();
  updatePodborUI();
  observeReveals();
  initMagnetic();

  /* TEACHER MODAL */
  const teacherModal = document.querySelector('[data-modal="teacher"]');
  const teacherContent = document.querySelector('[data-teacher-content]');

  function openTeacherModal(id) {
    const t = (window.TEACHERS || []).find(x => String(x.id) === String(id));
    if (!t || !teacherModal) return;

    const initials = (t.name || 'Р').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const avatarHtml = t.avatar_url
      ? `<div class="tp__avatar" style="overflow:hidden;padding:0;"><img src="${t.avatar_url}" style="width:100%;height:100%;object-fit:cover;" alt=""></div>`
      : `<div class="tp__avatar">${initials}</div>`;

    const slotsHtml = (t.slots || []).map(s =>
      `<span class="slot ${s.free ? 'slot--free' : 'slot--busy'}" ${s.free ? `data-slot data-slot-id="${s.id}" data-day="${s.day}" data-time="${s.time}" data-teacher="${t.id}"` : ''}>${s.day} ${s.time}</span>`
    ).join('');
    const tagsHtml = (t.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('');
    const reviewsHtml = (t.reviews || []).map(r => `
      <div class="review">
        <div class="review__head">
          <span class="review__name">${r.name}</span>
          <span class="review__rating">★ ${r.rating}</span>
        </div>
        <div class="review__text">${r.text}</div>
      </div>
    `).join('') || '<div style="color:var(--text-mute);font-size:14px;">Пока нет отзывов</div>';

    teacherContent.innerHTML = `
      <div class="tp">
        <div class="tp__head">
          ${avatarHtml}
          <div>
            <div class="tp__name">${t.name}</div>
            <div class="tp__subject">${t.subjectLabel} · ${t.reviewsCount || 0} отзывов</div>
          </div>
          <div class="tp__rating">★ ${t.rating || '—'}</div>
        </div>
        <div class="tp__grid">
          <div>
            <div class="tp__section-title">О преподавателе</div>
            <p class="tp__bio">${t.bio || 'Информация пока не заполнена'}</p>
            <div class="tp__section-title">Специализация</div>
            <div class="teacher-card__tags">${tagsHtml}</div>
          </div>
          <div>
            <div class="tp__section-title">Свободные слоты</div>
            <div class="tp__slots">${slotsHtml || '<span style="color:var(--text-mute);font-size:13px;">Слотов пока нет</span>'}</div>
            <div class="tp__section-title" style="margin-top:24px;">Отзывы</div>
            <div class="tp__reviews">${reviewsHtml}</div>
          </div>
        </div>
        <div class="tp__foot">
          <div class="tp__price">${t.price} ₽<span> / урок</span></div>
          <button class="btn btn--primary btn--lg" data-pay-open data-teacher="${t.id}">Забронировать</button>
        </div>
      </div>
    `;

    teacherModal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModals() {
    document.querySelectorAll('.modal').forEach(m => m.hidden = true);
    document.body.style.overflow = '';
  }

  document.addEventListener('click', (e) => {
    const card = e.target.closest('[data-teacher-id]');
    if (card) { openTeacherModal(card.dataset.teacherId); return; }
    if (e.target.closest('[data-modal-close]')) { closeModals(); return; }

    const slot = e.target.closest('.slot--free[data-teacher]');
    if (slot) {
      e.preventDefault();
      openPayModal(slot.dataset.teacher, slot.dataset.slotId, slot.dataset.day, slot.dataset.time);
      return;
    }

    const payOpen = e.target.closest('[data-pay-open]');
    if (payOpen) {
      e.preventDefault();
      const t = (window.TEACHERS || []).find(x => String(x.id) === String(payOpen.dataset.teacher));
      if (!t) return;
      const firstFree = (t.slots || []).find(s => s.free);
      openPayModal(t.id, firstFree?.id || null, firstFree?.day || '—', firstFree?.time || '—');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModals();
  });

  /* PAY MODAL */
  const payModal = document.querySelector('[data-modal="pay"]');
  const payContent = document.querySelector('[data-pay-content]');

  async function openPayModal(teacherId, slotId, day, time) {
    const t = (window.TEACHERS || []).find(x => String(x.id) === String(teacherId));
    if (!t || !payModal) return;

    const currentUser = window.authAPI ? await window.authAPI.getCurrentUser() : null;

    if (currentUser) {
      const { data: existing } = await window.supabaseClient
        .from('bookings')
        .select('id, status')
        .eq('student_id', currentUser.user.id)
        .eq('teacher_id', t.id)
        .in('status', ['pending', 'confirmed'])
        .maybeSingle();

      if (existing) {
        const msg = existing.status === 'pending'
          ? 'У вас уже есть заявка к этому репетитору. Дождитесь подтверждения.'
          : 'У вас уже есть подтверждённый урок с этим репетитором.';
        payContent.innerHTML = `
          <div class="pay">
            <div class="pay__title">Заявка уже есть</div>
            <p style="color:var(--text-dim);margin-bottom:24px;">${msg}</p>
            <button class="btn btn--ghost btn--lg" style="width:100%;" data-modal-close>Закрыть</button>
          </div>
        `;
        payModal.hidden = false;
        document.body.style.overflow = 'hidden';
        return;
      }
    }

    payContent.innerHTML = `
      <div class="pay">
        <div class="pay__title">Бронирование урока</div>
        <div class="pay__lesson">
          <div class="pay__row"><span class="pay__row-label">Репетитор</span><span class="pay__row-value">${t.name}</span></div>
          <div class="pay__row"><span class="pay__row-label">Предмет</span><span class="pay__row-value">${t.subjectLabel}</span></div>
          <div class="pay__row"><span class="pay__row-label">Время</span><span class="pay__row-value">${day} ${time}</span></div>
          <div class="pay__row"><span class="pay__row-label">Длительность</span><span class="pay__row-value">60 мин</span></div>
        </div>
        <div class="pay__free-note">На старте всё бесплатно — вы платите репетитору напрямую, без комиссий.</div>
        <div class="pay__lesson" style="background:transparent;border:none;padding:0;">
          <div class="pay__row"><span class="pay__row-label">Стоимость урока</span><span class="pay__row-value">${t.price} ₽</span></div>
          <div class="pay__row"><span class="pay__row-label">Комиссия сервиса</span><span class="pay__row-value" style="color:var(--accent);">0 ₽</span></div>
          <div class="pay__divider"></div>
          <div class="pay__row pay__row--total"><span class="pay__row-label">Итого</span><span class="pay__row-value">${t.price} ₽</span></div>
        </div>
        ${!currentUser ? '<div style="color:var(--red);font-size:13px;margin-top:12px;text-align:center;">Чтобы забронировать — войдите или зарегистрируйтесь</div>' : ''}
        <button class="btn btn--primary btn--lg" style="width:100%;margin-top:24px;" data-pay-confirm ${!currentUser ? 'disabled' : ''}>
          ${currentUser ? 'Подтвердить бронь' : 'Нужен аккаунт'}
        </button>
        <div class="pay__demo">Демо-режим · деньги не списываются</div>
      </div>
    `;

    const confirmBtn = payContent.querySelector('[data-pay-confirm]');
    if (confirmBtn && currentUser) {
      confirmBtn.addEventListener('click', () => createBooking(t, slotId, day, time, currentUser));
    }

    payModal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  async function createBooking(t, slotId, day, time, currentUser) {
    const confirmBtn = payContent.querySelector('[data-pay-confirm]');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Бронируем…';
    }

    const { data: existing } = await window.supabaseClient
      .from('bookings')
      .select('id')
      .eq('student_id', currentUser.user.id)
      .eq('teacher_id', t.id)
      .in('status', ['pending', 'confirmed'])
      .maybeSingle();

    if (existing) {
      payContent.innerHTML = `
        <div class="pay">
          <div class="pay__title">Заявка уже есть</div>
          <p style="color:var(--text-dim);margin-bottom:24px;">У вас уже есть активная заявка к этому репетитору.</p>
          <button class="btn btn--ghost btn--lg" style="width:100%;" data-modal-close>Закрыть</button>
        </div>
      `;
      return;
    }

    const { error } = await window.supabaseClient.from('bookings').insert({
      student_id: currentUser.user.id,
      teacher_id: t.id,
      slot_id: slotId,
      status: 'pending'
    });

    if (error) {
      payContent.innerHTML = `
        <div class="pay">
          <div class="pay__title">Ошибка</div>
          <p style="color:var(--red);margin-bottom:24px;">${error.message}</p>
          <button class="btn btn--ghost btn--lg" style="width:100%;" data-modal-close>Закрыть</button>
        </div>
      `;
      return;
    }

    payContent.innerHTML = `
      <div class="pay">
        <div class="pay__success">
          <div class="pay__success-icon">✓</div>
          <h3>Заявка отправлена</h3>
          <p>Свяжемся с ${t.name} на ${day} ${time}.<br>Репетитор подтвердит бронь в кабинете.</p>
          <button class="btn btn--ghost btn--lg" data-modal-close>Закрыть</button>
        </div>
      </div>
    `;
  }

  /* MOBILE BURGER */
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

})();
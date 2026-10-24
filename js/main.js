(function () {
  'use strict';

  const SUBJECT_LABELS = {
    math: 'Математика', russian: 'Русский', physics: 'Физика',
    chemistry: 'Химия', biology: 'Биология', it: 'Информатика',
    english: 'Английский', history: 'История', social: 'Обществознание',
    geography: 'География'
  };

  const SUBJECT_GOALS = {
    math: [{ value: 'school', label: 'Подтянуть школу' }, { value: 'oge', label: 'ОГЭ' }, { value: 'ege', label: 'ЕГЭ' }, { value: 'olymp', label: 'Олимпиады' }, { value: 'vuz', label: 'Подготовка к вузу' }],
    russian: [{ value: 'school', label: 'Подтянуть школу' }, { value: 'oge', label: 'ОГЭ' }, { value: 'ege', label: 'ЕГЭ' }, { value: 'essay', label: 'Сочинение' }, { value: 'literacy', label: 'Грамотность' }],
    physics: [{ value: 'school', label: 'Подтянуть школу' }, { value: 'oge', label: 'ОГЭ' }, { value: 'ege', label: 'ЕГЭ' }, { value: 'olymp', label: 'Олимпиады' }, { value: 'vuz', label: 'Подготовка к вузу' }],
    chemistry: [{ value: 'school', label: 'Подтянуть школу' }, { value: 'oge', label: 'ОГЭ' }, { value: 'ege', label: 'ЕГЭ' }, { value: 'med', label: 'Медвуз' }, { value: 'olymp', label: 'Олимпиады' }],
    biology: [{ value: 'school', label: 'Подтянуть школу' }, { value: 'oge', label: 'ОГЭ' }, { value: 'ege', label: 'ЕГЭ' }, { value: 'med', label: 'Медвуз' }, { value: 'olymp', label: 'Олимпиады' }],
    it: [{ value: 'school', label: 'Школьная информатика' }, { value: 'oge', label: 'ОГЭ' }, { value: 'ege', label: 'ЕГЭ' }, { value: 'python', label: 'Python' }, { value: 'web', label: 'Веб-разработка' }, { value: 'olymp', label: 'Олимпиады' }],
    english: [{ value: 'school', label: 'Школьная программа' }, { value: 'oge', label: 'ОГЭ' }, { value: 'ege', label: 'ЕГЭ' }, { value: 'conversation', label: 'Разговорный' }, { value: 'business', label: 'Бизнес-английский' }, { value: 'ielts', label: 'IELTS / TOEFL' }],
    history: [{ value: 'school', label: 'Подтянуть школу' }, { value: 'oge', label: 'ОГЭ' }, { value: 'ege', label: 'ЕГЭ' }, { value: 'olymp', label: 'Олимпиады' }, { value: 'vuz', label: 'Подготовка к вузу' }],
    social: [{ value: 'school', label: 'Подтянуть школу' }, { value: 'oge', label: 'ОГЭ' }, { value: 'ege', label: 'ЕГЭ' }, { value: 'olymp', label: 'Олимпиады' }],
    geography: [{ value: 'school', label: 'Подтянуть школу' }, { value: 'oge', label: 'ОГЭ' }, { value: 'ege', label: 'ЕГЭ' }, { value: 'olymp', label: 'Олимпиады' }]
  };

  const PAGE_SIZE = 9;
  let podborState = { step: 1, subject: null, goal: null, gender: null, budget: null, shown: PAGE_SIZE };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // --- АВТОПОДБОР ---
  const podborNext = document.querySelector('[data-podbor-next]');
  const podborBack = document.querySelector('[data-podbor-back]');
  const goalChips = document.querySelector('[data-goal-chips]');
  
  document.querySelectorAll('.teacher-card').forEach(c => c.style.display = 'none'); // Прячем статику

  function updatePodborUI() {
    document.querySelectorAll('.podbor__step').forEach(s => s.classList.toggle('is-active', +s.dataset.step === podborState.step));
    document.querySelector('.podbor__bar').style.width = (podborState.step / 4 * 100) + '%';
    if (podborBack) podborBack.disabled = podborState.step === 1;
    if (podborNext) podborNext.textContent = podborState.step === 4 ? 'Показать репетиторов' : 'Далее';
  }

  document.querySelector('.podbor').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const field = chip.closest('.chips').dataset.field;
    
    chip.closest('.chips').querySelectorAll('.chip').forEach(c => c.classList.remove('is-active'));
    chip.classList.add('is-active');

    if (field === 'subject') {
      podborState.subject = chip.dataset.value;
      podborState.goal = null;
      const goals = SUBJECT_GOALS[podborState.subject] || [];
      goalChips.innerHTML = goals.map(g => `<button class="chip" data-value="${g.value}">${g.label}</button>`).join('');
    } else if (field === 'goal') {
      podborState.goal = chip.dataset.value;
    } else if (field === 'gender') {
      podborState.gender = chip.dataset.value;
    } else if (field === 'budget') {
      podborState.budget = chip.dataset.value;
    }
  });

  if (podborBack) podborBack.addEventListener('click', () => { if (podborState.step > 1) { podborState.step--; updatePodborUI(); } });
  
  if (podborNext) {
    podborNext.addEventListener('click', async () => {
      if (podborState.step < 4) { podborState.step++; updatePodborUI(); }
      else { await runPodbor(); }
    });
  }

  async function runPodbor() {
    podborNext.disabled = true;
    podborNext.textContent = 'Ищем…';

    const { data: teachers } = await window.supabaseClient
      .from('teachers')
      .select('id, subject, price, rating, reviews_count, avatar_url, goals, gender, views_count, is_active')
      .eq('is_active', true);

    let list = teachers || [];
    
    // ФИЛЬТР
    if (podborState.subject) list = list.filter(t => t.subject === podborState.subject);
    if (podborState.goal) list = list.filter(t => t.goals && t.goals.includes(podborState.goal));
    
    // МЯГКИЙ ФИЛЬТР ПО ПОЛУ (если выбрано "Не важно" — пропускаем всех)
    if (podborState.gender && podborState.gender !== 'any') {
      list = list.filter(t => !t.gender || t.gender === podborState.gender);
    }
    
    if (podborState.budget && podborState.budget !== 'any') {
      list = list.filter(t => t.price <= +podborState.budget);
    }

    // Загружаем имена
    const ids = list.map(t => t.id);
    if (ids.length > 0) {
      const { data: profiles } = await window.supabaseClient.from('profiles').select('id, name').in('id', ids);
      const pMap = {};
      profiles.forEach(p => pMap[p.id] = p.name);
      list.forEach(t => t.name = pMap[t.id] || 'Репетитор');
    }

    podborNext.disabled = false;
    podborNext.textContent = 'Показать репетиторов';
    
    document.querySelector('.podbor__card').style.display = 'none';
    document.querySelector('[data-podbor-results]').hidden = false;
    
    renderResults(list);
  }

  function renderResults(list) {
    const grid = document.querySelector('[data-podbor-grid]');
    if (list.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-mute);">Никого не нашли по этим критериям</div>`;
      return;
    }
    
    grid.innerHTML = list.map(t => `
      <a href="teacher.html?id=${t.id}" class="teacher-card" style="display: flex;">
        <div class="teacher-card__head">
          <div class="teacher-card__avatar">${t.avatar_url ? `<img src="${escapeHtml(t.avatar_url)}">` : escapeHtml(t.name[0])}</div>
          <div>
            <div class="teacher-card__name">${escapeHtml(t.name)}</div>
            <div class="teacher-card__subject">${SUBJECT_LABELS[t.subject] || t.subject}</div>
          </div>
          <div class="teacher-card__rating">★ ${t.rating || '—'}</div>
        </div>
        <div class="teacher-card__foot">
          <div class="teacher-card__price">${t.price} ₽<span> / урок</span></div>
          <div class="teacher-card__cta">Подробнее →</div>
        </div>
      </a>
    `).join('');
  }

  // --- ХЕДЕР ---
  async function initAuthHeader() {
    if (!window.authAPI) return;
    const current = await window.authAPI.getCurrentUser();
    if (!current) return;

    const actions = document.querySelector('[data-nav-actions]');
    if (actions) actions.hidden = true;

    const userMenu = document.querySelector('[data-user-menu]');
    if (userMenu) userMenu.hidden = false;
    
    const link = document.querySelector('[data-user-link]');
    if (link) link.href = current.profile.role === 'teacher' ? 'cabinet-teacher.html' : 'cabinet-student.html';
    
    const nameEl = document.querySelector('[data-user-name]');
    if (nameEl) nameEl.textContent = current.profile.name || 'Профиль';
    
    const avatarEl = document.querySelector('[data-user-avatar]');
    if (avatarEl) avatarEl.textContent = (current.profile.name || 'П')[0].toUpperCase();
  }

  document.addEventListener('DOMContentLoaded', () => {
    initAuthHeader();
    updatePodborUI();
  });
})();

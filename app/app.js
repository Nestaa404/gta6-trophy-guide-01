// app.js — the tracker itself. Loads data/trophies.json, keeps earned ticks
// and counters in localStorage, and wires up the checklist: search, kind
// filters (story, missable, collectibles, activities, side, combat, money,
// exploration — plus online, which the official list has none of), grade
// filter, sorting, the spoiler setting, export/import, and hash routing
// (#checklist, #roadmap, #missable, #spoiler, #trophy-<id>).

import { renderTrophyList, GRADE_LABELS } from './views.js';
import { renderRoadmap, renderMissable } from './roadmap.js';

const STORAGE_KEY = 'leonida-trophy-guide-v1';
const SPOILER_KEY = 'leonida-trophy-guide-spoiler-v1';

const FILTERS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'story', label: 'Story', test: (t) => t.kind === 'story' },
  { id: 'missable', label: 'Missable', test: (t) => t.missable },
  { id: 'collectible', label: 'Collectibles', test: (t) => t.kind === 'collectible' || t.kind === 'exploration' },
  { id: 'activity', label: 'Activities', test: (t) => t.kind === 'activity' },
  { id: 'side', label: 'Stranger strands', test: (t) => t.kind === 'side' },
  { id: 'combat', label: 'Combat', test: (t) => t.kind === 'combat' },
  { id: 'money', label: 'Money', test: (t) => t.kind === 'money' },
  { id: 'online', label: 'Online', test: () => false },
  { id: 'earned', label: 'Earned', test: (t, s) => s.earned.has(t.id) },
  { id: 'remaining', label: 'Remaining', test: (t, s) => !s.earned.has(t.id) },
];

const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };

const state = {
  trophies: [],
  earned: new Set(),
  counts: {},
  filter: 'all',
  grade: 'all',
  query: '',
  sort: 'list',
  spoilerOn: false,
  openId: null,
  view: 'checklist',
};

const $ = (id) => document.getElementById(id);
const listElement = $('trophy-list');

// ---------- persistence ----------

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.earned)) state.earned = new Set(data.earned.filter((id) => Number.isInteger(id)));
    if (data.counts && typeof data.counts === 'object') {
      for (const [key, value] of Object.entries(data.counts)) {
        const id = Number(key);
        if (Number.isInteger(id) && Number.isFinite(value)) state.counts[id] = Math.max(0, value);
      }
    }
  } catch {
    // A corrupt save is ignored; the tracker starts empty instead of breaking.
  }
  try {
    state.spoilerOn = localStorage.getItem(SPOILER_KEY) === '1';
  } catch {
    state.spoilerOn = false;
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      earned: [...state.earned].sort((a, b) => a - b),
      counts: state.counts,
      savedAt: new Date().toISOString(),
    }));
    const note = $('saved-note');
    note.textContent = 'Progress saved in this browser.';
    window.clearTimeout(save._timer);
    save._timer = window.setTimeout(() => { note.textContent = ''; }, 2500);
  } catch {
    // Storage full or unavailable (private mode): the page still works.
  }
}

// ---------- filtering & sorting ----------

function visibleTrophies() {
  const filter = FILTERS.find((f) => f.id === state.filter) || FILTERS[0];
  const query = state.query.trim().toLowerCase();
  let out = state.trophies.filter((t) => {
    if (state.grade !== 'all' && t.grade !== state.grade) return false;
    if (!filter.test(t, state)) return false;
    if (!query) return true;
    const haystack = [t.name, t.description, t.guide, t.chapter || '', t.kind, ...(t.steps || [])]
      .join(' ').toLowerCase();
    return haystack.includes(query);
  });
  if (state.sort === 'grade') {
    out = [...out].sort((a, b) => GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade] || a.id - b.id);
  } else if (state.sort === 'name') {
    out = [...out].sort((a, b) => a.name.localeCompare(b.name));
  } else if (state.sort === 'roadmap') {
    out = [...out].sort((a, b) => a.roadmap - b.roadmap || a.id - b.id);
  }
  return out;
}

// ---------- rendering ----------

function renderProgress() {
  const total = state.trophies.length;
  const earned = state.earned.size;
  $('earned-count').textContent = String(earned);
  $('progress-percent').textContent = total ? `${Math.round((earned / total) * 100)}%` : '0%';
  $('progress-fill').style.width = total ? `${(earned / total) * 100}%` : '0%';
  const byGrade = {};
  for (const t of state.trophies) {
    if (state.earned.has(t.id)) byGrade[t.grade] = (byGrade[t.grade] || 0) + 1;
  }
  const totals = {};
  for (const t of state.trophies) totals[t.grade] = (totals[t.grade] || 0) + 1;
  $('grade-counts').textContent = Object.keys(GRADE_LABELS)
    .map((g) => `${GRADE_LABELS[g]} ${byGrade[g] || 0}/${totals[g] || 0}`)
    .join(' · ');
}

function renderFilters() {
  const container = $('filters');
  container.replaceChildren();
  for (const filter of FILTERS) {
    const count = filter.id === 'online'
      ? 0
      : state.trophies.filter((t) => filter.test(t, state)).length;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip' + (state.filter === filter.id ? ' active' : '');
    chip.setAttribute('aria-pressed', state.filter === filter.id ? 'true' : 'false');
    chip.textContent = `${filter.label} `;
    const countSpan = document.createElement('span');
    countSpan.className = 'count';
    countSpan.textContent = `(${count})`;
    chip.append(countSpan);
    if (filter.id === 'online') chip.title = 'The official list has no online trophies.';
    chip.addEventListener('click', () => {
      state.filter = filter.id;
      renderAll();
    });
    container.append(chip);
  }
}

function renderList() {
  const visible = visibleTrophies();
  renderTrophyList(listElement, visible, state, {
    onToggle: (id, checked) => {
      if (checked) state.earned.add(id);
      else state.earned.delete(id);
      save();
      renderAll();
    },
    onCount: (id, value) => {
      state.counts[id] = value;
      save();
      renderAll();
    },
    onToggleDetail: (id) => {
      state.openId = state.openId === id ? null : id;
      renderList();
    },
  });
  $('result-count').textContent = `Showing ${visible.length} of ${state.trophies.length} trophies` +
    (state.filter === 'online' ? ' — the official 55-trophy list has no online trophies.' : '');
  $('empty-state').hidden = visible.length > 0;
}

function renderViews() {
  for (const view of ['checklist', 'roadmap', 'missable']) {
    $(`view-${view}`).hidden = state.view !== view;
  }
  for (const tab of document.querySelectorAll('.tab')) {
    tab.classList.toggle('active', tab.dataset.view === state.view);
  }
  if (state.view === 'roadmap') renderRoadmap($('roadmap-stages'), state.trophies, state);
  if (state.view === 'missable') renderMissable($('missable-list'), state.trophies, state);
}

function renderAll() {
  renderProgress();
  renderFilters();
  renderList();
  renderViews();
}

// ---------- export / import ----------

function exportProgress() {
  const payload = {
    app: 'leonida-trophy-guide',
    game: 'Grand Theft Auto VI',
    exportedAt: new Date().toISOString(),
    earned: [...state.earned].sort((a, b) => a - b),
    counts: state.counts,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'gta6-trophy-progress.json';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

async function importProgress(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const earned = Array.isArray(data.earned) ? data.earned : (Array.isArray(data) ? data : null);
    if (!earned) throw new Error('no earned list');
    const validIds = new Set(state.trophies.map((t) => t.id));
    state.earned = new Set(earned.filter((id) => validIds.has(id)));
    if (data.counts && typeof data.counts === 'object') {
      state.counts = {};
      for (const [key, value] of Object.entries(data.counts)) {
        const id = Number(key);
        if (validIds.has(id) && Number.isFinite(value)) state.counts[id] = Math.max(0, value);
      }
    }
    save();
    renderAll();
    $('saved-note').textContent = `Imported ${state.earned.size} earned trophies.`;
  } catch {
    $('saved-note').textContent = 'That file is not a progress export from this guide.';
  }
}

// ---------- hash routing ----------

function applyHash() {
  const hash = window.location.hash.replace(/^#/, '');
  if (hash === 'roadmap' || hash === 'missable') {
    state.view = hash;
  } else if (hash === 'spoiler') {
    state.view = 'checklist';
    state.spoilerOn = true;
    $('spoiler').checked = true;
    try { localStorage.setItem(SPOILER_KEY, '1'); } catch { /* ignore */ }
  } else if (hash.startsWith('trophy-')) {
    state.view = 'checklist';
    const id = Number(hash.slice('trophy-'.length));
    if (Number.isInteger(id)) state.openId = id;
  } else {
    state.view = 'checklist';
  }
  renderAll();
  if (state.openId) {
    const target = document.getElementById(`trophy-${state.openId}`);
    if (target) target.scrollIntoView({ block: 'start' });
  }
}

// ---------- boot ----------

async function boot() {
  loadStored();
  const response = await fetch('data/trophies.json');
  const doc = await response.json();
  state.trophies = doc.trophies || [];

  $('search').addEventListener('input', (e) => {
    state.query = e.target.value;
    renderList();
  });
  $('grade-filter').addEventListener('change', (e) => {
    state.grade = e.target.value;
    renderList();
  });
  $('sort').addEventListener('change', (e) => {
    state.sort = e.target.value;
    renderList();
  });
  $('spoiler').checked = state.spoilerOn;
  $('spoiler').addEventListener('change', (e) => {
    state.spoilerOn = e.target.checked;
    try { localStorage.setItem(SPOILER_KEY, state.spoilerOn ? '1' : '0'); } catch { /* ignore */ }
    renderList();
  });
  $('export-btn').addEventListener('click', exportProgress);
  $('import-file').addEventListener('change', (e) => {
    importProgress(e.target.files[0]);
    e.target.value = '';
  });
  $('reset-btn').addEventListener('click', () => {
    if (!window.confirm('Clear all earned ticks and counters? This cannot be undone.')) return;
    state.earned = new Set();
    state.counts = {};
    save();
    renderAll();
  });
  for (const tab of document.querySelectorAll('.tab')) {
    tab.addEventListener('click', () => {
      state.view = tab.dataset.view;
      renderViews();
    });
  }
  window.addEventListener('hashchange', applyHash);

  applyHash();
}

boot();

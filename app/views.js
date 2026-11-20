// views.js — renders one trophy as a checklist card: grade badge, kind and
// roadmap tags, missable flag, a counter for counted trophies, and an
// expandable guide with steps and named sources. Spoiler mode hides the
// name, description and guide of un-earned story trophies.

export const GRADE_LABELS = {
  platinum: 'Platinum',
  gold: 'Gold',
  silver: 'Silver',
  bronze: 'Bronze',
};

export const KIND_LABELS = {
  platinum: 'Platinum',
  story: 'Story',
  completion: 'Completion',
  activity: 'Activity',
  side: 'Stranger strand',
  collectible: 'Collectible',
  combat: 'Combat',
  exploration: 'Exploration',
  money: 'Money',
  misc: 'Moment',
};

export const STAGE_NAMES = {
  1: 'Story — chapters & missions',
  2: 'Stranger strands',
  3: 'Collectibles & exploration',
  4: 'Activities & skills',
  5: 'Combat, chaos & money',
  6: 'Platinum cleanup',
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function formatCount(value) {
  return Number(value).toLocaleString('en-US');
}

// A story trophy whose name would spoil the plot: show a placeholder until
// it is earned (or until the reader turns the spoiler setting off).
export function isSpoilerHidden(trophy, spoilerOn, earned) {
  return spoilerOn && trophy.kind === 'story' && !earned.has(trophy.id);
}

export function trophyCard(trophy, state, handlers) {
  const earned = state.earned.has(trophy.id);
  const hidden = isSpoilerHidden(trophy, state.spoilerOn, state.earned);
  const li = el('li', 'trophy' + (earned ? ' earned' : ''));
  li.id = `trophy-${trophy.id}`;

  const head = el('div', 'trophy-head');

  const boxWrap = el('label', 'earn-box');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned;
  box.setAttribute('aria-label', `Mark ${trophy.name} as earned`);
  box.addEventListener('change', () => handlers.onToggle(trophy.id, box.checked));
  boxWrap.append(box);
  head.append(boxWrap);

  const main = el('div', 'trophy-main');
  const nameHeading = el('h3', 'trophy-name');
  const nameButton = document.createElement('button');
  nameButton.type = 'button';
  nameButton.textContent = hidden ? 'Hidden story trophy — earn it to reveal' : trophy.name;
  nameButton.setAttribute('aria-expanded', state.openId === trophy.id ? 'true' : 'false');
  nameButton.addEventListener('click', () => handlers.onToggleDetail(trophy.id));
  nameHeading.append(nameButton);
  main.append(nameHeading);

  const desc = el('p', 'trophy-desc', hidden
    ? 'Story spoiler hidden. Earn this trophy (or turn the spoiler setting off) to see its name and description.'
    : trophy.description);
  main.append(desc);

  const meta = el('div', 'trophy-meta');
  meta.append(el('span', `badge badge-${trophy.grade}`, GRADE_LABELS[trophy.grade]));
  if (KIND_LABELS[trophy.kind] !== GRADE_LABELS[trophy.grade]) {
    meta.append(el('span', 'badge badge-kind', KIND_LABELS[trophy.kind] || trophy.kind));
  }
  meta.append(el('span', 'badge badge-stage', `Stage ${trophy.roadmap}`));
  if (trophy.chapter) meta.append(el('span', 'badge badge-kind', trophy.chapter));
  if (trophy.missable) meta.append(el('span', 'badge badge-missable', '⚠ Missable'));
  main.append(meta);

  if (typeof trophy.count === 'number' && trophy.count > 1) {
    const current = state.counts[trophy.id] || 0;
    const counter = el('div', 'counter');
    const minus = el('button', null, '−');
    minus.type = 'button';
    minus.setAttribute('aria-label', `Decrease count for ${trophy.name}`);
    minus.addEventListener('click', () => handlers.onCount(trophy.id, Math.max(0, current - 1)));
    const out = el('output', null, `${formatCount(current)} / ${formatCount(trophy.count)}`);
    const plus = el('button', null, '+');
    plus.type = 'button';
    plus.setAttribute('aria-label', `Increase count for ${trophy.name}`);
    plus.addEventListener('click', () => handlers.onCount(trophy.id, Math.min(trophy.count, current + 1)));
    const label = el('span', null, trophy.count >= 1000 ? 'progress ($)' : 'progress');
    counter.append(label, minus, out, plus);
    main.append(counter);
  }

  head.append(main);
  li.append(head);

  if (state.openId === trophy.id) {
    const detail = el('div', 'trophy-detail');
    if (hidden) {
      detail.append(el('p', 'spoiler-hidden', 'The guide for this trophy is hidden with its name — it would spoil the story.'));
    } else {
      detail.append(el('h3', null, 'Guide'));
      detail.append(el('p', null, trophy.guide));
      const stepsHeading = el('h3', null, 'Steps');
      const steps = el('ol');
      for (const step of trophy.steps || []) steps.append(el('li', null, step));
      detail.append(stepsHeading, steps);
      const sources = el('p', 'sources');
      const strong = el('strong', null, 'Sources: ');
      sources.append(strong, (trophy.sources || []).join(' · '));
      detail.append(sources);
    }
    li.append(detail);
  }

  return li;
}

// Renders the full filtered list into the <ol>, and reports how many match.
export function renderTrophyList(listElement, trophies, state, handlers) {
  listElement.replaceChildren();
  for (const trophy of trophies) {
    listElement.append(trophyCard(trophy, state, handlers));
  }
}

// roadmap.js — renders the six-stage roadmap to the platinum and the
// missable-trophy warning list, both built from the trophy data itself
// (roadmap stage, kind, chapter and missable flag), never hard-coded lists.

import { GRADE_LABELS, STAGE_NAMES } from './views.js';

export const ROADMAP_DESCRIPTIONS = {
  1: 'Play the story in order, Chapters 1–4 and the finale. Every missable story trophy lives here: the chapter trophies, the named missions, and the gold for the final mission. Do not rush past a mission — finish each one before moving on.',
  2: 'Stranger strands: the question-mark contacts with their own mission chains. Each strand ends in its own trophy, and finishing eight of them earns the silver. Explore the whole state, not just Vice City.',
  3: 'Collectibles and exploration: meditation spots, card sets, WAiNK locations, vehicles to discover, areas to visit, garages to buy and vehicles to register. Best done as one big sweep of Leonida.',
  4: 'Activities and skills: stunts, races, drone races, fishing, the shooting range, arcade games, bowling and the challenge list. Try every activity type once early, then master each one.',
  5: 'Combat, chaos and money: partner moments, robberies, gang operations, the tank, the strange encounter, and the cash trophies. Several of these need your partner with you or a choice made at the right moment — check the missable list first.',
  6: 'Cleanup: reach 100% completion for the gold, and the platinum pops with it. Whatever the tracker still shows as missing is the last job.',
};

const MISSABLE_ADVICE = {
  story: 'Tied to one story mission or chapter. Play the missions in order; if you fail one, use mission replay rather than starting over.',
  combat: 'Needs your partner with you. Only certain story points and free-roam moments put your partner beside you — act while the moment is live.',
  misc: 'Tied to a choice or an attempt that only comes up once. Always pick an option when the game offers one, and retry a failed attempt right away.',
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

export function renderRoadmap(container, trophies, state) {
  container.replaceChildren();
  for (let stage = 1; stage <= 6; stage += 1) {
    const stageTrophies = trophies.filter((t) => t.roadmap === stage);
    const earned = stageTrophies.filter((t) => state.earned.has(t.id)).length;

    const section = el('section', 'stage');
    const heading = el('h3');
    heading.append(el('span', 'stage-num', String(stage)));
    heading.append(document.createTextNode(STAGE_NAMES[stage]));
    section.append(heading);
    section.append(el('p', null, ROADMAP_DESCRIPTIONS[stage]));
    section.append(el('p', 'stage-progress', `${earned} of ${stageTrophies.length} earned in this stage`));

    const list = el('ul');
    for (const trophy of stageTrophies) {
      const item = el('li', state.earned.has(trophy.id) ? 'done' : '');
      const check = el('span', null, state.earned.has(trophy.id) ? '✓' : '○');
      item.append(check);
      item.append(el('span', 'tname', trophy.name));
      item.append(el('span', 'tgrade', `${GRADE_LABELS[trophy.grade]}${trophy.missable ? ' · Missable' : ''}${trophy.chapter ? ` · ${trophy.chapter}` : ''}`));
      list.append(item);
    }
    section.append(list);
    container.append(section);
  }
}

export function renderMissable(container, trophies, state) {
  container.replaceChildren();
  const missable = trophies.filter((t) => t.missable);
  for (const trophy of missable) {
    const card = el('article', 'missable-card');
    const heading = el('h3', null, `${trophy.name} — ${GRADE_LABELS[trophy.grade]}`);
    card.append(heading);
    card.append(el('p', null, trophy.description));
    const why = MISSABLE_ADVICE[trophy.kind] || MISSABLE_ADVICE.story;
    const detail = trophy.kind === 'story' && trophy.chapter
      ? `${why} (${trophy.chapter}.)`
      : why;
    card.append(el('p', 'why', detail));
    card.append(el('p', 'why', `Guide: ${trophy.guide}`));
    card.append(el('p', 'why', `Sources: ${(trophy.sources || []).join(' · ')}`));
    container.append(card);
  }
}

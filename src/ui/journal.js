// The field journal: a list of species and a detail page for each.
import { SPECIES } from '../game/species-data.js';

const KIND_LABEL = { plant: 'Plant', fungus: 'Fungus', animal: 'Animal' };
const MECH_LABEL = { plant: 'How it works', fungus: 'How it works', animal: 'Physiology' };

export class Journal {
  constructor(onClose) {
    this.root = document.getElementById('journal');
    this.list = document.getElementById('journal-list');
    this.page = document.getElementById('journal-page');
    this.progress = document.getElementById('journal-progress');
    this.root.querySelector('[data-close]').addEventListener('click', onClose);
    this.selected = SPECIES[0].id;
  }

  isOpen() {
    return !this.root.classList.contains('hidden');
  }

  open(discovered, focusId) {
    if (focusId) this.selected = focusId;
    else {
      const first = SPECIES.find((s) => discovered.has(s.id));
      if (first && !discovered.has(this.selected)) this.selected = first.id;
    }
    this.render(discovered);
    this.root.classList.remove('hidden');
    this.list.querySelector('.selected')?.focus();
  }

  close() {
    this.root.classList.add('hidden');
  }

  render(discovered) {
    this.discovered = discovered;
    this.progress.textContent = `${discovered.size} of ${SPECIES.length} species catalogued`;
    this.list.innerHTML = '';
    let lastKind = '';
    for (const s of SPECIES) {
      const group = s.kind === 'animal' ? 'Animals' : 'Plants & fungi';
      if (group !== lastKind) {
        const h = document.createElement('h3');
        h.textContent = group;
        this.list.appendChild(h);
        lastKind = group;
      }
      const known = discovered.has(s.id);
      const b = document.createElement('button');
      b.className = `entry${known ? ' known' : ''}${s.id === this.selected ? ' selected' : ''}`;
      b.innerHTML = known
        ? `<span class="tick" aria-hidden="true">✓</span><span><b>${s.name}</b><em>${s.sci}</em></span>`
        : `<span class="tick" aria-hidden="true">○</span><span><b>Unknown ${KIND_LABEL[s.kind].toLowerCase()}</b><em>${s.habitat}</em></span>`;
      b.addEventListener('click', () => {
        this.selected = s.id;
        this.render(discovered);
      });
      this.list.appendChild(b);
    }
    this.renderPage(SPECIES.find((s) => s.id === this.selected), discovered.has(this.selected));
  }

  renderPage(s, known) {
    if (!known) {
      this.page.innerHTML = `
        <div class="unknown">
          <p class="kind">${KIND_LABEL[s.kind]} · not yet catalogued</p>
          <h2>???</h2>
          <dl>
            <dt>Where to look</dt><dd>${s.habitat}</dd>
            <dt>Field hint</dt><dd>${s.hint}</dd>
            <dt>How to record it</dt><dd>${
              s.kind === 'animal'
                ? 'Find one, keep it in the middle of your view and hold <kbd>E</kbd> to observe. Move slowly (<kbd>C</kbd> to sneak) — running scares animals away.'
                : 'Look for a soft golden glow, walk up close and press <kbd>E</kbd> to take a sample.'
            }</dd>
          </dl>
        </div>`;
      return;
    }
    this.page.innerHTML = `
      <p class="kind">${KIND_LABEL[s.kind]} · ${s.family}</p>
      <h2>${s.name}</h2>
      <p class="sci">${s.sci}</p>
      <p class="habitat"><span>Habitat</span> ${s.habitat}</p>
      <section><h4>Natural history</h4><p>${s.biology}</p></section>
      <section><h4>Medical connection</h4><p>${s.medicine}</p></section>
      <section><h4>${MECH_LABEL[s.kind]}</h4><p>${s.mechanism}</p></section>
      ${s.caution ? `<section class="caution"><h4>Note</h4><p>${s.caution}</p></section>` : ''}`;
  }
}

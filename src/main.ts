import './style.css';
import { Game, type RunSummary } from './game/game';
import { InputController } from './game/input';
import type { RunUpgradeChoice, RunUpgradeId } from './game/runUpgrades';
import { canRemoveNode, canSelectNode, getNode, skillNodes, spentPoints, TOTAL_META_POINTS, type School } from './game/skillTree';

const appElement = document.querySelector<HTMLDivElement>('#app');
if (!appElement) throw new Error('Missing #app element.');
const app: HTMLDivElement = appElement;

const selectedNodes = new Set<string>();
let bestScore = Number(localStorage.getItem('wyrmforge.bestScore') ?? 0);
let activeGame: Game | null = null;
let activeInput: InputController | null = null;

renderForge();

function renderForge(): void {
  activeGame?.stop();
  activeInput?.dispose();
  activeGame = null;
  activeInput = null;

  app.innerHTML = `
    <main class="forge-screen">
      <header class="hero">
        <div>
          <div class="eyebrow">WYRMFORGE • PROTOTYPE 0.0.2</div>
          <h1>Forge your path. Grow inside the run.</h1>
          <p>Shape your permanent tree, then gain levels during combat and choose upgrades that compound with it.</p>
        </div>
        <div class="score-card"><span>BEST SCORE</span><strong>${bestScore.toLocaleString()}</strong></div>
      </header>

      <section class="tree-panel">
        <div class="tree-toolbar">
          <div><strong id="points-left"></strong><span> available</span></div>
          <div class="toolbar-actions">
            <button class="secondary" id="reset-tree">Respec</button>
            <button class="primary" id="start-run">Enter the Wyrmrealm</button>
          </div>
        </div>
        <div class="tree-hint">Minor = additive • Major = multiplicative • Epic = build changing • Legendary = rule changing</div>
        <div class="schools">${(['fire', 'frost', 'storm', 'arcane'] as const).map(renderSchool).join('')}</div>
      </section>
      <footer>Keyboard: WASD / arrows • Touch: drag anywhere to move • Spells auto-target • Level-ups pause the run</footer>
    </main>`;

  updateTreeUi();
  document.querySelector('#reset-tree')?.addEventListener('click', () => { selectedNodes.clear(); updateTreeUi(); });
  document.querySelector('#start-run')?.addEventListener('click', startRun);
  document.querySelectorAll<HTMLButtonElement>('[data-node]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.node;
      if (!id) return;
      const node = getNode(id);
      if (selectedNodes.has(id)) {
        if (canRemoveNode(node, selectedNodes)) selectedNodes.delete(id);
      } else if (canSelectNode(node, selectedNodes)) {
        selectedNodes.add(id);
      }
      updateTreeUi();
    });
  });
}

function renderSchool(school: School): string {
  const icons: Record<School, string> = { fire: '🔥', frost: '❄️', storm: '⚡', arcane: '✨' };
  return `<section class="school school-${school}"><h2>${icons[school]} ${school}</h2><div class="node-stack">${skillNodes.filter((node) => node.school === school).map((node) => `
    <button class="skill-node tier-${node.tier}" data-node="${node.id}">
      <span class="tier-label">${node.tier} • ${node.cost} pt${node.cost === 1 ? '' : 's'}</span>
      <strong>${node.name}</strong>
      <small>${node.description}</small>
    </button>`).join('')}</div></section>`;
}

function updateTreeUi(): void {
  const pointsLeft = TOTAL_META_POINTS - spentPoints(selectedNodes);
  const points = document.querySelector<HTMLElement>('#points-left');
  if (points) points.textContent = `${pointsLeft} / ${TOTAL_META_POINTS}`;

  document.querySelectorAll<HTMLButtonElement>('[data-node]').forEach((button) => {
    const id = button.dataset.node;
    if (!id) return;
    const node = getNode(id);
    const selected = selectedNodes.has(id);
    button.classList.toggle('selected', selected);
    button.classList.toggle('locked', !selected && !canSelectNode(node, selectedNodes));
    button.disabled = selected ? !canRemoveNode(node, selectedNodes) : !canSelectNode(node, selectedNodes);
  });
}

function startRun(): void {
  app.innerHTML = `<main class="game-screen"><canvas id="game-canvas" aria-label="Wyrmforge combat arena"></canvas><button class="leave-run" id="leave-run">End run</button></main>`;
  const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
  if (!canvas) throw new Error('Missing game canvas.');
  activeInput = new InputController(canvas);
  activeGame = new Game(canvas, activeInput, new Set(selectedNodes), showLevelUp, showGameOver);
  activeGame.start();
  document.querySelector('#leave-run')?.addEventListener('click', renderForge);
}

function showLevelUp(level: number, choices: readonly RunUpgradeChoice[], choose: (id: RunUpgradeId) => void): void {
  document.querySelector('#level-up')?.remove();
  app.insertAdjacentHTML('beforeend', `
    <div class="level-up" id="level-up">
      <section class="level-up-card">
        <div class="eyebrow">LEVEL ${level}</div>
        <h2>Choose your next rune</h2>
        <p>The run is paused. Pick one upgrade; ranks can stack until their cap.</p>
        <div class="upgrade-choices">${choices.map((choice) => `
          <button class="run-upgrade" data-upgrade="${choice.upgrade.id}">
            <span class="upgrade-icon">${choice.upgrade.icon}</span>
            <span class="upgrade-rank">RANK ${choice.currentRank + 1} / ${choice.upgrade.maxRank}</span>
            <strong>${choice.upgrade.name}</strong>
            <small>${choice.upgrade.description}</small>
          </button>`).join('')}</div>
      </section>
    </div>`);

  document.querySelectorAll<HTMLButtonElement>('[data-upgrade]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.upgrade as RunUpgradeId | undefined;
      if (!id) return;
      document.querySelector('#level-up')?.remove();
      choose(id);
    }, { once: true });
  });
}

function showGameOver(summary: RunSummary): void {
  bestScore = Math.max(bestScore, summary.score);
  localStorage.setItem('wyrmforge.bestScore', String(bestScore));
  document.querySelector('#level-up')?.remove();
  app.insertAdjacentHTML('beforeend', `<div class="game-over"><div class="game-over-card"><div class="eyebrow">RUN ENDED</div><h2>${summary.score.toLocaleString()} score</h2><p>Level ${summary.level} • ${summary.upgrades} upgrades • ${summary.kills} kills • ${summary.seconds}s survived</p><button class="primary" id="return-forge">Return to Wyrmforge</button></div></div>`);
  document.querySelector('#return-forge')?.addEventListener('click', renderForge);
}

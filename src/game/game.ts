import type { InputController } from './input';
import {
  applyRunUpgrade,
  createRunUpgradeLevels,
  experienceRequiredForLevel,
  getRunModifiers,
  rollRunUpgradeChoices,
  type RunModifiers,
  type RunUpgradeChoice,
  type RunUpgradeId,
} from './runUpgrades';

interface Vec2 { x: number; y: number }
interface Enemy { id: number; position: Vec2; radius: number; hp: number; speed: number; frozenFor: number }
interface Projectile { position: Vec2; velocity: Vec2; radius: number; damage: number; inferno: boolean; chainsLeft: number }

export interface RunSummary {
  score: number;
  kills: number;
  seconds: number;
  level: number;
  upgrades: number;
}

export type LevelUpHandler = (level: number, choices: readonly RunUpgradeChoice[], choose: (id: RunUpgradeId) => void) => void;

export class Game {
  private readonly context: CanvasRenderingContext2D;
  private readonly player = { position: { x: 0, y: 0 }, radius: 14, health: 100, maxHealth: 100, speed: 190, barrier: false };
  private readonly enemies: Enemy[] = [];
  private readonly projectiles: Projectile[] = [];
  private readonly runUpgradeLevels = createRunUpgradeLevels();
  private runModifiers: RunModifiers = getRunModifiers(this.runUpgradeLevels);
  private lastFrame = 0;
  private elapsed = 0;
  private spawnTimer = 0;
  private castTimer = 0;
  private castCount = 0;
  private hitCount = 0;
  private enemyId = 0;
  private score = 0;
  private kills = 0;
  private level = 1;
  private experience = 0;
  private experienceToNext = experienceRequiredForLevel(1);
  private upgradeCount = 0;
  private running = false;
  private pausedForUpgrade = false;
  private animationFrame = 0;
  private readonly stats: ReturnType<typeof createStats>;

  public constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly input: InputController,
    selectedNodes: ReadonlySet<string>,
    private readonly onLevelUp: LevelUpHandler,
    private readonly onGameOver: (summary: RunSummary) => void,
  ) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable.');
    this.context = context;
    this.stats = createStats(selectedNodes);
    this.player.maxHealth = this.stats.maxHealth;
    this.player.health = this.stats.maxHealth;
  }

  public start(): void {
    this.running = true;
    this.resize();
    this.lastFrame = performance.now();
    window.addEventListener('resize', this.resize);
    this.animationFrame = requestAnimationFrame(this.frame);
  }

  public stop(): void {
    this.running = false;
    cancelAnimationFrame(this.animationFrame);
    window.removeEventListener('resize', this.resize);
  }

  private readonly frame = (timestamp: number): void => {
    if (!this.running) return;
    const delta = Math.min((timestamp - this.lastFrame) / 1000, 0.05);
    this.lastFrame = timestamp;
    if (!this.pausedForUpgrade) this.update(delta);
    this.render();
    this.animationFrame = requestAnimationFrame(this.frame);
  };

  private update(delta: number): void {
    this.elapsed += delta;
    const movement = this.input.getMovement();
    const moving = movement.x !== 0 || movement.y !== 0;
    const moveBonus = this.stats.tempestStep ? Math.min(this.elapsed / 6, 1) * 0.25 : 0;
    const speed = this.player.speed * this.runModifiers.moveSpeedMultiplier * (1 + moveBonus);
    this.player.position.x += movement.x * speed * delta;
    this.player.position.y += movement.y * speed * delta;
    this.clampPlayer();

    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0) {
      this.spawnEnemy();
      this.spawnTimer = Math.max(0.28, 0.9 - this.elapsed / 120);
    }

    let castInterval = this.stats.castInterval * this.runModifiers.castIntervalMultiplier;
    if (this.stats.lightningForm && moving) castInterval /= 1.5;
    this.castTimer -= delta;
    if (this.castTimer <= 0 && this.enemies.length > 0) {
      this.cast();
      this.castTimer = castInterval;
    }

    for (const enemy of this.enemies) {
      enemy.frozenFor = Math.max(0, enemy.frozenFor - delta);
      if (enemy.frozenFor > 0) continue;
      const direction = directionTo(enemy.position, this.player.position);
      enemy.position.x += direction.x * enemy.speed * delta;
      enemy.position.y += direction.y * enemy.speed * delta;
      if (distance(enemy.position, this.player.position) <= enemy.radius + this.player.radius) this.damagePlayer(18 * delta);
    }

    for (const projectile of this.projectiles) {
      projectile.position.x += projectile.velocity.x * delta;
      projectile.position.y += projectile.velocity.y * delta;
    }

    this.resolveProjectileHits();
    this.projectiles.splice(0, this.projectiles.length, ...this.projectiles.filter((projectile) => this.isOnScreen(projectile.position, 80)));
    this.enemies.splice(0, this.enemies.length, ...this.enemies.filter((enemy) => enemy.hp > 0));
    if (this.player.health <= 0) this.endRun();
  }

  private render(): void {
    const { width, height } = this.canvas.getBoundingClientRect();
    const ctx = this.context;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#14111b';
    ctx.fillRect(0, 0, width, height);
    drawGrid(ctx, width, height);

    for (const enemy of this.enemies) {
      ctx.beginPath();
      ctx.arc(enemy.position.x, enemy.position.y, enemy.radius, 0, Math.PI * 2);
      ctx.fillStyle = enemy.frozenFor > 0 ? '#9fdfff' : '#c14b54';
      ctx.fill();
    }

    for (const projectile of this.projectiles) {
      ctx.beginPath();
      ctx.arc(projectile.position.x, projectile.position.y, projectile.radius, 0, Math.PI * 2);
      ctx.fillStyle = projectile.inferno ? '#ffb04a' : '#b887ff';
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(this.player.position.x, this.player.position.y, this.player.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.player.barrier ? '#b6efff' : '#f4e9ff';
    ctx.fill();
    ctx.strokeStyle = '#7f56c2';
    ctx.lineWidth = 3;
    ctx.stroke();
    this.drawHud(ctx, width);
    this.drawTouchIndicator(ctx);
  }

  private drawHud(ctx: CanvasRenderingContext2D, width: number): void {
    const pad = 18;
    const barWidth = Math.min(220, width - pad * 2);
    ctx.fillStyle = 'rgba(8, 6, 12, 0.72)';
    roundRect(ctx, pad, pad, barWidth + 24, 118, 12);
    ctx.fill();
    ctx.fillStyle = '#ede8f5';
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.fillText(`Score ${this.score}`, pad + 12, pad + 22);
    ctx.fillText(`${Math.floor(this.elapsed)}s  •  ${this.kills} kills`, pad + 12, pad + 43);

    ctx.fillStyle = '#332a3e';
    roundRect(ctx, pad + 12, pad + 55, barWidth, 10, 5);
    ctx.fill();
    ctx.fillStyle = '#9ed6a2';
    roundRect(ctx, pad + 12, pad + 55, barWidth * Math.max(0, this.player.health / this.player.maxHealth), 10, 5);
    ctx.fill();

    ctx.fillStyle = '#bdb3c7';
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText(`Level ${this.level}  •  XP ${this.experience}/${this.experienceToNext}`, pad + 12, pad + 88);
    ctx.fillStyle = '#332a3e';
    roundRect(ctx, pad + 12, pad + 97, barWidth, 8, 4);
    ctx.fill();
    ctx.fillStyle = '#b887ff';
    roundRect(ctx, pad + 12, pad + 97, barWidth * Math.min(1, this.experience / this.experienceToNext), 8, 4);
    ctx.fill();
  }

  private drawTouchIndicator(ctx: CanvasRenderingContext2D): void {
    const touch = this.input.getTouchIndicator();
    if (!touch) return;
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(touch.originX, touch.originY, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(touch.currentX, touch.currentY, 16, 0, Math.PI * 2);
    ctx.stroke();
  }

  private cast(): void {
    const target = nearestEnemy(this.player.position, this.enemies);
    if (!target) return;
    this.castCount++;
    const isInferno = this.stats.inferno && this.castCount % 5 === 0;
    const isVolley = this.stats.prismatic && this.castCount % 5 === 0;
    const baseProjectileCount = isVolley ? (this.stats.astralBarrage ? 5 : 3) : 1;
    const projectileCount = baseProjectileCount + this.runModifiers.extraProjectiles;
    const baseDirection = directionTo(this.player.position, target.position);
    const baseDamage = this.stats.damage * this.runModifiers.damageMultiplier;
    const projectileSpeed = this.stats.projectileSpeed * this.runModifiers.projectileSpeedMultiplier;
    const baseChains = (this.stats.livingStorm ? 4 : this.stats.chainstorm ? 1 : 0) + this.runModifiers.bonusChains;

    for (let index = 0; index < projectileCount; index++) {
      const offset = projectileCount === 1 ? 0 : (index - (projectileCount - 1) / 2) * 0.16;
      const direction = rotate(baseDirection, offset);
      this.projectiles.push({
        position: { ...this.player.position },
        velocity: { x: direction.x * projectileSpeed, y: direction.y * projectileSpeed },
        radius: isInferno ? 9 : 5,
        damage: baseDamage * (isInferno ? 4 : 1),
        inferno: isInferno,
        chainsLeft: baseChains,
      });
    }

    if (this.stats.arcaneEcho && this.castCount % 6 === 0) {
      this.spawnEcho(baseDirection, this.stats.echoChamber ? 1 : 0.6);
    }
    if (this.runModifiers.echoEveryCasts > 0 && this.castCount % this.runModifiers.echoEveryCasts === 0) {
      this.spawnEcho(baseDirection, this.runModifiers.echoDamageMultiplier);
    }
  }

  private spawnEcho(direction: Vec2, damageMultiplier: number): void {
    const projectileSpeed = this.stats.projectileSpeed * this.runModifiers.projectileSpeedMultiplier;
    this.projectiles.push({
      position: { ...this.player.position },
      velocity: { x: direction.x * projectileSpeed, y: direction.y * projectileSpeed },
      radius: 4,
      damage: this.stats.damage * this.runModifiers.damageMultiplier * damageMultiplier,
      inferno: false,
      chainsLeft: this.runModifiers.bonusChains,
    });
  }

  private resolveProjectileHits(): void {
    const consumed = new Set<Projectile>();
    for (const projectile of this.projectiles) {
      const enemy = this.enemies.find((candidate) => candidate.hp > 0 && distance(projectile.position, candidate.position) <= projectile.radius + candidate.radius);
      if (!enemy) continue;
      this.hitCount++;
      let damage = projectile.damage;
      if (this.stats.detonation && this.hitCount % 4 === 0) damage *= this.stats.volcanic ? 2.5 : 2;
      if (this.stats.absoluteZero && enemy.frozenFor > 0) damage *= 2;
      const killed = this.damageEnemy(enemy, damage, projectile);
      const runFreeze = this.runModifiers.freezeEveryHits > 0 && this.hitCount % this.runModifiers.freezeEveryHits === 0;
      if (!killed && ((this.stats.deepFreeze && this.hitCount % 4 === 0) || runFreeze)) {
        enemy.frozenFor = Math.max(enemy.frozenFor, runFreeze ? this.runModifiers.freezeDuration : 1.25);
      }
      if (this.stats.wildfire) this.splash(enemy.position, damage * 0.35, this.stats.volcanic ? 90 : 64, enemy.id);
      consumed.add(projectile);
    }
    this.projectiles.splice(0, this.projectiles.length, ...this.projectiles.filter((projectile) => !consumed.has(projectile)));
  }

  private damageEnemy(enemy: Enemy, damage: number, source?: Projectile): boolean {
    if (enemy.hp <= 0) return false;
    enemy.hp -= damage;
    if (enemy.hp > 0) return false;
    this.registerKill(enemy.position, source);
    return true;
  }

  private registerKill(position: Vec2, source?: Projectile): void {
    this.kills++;
    this.score += 100 + Math.floor(this.elapsed * 2);
    this.gainExperience(1);
    if (source && source.chainsLeft > 0) this.chainFrom(position, source);
  }

  private splash(position: Vec2, damage: number, radius: number, ignoreId: number): void {
    for (const enemy of this.enemies) {
      if (enemy.id !== ignoreId && enemy.hp > 0 && distance(position, enemy.position) <= radius) this.damageEnemy(enemy, damage);
    }
  }

  private chainFrom(position: Vec2, source: Projectile): void {
    const target = nearestEnemy(position, this.enemies.filter((enemy) => enemy.hp > 0 && distance(position, enemy.position) > 12));
    if (!target) return;
    const direction = directionTo(position, target.position);
    const projectileSpeed = this.stats.projectileSpeed * this.runModifiers.projectileSpeedMultiplier;
    this.projectiles.push({
      position: { ...position },
      velocity: { x: direction.x * projectileSpeed * 1.2, y: direction.y * projectileSpeed * 1.2 },
      radius: 4,
      damage: source.damage * 0.82,
      inferno: false,
      chainsLeft: source.chainsLeft - 1,
    });
  }

  private gainExperience(amount: number): void {
    this.experience += amount;
    this.tryLevelUp();
  }

  private tryLevelUp(): void {
    if (this.pausedForUpgrade || this.experience < this.experienceToNext) return;
    const choices = rollRunUpgradeChoices(this.runUpgradeLevels);
    if (choices.length === 0) {
      this.completeLevelUp();
      return;
    }

    this.pausedForUpgrade = true;
    const offeredIds = new Set(choices.map((choice) => choice.upgrade.id));
    let selected = false;
    this.onLevelUp(this.level + 1, choices, (id) => {
      if (selected || !this.running || !offeredIds.has(id)) return;
      if (!applyRunUpgrade(this.runUpgradeLevels, id)) return;
      selected = true;
      this.upgradeCount++;
      this.applyRunModifiers(id);
      this.completeLevelUp();
    });
  }

  private applyRunModifiers(id: RunUpgradeId): void {
    const previousMaxHealth = this.player.maxHealth;
    this.runModifiers = getRunModifiers(this.runUpgradeLevels);
    this.player.maxHealth = this.stats.maxHealth + this.runModifiers.maxHealthBonus;
    if (id === 'vitality') this.player.health = Math.min(this.player.maxHealth, this.player.health + (this.player.maxHealth - previousMaxHealth));
  }

  private completeLevelUp(): void {
    this.experience -= this.experienceToNext;
    this.level++;
    this.experienceToNext = experienceRequiredForLevel(this.level);
    this.pausedForUpgrade = false;
    this.tryLevelUp();
  }

  private damagePlayer(rawDamage: number): void {
    if (this.stats.winterShell && this.player.barrier) {
      this.player.barrier = false;
      window.setTimeout(() => { if (this.running) this.player.barrier = true; }, 5000);
      return;
    }
    this.player.health -= rawDamage * this.stats.damageTakenMultiplier;
    if (this.stats.iceArmor && !this.player.barrier) {
      this.player.barrier = true;
      window.setTimeout(() => { this.player.barrier = false; }, 1200);
    }
  }

  private spawnEnemy(): void {
    const { width, height } = this.canvas.getBoundingClientRect();
    const edge = Math.floor(Math.random() * 4);
    const margin = 30;
    const position = edge === 0 ? { x: Math.random() * width, y: -margin }
      : edge === 1 ? { x: width + margin, y: Math.random() * height }
        : edge === 2 ? { x: Math.random() * width, y: height + margin }
          : { x: -margin, y: Math.random() * height };
    const scale = 1 + this.elapsed / 80;
    this.enemies.push({ id: ++this.enemyId, position, radius: 11, hp: 36 * scale, speed: 48 + Math.min(52, this.elapsed * 0.4), frozenFor: 0 });
  }

  private readonly resize = (): void => {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.player.position.x === 0 && this.player.position.y === 0) this.player.position = { x: rect.width / 2, y: rect.height / 2 };
    this.clampPlayer();
  };

  private clampPlayer(): void {
    const { width, height } = this.canvas.getBoundingClientRect();
    this.player.position.x = Math.max(this.player.radius, Math.min(width - this.player.radius, this.player.position.x));
    this.player.position.y = Math.max(this.player.radius, Math.min(height - this.player.radius, this.player.position.y));
  }

  private isOnScreen(position: Vec2, margin: number): boolean {
    const { width, height } = this.canvas.getBoundingClientRect();
    return position.x >= -margin && position.y >= -margin && position.x <= width + margin && position.y <= height + margin;
  }

  private endRun(): void {
    if (!this.running) return;
    this.stop();
    this.onGameOver({ score: this.score, kills: this.kills, seconds: Math.floor(this.elapsed), level: this.level, upgrades: this.upgradeCount });
  }
}

function createStats(selected: ReadonlySet<string>) {
  const count = (ids: readonly string[]) => ids.filter((id) => selected.has(id)).length;
  let damage = 18 * (1 + count(['fire-1', 'fire-2']) * 0.05);
  if (selected.has('fire-major')) damage *= 1.25;
  let castInterval = 0.65 / (1 + count(['storm-1', 'storm-2']) * 0.04);
  if (selected.has('storm-major')) castInterval *= 0.75;
  let projectileSpeed = 410 * (1 + count(['arcane-1', 'arcane-2']) * 0.05);
  if (selected.has('arcane-major')) projectileSpeed *= 1.3;
  return {
    damage,
    castInterval,
    projectileSpeed,
    maxHealth: 100 + count(['frost-1', 'frost-2']) * 4,
    damageTakenMultiplier: selected.has('frost-major') ? 0.85 : 1,
    wildfire: selected.has('wildfire'),
    detonation: selected.has('detonation'),
    inferno: selected.has('inferno'),
    volcanic: selected.has('volcanic'),
    deepFreeze: selected.has('deep-freeze'),
    iceArmor: selected.has('ice-armor'),
    absoluteZero: selected.has('absolute-zero'),
    winterShell: selected.has('winter-shell'),
    chainstorm: selected.has('chainstorm'),
    tempestStep: selected.has('tempest-step'),
    livingStorm: selected.has('living-storm'),
    lightningForm: selected.has('lightning-form'),
    arcaneEcho: selected.has('arcane-echo'),
    prismatic: selected.has('prismatic'),
    echoChamber: selected.has('echo-chamber'),
    astralBarrage: selected.has('astral-barrage'),
  };
}

function nearestEnemy(position: Vec2, enemies: readonly Enemy[]): Enemy | undefined {
  let nearest: Enemy | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const enemy of enemies) {
    const currentDistance = distance(position, enemy.position);
    if (currentDistance < nearestDistance) {
      nearest = enemy;
      nearestDistance = currentDistance;
    }
  }
  return nearest;
}

function directionTo(from: Vec2, to: Vec2): Vec2 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}

function rotate(vector: Vec2, radians: number): Vec2 {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { x: vector.x * cos - vector.y * sin, y: vector.x * sin + vector.y * cos };
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 44) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  for (let y = 0; y < height; y += 44) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

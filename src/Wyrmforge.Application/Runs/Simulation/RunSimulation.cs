using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.EndRun;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Player;
using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Combat.Stats;
using Wyrmforge.Domain.Progression.Experience;
using Wyrmforge.Domain.Progression.RunUpgrades;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed class RunSimulation
{
    private static readonly IReadOnlyDictionary<SpellId, double> BaseSpellCooldowns = new Dictionary<SpellId, double>
    {
        [SpellId.ArcaneOrb] = 0.65,
        [SpellId.FireBolt] = 1.15,
        [SpellId.FrostShard] = 0.95,
        [SpellId.ChainLightning] = 1.35,
    };

    private readonly LevelChoiceService levelChoiceService;
    private readonly IRandomSource randomSource;
    private readonly PassiveCombatProfile passiveProfile;
    private readonly RunBuildState build = new();
    private readonly PlayerState player = new();
    private readonly List<EnemyState> enemies = [];
    private readonly List<ProjectileState> projectiles = [];
    private readonly List<LightningTrace> lightning = [];
    private readonly Dictionary<SpellId, double> spellCooldowns = Enum.GetValues<SpellId>().ToDictionary(id => id, _ => 0d);
    private RunUpgradeModifiers modifiers;
    private IReadOnlyList<LevelChoice> pendingChoices = [];
    private double elapsed;
    private double spawnTimer;
    private int castCount;
    private int projectileCastCount;
    private int hitCount;
    private int arcaneHitCount;
    private int enemyId;
    private int score;
    private int kills;
    private int level = 1;
    private int experience;
    private int experienceToNext = ExperienceCurve.RequiredForLevel(1);
    private int choiceCount;

    public RunSimulation(IReadOnlySet<string> selectedNodes, LevelChoiceService levelChoiceService, IRandomSource randomSource)
    {
        this.levelChoiceService = levelChoiceService;
        this.randomSource = randomSource;
        passiveProfile = PassiveCombatProfile.Create(selectedNodes);
        modifiers = RunUpgradeModifiers.Create(build.RunUpgrades);
        player.MaxHealth = passiveProfile.MaxHealth;
        player.Health = player.MaxHealth;
    }

    public IReadOnlyList<LevelChoice> PendingChoices => pendingChoices;

    public bool IsEnded { get; private set; }

    public RunRenderSnapshot Tick(double delta, MovementInput movement, double width, double height)
    {
        if (IsEnded || pendingChoices.Count > 0) return CreateSnapshot();
        delta = Math.Clamp(delta, 0, 0.05);
        elapsed += delta;
        UpdatePlayer(delta, movement, width, height);
        UpdateSpawn(delta, width, height);
        UpdateSpellcasting(delta, movement.IsMoving);
        UpdateEnemies(delta);
        UpdateProjectiles(delta, width, height);
        UpdateLightning(delta);
        ResolveProjectileHits();
        enemies.RemoveAll(enemy => enemy.Health <= 0);
        if (player.Health <= 0) IsEnded = true;
        return CreateSnapshot();
    }

    public bool ApplyChoice(string id)
    {
        var choice = pendingChoices.SingleOrDefault(candidate => candidate.Id == id);
        if (choice is null || !levelChoiceService.Apply(build, choice)) return false;
        choiceCount++;
        ApplyChoiceEffects(choice);
        pendingChoices = [];
        CompleteLevelUp();
        return true;
    }

    public RunSummary EndRun()
    {
        IsEnded = true;
        return CreateSummary();
    }

    public RunSummary CreateSummary() => new(score, kills, (int)elapsed, level, choiceCount, build.Spells.LearnedCount, build.Synergies.Count);

    public RunRenderSnapshot CreateSnapshot()
    {
        var spellHud = SpellCatalog.All
            .Where(spell => build.Spells[spell.Id] > 0)
            .Select(spell => new SpellHudSnapshot(spell.Icon, spell.Name, build.Spells[spell.Id]))
            .ToArray();
        var synergyHud = SynergyCatalog.All
            .Where(synergy => build.Synergies.Contains(synergy.Id))
            .Select(synergy => new SynergyHudSnapshot(synergy.Icon, synergy.Name))
            .ToArray();
        var hud = new RunHudSnapshot(score, kills, (int)elapsed, player.Health, player.MaxHealth, level, experience, experienceToNext, spellHud, synergyHud);
        return new RunRenderSnapshot(
            new PlayerRenderSnapshot(player.Position.X, player.Position.Y, player.Radius, player.Barrier),
            enemies.Select(enemy => new EnemyRenderSnapshot(enemy.Position.X, enemy.Position.Y, enemy.Radius, enemy.FrozenFor > 0)).ToArray(),
            projectiles.Select(projectile => new ProjectileRenderSnapshot(projectile.Position.X, projectile.Position.Y, projectile.Radius, projectile.Spell.ToString(), projectile.Inferno)).ToArray(),
            lightning.Select(trace => new LightningRenderSnapshot(trace.From.X, trace.From.Y, trace.To.X, trace.To.Y, trace.Life)).ToArray(),
            hud,
            pendingChoices.Count > 0,
            IsEnded);
    }

    private void UpdatePlayer(double delta, MovementInput movement, double width, double height)
    {
        var direction = movement.Direction;
        var moveBonus = passiveProfile.TempestStep ? Math.Min(elapsed / 6, 1) * 0.25 : 0;
        var speed = player.Speed * modifiers.MoveSpeedMultiplier * (1 + moveBonus);
        player.Position += direction * speed * delta;
        player.Position = new Vector2D(
            Math.Clamp(player.Position.X, player.Radius, Math.Max(player.Radius, width - player.Radius)),
            Math.Clamp(player.Position.Y, player.Radius, Math.Max(player.Radius, height - player.Radius)));
        if (player.Position == Vector2D.Zero) player.Position = new Vector2D(width / 2, height / 2);

        if (player.BarrierRemaining > 0)
        {
            player.BarrierRemaining = Math.Max(0, player.BarrierRemaining - delta);
            if (player.BarrierRemaining == 0 && !passiveProfile.WinterShell) player.Barrier = false;
        }
        if (player.WinterShellRechargeRemaining > 0)
        {
            player.WinterShellRechargeRemaining = Math.Max(0, player.WinterShellRechargeRemaining - delta);
            if (player.WinterShellRechargeRemaining == 0 && passiveProfile.WinterShell) player.Barrier = true;
        }
    }

    private void UpdateSpawn(double delta, double width, double height)
    {
        spawnTimer -= delta;
        if (spawnTimer > 0) return;
        SpawnEnemy(width, height);
        spawnTimer = Math.Max(0.28, 0.9 - elapsed / 120);
    }

    private void SpawnEnemy(double width, double height)
    {
        const double margin = 30;
        var edge = randomSource.Next(4);
        var position = edge switch
        {
            0 => new Vector2D(randomSource.NextDouble() * width, -margin),
            1 => new Vector2D(width + margin, randomSource.NextDouble() * height),
            2 => new Vector2D(randomSource.NextDouble() * width, height + margin),
            _ => new Vector2D(-margin, randomSource.NextDouble() * height),
        };
        var scale = 1 + elapsed / 80;
        enemies.Add(new EnemyState(++enemyId, position, 11, 36 * scale, 48 + Math.Min(52, elapsed * 0.4)));
    }

    private void UpdateSpellcasting(double delta, bool moving)
    {
        foreach (var spell in SpellCatalog.All)
        {
            var rank = build.Spells[spell.Id];
            if (rank <= 0) continue;
            spellCooldowns[spell.Id] -= delta;
            if (spellCooldowns[spell.Id] > 0 || enemies.Count == 0) continue;
            CastSpell(spell.Id, rank, 1, false);
            spellCooldowns[spell.Id] = GetSpellCooldown(spell.Id, rank, moving);
        }
    }

    private double GetSpellCooldown(SpellId id, int rank, bool moving)
    {
        var rankMultiplier = 1 - Math.Max(0, rank - 1) * 0.06;
        var lightningFormMultiplier = passiveProfile.LightningForm && moving ? 1 / 1.5 : 1;
        return BaseSpellCooldowns[id] * rankMultiplier * passiveProfile.CastIntervalMultiplier * modifiers.CastIntervalMultiplier * lightningFormMultiplier;
    }

    private void CastSpell(SpellId id, int rank, double damageScale, bool echo)
    {
        if (!echo)
        {
            castCount++;
            if (id != SpellId.ChainLightning) projectileCastCount++;
        }
        if (id == SpellId.ChainLightning) CastChainLightning(rank, player.Position, damageScale);
        else CastProjectileSpell(id, rank, damageScale);
        if (echo) return;

        var treeEcho = passiveProfile.ArcaneEcho && castCount % 6 == 0;
        var runEcho = modifiers.EchoEveryCasts > 0 && castCount % modifiers.EchoEveryCasts == 0;
        if (treeEcho) CastSpell(id, rank, passiveProfile.EchoChamber ? damageScale : damageScale * 0.6, true);
        if (runEcho) CastSpell(id, rank, damageScale * modifiers.EchoDamageMultiplier, true);
    }

    private void CastProjectileSpell(SpellId id, int rank, double damageScale)
    {
        var target = NearestEnemy(player.Position, enemies);
        if (target is null) return;
        var inferno = passiveProfile.Inferno && projectileCastCount > 0 && projectileCastCount % 5 == 0;
        var prismatic = passiveProfile.Prismatic && projectileCastCount > 0 && projectileCastCount % 5 == 0;
        var baseCount = prismatic ? passiveProfile.AstralBarrage ? 5 : 3 : 1;
        var count = baseCount + modifiers.ExtraProjectiles;
        var baseDirection = Vector2D.DirectionTo(player.Position, target.Position);
        var speed = GetSpellProjectileSpeed(id, rank) * passiveProfile.ProjectileSpeedMultiplier * modifiers.ProjectileSpeedMultiplier;
        var damage = GetSpellDamage(id, rank) * passiveProfile.DamageMultiplier * modifiers.DamageMultiplier * damageScale;
        var chains = (passiveProfile.LivingStorm ? 4 : passiveProfile.Chainstorm ? 1 : 0) + modifiers.BonusChains;

        for (var index = 0; index < count; index++)
        {
            var offset = count == 1 ? 0 : (index - (count - 1) / 2d) * 0.16;
            var direction = Vector2D.Rotate(baseDirection, offset);
            projectiles.Add(new ProjectileState(
                player.Position,
                direction * speed,
                inferno ? 9 : id == SpellId.FireBolt ? 7 : 5,
                damage * (inferno ? 4 : 1),
                id,
                inferno,
                chains,
                id == SpellId.FireBolt && rank >= 3 ? 56 : 0,
                id == SpellId.FrostShard ? 0.35 + rank * 0.18 : 0));
        }
    }

    private void CastChainLightning(int rank, Vector2D origin, double damageScale, int bonusJumps = 0)
    {
        var current = origin;
        var damage = (15 + (rank - 1) * 5) * passiveProfile.DamageMultiplier * modifiers.DamageMultiplier * damageScale;
        var jumps = rank + 1 + modifiers.BonusChains + bonusJumps;
        var hit = new HashSet<int>();
        var stormglassTriggered = false;

        for (var jump = 0; jump < jumps; jump++)
        {
            var target = NearestEnemy(current, enemies.Where(enemy => enemy.Health > 0 && !hit.Contains(enemy.Id)));
            if (target is null) break;
            hit.Add(target.Id);
            lightning.Add(new LightningTrace(current, target.Position, 0.12));
            var hitDamage = damage;
            if (build.Synergies.Contains(SynergyId.Stormglass) && target.FrozenFor > 0)
            {
                hitDamage *= 1.5;
                if (!stormglassTriggered)
                {
                    jumps += 2;
                    stormglassTriggered = true;
                }
            }
            DamageEnemy(target, hitDamage);
            current = target.Position;
            damage *= 0.84;
        }
    }

    private void UpdateEnemies(double delta)
    {
        foreach (var enemy in enemies)
        {
            enemy.FrozenFor = Math.Max(0, enemy.FrozenFor - delta);
            if (enemy.FrozenFor > 0) continue;
            var direction = Vector2D.DirectionTo(enemy.Position, player.Position);
            enemy.Position += direction * enemy.Speed * delta;
            if (Vector2D.Distance(enemy.Position, player.Position) <= enemy.Radius + player.Radius) DamagePlayer(18 * delta);
        }
    }

    private void UpdateProjectiles(double delta, double width, double height)
    {
        foreach (var projectile in projectiles) projectile.Position += projectile.Velocity * delta;
        projectiles.RemoveAll(projectile => !IsOnScreen(projectile.Position, width, height, 80));
    }

    private void UpdateLightning(double delta)
    {
        foreach (var trace in lightning) trace.Life -= delta;
        lightning.RemoveAll(trace => trace.Life <= 0);
    }

    private void ResolveProjectileHits()
    {
        var consumed = new HashSet<ProjectileState>();
        var spawned = new List<ProjectileState>();
        foreach (var projectile in projectiles)
        {
            var enemy = enemies.FirstOrDefault(candidate => candidate.Health > 0 && Vector2D.Distance(projectile.Position, candidate.Position) <= projectile.Radius + candidate.Radius);
            if (enemy is null) continue;
            hitCount++;
            var damage = projectile.Damage;
            var synergySplash = 0d;
            if (projectile.Spell == SpellId.FireBolt && build.Synergies.Contains(SynergyId.Frostfire) && enemy.FrozenFor > 0)
            {
                damage *= 2;
                synergySplash = 92;
            }
            if (passiveProfile.Detonation && hitCount % 4 == 0) damage *= passiveProfile.Volcanic ? 2.5 : 2;
            if (passiveProfile.AbsoluteZero && enemy.FrozenFor > 0) damage *= 2;

            var killed = DamageEnemy(enemy, damage, projectile, spawned);
            if (!killed && projectile.FreezeDuration > 0) enemy.FrozenFor = Math.Max(enemy.FrozenFor, projectile.FreezeDuration);
            var runFreeze = modifiers.FreezeEveryHits > 0 && hitCount % modifiers.FreezeEveryHits == 0;
            if (!killed && ((passiveProfile.DeepFreeze && hitCount % 4 == 0) || runFreeze)) enemy.FrozenFor = Math.Max(enemy.FrozenFor, runFreeze ? modifiers.FreezeDuration : 1.25);

            if (projectile.SplashRadius > 0) Splash(enemy.Position, damage * 0.4, projectile.SplashRadius, enemy.Id);
            if (synergySplash > 0) Splash(enemy.Position, damage * 0.45, synergySplash, enemy.Id);
            if (passiveProfile.Wildfire) Splash(enemy.Position, damage * 0.35, passiveProfile.Volcanic ? 90 : 64, enemy.Id);

            if (projectile.Spell == SpellId.ArcaneOrb)
            {
                arcaneHitCount++;
                if (build.Synergies.Contains(SynergyId.ArcaneConduit) && arcaneHitCount % 4 == 0) CastChainLightning(1, enemy.Position, 0.55, 1);
            }
            consumed.Add(projectile);
        }
        projectiles.RemoveAll(consumed.Contains);
        projectiles.AddRange(spawned);
    }

    private bool DamageEnemy(EnemyState enemy, double damage, ProjectileState? source = null, List<ProjectileState>? spawned = null)
    {
        if (enemy.Health <= 0) return false;
        enemy.Health -= damage;
        if (enemy.Health > 0) return false;
        kills++;
        score += 100 + (int)(elapsed * 2);
        GainExperience(1);
        if (source is not null && source.ChainsLeft > 0 && spawned is not null) ChainFrom(enemy.Position, source, spawned);
        return true;
    }

    private void Splash(Vector2D position, double damage, double radius, int ignoreId)
    {
        foreach (var enemy in enemies.Where(enemy => enemy.Id != ignoreId && enemy.Health > 0 && Vector2D.Distance(position, enemy.Position) <= radius)) DamageEnemy(enemy, damage);
    }

    private void ChainFrom(Vector2D position, ProjectileState source, ICollection<ProjectileState> spawned)
    {
        var target = NearestEnemy(position, enemies.Where(enemy => enemy.Health > 0 && Vector2D.Distance(position, enemy.Position) > 12));
        if (target is null) return;
        var direction = Vector2D.DirectionTo(position, target.Position);
        var speed = source.Velocity.Length * 1.2;
        spawned.Add(new ProjectileState(position, direction * speed, Math.Max(4, source.Radius - 1), source.Damage * 0.82, source.Spell, false, source.ChainsLeft - 1, source.SplashRadius, source.FreezeDuration));
    }

    private void DamagePlayer(double rawDamage)
    {
        if (passiveProfile.WinterShell && player.Barrier)
        {
            player.Barrier = false;
            player.WinterShellRechargeRemaining = 5;
            return;
        }
        player.Health -= rawDamage * passiveProfile.DamageTakenMultiplier;
        if (passiveProfile.IceArmor && !player.Barrier)
        {
            player.Barrier = true;
            player.BarrierRemaining = 1.2;
        }
    }

    private void GainExperience(int amount)
    {
        experience += amount;
        TryLevelUp();
    }

    private void TryLevelUp()
    {
        if (pendingChoices.Count > 0 || experience < experienceToNext) return;
        pendingChoices = levelChoiceService.Roll(build);
        if (pendingChoices.Count == 0) CompleteLevelUp();
    }

    private void ApplyChoiceEffects(LevelChoice choice)
    {
        if (choice.Kind != LevelChoiceKind.Rune) return;
        var previousMaxHealth = player.MaxHealth;
        modifiers = RunUpgradeModifiers.Create(build.RunUpgrades);
        player.MaxHealth = passiveProfile.MaxHealth + modifiers.MaxHealthBonus;
        if (choice.Id == $"rune:{RunUpgradeId.Vitality}") player.Health = Math.Min(player.MaxHealth, player.Health + (player.MaxHealth - previousMaxHealth));
    }

    private void CompleteLevelUp()
    {
        experience -= experienceToNext;
        level++;
        experienceToNext = ExperienceCurve.RequiredForLevel(level);
        TryLevelUp();
    }

    private static double GetSpellDamage(SpellId id, int rank)
    {
        if (id == SpellId.ArcaneOrb) return 18 * (1 + (rank - 1) * 0.28);
        if (id == SpellId.FireBolt) return 30 * (1 + (rank - 1) * 0.3);
        return 12 * (1 + (rank - 1) * 0.25);
    }

    private static double GetSpellProjectileSpeed(SpellId id, int rank)
    {
        if (id == SpellId.FireBolt) return 330 + (rank - 1) * 20;
        if (id == SpellId.FrostShard) return 500 + (rank - 1) * 25;
        return 410 + (rank - 1) * 20;
    }

    private static EnemyState? NearestEnemy(Vector2D position, IEnumerable<EnemyState> candidates) => candidates.OrderBy(enemy => Vector2D.Distance(position, enemy.Position)).FirstOrDefault();

    private static bool IsOnScreen(Vector2D position, double width, double height, double margin) => position.X >= -margin && position.Y >= -margin && position.X <= width + margin && position.Y <= height + margin;

    private sealed class LightningTrace(Vector2D from, Vector2D to, double life)
    {
        public Vector2D From { get; } = from;

        public Vector2D To { get; } = to;

        public double Life { get; set; } = life;
    }
}

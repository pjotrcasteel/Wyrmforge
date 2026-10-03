using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.EndRun;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Player;
using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Combat.Stats;
using Wyrmforge.Domain.Progression.Experience;
using Wyrmforge.Domain.Progression.RunUpgrades;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
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
    private bool playerPositionInitialized;

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
}

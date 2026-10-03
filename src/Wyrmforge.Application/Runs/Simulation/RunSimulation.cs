using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Depth;
using Wyrmforge.Application.Runs.EndRun;
using Wyrmforge.Application.Runs.Extraction;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Offerings;
using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Player;
using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Combat.Stats;
using Wyrmforge.Domain.Progression.DragonEssences;
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
    private readonly RunDepthState depthState = new();
    private readonly RunExtractionState extractionState = new();
    private readonly PlayerState player = new();
    private readonly List<EnemyState> enemies = [];
    private readonly List<ProjectileState> projectiles = [];
    private readonly List<LightningTrace> lightning = [];
    private readonly List<EssenceBurstState> essenceBursts = [];
    private readonly List<EssenceBoltState> essenceBolts = [];
    private readonly Dictionary<int, double> hitFlashRemaining = [];
    private readonly List<SplashPulseState> splashPulses = [];
    private readonly Dictionary<SpellId, double> spellCooldowns = Enum.GetValues<SpellId>().ToDictionary(id => id, _ => 0d);
    private RunUpgradeModifiers modifiers;
    private IReadOnlyList<LevelChoice> pendingChoices = [];
    private IReadOnlyList<DragonEssenceDefinition> pendingDragonEssenceChoices = [];
    private DragonState? dragon;
    private RunOutcome outcome = RunOutcome.InProgress;
    private double elapsed;
    private double spawnTimer;
    private double ashenWingMovementTime;
    private double ashenWingCooldown;
    private int castCount;
    private int projectileCastCount;
    private int hitCount;
    private int arcaneHitCount;
    private int enemyId;
    private int score;
    private int kills;
    private int dragonsSlain;
    private int level = 1;
    private int experience;
    private int experienceToNext = ExperienceCurve.RequiredForLevel(1);
    private int choiceCount;
    private bool playerPositionInitialized;
    private bool dragonEncounterStarted;

    public RunSimulation(IReadOnlySet<string> selectedNodes, LevelChoiceService levelChoiceService, IRandomSource randomSource, DragonEssenceId? offering = null)
    {
        this.levelChoiceService = levelChoiceService;
        this.randomSource = randomSource;
        Offering = offering;
        passiveProfile = PassiveCombatProfile.Create(selectedNodes);
        ApplyOffering();
        modifiers = RunUpgradeModifiers.Create(build.RunUpgrades);
        player.MaxHealth = passiveProfile.MaxHealth + modifiers.MaxHealthBonus;
        player.Health = player.MaxHealth;
    }

    public IReadOnlyList<LevelChoice> PendingChoices => pendingChoices;

    public IReadOnlyList<DragonEssenceDefinition> PendingDragonEssenceChoices => pendingDragonEssenceChoices;

    public IReadOnlyList<DragonEssenceDefinition> SelectedDragonEssences => build.DragonEssences.Selected.Select(DragonEssenceCatalog.Get).ToArray();

    public DragonEssenceId? Offering { get; }

    public bool PendingPushOrExtract => depthState.DecisionPending;

    public int Depth => depthState.Depth;

    public double ScoreMultiplier => depthState.ScoreMultiplier;

    public bool IsEnded { get; private set; }

    public RunRenderSnapshot Tick(double delta, MovementInput movement, double width, double height)
    {
        if (IsEnded || pendingChoices.Count > 0 || pendingDragonEssenceChoices.Count > 0 || depthState.DecisionPending) return CreateSnapshot();
        delta = Math.Clamp(delta, 0, 0.05);
        UpdateCombatFeedback(delta);
        elapsed += delta;
        UpdatePlayer(delta, movement, width, height);
        UpdateDepthRift(delta);
        UpdateDragonEssenceEffects(delta, movement.IsMoving);
        UpdateDragonEncounter(delta, width, height);
        UpdateSpawn(delta, width, height);
        UpdateSpellcasting(delta, movement.IsMoving);
        UpdateEnemies(delta);
        UpdateProjectiles(delta, width, height);
        UpdateLightning(delta);
        ResolveProjectileHits();
        enemies.RemoveAll(enemy => enemy.Health <= 0);
        if (player.Health <= 0)
        {
            extractionState.Cancel();
            outcome = RunOutcome.Defeated;
            IsEnded = true;
        }
        else if (extractionState.Tick(delta, player.Position))
        {
            outcome = RunOutcome.Extracted;
            IsEnded = true;
        }
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

    public bool ApplyDragonEssence(DragonEssenceId id)
    {
        var choice = pendingDragonEssenceChoices.SingleOrDefault(candidate => candidate.Id == id);
        if (choice is null || !build.DragonEssences.Select(id)) return false;
        pendingDragonEssenceChoices = [];
        depthState.OfferDecision();
        return true;
    }

    public bool PushDeeper()
    {
        if (!depthState.PushDeeper()) return false;
        spawnTimer = Math.Min(spawnTimer, 0.35);
        return true;
    }

    public bool StartExtraction()
    {
        if (!depthState.Extract()) return false;
        if (extractionState.Start(player.Position)) return true;
        depthState.OfferDecision();
        return false;
    }

    public RunSummary AbandonRun()
    {
        extractionState.Cancel();
        outcome = RunOutcome.Abandoned;
        IsEnded = true;
        return CreateSummary();
    }

    public RunSummary EndRun() => AbandonRun();

    public RunSummary CreateSummary() => new(
        score,
        kills,
        dragonsSlain,
        build.DragonEssences.Count,
        build.DragonEssences.Selected.ToArray(),
        (int)elapsed,
        level,
        choiceCount,
        build.Spells.LearnedCount,
        build.Synergies.Count,
        depthState.Depth,
        outcome);

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
        var extraction = extractionState.IsActive
            ? new ExtractionRenderSnapshot(
                extractionState.Position.X,
                extractionState.Position.Y,
                RunExtractionState.Radius,
                1 - (extractionState.RemainingSeconds / RunExtractionState.DurationSeconds),
                extractionState.RemainingSeconds,
                extractionState.IsProgressing)
            : null;
        return new RunRenderSnapshot(
            new PlayerRenderSnapshot(player.Position.X, player.Position.Y, player.Radius, player.Barrier),
            extraction,
            enemies.Select(enemy => new EnemyRenderSnapshot(
                enemy.Position.X,
                enemy.Position.Y,
                enemy.Radius,
                enemy.FrozenFor > 0,
                Math.Clamp(enemy.Health / enemy.MaxHealth, 0, 1),
                hitFlashRemaining.ContainsKey(enemy.Id))).ToArray(),
            CreateDragonSnapshot(),
            CreateDragonBreathSnapshot(),
            splashPulses.Select(pulse => new SplashPulseRenderSnapshot(pulse.Position.X, pulse.Position.Y, pulse.Radius, pulse.Progress)).ToArray(),
            elementalImpacts.Select(impact => new ElementalImpactRenderSnapshot(impact.Position.X, impact.Position.Y, impact.Spell.ToString(), impact.Progress)).ToArray(),
            deathBursts.Select(burst => new DeathBurstRenderSnapshot(burst.Position.X, burst.Position.Y, burst.Radius, burst.Progress)).ToArray(),
            essenceBursts.Select(burst => new EssenceBurstRenderSnapshot(burst.Position.X, burst.Position.Y, burst.Radius, burst.Life)).ToArray(),
            essenceBolts.Select(bolt => new EssenceBoltRenderSnapshot(bolt.From.X, bolt.From.Y, bolt.To.X, bolt.To.Y, bolt.Life)).ToArray(),
            projectiles.Select(projectile => new ProjectileRenderSnapshot(projectile.Position.X, projectile.Position.Y, projectile.Radius, projectile.Spell.ToString(), projectile.Inferno)).ToArray(),
            lightning.Select(trace => new LightningRenderSnapshot(trace.From.X, trace.From.Y, trace.To.X, trace.To.Y, trace.Life)).ToArray(),
            hud,
            pendingChoices.Count > 0 || pendingDragonEssenceChoices.Count > 0 || depthState.DecisionPending,
            IsEnded);
    }

    private void ApplyOffering()
    {
        if (Offering is not { } offeringId) return;
        var offering = RunOfferingCatalog.Get(offeringId);
        if (offering.StartingSpell is { } startingSpell) build.Spells.LearnOrUpgrade(startingSpell);
        if (offering.StartingUpgrade is { } startingUpgrade) build.RunUpgrades.Apply(startingUpgrade);
    }
}

using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Checkpoint;
using Wyrmforge.Application.Runs.Depth;
using Wyrmforge.Application.Runs.EndRun;
using Wyrmforge.Application.Runs.Extraction;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Offerings;
using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Player;
using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Combat.Stats;
using Wyrmforge.Domain.Combat.Statuses;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Experience;
using Wyrmforge.Domain.Progression.Signature;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Contextual;
using Wyrmforge.Domain.Spells.Evolutions;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private readonly LevelChoiceService levelChoiceService;
    private readonly IRandomSource randomSource;
    private readonly PassiveCombatProfile passiveProfile;
    private WyrmrealmMapState mapState;
    private readonly List<WyrmrealmMapNode> completedRouteNodes = [];
    private readonly RunBuildState build = new();
    private IReadOnlySet<SpellId> availablePrimarySpells = new HashSet<SpellId>
    {
        SpellId.ArcaneOrb, SpellId.FireBolt, SpellId.FrostShard, SpellId.ChainLightning,
    };
    private readonly RunDepthState depthState = new();
    private readonly RunDepthTrialState depthTrialState = new();
    private readonly RunExtractionState extractionState = new();
    private readonly RunEssenceCargoState essenceCargoState = new();
    private readonly RunMaterialCargoState materialCargoState = new();
    private readonly RunCheckpointState checkpointState = new();
    private readonly ExperienceShardField experienceShards = new();
    private readonly PlayerState player = new();
    private readonly List<EnemyState> enemies = [];
    private readonly List<ProjectileState> projectiles = [];
    private readonly List<LightningTrace> lightning = [];
    private readonly List<EssenceBurstState> essenceBursts = [];
    private readonly List<EssenceBoltState> essenceBolts = [];
    private readonly Dictionary<int, double> hitFlashRemaining = [];
    private readonly List<SplashPulseState> splashPulses = [];
    private readonly Dictionary<SpellId, double> spellCooldowns = Enum.GetValues<SpellId>().ToDictionary(id => id, _ => 0d);
    private readonly Dictionary<SpellId, int> primaryCastCounts = Enum.GetValues<SpellId>().ToDictionary(id => id, _ => 0);
    private IReadOnlyList<LevelChoice> pendingChoices = [];
    private IReadOnlyList<DragonEssenceDefinition> pendingDragonEssenceChoices = [];
    private IReadOnlyList<SpellHudSnapshot> spellHud = [];
    private IReadOnlyList<SynergyHudSnapshot> synergyHud = [];
    private DragonState? dragon;
    private RunOutcome outcome = RunOutcome.InProgress;
    private double elapsed;
    private double spawnTimer;
    private double ashenWingMovementTime;
    private double ashenWingCooldown;
    private int castCount;
    private CastMotionRenderSnapshot? lastCastMotion;
    private double lastCastMotionStartedAt;
    private int projectileCastCount;
    private int hitCount;
    private int arcaneHitCount;
    private int enemyId;
    private int score;
    private int kills;
    private int dragonsSlain;
    private int level = 1;
    private int experience;
    private int experienceEarned;
    private int experienceToNext = ExperienceCurve.RequiredForLevel(1);
    private int choiceCount;
    private bool playerPositionInitialized;

    public RunSimulation(IReadOnlySet<string> selectedNodes, LevelChoiceService levelChoiceService, IRandomSource randomSource, DragonEssenceId? offering = null)
    {
        this.levelChoiceService = levelChoiceService;
        this.randomSource = randomSource;
        Offering = offering;
        mapState = new WyrmrealmMapState();
        learnedPassiveNodeIds = selectedNodes.ToHashSet(StringComparer.Ordinal);
        passiveProfile = PassiveCombatProfile.Create(selectedNodes);
        ApplyOffering();
        RefreshBuildHud();
        RefreshBuildModifiers();
        player.Health = player.MaxHealth;
        if (passiveProfile.WinterShell) player.Barrier = true;
    }

    public bool PrimaryCommitted => build.Spells.IsPrimaryCommitted;
    public IReadOnlyList<SpellDefinition> PrimaryChoices => SpellCatalog.All.Where(spell => availablePrimarySpells.Contains(spell.Id)).ToArray();

    public bool ChoosePrimary(SpellId id)
    {
        if (!availablePrimarySpells.Contains(id) || elapsed > 0 || mapState.EncounterActive || completedRouteNodes.Count > 0 || IsEnded)
            return false;
        if (!build.Spells.TryChoosePrimary(id)) return false;
        ApplyPreparedLaboratoryMutation();
        RefreshBuildModifiers();
        RefreshBuildHud();
        return true;
    }

    public IReadOnlyList<LevelChoice> PendingChoices => pendingChoices;
    public SpellSchool? PendingRewardSchool { get; private set; }
    public IReadOnlyList<DragonEssenceDefinition> PendingDragonEssenceChoices => pendingDragonEssenceChoices;
    public IReadOnlyList<DragonEssenceDefinition> SelectedDragonEssences => build.DragonEssences.Selected.Select(DragonEssenceCatalog.Get).ToArray();
    public IReadOnlyList<WyrmrealmMapNode> MapNodes => mapState.Nodes;
    public IReadOnlyList<WyrmrealmMapNode> AvailableMapNodes => mapState.AvailableNodes;
    public IReadOnlyList<WyrmrealmMapNode> CompletedMapNodes => mapState.CompletedNodes;
    public WyrmrealmMapNode? CurrentMapNode => mapState.CurrentNode;
    public DragonEssenceId? Offering { get; }
    public DragonId? HuntTarget => AttractedDragon;
    public bool PendingMapChoice => mapState.DecisionPending && !dragonEncounterStarted && !trailExitPending;
    public bool AtCheckpoint => checkpointState.IsOpen;
    public bool CanPushDeeper => SelectedHunt is null && depthState.CanPushDeeper;
    public bool DepthTrialActive => depthTrialState.IsActive;
    public bool EvacuationActive => extractionState.IsActive;
    public double EvacuationRemainingSeconds => extractionState.RemainingSeconds;
    public int DepthTrialKills => depthTrialState.Kills;
    public int DepthTrialKillsRequired => depthTrialState.KillsRequired;
    public int Depth => depthState.Depth;
    public int Level => level;
    public int FocusedSurgesCast { get; private set; }
    public int ExtractionRitualsCompleted { get; private set; }
    public int DeathsDuringExtraction { get; private set; }
    public int CheckpointVisit => checkpointState.Visit;
    public double Health => player.Health;
    public double MaxHealth => player.MaxHealth;
    public double ScoreMultiplier => depthState.ScoreMultiplier;
    public bool IsEnded { get; private set; }

    public IReadOnlyList<RunCheckpointActionState> CheckpointActions => AtCheckpoint ? CreateCheckpointActions() : Array.Empty<RunCheckpointActionState>();

    public RunRenderSnapshot Tick(double delta, MovementInput movement, double width, double height)
    {
        // The Canvas is a camera viewport. Encounter simulation occupies a larger deterministic world.
        viewportWidth = width;
        viewportHeight = height;
        var roaming = arenaEnvironment is not null && (mapState.EncounterActive || trailExitPending);
        arenaWidth = roaming ? Math.Max(width * 2.6, 950) : width;
        arenaHeight = roaming ? Math.Max(height * 2.5, 1550) : height;
        width = arenaWidth;
        height = arenaHeight;
        EnsurePlayerPosition(width, height);
        if (IsEnded || (!developmentHunt && (HasPendingRunChoice || AtCheckpoint || PendingMapChoice)))
        {
            // A paused choice/map is an input boundary, not a latched manual heading.
            manualAimEngaged = false;
            automaticTargetId = null;
            return CreateSnapshot();
        }
        if (trailExitPending)
        {
            delta = Math.Clamp(delta, 0, 0.05);
            elapsed += delta;
            UpdatePlayer(delta, movement, width, height);
            UpdateAim(movement);
            CollectEnvironmentSupplies(width, height);
            TryReachTrailExit();
            return CreateSnapshot();
        }
        delta = Math.Clamp(delta, 0, 0.05);
        reactionBudget.BeginStep();
        BeginPlayerDamageFrame(delta);
        UpdateCombatFeedback(delta);
        elapsed += delta;
        AdvanceControlTelemetry(delta);
        UpdatePlayer(delta, movement, width, height);
        CollectEnvironmentSupplies(width, height);
        UpdateExperienceShards(delta);
        UpdateRouteHazards(delta);
        UpdateDragonEssenceEffects(delta, movement.IsMoving);
        UpdateStatusDamage(delta);
        enemies.RemoveAll(enemy => enemy.Health <= 0);
        UpdateDragonEncounter(delta, width, height);
        UpdateSpawn(delta, width, height);
        UpdateAim(movement);
        UpdateSpellcasting(delta, movement.IsMoving);
        UpdateContextualEffects(delta);
        // The Reliquary's hush: one held breath in which nothing hostile moves or strikes.
        if (!UpdateReliquaryReveal(delta)) UpdateEnemies(delta);
        RebuildCombatSpatialIndex();
        UpdateBurningGrounds(delta);
        UpdateProjectiles(delta, width, height);
        UpdateLightning(delta);
        ResolveProjectileHits();
        ResolveRelicDefeatBursts();
        enemies.RemoveAll(enemy => enemy.Health <= 0);
        CompleteMapEncounterCleanup();
        ResolvePlayerDamage();
        if (player.Health <= 0)
        {
            if (extractionState.IsActive) DeathsDuringExtraction++;
            if (TryReturnToRefuge()) return CreateSnapshot();
            essenceCargoState.LosePending();
            materialCargoState.LosePending();
            extractionState.Cancel();
            outcome = RunOutcome.Defeated;
            IsEnded = true;
        }
        else if (extractionState.Tick(delta, player.Position))
        {
            ExtractionRitualsCompleted++;
            essenceCargoState.SecurePending();
            materialCargoState.SecurePending();
            ClearMapEncounterField();
            if (SelectedHunt is not null)
            {
                outcome = RunOutcome.Extracted;
                IsEnded = true;
            }
            else checkpointState.Enter();
        }
        return CreateSnapshot();
    }

    public bool ApplyChoice(string id)
    {
        var choice = pendingChoices.SingleOrDefault(candidate => candidate.Id == id);
        if (choice is null || !levelChoiceService.ApplyForProgression(build, choice, level + 1, PendingRewardSchool.HasValue)) return false;
        choiceCount++;
        RecordSelection(choice);
        ApplyChoiceEffects(choice);
        RefreshBuildHud();

        // Rank III no longer grants a free immediate evolution.
        // The player earns a separate evolution choice at a later five-level breakthrough.
        pendingChoices = [];
        CloseFateweaveRound();
        if (mapState.EncounterActive || dragonEncounterStarted) ReleaseUpgradePower();
        if (PendingRewardSchool.HasValue)
        {
            PendingRewardSchool = null;
            TryLevelUp();
        }
        else CompleteLevelUp();
        return true;
    }

    public bool ApplyDragonEssence(DragonEssenceId id)
    {
        var choice = pendingDragonEssenceChoices.SingleOrDefault(candidate => candidate.Id == id);
        if (choice is null || extractionState.IsActive || !build.DragonEssences.Select(id) || !essenceCargoState.Carry(id)) return false;
        pendingDragonEssenceChoices = [];
        RefreshDragonEssenceModifiers();
        if (!extractionState.Start(player.Position)) throw new InvalidOperationException("Selected Essence must start an evacuation ritual.");
        return true;
    }

    public bool UseCheckpointAction(RunCheckpointActionId action) => action switch
    {
        RunCheckpointActionId.MendWounds => MendWounds(),
        RunCheckpointActionId.Descend => PushDeeper(),
        RunCheckpointActionId.LeaveRealm => LeaveRealm(),
        _ => false,
    };

    public bool PushDeeper()
    {
        if (!AtCheckpoint || !CanPushDeeper || !checkpointState.TryUse(RunCheckpointActionId.Descend)) return false;
        if (!depthState.PushDeeper()) return false;
        mapState = CreateSeededMapState(depthState.Depth);
        depthTrialState.Start(depthState.Difficulty);
        attractedDragon = null;
        dragonPending = false;
        dragonEncounterStarted = false;
        ResetDragonHunt();
        mapEncounterCleanupPending = false;
        trailExitPending = false;
        ClearMapEncounterField();
        spawnTimer = 0;
        return true;
    }

    public bool LeaveRealm()
    {
        if (!checkpointState.TryUse(RunCheckpointActionId.LeaveRealm)) return false;
        outcome = RunOutcome.Extracted;
        IsEnded = true;
        return true;
    }

    public RunSummary AbandonRun()
    {
        essenceCargoState.LosePending();
        materialCargoState.LosePending();
        extractionState.Cancel();
        outcome = RunOutcome.Abandoned;
        IsEnded = true;
        return CreateSummary();
    }

    public RunSummary EndRun() => AbandonRun();

    public RunSummary CreateSummary() => new(score, kills, dragonsSlain, essenceCargoState.SecuredCount, essenceCargoState.Secured, (int)elapsed, level, choiceCount,
        build.Spells.LearnedCount, build.Synergies.Count, depthState.Depth, outcome)
    {
        Hunt = SelectedHunt,
        EssenceRarity = EssenceRarity,
        RefugeReturns = RefugeReturns,
        SynergyIds = build.Synergies.Snapshot().ToArray(),
        ExperienceEarned = experienceEarned,
        PreparedMutation = activeLaboratoryMutation,
        ReactionsTriggered = reactionsTriggered,
        EnemyRecords = CreateEnemyRecords(),
        ElitesSlain = defeatedElites.Select(defeat => defeat.Affix).Distinct().Order().ToArray(),
        ReliquarySlain = ReliquaryDefeat is not null,
        Draft = DraftTelemetry,
        Control = ControlTelemetry,
        ContextualCasts = ContextualCasts,
        SecuredMaterials = materialCargoState.Secured,
    };

    public RunRenderSnapshot CreateSnapshot()
    {
        var hud = new RunHudSnapshot(score, kills, (int)elapsed, player.Health, player.MaxHealth, level, experience, experienceToNext, spellHud, synergyHud);
        return new RunRenderSnapshot(
            new PlayerRenderSnapshot(player.Position.X, player.Position.Y, player.Radius, player.Barrier || player.WinterShellGuardRemaining > 0)
            {
                AimAngle = Math.Atan2(effectiveAim.Y, effectiveAim.X),
                ManualAim = manualAimEngaged,
                AimTargetId = automaticTargetId,
                FocusCharge = primaryCastCounts[build.Spells.ActiveSpell] % FocusedSurgeProfile.CastInterval,
                WardCharge = WardCharge,
                Chill = player.Chill.Stacks,
                OnBlackIce = PlayerOnBlackIce,
            },
            CreateExtractionSnapshot(),
            enemies.Select(enemy => new EnemyRenderSnapshot(enemy.Position.X, enemy.Position.Y, enemy.Radius, enemy.Statuses.Has(CombatStatusId.Frozen),
                Math.Clamp(enemy.Health / enemy.MaxHealth, 0, 1), hitFlashRemaining.ContainsKey(enemy.Id), CreateStatusSnapshots(enemy.Statuses), enemy.Kind, enemy.Id,
                CreateEnemyTelegraph(enemy))
            {
                ShieldFacing = enemy.Penitent is { ShieldRaised: true } shield ? Math.Atan2(shield.Facing.Y, shield.Facing.X) : null,
                Routed = enemy.RoutedRemaining > 0,
                Revived = enemy.Revived,
                Opacity = enemy.DrownedWraith?.Opacity ?? FrostOpacity(enemy),
                RimeArmor = RimeArmorRatio(enemy),
                Elite = enemy.IsElite ? enemy.Elite.ToString() : null,
                Empowered = IsWardEmpowered(enemy),
            }).ToArray(),
            CreateDragonSnapshot(),
            CreateDragonBreathSnapshot(),
            splashPulses.Select(pulse => new SplashPulseRenderSnapshot(pulse.Position.X, pulse.Position.Y, pulse.Radius, pulse.Progress)).ToArray(),
            elementalImpacts.Select(impact => new ElementalImpactRenderSnapshot(impact.Position.X, impact.Position.Y, impact.Spell, impact.Progress)
            {
                Rank = impact.Rank,
                Combination = impact.Combination,
                Surge = impact.Surge,
            }).ToArray(),
            deathBursts.Select(burst => new DeathBurstRenderSnapshot(burst.Position.X, burst.Position.Y, burst.Radius, burst.Progress, burst.Intensity, burst.Kind, burst.EntityId, burst.BodyRadius)).ToArray(),
            CreateFieryAreaSnapshots(),
            essenceBolts.Select(bolt => new EssenceBoltRenderSnapshot(bolt.From.X, bolt.From.Y, bolt.To.X, bolt.To.Y, bolt.Life)).ToArray(),
            projectiles.Select(projectile => new ProjectileRenderSnapshot(projectile.Position.X, projectile.Position.Y, projectile.Radius, projectile.Spell, projectile.Inferno)
            {
                Combination = projectile.Combination,
                Angle = Math.Atan2(projectile.Velocity.Y, projectile.Velocity.X),
                Rank = projectile.Rank,
                Surge = projectile.Surge,
            }).ToArray(),
            lightning.Select(trace => new LightningRenderSnapshot(trace.From.X, trace.From.Y, trace.To.X, trace.To.Y, trace.Life)).ToArray(),
            hud,
            !developmentHunt && (HasPendingRunChoice || AtCheckpoint || PendingMapChoice),
            IsEnded,
            CreateDragonHuntSnapshot(),
            CreateDragonHuntHazardSnapshots(),
            ExperienceShards: experienceShards.Shards.Select(shard => new ExperienceShardRenderSnapshot(shard.Position.X, shard.Position.Y, shard.Value)).ToArray(),
            ExperiencePickups: experiencePickupPulses.Select(pulse => new ExperiencePickupRenderSnapshot(pulse.Position.X, pulse.Position.Y, pulse.Value, pulse.Progress)).ToArray())
        {
            FireballVisual = FireballVisualRecipe.Resolve(preparedFireballLevel, preparedFireballMutations),
            Trail = CreateTrailSnapshot(),
            PowerBurst = CreatePowerBurstSnapshot(),
            Environment = arenaEnvironment?.Snapshot(),
            Exit = CreateTrailExitSnapshot(),
            World = arenaEnvironment is not null && (mapState.EncounterActive || trailExitPending) ? new ArenaWorldRenderSnapshot(arenaWidth, arenaHeight) : null,
            CastMotion = CreateCastMotionSnapshot(),
            HostileProjectiles = CreateHostileProjectileSnapshots(),
            AshRemains = CreateAshRemainsSnapshots(),
            WraithRipples = CreateWraithRippleSnapshots(),
            Reliquary = CreateReliquarySnapshot(),
            ReliquaryFields = CreateReliquaryFieldSnapshots(),
            BellWarden = CreateBellWardenSnapshot(),
            BellShockwaves = CreateBellShockwaveSnapshots(),
            PermafrostScars = CreatePermafrostScarSnapshots(),
            GlassTethers = CreateGlassTetherSnapshots(),
            GlassPrisons = CreateGlassPrisonSnapshots(),
            WinterRings = CreateWinterRingSnapshots(),
            Icicles = CreateIcicleSnapshots(),
            WardPulse = CreateWardPulseSnapshot(),
            IceLances = CreateIceLanceSnapshots(),
            SplinterBlooms = CreateSplinterBloomSnapshots(),
            BlackIce = CreateBlackIceSnapshots(),
            SnowClouds = CreateSnowCloudSnapshots(),
            RimeHusks = CreateRimeHuskSnapshots(),
            AvalancheRings = CreateAvalancheRingSnapshots(),
        };
    }

    private CastMotionRenderSnapshot? CreateCastMotionSnapshot()
    {
        if (lastCastMotion is not { } cast) return null;
        var duration = cast.Rank >= 3 ? .52 : cast.Rank == 2 ? .44 : .36;
        var progress = (elapsed - lastCastMotionStartedAt) / duration;
        return progress >= 1 ? null : cast with { Progress = Math.Clamp(progress, 0, 1) };
    }

    private ExtractionRenderSnapshot? CreateExtractionSnapshot()
    {
        if (!extractionState.IsActive) return null;
        var progress = 1 - extractionState.RemainingSeconds / RunExtractionState.DurationSeconds;
        return new ExtractionRenderSnapshot(extractionState.Position.X, extractionState.Position.Y, RunExtractionState.Radius, progress,
            extractionState.RemainingSeconds, extractionState.IsProgressing);
    }

    private bool HasPendingRunChoice => pendingChoices.Count > 0 || pendingDragonEssenceChoices.Count > 0 || pendingRelicChoices.Count > 0;

    private RunCheckpointActionState[] CreateCheckpointActions() =>
    [
        new(RunCheckpointActionId.MendWounds, checkpointState.CanUse(RunCheckpointActionId.MendWounds) && player.Health < player.MaxHealth,
            checkpointState.HasUsed(RunCheckpointActionId.MendWounds)),
        new(RunCheckpointActionId.Descend, CanPushDeeper),
        new(RunCheckpointActionId.LeaveRealm, true),
    ];

    private bool MendWounds()
    {
        if (!AtCheckpoint || player.Health >= player.MaxHealth || !checkpointState.TryUse(RunCheckpointActionId.MendWounds)) return false;
        player.Health = Math.Min(player.MaxHealth, player.Health + player.MaxHealth * RunCheckpointState.MendFraction);
        return true;
    }

    private void ApplyOffering()
    {
        if (Offering is not { } offeringId) return;
        var offering = RunOfferingCatalog.Get(offeringId);
        if (offering.StartingSpell is { } startingSpell)
        {
            build.Spells.LearnOrUpgrade(startingSpell);
            build.Spells.TryFocus(startingSpell);
        }
        if (offering.StartingUpgrade is { } startingUpgrade) build.RunUpgrades.Apply(startingUpgrade);
    }

    private void RefreshBuildHud()
    {
        spellHud = SpellCatalog.All.Where(spell => build.Spells[spell.Id] > 0).Select(spell =>
        {
            var evolutionId = build.Evolutions.For(spell.Id);
            var evolution = evolutionId is { } id ? SpellEvolutionCatalog.Get(id) : null;
            return new SpellHudSnapshot(spell.Icon, spell.Name, build.Spells[spell.Id], evolution?.Icon, evolution?.Name)
            {
                IsActive = spell.Id == build.Spells.ActiveSpell,
            };
        }).Concat(contextualPolicy is null ? [] : [new SpellHudSnapshot(WardingPulse.Icon, WardingPulse.Name, 0) { Contextual = true }]).ToArray();
        synergyHud = SynergyCatalog.All.Where(synergy => build.Synergies.Contains(synergy.Id)).Select(synergy => new SynergyHudSnapshot(synergy.Icon, synergy.Name)).ToArray();
    }
}

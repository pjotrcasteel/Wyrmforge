using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Checkpoint;
using Wyrmforge.Application.Runs.EndRun;
using Wyrmforge.Application.Runs.Hunts;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.SelfPlay;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Forge;
using Wyrmforge.Domain.Progression.Onboarding;
using Wyrmforge.Domain.Progression.PassiveTree;
using Wyrmforge.Domain.Progression.Relics;
using Wyrmforge.Domain.Progression.Signature;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.Navigation;

/// <summary>Proves a real-damage Ashfang victory and extraction before any Nexus reward may be spent.</summary>
[TestClass]
public sealed class DamageableAshfangExtractionTests
{
    public TestContext TestContext { get; set; } = null!;

    [TestMethod]
    public void EarnedFireWeb_DamageableVictorySecuresEssenceAndUpgradesNextHunt()
    {
        // A later, legitimately earnable Web build: one point is available at the
        // first Hunt; nine further non-abandoned Hunts earn the ten-point route.
        // Earlier defeats are not simulated here. #490 separately exercises real
        // damageable retries and their JSON Web save/reload boundary.
        // Reaching Ashfang around attempts 3-4 is distinct from beating him.
        var progress = new FirstHuntProgress();
        var web = new PassiveTreeSelection(1);
        web.SetActiveSchool(PassiveSchool.Fire);
        for (var completed = 0; completed < 10; completed++)
        {
            var tutorial = progress.TutorialRun;
            Assert.IsTrue(progress.CompleteRun(abandoned: false));
            if (progress.AwardsArcanePoint(tutorial, abandoned: false)) web.GrantPoints(1);
        }

        Assert.AreEqual(10, web.PointBudget);
        Assert.IsTrue(web.SelectPath(["fire-start", "fire-1", "fire-2",
            "fire-major", "wildfire", "inferno"]), "Ten earned Web points must unlock Dragon's Inferno.");

        // Preserve earned Web power across a real JSON serialization boundary before combat.
        var savedWeb = JsonSerializer.Serialize(new WebSave(progress.CompletedRuns, web.PointBudget, web.Selected.ToArray()));
        var state = JsonSerializer.Deserialize<WebSave>(savedWeb)!;
        var restoredProgress = new FirstHuntProgress();
        restoredProgress.Restore(state.Runs);
        Assert.IsFalse(restoredProgress.TutorialRun, "Reloaded hunter must not restart the first Hunt.");
        var restored = new PassiveTreeSelection(1);
        restored.SetActiveSchool(PassiveSchool.Fire);
        restored.RestoreBudget(state.Budget);
        restored.RestoreNodes(state.Nodes);
        CollectionAssert.AreEquivalent(web.Selected.ToArray(), restored.Selected.ToArray());

        const int width = 390;
        const int height = 700;
        var evidence = new List<string>();
        RunSimulation? extractedSimulation = null;
        RunSelfPlayMetrics? extractedMetrics = null;
        // Diagnostic discovery only: widen the deterministic sample to find a
        // reproducible real-damage extraction. Pin any successful seed in the
        // small permanent acceptance suite; do not infer typical win rates.
        var seeds = new[] { 42, 1204, 9100, 9101 }.Concat(Enumerable.Range(9200, 40));
        var trials = seeds.SelectMany(seed =>
            new[] { RunAgentPersonality.BuildFocused, RunAgentPersonality.Kiter,
                RunAgentPersonality.Casual }.Select(personality => (seed, personality)));
        foreach (var (seed, personality) in trials)
        {
            var simulation = new RunSimulationFactory(new SeededRandomSource(seed)).Create(
                restored.Selected, seed: seed, progression: new ForgeProgressionState(),
                hunt: HuntSelection.FireTierOne, firstHunt: restoredProgress.TutorialRun);
            var build = new SelfPlayBuildDefinition("Earned Fire Web", SelfPlayBuildCohort.KeystoneRoute,
                SpellSchool.Fire, restored.Selected, [], restored.SpentPoints);
            var agent = new AshfangTelegraphAgent(
                new HeuristicRunAgent(personality, seed, SpellSchool.Fire));
            var metrics = new RunSelfPlayDriver().Play(build, seed, simulation, agent,
                new RunSelfPlayOptions(ArenaWidth: width, ArenaHeight: height,
                    MaximumSimulatedSeconds: 900, MaximumWallClockSeconds: 60));

            var row = $"seed={seed} strategy={personality} outcome={metrics.Outcome} stop={metrics.StopReason} " +
                $"damage={metrics.DamageTaken:F0} healthMin={metrics.MinimumHealthRatio:F2} " +
                $"routes={metrics.CompletedRouteNodes} wyrmReached={metrics.WyrmsReached} " +
                $"bossMinHP={agent.LowestBossHealthRatio:F2} bossFrames={agent.BossFrames} " +
                $"bossWindups={agent.BossWindups} contactEscapes={agent.ContactEscapes} " +
                $"stalledExits={agent.ExitSidesteps} " +
                $"hitByAttack={agent.DamageByAttack} " +
                $"dragonsSlain={metrics.DragonsSlain} essence={metrics.EssenceSecured} " +
                $"rituals={metrics.ExtractionRitualsCompleted} deathsInRitual={metrics.DeathsDuringExtraction} " +
                $"ritualFrames={agent.ExtractionFrames} ritualEntryHp={agent.ExtractionStartHealth:F0} " +
                $"ritualPaused={agent.ExtractionPausedFrames} ritualKills={agent.ExtractionKills} " +
                $"seconds={metrics.SimulatedSeconds:F1} " +
                $"evolutions={string.Join(",", metrics.EvolutionIds)}";
            evidence.Add(row);
            TestContext.WriteLine(row);

            if (metrics.Outcome != RunOutcome.Extracted) continue;
            extractedSimulation = simulation;
            extractedMetrics = metrics;
            break;
        }

        var message = string.Join(Environment.NewLine, evidence);
        Assert.IsNotNull(extractedSimulation, "No natural damageable Ashfang extraction observed. This is a gameplay/test-agent blocker, not a reason to enable invulnerability." +
            Environment.NewLine + message);
        Assert.IsNotNull(extractedMetrics);
        Assert.AreEqual(RunSelfPlayStopReason.NaturalEnd, extractedMetrics.StopReason, message);
        Assert.IsGreaterThan(0, extractedMetrics.DamageTaken, "The hunter must have been exposed to actual combat damage.");
        Assert.AreEqual(1, extractedMetrics.DragonsSlain, message);
        Assert.IsGreaterThanOrEqualTo(1, extractedMetrics.EssenceSecured, message);
        Assert.AreEqual(1, extractedMetrics.ExtractionRitualsCompleted, message);

        var summary = extractedSimulation.CreateEvaluationSummary();
        Assert.AreEqual(RunOutcome.Extracted, summary.Outcome);
        Assert.IsGreaterThanOrEqualTo(1, summary.EssenceIds.Count);

        // Only a naturally extracted Essence may enter the vault and purchase the first Nexus upgrade.
        var vault = new DragonEssenceVault();
        foreach (var essence in summary.EssenceIds) vault.Store(essence);
        var beforeSpend = vault.Entries.Count;
        var core = new FireballCoreState();
        Assert.IsTrue(core.DiscoverSecured(summary.EssenceIds));
        Assert.IsTrue(core.Upgrade(vault, new HuntMaterialSatchel()));
        Assert.AreEqual(beforeSpend - 1, vault.Entries.Count, "The Nexus must actually consume one secured Essence.");
        Assert.AreEqual(2, core.Level);
        Assert.IsTrue(core.Equip(0, core.Discovered.Single()));

        var restoredCore = new FireballCoreState();
        restoredCore.Restore(JsonSerializer.Deserialize<FireballCoreSave>(JsonSerializer.Serialize(core.ToSave())));
        Assert.AreEqual(2, restoredCore.Level);
        CollectionAssert.AreEquivalent(core.Equipped.ToArray(), restoredCore.Equipped.ToArray());
        var nextHunt = new RunSimulationFactory(new SeededRandomSource(4321)).Create(
            restored.Selected, seed: 4321, progression: new ForgeProgressionState(),
            hunt: HuntSelection.FireTierOne, fireballLevel: restoredCore.Level,
            fireballMutations: restoredCore.Equipped);
        var nextSummary = nextHunt.CreateEvaluationSummary();
        Assert.AreEqual(2, nextSummary.PreparedFireballLevel);
        CollectionAssert.AreEquivalent(restoredCore.Equipped.ToArray(), nextSummary.PreparedFireballMutations.ToArray());
    }

    private sealed record WebSave(int Runs, int Budget, string[] Nodes);

    // Only returns legitimate player movement and menu decisions from public snapshots.
    // Does not modify HP, damage, timers, enemies, boss state, RNG, rewards or simulation fields.
    private sealed class AshfangTelegraphAgent(IRunAgent inner) : IRunAgent
    {
        private (double X, double Y) exitAnchor;
        private int exitStalledTicks;
        private int exitSidestepTicks;
        private double exitSidestepDirection;
        private bool wasMoving;
        private double lastHealth = double.NaN;
        private int dodgeAttackSequence = -1;
        private int dodgeSide = 1;
        private readonly Dictionary<string, double> damageByAttack = new();

        public string Name => "Telegraph-aware " + inner.Name;
        public string DamageByAttack => string.Join(",", damageByAttack.OrderBy(entry => entry.Key)
            .Select(entry => $"{entry.Key}:{entry.Value:F0}"));
        public double LowestBossHealthRatio { get; private set; } = 1;
        public int BossFrames { get; private set; }
        public int BossWindups { get; private set; }
        public int ContactEscapes { get; private set; }
        public int ExitSidesteps { get; private set; }
        public int ExtractionFrames { get; private set; }
        public double ExtractionStartHealth { get; private set; } = -1;
        public int ExtractionPausedFrames { get; private set; }
        public int ExtractionKills { get; private set; }
        private int extractionStartKills;

        public MovementInput ChooseMovement(RunAgentObservation observation)
        {
            var frame = observation.Snapshot;
            if (!double.IsNaN(lastHealth) && frame.Hud.Health < lastHealth)
            {
                var action = frame.Extraction is not null ? "extraction" : frame.Dragon is { } damageWyrm
                    ? $"{damageWyrm.Action ?? "idle"}/{damageWyrm.ActionPhase ?? "unknown"}" : "pre-boss";
                damageByAttack[action] = damageByAttack.GetValueOrDefault(action) + lastHealth - frame.Hud.Health;
            }
            lastHealth = frame.Hud.Health;
            if (frame.Exit is not null) return ChooseExitMovement(observation);
            if (frame.Extraction is not null) return ChooseExtractionMovement(observation);
            if (frame.Dragon is not { Targetable: true } wyrm)
                return inner.ChooseMovement(observation);

            BossFrames++;
            LowestBossHealthRatio = Math.Min(LowestBossHealthRatio, wyrm.Health / Math.Max(1, wyrm.MaxHealth));
            if (wyrm.ActionPhase == "windup") BossWindups++;
            var player = frame.Player;
            var contactX = player.X - wyrm.X;
            var contactY = player.Y - wyrm.Y;
            // Contact damage keeps ticking while Ashfang stands on the mage.
            // Escaping immediately is a legal player response, not invulnerability.
            if (Length(contactX, contactY) < wyrm.Radius + player.Radius + 40)
            {
                ContactEscapes++;
                var retreat = Length(contactX, contactY) > .001
                    ? Move(contactX, contactY) : Move(wyrm.DirectionY, -wyrm.DirectionX);
                return AimAtBoss(retreat, player.X, player.Y, wyrm.X, wyrm.Y);
            }

            var hazard = (frame.HuntHazards ?? []).OrderBy(h =>
                Length(player.X - h.X, player.Y - h.Y) - h.Radius).FirstOrDefault();
            if (hazard is not null && Length(player.X - hazard.X, player.Y - hazard.Y) < hazard.Radius + 85)
            {
                var hx = player.X - hazard.X;
                var hy = player.Y - hazard.Y;
                var escape = Length(hx, hy) > .001 ? Move(hx, hy) : Move(player.Y - wyrm.Y, wyrm.X - player.X);
                return AimAtBoss(escape, player.X, player.Y, wyrm.X, wyrm.Y);
            }

            // Ashfang commits to warned attack directions. Sidestep a breath
            // cone or pounce without altering the real combat rules.
            if (wyrm.ActionPhase is "windup" or "strike")
            {
                var meleeRange = wyrm.Action switch
                {
                    "claw_right" => 155,
                    "claw_combo" => 165,
                    "bite" => 180,
                    "tail_left" or "tail_right" => 150,
                    _ => 0,
                };
                if (wyrm.ActionPhase == "windup" && meleeRange > 0 &&
                    Length(player.X - wyrm.X, player.Y - wyrm.Y) < meleeRange + 25)
                {
                    return AimAtBoss(Move(player.X - wyrm.X, player.Y - wyrm.Y),
                        player.X, player.Y, wyrm.X, wyrm.Y);
                }

                var isBreath = wyrm.Action is "breath" or "breath_sweep";
                var isPounce = wyrm.Action == "pounce";
                var x = player.X - wyrm.AttackTargetX;
                var y = player.Y - wyrm.AttackTargetY;
                var nearTarget = Length(x, y) < 190;
                if (isBreath || isPounce || nearTarget)
                {
                    var axisX = wyrm.DirectionX;
                    var axisY = wyrm.DirectionY;
                    if (dodgeAttackSequence != wyrm.AttackSequence)
                    {
                        var side = Math.Sign((player.X - wyrm.X) * -axisY + (player.Y - wyrm.Y) * axisX);
                        if (side == 0) side = wyrm.AttackSequence % 2 == 0 ? 1 : -1;
                        // Lock the choice for the full committed attack instead of
                        // reversing direction when a sweeping beam crosses the mage.
                        var leftX = player.X - axisY * 180;
                        var leftY = player.Y + axisX * 180;
                        var rightX = player.X + axisY * 180;
                        var rightY = player.Y - axisX * 180;
                        if (frame.World is { } world)
                        {
                            double Clearance(double px, double py) =>
                                Math.Min(Math.Min(px, world.Width - px), Math.Min(py, world.Height - py));
                            if (Clearance(side > 0 ? leftX : rightX, side > 0 ? leftY : rightY) < 50 &&
                                Clearance(side > 0 ? rightX : leftX, side > 0 ? rightY : leftY) > 50) side = -side;
                        }
                        dodgeSide = side;
                        dodgeAttackSequence = wyrm.AttackSequence;
                    }
                    return AimAtBoss(Move(-axisY * dodgeSide, axisX * dodgeSide),
                        player.X, player.Y, wyrm.X, wyrm.Y);
                }
            }

            var dx = player.X - wyrm.X;
            var dy = player.Y - wyrm.Y;
            var distance = Math.Max(1, Length(dx, dy));
            // Stay close enough for legitimate Fire Bolt casts without walking
            // into Ashfang's 125-unit tail and 175-unit bite ranges.
            var radial = distance < 205 ? 1.6 : distance > 255 ? -0.9 : 0;
            return AimAtBoss(Move(-dy / distance + dx / distance * radial, dx / distance + dy / distance * radial),
                player.X, player.Y, wyrm.X, wyrm.Y);
        }

        // Defend the actual ten-second ritual by moving around its interior.
        // Never leave the circle, change its countdown, or suppress its waves.
        private MovementInput ChooseExtractionMovement(RunAgentObservation observation)
        {
            ExtractionFrames++;
            var frame = observation.Snapshot;
            if (ExtractionFrames == 1)
            {
                ExtractionStartHealth = frame.Hud.Health;
                extractionStartKills = frame.Hud.Kills;
            }
            ExtractionKills = frame.Hud.Kills - extractionStartKills;
            if (!frame.Extraction!.IsProgressing) ExtractionPausedFrames++;
            var ritual = frame.Extraction!;
            var px = frame.Player.X;
            var py = frame.Player.Y;
            var dx = px - ritual.X;
            var dy = py - ritual.Y;
            var distance = Length(dx, dy);
            var ux = distance > .001 ? dx / distance : 1;
            var uy = distance > .001 ? dy / distance : 0;
            var ring = ritual.Radius * 0.65;

            // Running in a small circle keeps spawned attackers moving rather
            // than allowing several to converge on a stationary hunter.
            var radial = distance > ring + 8 ? -1.8 : distance < ring - 8 ? 0.9 : 0;
            var mx = -uy + ux * radial;
            var my = ux + uy * radial;

            var closest = frame.Enemies.OrderBy(enemy => Length(px - enemy.X, py - enemy.Y)).FirstOrDefault();
            if (closest is not null)
            {
                var enemyDistance = Length(px - closest.X, py - closest.Y);
                if (enemyDistance < 95)
                {
                    var avoidance = (95 - enemyDistance) / 95 * 1.4;
                    mx += (px - closest.X) / Math.Max(1, enemyDistance) * avoidance;
                    my += (py - closest.Y) / Math.Max(1, enemyDistance) * avoidance;
                }
            }

            // Hard return to the ritual interior if enemy avoidance starts
            // pushing the mage toward the boundary.
            if (distance > ritual.Radius * .80)
            {
                mx = -ux * 2 - uy * .4;
                my = -uy * 2 + ux * .4;
            }
            var move = Move(mx, my);
            return closest is null ? move : AimAtBoss(move, px, py, closest.X, closest.Y);
        }

        private MovementInput ChooseExitMovement(RunAgentObservation observation)
        {
            var movement = inner.ChooseMovement(observation);
            var frame = observation.Snapshot;
            var position = (frame.Player.X, frame.Player.Y);
            var moved = Math.Abs(position.X - exitAnchor.X) + Math.Abs(position.Y - exitAnchor.Y) > 4;
            if (moved || !wasMoving)
            {
                exitAnchor = position;
                exitStalledTicks = 0;
            }
            else exitStalledTicks++;
            wasMoving = movement.IsMoving;
            if (exitSidestepTicks > 0)
            {
                exitSidestepTicks--;
                return new MovementInput(exitSidestepDirection, 0);
            }

            if (exitStalledTicks > 20 && frame.World is { } world && frame.Environment?.Props is { Count: > 0 } props)
            {
                var closest = props.OrderBy(prop =>
                    Math.Abs(prop.X * world.Width - position.X) + Math.Abs(prop.Y * world.Height - position.Y)).First();
                exitStalledTicks = 0;
                exitSidestepTicks = 30;
                exitSidestepDirection = position.X < closest.X * world.Width ? -1 : 1;
                ExitSidesteps++;
            }
            return movement;
        }

        // Manual aiming uses the same right-stick/touch input a player has. This only
        // changes the choice of aim direction, not how the simulation fires or hits.
        private static MovementInput AimAtBoss(MovementInput movement, double px, double py, double bx, double by)
        {
            var dx = bx - px;
            var dy = by - py;
            var distance = Length(dx, dy);
            return distance < .001 ? movement : new MovementInput(movement.X, movement.Y, dx / distance, dy / distance);
        }

        private static double Length(double x, double y) => Math.Sqrt(x * x + y * y);

        private static MovementInput Move(double x, double y)
        {
            var length = Length(x, y);
            return length < .0001 ? new MovementInput(0, 0) : new MovementInput(x / length, y / length);
        }

        public string ChooseMapNode(RunAgentObservation observation) => inner.ChooseMapNode(observation);
        public LevelChoice ChooseLevelChoice(RunAgentObservation observation) => inner.ChooseLevelChoice(observation);
        public RelicId ChooseRelic(RunAgentObservation observation) => inner.ChooseRelic(observation);
        public DragonEssenceId ChooseEssence(RunAgentObservation observation) => inner.ChooseEssence(observation);
        public RunCheckpointActionId ChooseCheckpointAction(RunAgentObservation observation)
        {
            if (observation.SecuredEssenceCount > 0 && observation.CheckpointActions.Any(action =>
                    action.Id == RunCheckpointActionId.LeaveRealm && action.Enabled))
                return RunCheckpointActionId.LeaveRealm;
            return inner.ChooseCheckpointAction(observation);
        }
    }
}

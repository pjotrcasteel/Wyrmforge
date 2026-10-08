using System.Diagnostics;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Development;
using Wyrmforge.Application.Runs.SelfPlay;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Progression.Forge;
using Wyrmforge.Domain.Spells;
using Wyrmforge.PlaytestStudy;

var seeds = int.Parse(Argument("--seeds", "12"), System.Globalization.CultureInfo.InvariantCulture);
if (seeds is < 1 or > 1000) throw new ArgumentOutOfRangeException(nameof(seeds));
var output = Path.GetFullPath(Argument("--output", "artifacts/player-study"));
var mode = Argument("--mode", "all");
if (mode is not ("all" or "runs" or "bosses" or "dodge" or "world" or "verify")) throw new ArgumentException("Unknown study mode.");
var studyLabel = Argument("--label", "Baseline");
var gameIdentity = typeof(RunSimulation).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion ?? "Unknown";
var json = new JsonSerializerOptions(JsonSerializerDefaults.Web) { WriteIndented = true };
json.Converters.Add(new JsonStringEnumConverter());
Directory.CreateDirectory(output);
var stopwatch = Stopwatch.StartNew();

Verify();
if (mode == "verify") return;
if (mode is "all" or "runs") RunStudy();
if (mode is "all" or "bosses") BossStudy();
if (mode is "all" or "dodge") DodgeStudy();
if (mode == "world") WorldGeometryStudy();
Console.WriteLine($"Completed in {stopwatch.Elapsed.TotalSeconds:0.0}s. Evidence: {output}");

string Argument(string key, string fallback)
{
    var index = Array.IndexOf(args, key);
    return index >= 0 && index + 1 < args.Length ? args[index + 1] : fallback;
}

RunSelfPlayMetrics Play(SelfPlayBuildDefinition build, StudyArena arena, StudyProfile profile, int seed, bool fresh, out double wallRate)
{
    var simulation = new RunSimulationFactory(new SeededRandomSource(1)).Create(build.SelectedNodes, seed: seed,
        progression: fresh ? new ForgeProgressionState() : null);
    var agent = new ImperfectRunAgent(profile, arena, seed, build.PreferredSchool);
    var result = new RunSelfPlayDriver().Play(build, seed, simulation, agent,
        new RunSelfPlayOptions(ArenaWidth: arena.Width, ArenaHeight: arena.Height, MaximumSimulatedSeconds: 720));
    wallRate = agent.OutwardWallInputRate;
    return result;
}

void Verify()
{
    var build = StudyBuilds.All[0];
    foreach (var arena in StudyArena.All)
    {
        foreach (var profile in StudyProfile.All)
        {
            var first = Play(build, arena, profile, 10000, true, out var firstWall);
            var repeat = Play(build, arena, profile, 10000, true, out var repeatWall);
            if (JsonSerializer.Serialize(first, json) != JsonSerializer.Serialize(repeat, json) || firstWall != repeatWall)
                throw new InvalidOperationException($"Non-deterministic study profile: {arena.Name}/{profile.Name}");
        }
        var control = Play(build, arena, StudyProfile.All[0], 10000, false, out _);
        var original = new RunSelfPlayDriver().Play(build, 10000,
            new RunSimulationFactory(new SeededRandomSource(1)).Create(build.SelectedNodes, seed: 10000),
            new HeuristicRunAgent(RunAgentPersonality.Casual, 10000, build.PreferredSchool),
            new RunSelfPlayOptions(ArenaWidth: arena.Width, ArenaHeight: arena.Height));
        if (JsonSerializer.Serialize(control with { Agent = original.Agent }, json) != JsonSerializer.Serialize(original, json))
            throw new InvalidOperationException($"Control policy changed original behaviour in {arena.Name}.");
    }
    Console.WriteLine("Verified deterministic repeats for all profiles/arenas and exact Control equivalence to original Casual agent.");
}

void RunStudy()
{
    var rows = new List<StudyRun>();
    foreach (var build in StudyBuilds.All)
    {
        foreach (var arena in StudyArena.All)
        {
            foreach (var profile in StudyProfile.All)
            {
                for (var index = 0; index < seeds; index++)
                {
                    var result = Play(build, arena, profile, 10000 + index, true, out var wallRate);
                    rows.Add(new StudyRun("Fresh", arena, profile.Name, wallRate, result));
                }
            }
            if (SelfPlayBuildCatalog.All.Contains(build))
            {
                for (var index = 0; index < seeds; index++)
                {
                    var result = Play(build, arena, StudyProfile.All[0], 10000 + index, false, out var wallRate);
                    rows.Add(new StudyRun("AllBase", arena, "Control", wallRate, result));
                }
            }
        }
        File.WriteAllText(Path.Combine(output, "player-runs.json"), JsonSerializer.Serialize(new
        {
            GameIdentity = gameIdentity, StudyLabel = studyLabel, GeneratedAtUtc = DateTimeOffset.UtcNow,
            TickSeconds = 0.05, SeedStart = 10000, SeedsPerCombination = seeds, Profiles = StudyProfile.All, Runs = rows,
        }, json));
        Console.WriteLine($"{build.Name}: {rows.Count} player runs recorded");
    }
}

void BossStudy()
{
    var build = SelfPlayBuildCatalog.Get("Fire / Frost Hybrid");
    var rows = new List<BossResult>();
    foreach (var arena in StudyArena.All)
    {
        foreach (var spell in new[] { SpellId.ArcaneOrb, SpellId.FireBolt, SpellId.FrostShard, SpellId.ChainLightning })
        {
            foreach (var wyrm in Enum.GetValues<DragonId>())
            {
                foreach (var profile in StudyProfile.All.Where(profile => profile.Name is "Control" or "Novice" or "EdgeAwareControl" or "EdgeAwareNovice"))
                {
                    for (var index = 0; index < seeds; index++) rows.Add(Fight(build, arena, spell, wyrm, profile, 10000 + index));
                }
            }
            Console.WriteLine($"Boss trials {arena.Name}/{spell}: {rows.Count} recorded");
        }
    }
    File.WriteAllText(Path.Combine(output, "boss-trials.json"), JsonSerializer.Serialize(new
    {
        GameIdentity = gameIdentity, StudyLabel = studyLabel, GeneratedAtUtc = DateTimeOffset.UtcNow,
        Build = build.Name, build.SpentPoints, Depth = 2, MaximumSeconds = 180, Runs = rows,
    }, json));
}

void WorldGeometryStudy()
{
    var rows = new List<StudyRun>();
    foreach (var viewport in StudyArena.All.Where(arena => arena.Name != "Desktop"))
    {
        var scale = Math.Sqrt(1280d * 720 / (viewport.Width * viewport.Height));
        var arena = new StudyArena($"{viewport.Name}EqualWorldArea", viewport.Width * scale, viewport.Height * scale);
        foreach (var build in StudyBuilds.All)
        {
            foreach (var profile in StudyProfile.All.Where(profile => profile.Name is "EdgeAwareControl" or "EdgeAwareNovice"))
            {
                for (var index = 0; index < seeds; index++)
                {
                    var result = Play(build, arena, profile, 10000 + index, true, out var wallRate);
                    rows.Add(new StudyRun("Fresh", arena, profile.Name, wallRate, result));
                }
            }
        }
        Console.WriteLine($"Virtual-world geometry {arena.Name}: {rows.Count} runs recorded");
    }
    File.WriteAllText(Path.Combine(output, "world-geometry-runs.json"), JsonSerializer.Serialize(new
    {
        GameIdentity = gameIdentity, StudyLabel = studyLabel, GeneratedAtUtc = DateTimeOffset.UtcNow,
        Interpretation = "Geometry-only experiment. Larger world coordinates at the same viewport aspect; no renderer or input transform was implemented.",
        Runs = rows,
    }, json));
}

BossResult Fight(SelfPlayBuildDefinition build, StudyArena arena, SpellId spell, DragonId wyrm, StudyProfile profile, int seed)
{
    var setup = new DevelopmentHuntSetup(wyrm, false, 1, spell, seed, arena.Width, arena.Height);
    var simulation = new RunSimulationFactory(new SeededRandomSource(1)).CreateDevelopmentHunt(build.SelectedNodes, setup);
    var agent = new ImperfectRunAgent(profile, arena, seed, build.PreferredSchool);
    var snapshot = simulation.CreateSnapshot();
    var seconds = 0d;
    var minHealth = 1d;
    var secondPhase = false;
    var previousHealth = snapshot.Hud.Health;
    var damage = 0d;
    while (!simulation.IsEnded && snapshot.Dragon is not null && seconds < 180)
    {
        var observation = new RunAgentObservation(snapshot, [], [], [], [], [], simulation.Depth, 0, false);
        snapshot = simulation.Tick(0.05, agent.ChooseMovement(observation), arena.Width, arena.Height);
        seconds += 0.05;
        minHealth = Math.Min(minHealth, Math.Max(0, snapshot.Hud.Health / snapshot.Hud.MaxHealth));
        damage += Math.Max(0, previousHealth - snapshot.Hud.Health);
        previousHealth = snapshot.Hud.Health;
        secondPhase |= snapshot.Dragon?.Phase == 2;
    }
    var victory = simulation.CreateEvaluationSummary().DragonIds.Contains(wyrm);
    return new BossResult(arena.Name, spell.ToString(), wyrm.ToString(), profile.Name, seed, victory,
        simulation.IsEnded && !victory, !victory && !simulation.IsEnded, secondPhase, seconds, minHealth, damage, agent.OutwardWallInputRate);
}

void DodgeStudy()
{
    var results = new List<object>();
    foreach (var wyrm in new[] { DragonId.Voidweaver, DragonId.Rimeclaw })
    {
        foreach (var phase in new[] { 1, 2 })
        {
            foreach (var reaction in new[] { 0d, 0.25, 0.4 })
            {
                var setup = new DevelopmentHuntSetup(wyrm, false, phase, SpellId.ArcaneOrb, 10000, 1280, 720);
                var simulation = new RunSimulationFactory(new SeededRandomSource(1)).CreateDevelopmentHunt(new HashSet<string>(), setup);
                var attack = DragonCatalog.Get(wyrm).Combat.Attack;
                var radius = attack.Geometry.Radius.For(phase);
                var snapshot = simulation.CreateSnapshot();
                Wyrmforge.Application.Runs.Simulation.Snapshots.SplashPulseRenderSnapshot? warning = null;
                for (var tick = 0; tick < 1000 && warning is null; tick++)
                {
                    snapshot = simulation.Tick(0.05, new MovementInput(0, 0), setup.Width, setup.Height);
                    warning = snapshot.SplashPulses.FirstOrDefault(pulse => Math.Abs(pulse.Radius - radius) < 0.001 && pulse.Progress < 0.1
                        && Math.Abs(pulse.X - snapshot.Player.X) < 1 && Math.Abs(pulse.Y - snapshot.Player.Y) < 1);
                }
                if (warning is null || snapshot.Dragon?.Phase != phase) throw new InvalidOperationException("Could not isolate the requested target-burst warning.");
                var healthBefore = snapshot.Hud.Health;
                var elapsed = 0d;
                for (var tick = 0; tick < 100; tick++)
                {
                    var moving = elapsed + 0.000001 >= reaction;
                    snapshot = simulation.Tick(0.05, new MovementInput(moving ? 1 : 0, 0), setup.Width, setup.Height);
                    elapsed += 0.05;
                    if (!snapshot.SplashPulses.Any(pulse => Math.Abs(pulse.Radius - radius) < 0.001
                        && Math.Abs(pulse.X - warning.X) < 0.001 && Math.Abs(pulse.Y - warning.Y) < 0.001)) break;
                }
                var distance = Math.Sqrt(Math.Pow(snapshot.Player.X - warning.X, 2) + Math.Pow(snapshot.Player.Y - warning.Y, 2));
                results.Add(new
                {
                    Wyrm = wyrm.ToString(), Phase = phase, ReactionSeconds = reaction, WarningSeconds = attack.TelegraphSeconds.For(phase), Radius = radius,
                    BaseSpeed = 190, IdealTravelBeforeStrike = Math.Max(0, attack.TelegraphSeconds.For(phase) - reaction) * 190,
                    ObservedWarningWindowSeconds = elapsed, DistanceAtWarningEnd = distance, DamageAcrossWarningWindow = healthBefore - snapshot.Hud.Health,
                });
            }
        }
    }
    File.WriteAllText(Path.Combine(output, "dodge-probes.json"), JsonSerializer.Serialize(new { GameIdentity = gameIdentity, StudyLabel = studyLabel, Results = results }, json));
    Console.WriteLine("Recorded 12 direct target-burst probes using an unboosted, non-freezing mage and straight-line escape in open space.");
}

internal sealed record BossResult(string Arena, string Spell, string Wyrm, string Profile, int Seed, bool Victory, bool Defeated, bool TimeLimit,
    bool SecondPhase, double Seconds, double MinimumHealthRatio, double DamageTaken, double OutwardWallInputRate);

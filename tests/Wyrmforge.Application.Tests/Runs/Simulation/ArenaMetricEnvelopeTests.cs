using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Hunts;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class ArenaMetricEnvelopeTests
{
    [TestMethod]
    public void CombatEnvelope_IsFixedInMetresAtThirtyTwoUnitsPerMetre()
    {
        Assert.AreEqual(32d, ArenaMetricEnvelope.UnitsPerMeter);
        Assert.AreEqual(1024d, ArenaMetricEnvelope.CombatWidth);
        Assert.AreEqual(1920d, ArenaMetricEnvelope.CombatHeight);
    }

    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 700)]
    [DataRow(390, 844)]
    [DataRow(440, 956)]
    public void CombatWorld_DoesNotDependOnTheViewport(int viewportWidth, int viewportHeight)
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource())
            .Create(new HashSet<string>(), seed: 1204, hunt: HuntSelection.FireTierOne);
        Assert.IsTrue(simulation.ChoosePrimary(Wyrmforge.Domain.Spells.SpellId.FireBolt));
        simulation.Tick(0, default, viewportWidth, viewportHeight);
        Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes[0].Id));

        var snapshot = simulation.Tick(.05, default, viewportWidth, viewportHeight);

        Assert.IsNotNull(snapshot.World);
        Assert.AreEqual(ArenaMetricEnvelope.CombatWidth, snapshot.World.Width);
        Assert.AreEqual(ArenaMetricEnvelope.CombatHeight, snapshot.World.Height);
    }

    [TestMethod]
    public void CombatEnvironment_IsIdenticalAcrossViewports()
    {
        string Describe(int width, int height)
        {
            var simulation = new RunSimulationFactory(new FirstRandomSource())
                .Create(new HashSet<string>(), seed: 1204, hunt: HuntSelection.FireTierOne);
            simulation.ChoosePrimary(Wyrmforge.Domain.Spells.SpellId.FireBolt);
            simulation.Tick(0, default, width, height);
            simulation.ChooseMapNode(simulation.AvailableMapNodes[0].Id);
            var environment = simulation.Tick(.05, default, width, height).Environment!;
            return string.Join('|', environment.Props.Select(prop => $"{prop.Id}:{prop.Kind}:{prop.X:0.####}:{prop.Y:0.####}"));
        }

        Assert.AreEqual(Describe(320, 568), Describe(440, 956));
    }
}

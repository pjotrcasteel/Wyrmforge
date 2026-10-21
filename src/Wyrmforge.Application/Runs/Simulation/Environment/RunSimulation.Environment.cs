using Wyrmforge.Domain.Progression.Signature;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private void CollectEnvironmentSupplies(double width, double height)
    {
        if ((!mapState.EncounterActive && !trailExitPending) || arenaEnvironment is null) return;
        var collected = arenaEnvironment.TryCollect(player.Position, width, height, player.Radius, player.Health < player.MaxHealth);
        if (collected is null) return;

        if (collected.Kind.StartsWith("material:", StringComparison.Ordinal) &&
            Enum.TryParse<HuntMaterialId>(collected.Kind["material:".Length..], out var material))
        {
            materialCargoState.Collect(material);
            return;
        }

        switch (collected.Kind)
        {
            case "health":
                player.Health = Math.Min(player.MaxHealth, player.Health + player.MaxHealth * 0.08);
                break;
            case "experience":
                // Ordinary earned experience: the temporary spell build and permanent Hunter track both receive it.
                GainExperience(3);
                break;
        }
    }
}

using Wyrmforge.Domain.Combat.Dragons;

namespace Wyrmforge.Domain.Progression.GreatHunt;

public sealed record AscendantRite(DragonId Wyrm, string Trophy, string Signature, string Promise, string VictoryStory, string Omen);

public static class AscendantRiteCatalog
{
    public static IReadOnlyList<AscendantRite> All { get; } =
    [
        new(DragonId.Ashfang, "Crown of Embers", "Crownfall",
            "Survive moving Crownfall gates at Depth II. The first crown waits beyond the fire.",
            "You endured Crownfall and brought down Ascendant Ashfang. Your permanent Crown now shines in the Great Hunt altar.",
            "THE FIRST CROWN AWAKENS"),
        new(DragonId.Stormcoil, "Stormbound Halo", "Skybreak Crossing",
            "Follow the rhythm of three crossing lightning corridors at Depth II. Each wave demands a new escape.",
            "You crossed the Skybreak currents and defeated Ascendant Stormcoil. The Stormbound Halo now illuminates your Great Hunt altar.",
            "THE SKY REMEMBERS YOUR NAME"),
    ];

    public static bool IsAvailable(DragonId wyrm) => All.Any(rite => rite.Wyrm == wyrm);

    public static AscendantRite Get(DragonId wyrm) => All.Single(rite => rite.Wyrm == wyrm);
}

namespace Wyrmforge.Domain.Combat.Dragons;

public static class DragonCatalog
{
    public static DragonDefinition Ashfang { get; } = new(DragonId.Ashfang, "Ashfang", "Cinder Wyrm", 34, 1100, 78);

    public static DragonDefinition Stormcoil { get; } = new(DragonId.Stormcoil, "Stormcoil", "Tempest Wyrm", 32, 1500, 92);

    public static IReadOnlyList<DragonDefinition> All { get; } = [Ashfang, Stormcoil];

    public static DragonDefinition Get(DragonId id) => All.Single(dragon => dragon.Id == id);
}

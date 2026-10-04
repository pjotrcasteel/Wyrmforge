using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Combat.Dragons;

public sealed record DragonDefinition(DragonId Id, string Name, string Title, SpellSchool School, DragonStats Stats, DragonCombatProfile Combat)
{
    public double Radius => Stats.Radius;
    public double MaxHealth => Stats.MaxHealth;
    public double Speed => Stats.Speed;
}

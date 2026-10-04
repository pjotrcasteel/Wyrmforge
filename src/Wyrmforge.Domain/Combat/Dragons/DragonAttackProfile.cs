using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Combat.Dragons;

public sealed record DragonAttackProfile(
    DragonAttackPattern Pattern,
    SpellId VisualSpell,
    DragonPhaseValues TelegraphSeconds,
    DragonPhaseValues CooldownSeconds,
    DragonPhaseValues Damage,
    DragonAttackGeometry Geometry);

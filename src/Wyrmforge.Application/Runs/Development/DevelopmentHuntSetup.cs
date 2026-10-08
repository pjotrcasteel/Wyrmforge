using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Development;

public sealed record DevelopmentHuntSetup(
    DragonId Wyrm,
    bool Ascendant,
    int Phase,
    SpellId Spell,
    int Seed,
    double Width,
    double Height,
    bool Invulnerable = false)
{
    public void Validate()
    {
        if (!Enum.IsDefined(Wyrm) || !Enum.IsDefined(Spell)) throw new ArgumentOutOfRangeException(nameof(Wyrm));
        if (Phase is not (1 or 2)) throw new ArgumentOutOfRangeException(nameof(Phase));
        if (Width < 240 || Height < 240 || Width > 2560 || Height > 2560) throw new ArgumentOutOfRangeException(nameof(Width));
    }
}

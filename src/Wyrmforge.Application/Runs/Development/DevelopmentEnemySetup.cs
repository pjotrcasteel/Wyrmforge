using Wyrmforge.Domain.Combat.Enemies;

namespace Wyrmforge.Application.Runs.Development;

/// <summary>Isolated renderer inspection: this entry point never reads or writes saved progression.</summary>
public sealed record DevelopmentEnemySetup(EnemyKind Kind, int Seed, double Width, double Height, bool Casting = false, bool AgentFoundation = false, bool AgentPerception = false, int EntityId = 1)
{
    public void Validate()
    {
        if (EntityId is < 1 or > 1_000_000) throw new ArgumentOutOfRangeException(nameof(EntityId));
        if (!Enum.IsDefined(Kind)) throw new ArgumentOutOfRangeException(nameof(Kind));
        if (!double.IsFinite(Width) || !double.IsFinite(Height) || Width < 240 || Height < 240 || Width > 2560 || Height > 2560)
            throw new ArgumentOutOfRangeException(nameof(Width));
    }
}

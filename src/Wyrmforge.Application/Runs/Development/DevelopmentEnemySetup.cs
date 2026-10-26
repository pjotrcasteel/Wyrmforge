using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Agents;

namespace Wyrmforge.Application.Runs.Development;

/// <summary>Isolated renderer inspection: this entry point never reads or writes saved progression.</summary>
public sealed record DevelopmentEnemySetup(EnemyKind Kind, int Seed, double Width, double Height, bool Casting = false, bool AgentFoundation = false, bool AgentPerception = false)
{
    public AgentTier? Intelligence { get; init; }
    public int Count { get; init; } = 1;

    public void Validate()
    {
        if (Intelligence is { } tier && !Enum.IsDefined(tier)) throw new ArgumentOutOfRangeException(nameof(Intelligence));
        if (Count < 1 || Count > 64) throw new ArgumentOutOfRangeException(nameof(Count));
        if (Count > 1 && Kind is not (EnemyKind.Hollow or EnemyKind.MireHound)) throw new ArgumentException("Pack preview supports Hollow and Mire Hound.");
        if (!Enum.IsDefined(Kind)) throw new ArgumentOutOfRangeException(nameof(Kind));
        if (!double.IsFinite(Width) || !double.IsFinite(Height) || Width < 240 || Height < 240 || Width > 2560 || Height > 2560)
            throw new ArgumentOutOfRangeException(nameof(Width));
    }
}

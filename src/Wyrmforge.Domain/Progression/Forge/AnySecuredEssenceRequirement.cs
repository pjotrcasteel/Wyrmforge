using Wyrmforge.Domain.Progression.DragonEssences;

namespace Wyrmforge.Domain.Progression.Forge;

public sealed record AnySecuredEssenceRequirement(IReadOnlySet<DragonEssenceId> EssenceIds) : ForgeDiscoveryRequirement
{
    public override bool IsSatisfiedBy(ForgeDiscoveryContext context) => context.SecuredEssences.Any(EssenceIds.Contains);
}

using Wyrmforge.Domain.Progression.DragonEssences;

namespace Wyrmforge.Domain.Progression.Forge;

public sealed record ForgeDiscoveryContext(IReadOnlySet<DragonEssenceId> SecuredEssences)
{
    public static ForgeDiscoveryContext FromEssences(IEnumerable<DragonEssenceId> essences)
    {
        ArgumentNullException.ThrowIfNull(essences);
        return new ForgeDiscoveryContext(new HashSet<DragonEssenceId>(essences));
    }
}

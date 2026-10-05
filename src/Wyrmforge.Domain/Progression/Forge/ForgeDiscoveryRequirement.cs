namespace Wyrmforge.Domain.Progression.Forge;

public abstract record ForgeDiscoveryRequirement
{
    public abstract bool IsSatisfiedBy(ForgeDiscoveryContext context);
}

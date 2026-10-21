using Wyrmforge.Domain.Progression.Signature;

namespace Wyrmforge.Application.Runs.Extraction;

/// <summary>Common loot is provisional until the player secures a Hunt checkpoint.</summary>
public sealed class RunMaterialCargoState
{
    private readonly List<HuntMaterialId> pending = [];
    private readonly List<HuntMaterialId> secured = [];
    public IReadOnlyList<HuntMaterialId> Secured => secured.ToArray();
    public IReadOnlyList<HuntMaterialId> Pending => pending.ToArray();

    public void Collect(HuntMaterialId id) => pending.Add(id);
    public void SecurePending()
    {
        secured.AddRange(pending);
        pending.Clear();
    }

    public void LosePending() => pending.Clear();
}

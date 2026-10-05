using Wyrmforge.Domain.Progression.DragonEssences;

namespace Wyrmforge.Application.Runs.Extraction;

public sealed class RunEssenceCargoState
{
    private readonly List<DragonEssenceId> pending = [];
    private readonly List<DragonEssenceId> secured = [];

    public IReadOnlyList<DragonEssenceId> Pending => pending.ToArray();
    public IReadOnlyList<DragonEssenceId> Secured => secured.ToArray();
    public int SecuredCount => secured.Count;

    public bool Carry(DragonEssenceId id)
    {
        if (pending.Contains(id) || secured.Contains(id)) return false;
        pending.Add(id);
        return true;
    }

    public void SecurePending()
    {
        secured.AddRange(pending);
        pending.Clear();
    }

    public void LosePending() => pending.Clear();
}

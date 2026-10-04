using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Domain.Progression.Relics;

namespace Wyrmforge.Application.Runs.Relics;

public sealed class RelicChoiceService
{
    public const int ChoiceCount = 3;

    public IReadOnlyList<RelicDefinition> Roll(RelicInventoryState inventory, IRandomSource randomSource)
    {
        var pool = RelicCatalog.All.Where(definition => !inventory.IsOwned(definition.Id)).ToList();
        var choices = new List<RelicDefinition>();
        while (choices.Count < ChoiceCount && pool.Count > 0)
        {
            var index = randomSource.Next(pool.Count);
            choices.Add(pool[index]);
            pool.RemoveAt(index);
        }
        return choices;
    }
}

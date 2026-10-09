using Wyrmforge.Domain.Progression.Relics;

namespace Wyrmforge.Application.Runs.Relics;

public sealed record RelicSelection(RelicId Relic, RelicId? Replace = null);

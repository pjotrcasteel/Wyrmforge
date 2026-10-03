using Wyrmforge.Domain.Progression.DragonEssences;

namespace Wyrmforge.Application.Runs.Offerings;

public sealed record RunOfferingDefinition(DragonEssenceId EssenceId, string Effect);

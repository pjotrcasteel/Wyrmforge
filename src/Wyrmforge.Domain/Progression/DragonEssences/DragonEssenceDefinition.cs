namespace Wyrmforge.Domain.Progression.DragonEssences;

public sealed record DragonEssenceDefinition(
    DragonEssenceId Id,
    string Name,
    string Source,
    string Icon,
    string Effect,
    string Description);

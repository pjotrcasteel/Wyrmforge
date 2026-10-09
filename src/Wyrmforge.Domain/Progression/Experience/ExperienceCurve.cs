namespace Wyrmforge.Domain.Progression.Experience;

public static class ExperienceCurve
{
    public static int RequiredForLevel(int level) => level switch
    {
        <= 1 => 6,
        2 => 10,
        _ => 10 + (level - 1) * 5
    };
}

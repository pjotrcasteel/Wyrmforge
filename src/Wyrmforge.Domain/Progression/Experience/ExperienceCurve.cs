namespace Wyrmforge.Domain.Progression.Experience;

public static class ExperienceCurve
{
    public static int RequiredForLevel(int level) => 10 + Math.Max(0, level - 1) * 5;
}

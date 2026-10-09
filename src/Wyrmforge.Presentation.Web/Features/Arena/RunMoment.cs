namespace Wyrmforge.Presentation.Web.Features.Arena;

public sealed record RunMoment(string Eyebrow, string Title, string Detail, RunMomentTone Tone = RunMomentTone.Standard, bool Compact = false);

public enum RunMomentTone
{
    Standard,
    Rare,
    Legendary,
    Success,
    Danger,
}

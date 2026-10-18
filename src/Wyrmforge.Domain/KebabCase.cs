namespace Wyrmforge.Domain;

/// <summary>Lower-case kebab-case ids, used for data-authored content (regions, story books) that is saved by name.</summary>
internal static class KebabCase
{
    public static bool IsValid(string? value) =>
        !string.IsNullOrWhiteSpace(value)
        && value.All(character => char.IsAsciiLetterLower(character) || char.IsAsciiDigit(character) || character == '-')
        && !value.StartsWith('-') && !value.EndsWith('-') && !value.Contains("--", StringComparison.Ordinal);
}

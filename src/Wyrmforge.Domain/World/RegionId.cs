namespace Wyrmforge.Domain.World;

/// <summary>
/// Stable identity of an authored region (amendment §6, §11.5). Kebab-case strings rather than an enum, so dozens of regions
/// can be added by data without renumbering anything that is saved.
/// </summary>
public readonly record struct RegionId
{
    public RegionId(string value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Any(character => !(char.IsAsciiLetterLower(character) || char.IsAsciiDigit(character) || character == '-'))
            || value.StartsWith('-') || value.EndsWith('-') || value.Contains("--", StringComparison.Ordinal))
            throw new ArgumentException("A region id is lower-case kebab-case.", nameof(value));
        Value = value;
    }

    public string Value { get; }

    public override string ToString() => Value;
}

using System.Globalization;

namespace Wyrmforge.Presentation.Web.Shared;

// Maps catalog glyph icons to generated pixel-atlas icons (wwwroot/art/icons.css).
// A glyph string may combine several symbols (e.g. a synergy "🔥❄"); every symbol must
// resolve, otherwise the original glyph text is kept so no meaning is ever dropped.
public static class GameIconMap
{
    private static readonly IReadOnlyDictionary<string, string> Map = new Dictionary<string, string>(StringComparer.Ordinal)
    {
        ["✦"] = "arcane", ["◈"] = "arcane", ["⋈"] = "arcane",
        ["◇"] = "crystal", ["◆"] = "crystal", ["♢"] = "crystal", ["⬙"] = "crystal", ["❖"] = "crystal",
        ["✧"] = "star", ["⋆"] = "star", ["✹"] = "star", ["✺"] = "star", ["✵"] = "star", ["⊛"] = "star", ["✨"] = "star",
        ["🔥"] = "fire", ["♨"] = "fire", ["🜂"] = "fire", ["☄"] = "fire",
        ["❄"] = "frost", ["❆"] = "frost", ["❅"] = "frost",
        ["⚡"] = "storm", ["ϟ"] = "storm", ["↯"] = "storm", ["⌁"] = "storm",
        ["♥"] = "heart", ["💙"] = "heart",
        ["⬟"] = "shield", ["◉"] = "rune", ["◴"] = "hourglass", ["⟳"] = "cycle", ["≋"] = "wave",
        ["➶"] = "arrow", ["➤"] = "arrow", ["↟"] = "arrow",
        ["♛"] = "crown", ["🐉"] = "wyrm", ["🪽"] = "wing", ["🦷"] = "fang",
    };

    public static IReadOnlyList<string>? Resolve(string? glyph)
    {
        if (string.IsNullOrWhiteSpace(glyph)) return null;
        var ids = new List<string>(2);
        var elements = StringInfo.GetTextElementEnumerator(glyph.Trim());
        while (elements.MoveNext())
        {
            var symbol = ((string)elements.Current).Replace("\uFE0F", string.Empty).Replace("\uFE0E", string.Empty);
            if (symbol.Length == 0 || char.IsWhiteSpace(symbol[0])) continue;
            if (!Map.TryGetValue(symbol, out var id)) return null;
            ids.Add(id);
        }
        return ids.Count == 0 ? null : ids;
    }
}

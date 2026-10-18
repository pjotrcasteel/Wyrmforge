namespace Wyrmforge.Domain.Chronicles;

/// <summary>
/// Authored story books. Book I follows the 2026-10-15 handover §3. Names of people and places are provisional canon
/// (2026-10-18), written so the product owner can adjust them later without touching saves: only ids are persisted.
/// </summary>
public static class StoryBookCatalog
{
    public static StoryBookDefinition BrokenCovenant { get; } = new(
        new("broken-covenant"),
        "Book I — The Broken Covenant",
        Version: 1,
        StoryBookStatus.InPreparation,
        "When the world can no longer be protected as it once was, what are you willing to change to save it?",
        "Humanity survives behind wards powered by the Covenant Engines. Their fuel is running out, the Wyrms have changed, and the settlements beyond the walls are the first to feel it.",
        [
            new(new("prologue"), "Prologue — The Night of the Breach",
                "The ward over Cindervale flickers out for a single night. Something walks through the gap, and you answer it with the first spell you have ever cast in anger.",
                "Your first hunt."),
            new(new("beyond-the-last-ward"), "Act I — Beyond the Last Ward",
                "Wet forests, emptied villages and ruins past the wall. The wards cannot cover everyone, and the Wyrms have begun to hunt differently.",
                "First Wyrm hunts, early discoveries and the research desk."),
            new(new("the-forbidden-testament"), "Act II — The Forbidden Testament",
                "The Archivist uncovers the Sealed Testament: the original terms of the Covenant, and the magic it forbade. Every faction wants it handled differently.",
                "Guided combinations and the first true mutations in the Arcane Nexus."),
            new(new("the-hollow-crown"), "Act III — The Hollow Crown",
                "The last Covenant Engine falters, and a monumental Wyrm rises from the Cinder Frontier to claim what the engines held back.",
                "Prototype advanced spellcraft and the first monumental Wyrm."),
        ],
        [
            new(new("cost-of-protection"), new("beyond-the-last-ward"), "The Cost of Protection",
                "The ward can hold one place. Which one?",
                [
                    new(new("reinforce-highward"), "Reinforce Highward", "The city's walls hold. Cindervale must defend itself, and some of its people will not see the spring."),
                    new(new("shield-cindervale"), "Shield Cindervale", "The frontier town is saved. Highward's outer ward thins, and the city pays for it."),
                ]),
            new(new("price-of-knowledge"), new("the-forbidden-testament"), "The Price of Knowledge",
                "Who should hold the Sealed Testament?",
                [
                    new(new("seal-the-testament"), "Seal it away", "The dangerous records stay locked in the Archive. Safer, and slower."),
                    new(new("release-the-testament"), "Release it to all", "Every hearth learns what the Covenant forbade. Hope and fear spread together."),
                    new(new("entrust-the-researchers"), "Entrust the researchers", "Independent scholars study it beyond the Ward Commander's reach."),
                ]),
            new(new("future-of-humanity"), new("the-hollow-crown"), "The Future of Humanity",
                "The crisis is contained. What becomes of the power you recovered?",
                [
                    new(new("the-last-bastion"), "Stabilize the engine", "Highward's engine burns again. The wards hold, on a system no one fully understands."),
                    new(new("the-open-roads"), "Carry it to the frontier", "Protection is shared among the settlements. Wider hope, thinner walls."),
                    new(new("the-unbound-dawn"), "Forge something new", "The power goes into an untested alternative, held together by interim safeguards."),
                ]),
        ],
        [
            new(new("the-last-bastion"), "The Last Bastion", "Preservation",
                "The wards hold, but humanity remains dependent on a system it does not understand."),
            new(new("the-open-roads"), "The Open Roads", "Rebuilding",
                "The roads between settlements open again. Hope reaches further; the defenses are fragile."),
            new(new("the-unbound-dawn"), "The Unbound Dawn", "Transformation",
                "The catastrophe is averted by something new, and its future is still being researched."),
        ],
        [
            new("Ward Commander", "Commander Aldric Vane", "Protection must be concentrated where it can still hold."),
            new("Archivist", "Archivist Seren Thale", "Fears what knowledge does in the wrong hands, and what silence does in all of them."),
            new("Enginekeeper", "Enginekeeper Brannoc Hale", "Keeps the last Covenant Engine running, and is no longer sure what it burns."),
            new("Outlands Scout", "Scout Wren Ashby", "Born in Cindervale; speaks for everyone outside the walls."),
        ]);

    public static IReadOnlyList<StoryBookDefinition> All { get; } = [BrokenCovenant];

    public static StoryBookDefinition? Find(StoryId id) => All.FirstOrDefault(book => book.Id == id);
}

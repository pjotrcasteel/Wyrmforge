using Wyrmforge.Domain.Combat.Enemies;

namespace Wyrmforge.Domain.Progression.Bestiary;

/// <summary>Field-guide text for one creature. Roles, counterplay and habitats follow the first-hunt brief (§2).</summary>
public sealed record BestiaryEntry(
    EnemyKind Kind,
    string Name,
    string Tier,
    string Behavior,
    string Counterplay,
    string Habitats,
    string HunterNote);

public static class BestiaryCatalog
{
    /// <summary>Kills needed before the hunter's private note on a creature is revealed.</summary>
    public const int HunterNoteKills = 10;

    /// <summary>Kills needed for a creature to be marked as studied.</summary>
    public const int StudiedKills = 50;

    public static IReadOnlyList<BestiaryEntry> All { get; } =
    [
        new(EnemyKind.Hollow, "The Hollow", "Common • mindless chaser",
            "Shambles straight at the hunter and grasps at arm's length. Alone it is nothing; a crowd of them is a wall.",
            "Keep moving, kite them into a line, and spend area spells and crowd control on the pack.",
            "Village, road, graveyard, monastery",
            "They still wear what they wore on the day the ash fell. Some carry tools; none remember why."),
        new(EnemyKind.MireHound, "Mire Hound", "Common • fast flanker",
            "Stalks at the edge of sight, circles to the hunter's side, then lunges and breaks away to reposition.",
            "Watch for the low crouch: sidestep the lunge, then punish the recovery before it circles again.",
            "Wet forest, overgrown village",
            "Hounds never attack from where you are looking. Turn to face one and it starts walking again."),
        new(EnemyKind.Ashling, "Ashling", "Common • coordinated swarmer",
            "Small, quick and horned. Ashlings circle and dart in as a pack and hold formation while a priest commands them.",
            "Burst the pack with area spells, split it, or kill the commander: leaderless Ashlings scatter.",
            "Open field, scorched road",
            "Ashlings are afraid of being alone. Their courage is borrowed, and the priest is the one lending it."),
        new(EnemyKind.Penitent, "The Penitent", "Common • heavy guardian",
            "A slow giant behind a single tower shield. It guards priests and slingers, blocks frontal hits and shield-bashes anyone close.",
            "Flank the shield, or stagger it with a heavy hit. Its back is bare.",
            "Village chapel, monastery",
            "The shield is a door from the old chapel. The penitents carry their vows the way others carry wounds."),
        new(EnemyKind.AshSlinger, "Ash Slinger", "Common • ranged harasser",
            "Keeps to the back line and lobs a glowing ember in a slow arc. The ember marks the ground before it lands.",
            "Step off the marked circle, then close the gap: slingers are fragile once you reach them.",
            "Open field, scorched approach",
            "The sling hums before every throw. Learn the sound and you will never need to look."),
        new(EnemyKind.AshPriest, "Ash Priest", "Common • healer and commander",
            "Stays behind the line, mends the pack with a visible tether, rallies Ashlings and raises fallen ones from their remains.",
            "Interrupt the ritual and break the tether, isolate the priest and kill it first.",
            "Open field, demonic warbands, village edge",
            "Their staffs burn with the same fire as Ashfang's breath. Nobody knows who taught them the prayers."),
        new(EnemyKind.DrownedWraith, "Drowned Wraith", "Uncommon • ambusher",
            "Glides unseen below the water, rises beside the hunter behind a closing ring, rakes once with a spectral claw and fades.",
            "Read the ripple and step out of the claw wedge; strike while it hangs exposed after the attack.",
            "Flooded cloister, drowned crypt",
            "The cloister bells rang the night the river rose. The wraiths still rise when they hear footsteps."),
    ];

    public static BestiaryEntry Get(EnemyKind kind) => All.Single(entry => entry.Kind == kind);
}

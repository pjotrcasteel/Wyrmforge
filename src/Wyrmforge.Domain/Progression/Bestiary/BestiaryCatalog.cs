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
        new(EnemyKind.Reliquary, "The Reliquary", "Unique • ultra-rare ward-bearer",
            "A crowned ritualist that rises from ruined sanctuaries. It plants wards that empower nearby monsters, seeds corruption under the hunter and marks delayed seal blasts. At half strength its ritual deepens.",
            "Destroy the ward, break the support, then punish the caster: it is shielded while a ward stands. Leave every marked circle.",
            "Ruined monastery, flooded cloister, scorched sanctuary",
            "It carries a splinter of the Wyrm in its censers. The monks who built the cloister never wrote down what they were guarding."),
        new(EnemyKind.BellWarden, "The Bell Warden", "Named • guardian of the lair road",
            "An armoured giant that carries the monastery's great bell. It smashes the bell down behind a long raised tell, sends a tolling wave down the ground and rings in reinforcements. At half strength the bell cracks.",
            "Leave the marked crater, then step inside it before the shockwave rolls out. Sidestep the toll. Strike while it heaves the bell back up.",
            "Ruined bell arch before the Wyrm's lair",
            "The bell once rang to warn the valley of the Wyrm. Now it rings for him."),
        new(EnemyKind.FrostlingPackling, "Frostling Packling", "Common • pack encircler",
            "Small rime-backed hunters that never chase in a line. Each takes a place on a slowly turning ring around the hunter, then skitters in low for a hamstring bite that chills. They bite faster and harder at prey that is already cold.",
            "Break the ring before it closes, keep moving to stay warm, and punish the Packling that just lunged while it recovers.",
            "Glacier shelf, frozen pass",
            "A pack is patient. It does not need to kill you; it only needs you to slow down."),
        new(EnemyKind.Shardcaster, "Shardcaster", "Common • ranged lane-caster",
            "Plants itself at a distance, draws a straight lane and fires a fast ice lance down it. Where the lance stops, splinters bloom a heartbeat later. Every third cast it glazes the ground with slick black ice.",
            "Step out of the lane and away from where it ends. Stay off black ice, then close in while it skates to its next spot.",
            "Glacier shelf, rime cliffs",
            "It never looks at you while it aims. It looks at the line, and the line looks at you."),
        new(EnemyKind.WhitefangStalker, "Whitefang Stalker", "Common • flanker",
            "A frost-maned predator that prowls wide. It kicks up a snow cloud where you last saw it and darts behind your heading, then crouches and leaps from the flank. Its Tendon Chill bite slows the escape.",
            "Watch the cloud, not the spot it left. Keep your sides clear, step off the pounce lane during the crouch, and punish the long recovery.",
            "Glacier shelf, wind-cut roads",
            "It tests your focus before it tests your flesh."),
        new(EnemyKind.CairnSentinel, "Cairn Sentinel", "Common • heavy guardian",
            "A monastery guardian sealed in ice. It marches in, plants its tower shield in a Frost Brace that soaks hits from the front and cannot be shoved, then stamps an Avalanche Step: a wave of shock that rolls out across its front and chills.",
            "Flank it instead of trading into the shield: beside or behind it, neither the brace nor the wave reaches you. Strike while it recovers.",
            "Frozen cloister, rime cliffs",
            "Rimeclaw's winter kept their oath and emptied their purpose."),
        new(EnemyKind.HoarfrostCantor, "Hoarfrost Cantor", "Common • support commander",
            "A keeper of winter rites who stays behind its pack and chants. The Rime Hymn crusts nearby allies in frost armour, Reknit pulls a fallen Frostling's husk back into a thrall, and the Stillness Verse numbs anyone who comes close.",
            "Pressure the backline and break the chant: a real burst or a shove mid-verse silences it. Every rite you let finish makes the pack harder to break.",
            "Frozen cathedral, bell-hung cloisters",
            "Its hymns stiffen flesh and preserve the dead for the glacier's liturgy."),
        new(EnemyKind.MirrorWisp, "Mirror Wisp", "Uncommon • ambusher",
            "A spectral shape that is never quite there: most of a hit passes through it. It glass-steps through black ice or beside you, leaves a false double behind, and strikes a short Shiver Cut.",
            "Do not chase the first apparition: the double only drifts. Step out of the cut, then punish the real Wisp while it hangs solid after the strike.",
            "Black-ice halls, frost-glass ruins",
            "It remembers a face but not a life."),
        new(EnemyKind.BellOfWinter, "The Bell of Winter", "Named • set piece of the glacier road",
            "A monumental keeper that drags a frozen bell on chains. Its Permafrost Slam leaves scars of ice that stay on the ground, its Winter Toll sends freezing rings with only a few open lanes, and its Icicle Recall calls the shards in those scars down from above. It never calls for help. At half strength the bell rimes over into Deep Winter.",
            "Read the slow tells. Run the open lanes of each ring, keep the scars from walling you in, and leave every marked shard. Punish the long recovery after each swing: panic and greed are equally fatal.",
            "Frozen bell road before Rimeclaw's lair",
            "The bell once called the faithful to prayer. Now it tolls for the dead, and its ringing announces Rimeclaw's absolute winter."),
    ];

    /// <summary>The creatures the book can list; ritual objects such as wards have no page.</summary>
    public static bool HasEntry(EnemyKind kind) => All.Any(entry => entry.Kind == kind);

    public static BestiaryEntry Get(EnemyKind kind) => All.Single(entry => entry.Kind == kind);
}

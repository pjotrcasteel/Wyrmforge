using System.Collections.Immutable;
using System.Globalization;
namespace Wyrmforge.Domain.Agents;

/// <summary>Scores earned observations only. The executor always owns committed attacks.</summary>
public sealed class CombatTacticPolicy(CombatCapabilities capabilities, bool hasPounce) : IAgentPolicy
{
    public ImmutableArray<AgentAlternative> Evaluate(AgentContext context)
    {
        string Fact(string key) => context.Observations.FirstOrDefault(f => f.Key == key)?.Value ?? "";
        var known = Fact("target") is not ("unknown" or "");
        var visible = Fact("target-visible") == "True";
        var moving = Fact("path-status") is "Moving" or "legacy";
        var distance = double.TryParse(Fact("distance"), CultureInfo.InvariantCulture, out var value) ? value : double.PositiveInfinity;
        var cooldown = double.TryParse(Fact("cooldown"), CultureInfo.InvariantCulture, out value) ? value : 1;
        var ready = visible && Fact("may-commit") == "True" && cooldown <= .15;
        var counter = capabilities.Adapt ? Fact("adaptation") : "none";
        var committed = Fact("phase") is "Windup" or "Pounce" or "Recover" or "Retreat";
        return [
            new("commitment", "hound-cycle", 20, hasPounce && committed, "authored-attack-and-recovery-lock"),
            new("attack", "hound-cycle", 8, hasPounce && known && moving && ready && distance <= 170, "earned-sight-range-cooldown-slot"),
            new("make-space", "retreat", 6, hasPounce && capabilities.Reposition && known && moving && (distance < 90 || counter == "hold-space" && distance < 120) && !ready, "close-range-cooldown-disengage"),
            new("reposition", "strafe", 4, hasPounce && capabilities.Reposition && known && moving && distance is >= 90 and <= 190 && !ready, "circle-during-cooldown"),
            new("pursue", "chase", counter == "close-distance" && distance > 140 ? 4.5 : 2, known && moving, "approach-last-confirmed-location"),
            new("idle", "wait", 1, true, "unknown-or-blocked-target")
        ];
    }
}

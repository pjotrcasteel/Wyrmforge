using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Hunts;

public sealed record DragonHuntSignatureStrike(Vector2D Position, double DelaySeconds, double? Radius = null);

public static class DragonHuntSignaturePlanner
{
    public static IReadOnlyList<DragonHuntSignatureStrike> Create(
        DragonHuntSignatureProfile signature,
        int phase,
        Vector2D dragonPosition,
        Vector2D playerPosition,
        double width,
        double height,
        IRandomSource randomSource)
    {
        ArgumentNullException.ThrowIfNull(signature);
        ArgumentNullException.ThrowIfNull(randomSource);
        var strikes = Math.Max(1, signature.StrikesFor(phase));
        var radius = signature.Radius.For(phase);
        return signature.Kind switch
        {
            DragonHuntSignatureKind.CinderSweep => CinderSweep(strikes, radius, dragonPosition, playerPosition, width, height),
            DragonHuntSignatureKind.TempestCage => TempestCage(strikes, radius, playerPosition, width, height, randomSource),
            DragonHuntSignatureKind.GlacialWall => GlacialWall(strikes, radius, playerPosition, width, height, randomSource),
            DragonHuntSignatureKind.RiftEcho => RiftEcho(strikes, radius, playerPosition, width, height),
            DragonHuntSignatureKind.Crownfall => Crownfall(strikes, radius, playerPosition, width, height),
            DragonHuntSignatureKind.SkybreakCrossing => SkybreakCrossing(strikes, radius, playerPosition, width, height),
            _ => throw new InvalidOperationException($"Unsupported Wyrm signature {signature.Kind}."),
        };
    }

    private static IReadOnlyList<DragonHuntSignatureStrike> CinderSweep(
        int strikes,
        double radius,
        Vector2D dragonPosition,
        Vector2D playerPosition,
        double width,
        double height)
    {
        var direction = Vector2D.DirectionTo(dragonPosition, playerPosition);
        if (direction.Length <= double.Epsilon) direction = new Vector2D(0, 1);
        var spacing = radius * 2.05;
        var offset = -spacing * (strikes - 1) / 2d;
        return Enumerable.Range(0, strikes)
            .Select(index => new DragonHuntSignatureStrike(
                Clamp(playerPosition + direction * (offset + spacing * index), width, height, radius),
                index * 0.16))
            .ToArray();
    }

    private static IReadOnlyList<DragonHuntSignatureStrike> TempestCage(
        int strikes,
        double radius,
        Vector2D playerPosition,
        double width,
        double height,
        IRandomSource randomSource)
    {
        var ringRadius = radius * 2.65;
        var rotation = randomSource.NextDouble() * Math.PI * 2;
        return Enumerable.Range(0, strikes)
            .Select(index =>
            {
                var angle = rotation + index * Math.PI * 2 / strikes;
                var offset = new Vector2D(Math.Cos(angle), Math.Sin(angle)) * ringRadius;
                return new DragonHuntSignatureStrike(Clamp(playerPosition + offset, width, height, radius), index % 2 * 0.1);
            })
            .ToArray();
    }

    private static IReadOnlyList<DragonHuntSignatureStrike> GlacialWall(
        int strikes,
        double radius,
        Vector2D playerPosition,
        double width,
        double height,
        IRandomSource randomSource)
    {
        var slots = strikes + 1;
        var gap = randomSource.Next(slots);
        var alongWidth = width <= height;
        var span = alongWidth ? width : height;
        var effectiveRadius = Math.Min(radius, span / (slots * 2.1));
        var usable = Math.Max(1, span - effectiveRadius * 2);
        var result = new List<DragonHuntSignatureStrike>(strikes);

        for (var slot = 0; slot < slots; slot++)
        {
            if (slot == gap) continue;
            var coordinate = slots == 1 ? span / 2 : effectiveRadius + usable * slot / (slots - 1d);
            var position = alongWidth ? new Vector2D(coordinate, playerPosition.Y) : new Vector2D(playerPosition.X, coordinate);
            result.Add(new DragonHuntSignatureStrike(Clamp(position, width, height, effectiveRadius), 0, effectiveRadius));
        }

        return result;
    }

    private static IReadOnlyList<DragonHuntSignatureStrike> RiftEcho(
        int strikes,
        double radius,
        Vector2D playerPosition,
        double width,
        double height)
    {
        var mirror = new Vector2D(width - playerPosition.X, height - playerPosition.Y);
        var center = new Vector2D(width / 2, height / 2);
        var anchors = new[] { playerPosition, mirror, center };
        return Enumerable.Range(0, strikes)
            .Select(index => new DragonHuntSignatureStrike(Clamp(anchors[Math.Min(index, anchors.Length - 1)], width, height, radius), index * 0.28))
            .ToArray();
    }

    // Multiple warning waves split the arena into four lanes with one safe gate.
    // The gate moves each wave, allowing deliberate repositioning on portrait screens.
    private static IReadOnlyList<DragonHuntSignatureStrike> Crownfall(int strikes, double radius, Vector2D player, double width, double height)
    {
        const int slots = 4;
        var acrossWidth = width <= height;
        var span = acrossWidth ? width : height;
        var effectiveRadius = Math.Min(radius, Math.Max(8, span / 10));
        var spacing = (span - effectiveRadius * 2) / (slots - 1);
        var coordinate = acrossWidth ? player.X : player.Y;
        var initialGate = Math.Clamp((int)Math.Round((coordinate - effectiveRadius) / Math.Max(1, spacing)), 0, slots - 1);
        var waves = strikes / (slots - 1);
        var result = new List<DragonHuntSignatureStrike>(strikes);

        for (var wave = 0; wave < waves; wave++)
        {
            var safeLane = (initialGate + wave) % slots;
            for (var lane = 0; lane < slots; lane++)
            {
                if (lane == safeLane) continue;
                var at = effectiveRadius + spacing * lane;
                var point = acrossWidth ? new Vector2D(at, player.Y) : new Vector2D(player.X, at);
                result.Add(new DragonHuntSignatureStrike(Clamp(point, width, height, effectiveRadius), wave * 1.25, effectiveRadius));
            }
        }

        return result;
    }

    // Sequential crossing currents sweep through the captured position in perpendicular directions.
    // Each wave gives a full telegraph and a 1.35s recovery window. No camera-relative assumptions.
    private static IReadOnlyList<DragonHuntSignatureStrike> SkybreakCrossing(int strikes, double radius, Vector2D player, double width, double height)
    {
        const int nodesPerWave = 5;
        var waveCount = Math.Max(1, strikes / nodesPerWave);
        var effectiveRadius = Math.Min(radius, Math.Min(width, height) / 13d);
        var spacing = effectiveRadius * 1.85;
        var result = new List<DragonHuntSignatureStrike>(waveCount * nodesPerWave);

        for (var wave = 0; wave < waveCount; wave++)
        {
            var direction = (wave % 3) switch
            {
                0 => new Vector2D(1, 0),
                1 => new Vector2D(0, 1),
                _ => new Vector2D(Math.Sqrt(0.5), Math.Sqrt(0.5)),
            };
            for (var node = 0; node < nodesPerWave; node++)
            {
                var offset = (node - nodesPerWave / 2) * spacing;
                result.Add(new DragonHuntSignatureStrike(Clamp(player + direction * offset, width, height, effectiveRadius),
                    wave * 1.35, effectiveRadius));
            }
        }

        return result;
    }

    private static Vector2D Clamp(Vector2D position, double width, double height, double radius)
    {
        var x = Math.Clamp(position.X, radius, Math.Max(radius, width - radius));
        var y = Math.Clamp(position.Y, radius, Math.Max(radius, height - radius));
        return new Vector2D(x, y);
    }
}

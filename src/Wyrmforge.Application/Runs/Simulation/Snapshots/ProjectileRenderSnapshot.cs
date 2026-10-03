using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

public sealed record ProjectileRenderSnapshot(double X, double Y, double Radius, SpellId Spell, bool Inferno);

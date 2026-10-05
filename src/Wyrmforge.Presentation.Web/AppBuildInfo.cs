using System.Reflection;

namespace Wyrmforge.Presentation.Web;

public static class AppBuildInfo
{
    private static readonly string InformationalVersion = typeof(AppBuildInfo).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion ?? "0.0.0";

    public static string Version { get; } = InformationalVersion.Split('+', 2)[0];

    public static string Commit { get; } = ResolveCommit();

    public static string Display => string.IsNullOrWhiteSpace(Commit) ? $"v{Version}" : $"v{Version} · {Commit}";

    private static string ResolveCommit()
    {
        var separator = InformationalVersion.IndexOf('+');
        if (separator < 0 || separator == InformationalVersion.Length - 1) return string.Empty;
        var metadata = InformationalVersion[(separator + 1)..];
        var commit = metadata.Split('.', 2)[0];
        return commit.Length <= 7 ? commit : commit[..7];
    }
}

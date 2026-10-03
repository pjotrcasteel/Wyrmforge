using Microsoft.Extensions.DependencyInjection;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Infrastructure.Randomness;

namespace Wyrmforge.Bootstrap;

public static class DependencyInjection
{
    public static IServiceCollection AddWyrmforge(this IServiceCollection services)
    {
        services.AddSingleton<IRandomSource, SystemRandomSource>();
        services.AddSingleton<LevelChoiceService>();
        return services;
    }
}

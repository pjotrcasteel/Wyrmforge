using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using Wyrmforge.Bootstrap;
using Wyrmforge.Presentation.Web;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.Services.AddWyrmforge();
await builder.Build().RunAsync();

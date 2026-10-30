using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

[TestClass]
public sealed class HuntGpuAdapterBrowserTests : PageTest
{
    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task HuntAdapter_AuthoredActorAndGround_ReceiveLightAndRespectZero(int width, int height)
    {
        var root = Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL");
        if (string.IsNullOrWhiteSpace(root)) { Assert.Inconclusive("Requires published game."); return; }
        await Page.SetViewportSizeAsync(width, height);
        await Page.GotoAsync(root.TrimEnd('/') + "/arena-material-kit", new() { WaitUntil = WaitUntilState.NetworkIdle });
        var result = await Page.EvaluateAsync<int[]>(@"async ({width,height}) => {
            const { HuntGpuWorld } = await import('./js/arena-gpu-world.js');
            const world = new HuntGpuWorld();
            const canvas = document.createElement('canvas'); canvas.id='hunt-gpu-adapter-proof';
            canvas.width=width; canvas.height=height;
            Object.assign(canvas.style,{position:'fixed',left:'0',top:'0',zIndex:'99999'});
            document.body.appendChild(canvas);
            const ctx=canvas.getContext('2d');ctx.fillStyle='#777777';ctx.fillRect(0,0,width,height);
            const sprite=new Image();sprite.src='./art/enemies/hollow-rigged/arms/standard-walk.png';await sprite.decode();
            const tile=document.createElement('canvas');tile.width=tile.height=96;
            tile.getContext('2d').drawImage(sprite,0,4*96,96,96,0,0,96,96);
            const frame={version:1,time:0,environment:{ambient:0,color:'#ffffff',exposure:1,emission:false},
                materials:[],objects:[],lights:[{id:'moving-source',ownerId:'test',type:'point',enabled:true,
                position:[width/2-48,height/2,96],direction:[0,0,-1],color:'#ffffff',intensity:24,range:400,
                coneAngle:.5,penumbra:0,castsShadow:true,priority:1}]};
            world.begin(ctx,{x:0,y:0},width,height);
            world.capture('hollow',tile,width/2-48,height/2-48,96,96,.25,true);
            world.render(ctx,frame);
            const lit=world.engine.pixels();let peak=0;
            for(let i=0;i<lit.length;i+=4)peak=Math.max(peak,lit[i],lit[i+1],lit[i+2]);
            const shadowViews=world.engine.diagnostics().lights.filter(l=>l.shadow).length;
            world.render(ctx,{...frame,lights:frame.lights.map(light=>({...light,castsShadow:false}))});
            const unshadowed=world.engine.pixels();
            const alpha=tile.getContext('2d').getImageData(0,0,96,96).data;
            let groundShadowPixels=0;
            for(let i=0;i<lit.length;i+=4){
                const x=(i/4)%width, y=height-1-Math.floor(i/4/width);
                const sx=Math.floor(x-(width/2-48)),sy=Math.floor(y-(height/2-48));
                const actorPixel=sx>=0&&sy>=0&&sx<96&&sy<96&&alpha[(sy*96+sx)*4+3]>0;
                if(!actorPixel&&(lit[i]!==unshadowed[i]||lit[i+1]!==unshadowed[i+1]||lit[i+2]!==unshadowed[i+2]))groundShadowPixels++;
            }
            world.render(ctx,{...frame,lights:[]});
            const zero=world.engine.pixels();let dark=0;
            for(let i=0;i<zero.length;i+=4)dark=Math.max(dark,zero[i],zero[i+1],zero[i+2]);
            world.render(ctx,frame);
            const composed=ctx.getImageData(0,0,width,height).data;
            let composedPeak=0;
            for(let i=0;i<composed.length;i+=4)
                composedPeak=Math.max(composedPeak,composed[i],composed[i+1],composed[i+2]);
            const retained=world.engine.renderer.getContext().getContextAttributes().preserveDrawingBuffer;
            window.__huntGpuAdapterProof=world;
            return [peak,dark,shadowViews,groundShadowPixels,composedPeak,retained?1:0];
        }", new { width, height });
        Assert.IsTrue(result[0] > 0, "Actual shared GPU output must respond to source light.");
        Assert.AreEqual(0, result[1], "No ambient/emission/sources must produce black world pixels.");
        Assert.AreEqual(1, result[2], "The shared engine must select the actual shadow-casting source.");
        Assert.IsTrue(result[3] > 0, "Disabling source shadows must change actual ground pixels outside the actor silhouette.");
        Assert.IsTrue(result[4] > 0, "Opt-in Hunt must compose nonblack WebGL pixels into its actual game Canvas.");
        Assert.AreEqual(0, result[5], "Mobile Hunt must not retain a completed WebGL drawing buffer.");
        var artifacts = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS") ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(artifacts);
        await Page.Locator("#hunt-gpu-adapter-proof").ScreenshotAsync(new()
        {
            Path = Path.Combine(artifacts, $"hunt-gpu-adapter-{width}.png"),
        });
        await Page.EvaluateAsync("() => window.__huntGpuAdapterProof.dispose()");
    }

    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task HuntAdapter_AuthoredFireballAtlas_EmitsWithoutCanvasCapture_AndZeroEmissionIsBlack(int width, int height)
    {
        var root = Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL");
        if (string.IsNullOrWhiteSpace(root)) { Assert.Inconclusive("Requires published game."); return; }
        await Page.SetViewportSizeAsync(width, height);
        await Page.GotoAsync(root.TrimEnd('/') + "/arena-material-kit", new() { WaitUntil = WaitUntilState.NetworkIdle });
        var result = await Page.EvaluateAsync<int[]>(@"async ({width,height}) => {
            const { HuntGpuWorld } = await import('./js/arena-gpu-world.js');
            const { submitGpuFireballs } = await import('./js/arena-gpu-fireball.js');
            const { installFireballV5ForTesting } = await import('./js/arena-fireball-v5.js');
            const load = async path => {
                const image = new Image();
                image.src = path;
                await image.decode();
                return image;
            };
            const albedo = await load('./art/fireball-v5-albedo.png');
            const emissive = await load('./art/fireball-v5-emissive.png');
            installFireballV5ForTesting(albedo, emissive);
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            canvas.id = 'hunt-gpu-fireball-proof';
            Object.assign(canvas.style, { position:'fixed', left:'0', top:'0', zIndex:'99999' });
            document.body.appendChild(canvas);
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#777777'; ctx.fillRect(0, 0, width, height);
            const world = new HuntGpuWorld({ quality: width === 320 ? 'mobile' : 'balanced' });
            const environment = { ambient:0, color:'#ffffff', exposure:1, emission:true };
            const frame = { version:1, time:0, environment, lights:[], materials:[], objects:[] };
            world.begin(ctx, {x:0,y:0}, width, height);
            const submitted = submitGpuFireballs(world, [{
                spell:1, combination:null, x:width/2, y:height/2,
                radius:14, angle:0, fireballSourceId:17,
            }], {x:0,y:0}, 0);
            world.render(ctx, frame);
            const luminous = world.engine.pixels();
            let peak = 0;
            for(let i=0;i<luminous.length;i+=4)
                peak = Math.max(peak,luminous[i],luminous[i+1],luminous[i+2]);
            world.render(ctx, {...frame, environment:{...environment, emission:false}});
            const zero = world.engine.pixels();
            let dark = 0;
            for(let i=0;i<zero.length;i+=4)
                dark = Math.max(dark,zero[i],zero[i+1],zero[i+2]);
            world.render(ctx, frame);
            const composed = ctx.getImageData(0, 0, width, height).data;
            let compositePeak = 0;
            for(let i=0;i<composed.length;i+=4)
                compositePeak=Math.max(compositePeak,composed[i],composed[i+1],composed[i+2]);
            const diagnostics = world.diagnostics();
            window.__huntGpuFireballProof = world;
            return [submitted.size, peak, dark, diagnostics.authoredTextures,
                diagnostics.textureUploads.dynamicTextures, diagnostics.budgets.shadowMapSize,
                compositePeak, diagnostics.budgets.preserveDrawingBuffer ? 1 : 0];
        }", new { width, height });
        Assert.AreEqual(1, result[0], "Fireball must be bound through its authored GPU material.");
        Assert.IsTrue(result[1] > 0, "The authored emissive channel must survive actual GPU composition.");
        Assert.AreEqual(0, result[2], "Zero sources, ambient and emission must leave black world pixels.");
        Assert.AreEqual(2, result[3], "Exactly the authored albedo and emissive textures are registered.");
        Assert.AreEqual(0, result[4], "Unchanged GPU atlas resources cannot be recaptured as Canvas.");
        Assert.AreEqual(width == 320 ? 256 : 512, result[5], "Shared GPU quality tier must control actual renderer shadow allocations.");
        Assert.IsTrue(result[6] > 0, "The authored Fireball must reach the composed game Canvas, not just the offscreen framebuffer.");
        Assert.AreEqual(0, result[7], "Live Hunt Fireball uses the memory-saving framebuffer policy.");
        var artifacts = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS") ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(artifacts);
        await Page.Locator("#hunt-gpu-fireball-proof").ScreenshotAsync(new()
        {
            Path = Path.Combine(artifacts, $"hunt-gpu-fireball-{width}.png"),
        });
        await Page.EvaluateAsync("() => window.__huntGpuFireballProof.dispose()");
    }

}

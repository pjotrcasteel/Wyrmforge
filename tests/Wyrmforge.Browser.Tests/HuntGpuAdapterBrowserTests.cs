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
            window.__huntGpuAdapterProof=world;
            return [peak,dark,shadowViews,groundShadowPixels];
        }", new { width, height });
        Assert.IsTrue(result[0] > 0, "Actual shared GPU output must respond to source light.");
        Assert.AreEqual(0, result[1], "No ambient/emission/sources must produce black world pixels.");
        Assert.AreEqual(1, result[2], "The shared engine must select the actual shadow-casting source.");
        Assert.IsTrue(result[3] > 0, "Disabling source shadows must change actual ground pixels outside the actor silhouette.");
        var artifacts = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS") ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(artifacts);
        await Page.Locator("#hunt-gpu-adapter-proof").ScreenshotAsync(new()
        {
            Path = Path.Combine(artifacts, $"hunt-gpu-adapter-{width}.png"),
        });
        await Page.EvaluateAsync("() => window.__huntGpuAdapterProof.dispose()");
    }
}

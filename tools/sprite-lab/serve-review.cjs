/* Loopback-only static review server. Serves the existing wwwroot, no write API. */
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const root=path.resolve(__dirname,'../../src/Wyrmforge.Presentation.Web/wwwroot');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.gif':'image/gif','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{
  try{
    let route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(route.endsWith('/'))route+='index.html';
    const file=path.resolve(root,'.'+route);
    if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
    const data=await fs.readFile(file);
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
    res.end(data);
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(8766,'127.0.0.1',()=>console.log('Sprite Lab review: http://127.0.0.1:8766/sprite-lab/?candidate=hollow-local-pixel-v1'));

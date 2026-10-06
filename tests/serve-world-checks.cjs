const http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../site');
http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://local').pathname;
  const file=pathname==='/'?path.join(__dirname,'world-checks.html'):path.resolve(root,'.'+pathname);
  if(pathname!=='/'&&!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':'text/html');res.end(data);});
}).listen(4187,'127.0.0.1',()=>console.log('Open http://127.0.0.1:4187 for the animated geometry checks.'));

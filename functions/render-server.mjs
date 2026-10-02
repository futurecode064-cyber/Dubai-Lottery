import http from 'node:http';
import handler from './index.mjs';

const port=Number(process.env.PORT||10000);
const server=http.createServer(async(req,res)=>{
  try{
    const chunks=[];
    for await(const chunk of req)chunks.push(chunk);
    const body=chunks.length?Buffer.concat(chunks):undefined;
    const proto=(req.headers['x-forwarded-proto']||'https').toString().split(',')[0].trim();
    const host=req.headers.host||'localhost';
    const init={method:req.method,headers:req.headers};
    if(body&&req.method!=='GET'&&req.method!=='HEAD')init.body=body;
    const response=await handler.fetch(new Request(`${proto}://${host}${req.url}`,init));
    res.statusCode=response.status;
    for(const [k,v] of response.headers){if(k.toLowerCase()!=='set-cookie')res.setHeader(k,v);}
    const setCookies=response.headers.getSetCookie?.()||[];
    if(setCookies.length)res.setHeader('Set-Cookie',setCookies);
    res.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){
    console.error('http_adapter_failed',{message:error?.message});
    res.statusCode=500;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify({error:'Server error'}));
  }
});
server.listen(port,'0.0.0.0',()=>console.log(`Dubai Lottery listening on ${port}`));

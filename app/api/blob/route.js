import {get} from '@vercel/blob';

function configured(){return Boolean(process.env.BLOB_STORE_ID||process.env.BLOB_READ_WRITE_TOKEN)}

export async function GET(request){
  if(!configured())return new Response('Cloud storage not configured',{status:503});
  const url=new URL(request.url);
  const pathname=url.searchParams.get('pathname');
  const download=url.searchParams.get('download')==='1';
  const name=url.searchParams.get('name')||'artwork';
  if(!pathname)return new Response('Missing pathname',{status:400});
  try{
    const result=await get(pathname,{access:'private'});
    if(!result||result.statusCode!==200)return new Response('Not found',{status:404});
    const headers={
      'Content-Type':result.blob.contentType||'application/octet-stream',
      'X-Content-Type-Options':'nosniff',
      'Cache-Control':'private, max-age=300'
    };
    if(download)headers['Content-Disposition']=`attachment; filename="${name.replace(/["\r\n]/g,'')}"`;
    return new Response(result.stream,{headers});
  }catch(error){console.error(error);return new Response('Could not read file',{status:500})}
}

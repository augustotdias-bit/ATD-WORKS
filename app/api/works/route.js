import {del,get,put} from '@vercel/blob';

const MANIFEST='atd-data/works.json';

function configured(){return Boolean(process.env.BLOB_STORE_ID||process.env.BLOB_READ_WRITE_TOKEN)}
function authorized(request){const expected=process.env.ATD_ADMIN_PASSWORD;return Boolean(expected)&&request.headers.get('x-admin-password')===expected}
function normalizeWorks(works){
  const sorted=[...works].sort((a,b)=>(b.date||'').localeCompare(a.date||'') || (b.createdAt||0)-(a.createdAt||0));
  return sorted.map((w,i)=>({...w,order:Number.isFinite(Number(w.order))?Number(w.order):i,hidden:Boolean(w.hidden)}))
    .sort((a,b)=>a.order-b.order || (b.createdAt||0)-(a.createdAt||0));
}
function exposeWork(work){return work.imagePath?{...work,imageUrl:`/api/blob?pathname=${encodeURIComponent(work.imagePath)}`}:work}

async function readWorks(){
  if(!configured())throw new Error('STORAGE_NOT_CONFIGURED');
  const result=await get(MANIFEST,{access:'private',useCache:false});
  if(!result||result.statusCode!==200)return [];
  const works=await new Response(result.stream).json();
  return Array.isArray(works)?normalizeWorks(works):[];
}
async function writeWorks(works){
  await put(MANIFEST,JSON.stringify(normalizeWorks(works)),{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'application/json'});
}

export async function GET(request){
  try{
    const works=await readWorks();
    const url=new URL(request.url);
    const id=url.searchParams.get('id');
    const includeHidden=url.searchParams.get('includeHidden')==='1'&&authorized(request);
    if(id){const work=works.find(w=>w.id===id);return Response.json(work&&(!work.hidden||includeHidden)?exposeWork(work):null)}
    const visible=includeHidden?works:works.filter(w=>!w.hidden);
    return Response.json(visible.map(exposeWork));
  }catch(error){
    if(error.message==='STORAGE_NOT_CONFIGURED')return Response.json({error:'Cloud storage not configured'},{status:503});
    console.error(error);return Response.json({error:'Could not read archive'},{status:500});
  }
}

export async function POST(request){
  if(!configured())return Response.json({error:'Cloud storage not configured'},{status:503});
  if(!authorized(request))return Response.json({error:'Unauthorized'},{status:401});
  try{
    const data=await request.formData();
    const image=data.get('image');
    if(!(image instanceof File))return Response.json({error:'Image required'},{status:400});
    const works=await readWorks();
    const id=String(data.get('id')||crypto.randomUUID());
    const safe=(image.name||'artwork').replace(/[^a-zA-Z0-9._-]+/g,'-');
    const blob=await put(`artworks/${id}-${safe}`,image,{access:'private',addRandomSuffix:false});
    const maxOrder=works.reduce((m,w)=>Math.max(m,Number(w.order)||0),-1);
    const work={id,title:String(data.get('title')||''),medium:String(data.get('medium')||''),dimensions:String(data.get('dimensions')||''),date:String(data.get('date')||''),availability:String(data.get('availability')||'Available'),imagePath:blob.pathname,originalName:image.name||`${id}.jpg`,mime:image.type||'application/octet-stream',createdAt:Number(data.get('createdAt')||Date.now()),order:maxOrder+1,hidden:false};
    await writeWorks([work,...works.filter(w=>w.id!==id)]);
    return Response.json(exposeWork(work),{status:201});
  }catch(error){console.error(error);return Response.json({error:'Could not save artwork'},{status:500})}
}

export async function PATCH(request){
  if(!configured())return Response.json({error:'Cloud storage not configured'},{status:503});
  if(!authorized(request))return Response.json({error:'Unauthorized'},{status:401});
  try{
    const body=await request.json();
    const id=String(body.id||'');
    if(!id)return Response.json({error:'ID required'},{status:400});
    const works=await readWorks();
    const index=works.findIndex(w=>w.id===id);
    if(index<0)return Response.json({error:'Artwork not found'},{status:404});
    const allowed=['title','medium','dimensions','date','availability','hidden','order'];
    const changes={};
    for(const key of allowed)if(Object.prototype.hasOwnProperty.call(body.changes||{},key))changes[key]=body.changes[key];
    works[index]={...works[index],...changes};
    await writeWorks(works);
    return Response.json(exposeWork(works[index]));
  }catch(error){console.error(error);return Response.json({error:'Could not update artwork'},{status:500})}
}

export async function DELETE(request){
  if(!configured())return Response.json({error:'Cloud storage not configured'},{status:503});
  if(!authorized(request))return Response.json({error:'Unauthorized'},{status:401});
  try{
    const id=new URL(request.url).searchParams.get('id');
    if(!id)return Response.json({error:'ID required'},{status:400});
    const works=await readWorks();
    const work=works.find(w=>w.id===id);
    if(work?.imagePath)await del(work.imagePath).catch(()=>{});else if(work?.imageUrl)await del(work.imageUrl).catch(()=>{});
    await writeWorks(works.filter(w=>w.id!==id));
    return Response.json({ok:true});
  }catch(error){console.error(error);return Response.json({error:'Could not delete artwork'},{status:500})}
}

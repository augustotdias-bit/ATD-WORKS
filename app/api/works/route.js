import {del,list,put} from '@vercel/blob';

const MANIFEST='atd-data/works.json';

function configured(){return Boolean(process.env.BLOB_READ_WRITE_TOKEN)}
function authorized(request){const expected=process.env.ATD_ADMIN_PASSWORD;return Boolean(expected)&&request.headers.get('x-admin-password')===expected}
function sortWorks(works){return [...works].sort((a,b)=>(b.date||'').localeCompare(a.date||'') || (b.createdAt||0)-(a.createdAt||0))}

async function readWorks(){
  if(!configured()) throw new Error('STORAGE_NOT_CONFIGURED');
  const result=await list({prefix:MANIFEST,limit:10});
  const blob=result.blobs.find(b=>b.pathname===MANIFEST);
  if(!blob)return [];
  const response=await fetch(blob.url,{cache:'no-store'});
  if(!response.ok)return [];
  const works=await response.json();
  return Array.isArray(works)?sortWorks(works):[];
}

async function writeWorks(works){
  await put(MANIFEST,JSON.stringify(sortWorks(works)),{access:'public',addRandomSuffix:false,allowOverwrite:true,contentType:'application/json'});
}

export async function GET(request){
  try{
    const works=await readWorks();
    const id=new URL(request.url).searchParams.get('id');
    if(id)return Response.json(works.find(w=>w.id===id)||null);
    return Response.json(works);
  }catch(error){
    if(error.message==='STORAGE_NOT_CONFIGURED')return Response.json({error:'Cloud storage not configured'},{status:503});
    return Response.json({error:'Could not read archive'},{status:500});
  }
}

export async function POST(request){
  if(!configured())return Response.json({error:'Cloud storage not configured'},{status:503});
  if(!authorized(request))return Response.json({error:'Unauthorized'},{status:401});
  try{
    const data=await request.formData();
    const image=data.get('image');
    if(!(image instanceof File))return Response.json({error:'Image required'},{status:400});
    const id=String(data.get('id')||crypto.randomUUID());
    const safe=(image.name||'artwork').replace(/[^a-zA-Z0-9._-]+/g,'-');
    const blob=await put(`artworks/${id}-${safe}`,image,{access:'public',addRandomSuffix:false});
    const work={
      id,
      title:String(data.get('title')||''),
      medium:String(data.get('medium')||''),
      dimensions:String(data.get('dimensions')||''),
      date:String(data.get('date')||''),
      availability:String(data.get('availability')||'Available'),
      imageUrl:blob.url,
      originalName:image.name||`${id}.jpg`,
      mime:image.type||'application/octet-stream',
      createdAt:Number(data.get('createdAt')||Date.now())
    };
    const works=await readWorks();
    await writeWorks([work,...works.filter(w=>w.id!==id)]);
    return Response.json(work,{status:201});
  }catch(error){return Response.json({error:'Could not save artwork'},{status:500})}
}

export async function DELETE(request){
  if(!configured())return Response.json({error:'Cloud storage not configured'},{status:503});
  if(!authorized(request))return Response.json({error:'Unauthorized'},{status:401});
  try{
    const id=new URL(request.url).searchParams.get('id');
    if(!id)return Response.json({error:'ID required'},{status:400});
    const works=await readWorks();
    const work=works.find(w=>w.id===id);
    if(work?.imageUrl)await del(work.imageUrl).catch(()=>{});
    await writeWorks(works.filter(w=>w.id!==id));
    return Response.json({ok:true});
  }catch(error){return Response.json({error:'Could not delete artwork'},{status:500})}
}

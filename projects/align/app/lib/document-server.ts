import {blocked,defaultPrivacy} from './live';
import {activeMaterialMatch} from './profile-materials';
type Row=Record<string,any>;
type Bucket={get:(key:string)=>Promise<any>;put:(key:string,data:ArrayBuffer,options:any)=>Promise<any>};
const json=(error:string,status:number)=>Response.json({error},{status,headers:{'Cache-Control':'private, no-store'}});
const parse=(value:string)=>{try{return JSON.parse(value||'{}')}catch{return {}}};
export function createDocuments(db:D1Database,bucket:Bucket){
 async function POST(req:Request){
  const user=req.headers.get('oai-authenticated-user-id');if(!user)return json('Sign in to upload application documents.',401);
  if(req.headers.get('origin')!==new URL(req.url).origin)return json('Same-origin requests required.',403);
  if(Number(req.headers.get('content-length'))>5_500_000)return json('Choose a file smaller than 5 MB.',413);
  try{
   const bytes=await req.arrayBuffer();if(bytes.byteLength>5_500_000)return json('Choose a file smaller than 5 MB.',413);
   const form=await new Request(req.url,{method:'POST',headers:req.headers,body:bytes}).formData(),file=form.get('file');
   if(!(file instanceof File)||!file.size||file.size>5_000_000||!(/\.(pdf|docx)$/i.test(file.name)))return json('Upload a PDF or DOCX under 5 MB.',400);
   const name=file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-150),key=encodeURIComponent(user)+'/'+crypto.randomUUID()+'/'+name;
   await bucket.put(key,await file.arrayBuffer(),{httpMetadata:{contentType:name.toLowerCase().endsWith('.pdf')?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}});
   return Response.json({name:file.name.slice(0,180),key},{headers:{'Cache-Control':'private, no-store'}});
  }catch{return json('The file could not be uploaded. Choose a PDF or DOCX and try again.',400)}
 }
 async function GET(req:Request){
  const user=req.headers.get('oai-authenticated-user-id');if(!user)return json('Sign in to open this document.',401);
  const url=new URL(req.url);let key=url.searchParams.get('key')||'',name='';
  if(key){if(!key.startsWith(encodeURIComponent(user)+'/'))return json('You do not have access to this document.',403)}
  else{
   const applicationId=url.searchParams.get('applicationId')||'',kind=url.searchParams.get('document');
   if(!applicationId||!['resume','coverLetter'].includes(kind||''))return json('Choose an application document.',400);
   const a=await db.prepare('SELECT a.*,p.privacy AS profile_privacy,c.domain AS company_domain FROM live_applications a JOIN live_profiles p ON p.id=a.candidate_id JOIN live_companies c ON c.id=a.company_id WHERE a.id=?').bind(applicationId).first<Row>();
   if(!a)return json('Document not found.',404);
   if(a.candidate_user_id!==user){
    const member=await db.prepare('SELECT id FROM live_members WHERE company_id=? AND user_id=?').bind(a.company_id,user).first<Row>();
    if(!member||!activeMaterialMatch(a)||blocked({...defaultPrivacy,...parse(a.profile_privacy)},{id:a.company_id,domain:a.company_domain}))return json('An active mutual match and hiring-team access are required.',403);
   }
   const doc=parse(a.data).swipeMaterials?.[kind!];
   if(!doc?.key||!doc.key.startsWith(encodeURIComponent(a.candidate_user_id)+'/'))return json('This document is no longer shared.',404);
   key=doc.key;name=doc.name;
  }
  const object=await bucket.get(key);if(!object)return json('Document not found.',404);
  name=name||key.split('/').pop()||'document';
  return new Response(object.body,{headers:{'Content-Type':object.httpMetadata?.contentType||'application/octet-stream','Content-Disposition':`attachment; filename="${name.replace(/[^a-zA-Z0-9._-]/g,'_')}"; filename*=UTF-8''${encodeURIComponent(name)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }
 return {GET,POST};
}

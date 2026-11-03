import {activeMaterialMatch} from './profile-materials';
import {blocked,defaultPrivacy} from './live';
type Row=Record<string,any>;
const json=(error:string,status=400)=>Response.json({error},{status});
export async function demoDocumentRequest(state:Row,role:string,url:URL,init:RequestInit|undefined,save:()=>boolean){
 if(init?.method==='POST'){
  if(role!=='candidate')return json('Switch to the candidate workspace to add your documents.',403);
  const file=init.body instanceof FormData?init.body.get('file'):null;
  if(!file||typeof file==='string'||!file.size||file.size>1_000_000||!/\.(pdf|docx)$/i.test(file.name))return json('Choose a PDF or DOCX under 1 MB for the browser demo.');
  const key=encodeURIComponent(state.profile.id)+'/'+(globalThis.crypto?.randomUUID?.()||'file-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2))+'/'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-150),bytes=new Uint8Array(await file.arrayBuffer());let binary='';
  for(let offset=0;offset<bytes.length;offset+=16384)binary+=String.fromCharCode(...bytes.subarray(offset,offset+16384));
  const record={name:file.name.slice(0,180),data:btoa(binary),type:file.name.toLowerCase().endsWith('.pdf')?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
  const files={...state.files,[key]:record};if(JSON.stringify({...state,files}).length>4_000_000)return json('Demo document storage is full. Use a document link or a smaller file.',413);
  const previous=state.files;state.files=files;if(!save()){state.files=previous;save();return json('Browser storage is unavailable or full. Use a document link or a smaller file.',413)}return Response.json({name:record.name,key,demo:true});
 }
 let key=url.searchParams.get('key')||'';
 if(key){if(role!=='candidate'||!key.startsWith(encodeURIComponent(state.profile.id)+'/'))return json('This document is private.',403)}
 else{
  const app=state.applications.find((a:Row)=>a.id===url.searchParams.get('applicationId')),kind=url.searchParams.get('document');if(!app||!['resume','coverLetter'].includes(kind||''))return json('Document not found.',404);
  const owner=role==='candidate'&&app.candidateId===state.profile.id,company=state.companies.find((c:Row)=>c.id===app.companyId),person=state.people.find((p:Row)=>p.id===app.candidateId);
  if(!owner&&(role!=='employer'||!activeMaterialMatch(app)||!state.organizations.some((c:Row)=>c.id===app.companyId)||blocked(person.privacy||defaultPrivacy,company)))return json('An active mutual match with this hiring team is required.',403);
  key=app.data.swipeMaterials?.[kind!]?.key||'';
 }
 const file=state.files?.[key];if(!file)return json('This document is no longer available.',404);
 const body=Uint8Array.from(atob(file.data),(character:string)=>character.charCodeAt(0));
 return new Response(body,{headers:{'Content-Type':file.type,'Content-Disposition':'attachment; filename="'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_')+'"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}

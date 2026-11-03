import {createMarket} from './live-server';
import {createWorkflows} from './workflows-server';
import {handoffDocument} from './handoff';
type R=Record<string,any>;
export function createHandoff(db:D1Database,options:{adminEmails?:string}={}){return async(req:Request)=>{
 const json=(d:unknown,status=200)=>Response.json(d,{status,headers:{'Cache-Control':'private, no-store'}}),uid=req.headers.get('oai-authenticated-user-id');if(!uid)return json({error:'Sign in to export a shared candidate.'},401);
 const id=new URL(req.url).searchParams.get('applicationId');if(!id||id.length>100)return json({error:'Choose an application.'},400);
 const a=await db.prepare('SELECT a.* FROM live_applications a JOIN live_members m ON m.company_id=a.company_id WHERE a.id=? AND m.user_id=?').bind(id,uid).first<R>();
 if(!a||!a.candidate_interest||!a.employer_interest||['closed','withdrawn'].includes(a.stage))return json({error:'An active mutual match and hiring-team access are required.'},403);
 const data=await (await createMarket(db,fetch,options).GET(new Request(new URL('/api/live?companyId='+encodeURIComponent(a.company_id),req.url),{headers:req.headers}))).json() as R;
 const readable=data.applications?.find((x:R)=>x.id===id&&x.side==='employer');if(!readable||!readable.candidate.exportAllowed)return json({error:'The candidate has not allowed this handoff, or access has changed.'},403);
 const work=await (await createWorkflows(db,options)(new Request(new URL('/api/workflows?companyId='+encodeURIComponent(a.company_id),req.url),{headers:req.headers}))).json() as R;
 return json(handoffDocument(readable,work.shares||[]));
};}

import {createMarket} from './live-server';
import {rankCandidate,rankingPreferences} from './ranking';
import {roleRanking} from './role-criteria';
type Options={adminEmails?:string};
const json=(d:unknown,status=200)=>Response.json(d,{status,headers:{'Cache-Control':'private, no-store'}});
export function createRanking(db:D1Database,options:Options={}){return async(req:Request)=>{
 try{
  const uid=req.headers.get('oai-authenticated-user-id');if(!uid)return json({error:'Sign in to review candidates.'},401);
  if(req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Same-origin requests required.'},403);
  if(Number(req.headers.get('content-length')||0)>16000)return json({error:'Request too large.'},413);
  const raw=await req.text();if(raw.length>16000)return json({error:'Request too large.'},413);const b=JSON.parse(raw);
  if(!['preview','save'].includes(b.action)||typeof b.companyId!=='string'||typeof b.jobId!=='string')return json({error:'Choose a company and role.'},400);
  let p=rankingPreferences(b.preferences||{});
  // Reuse the live service's membership, discovery, direct-interest and company-block rules.
  const u=new URL('/api/live',req.url);u.searchParams.set('companyId',b.companyId);
  const result=await createMarket(db,fetch,{adminEmails:options.adminEmails}).GET(new Request(u,{headers:req.headers}));
  if(!result.ok)return result;const data:any=await result.json();
  const org=data.organizations.find((x:any)=>x.id===b.companyId);if(!org)return json({error:'Company access denied.'},403);
  const job=data.companyJobs.find((x:any)=>x.id===b.jobId);if(!job)return json({error:'This role does not belong to your company.'},403);
  p=roleRanking(job);
  if(b.action==='save')return json({error:'Criteria are shared by the team. Edit the role to update them.'},409);
  const pool=new Map<string,any>(data.profiles.filter((x:any)=>!x.eligibleJobIds||x.eligibleJobIds.includes(job.id)).map((x:any)=>[x.id,x]));
  for(const a of data.applications)if(a.side==='employer'&&a.companyId===org.id&&a.jobId===job.id&&a.stage!=='withdrawn')pool.set(a.candidate.id,a.candidate);
  let rows=Array.from(pool.values()).map(c=>rankCandidate(c,job,p));
  rows.sort((a,b)=>b.skillEvidence.length-a.skillEvidence.length||b.coverage-a.coverage||(b.score??-1)-(a.score??-1)||a.candidate.id.localeCompare(b.candidate.id));
  const total=rows.length;rows=rows.slice(0,50);
  return json({rows,total,compared:rows.length,mode:'builtin',generatedAt:new Date().toISOString(),preferences:p});
 }catch(e:any){return json({error:e instanceof SyntaxError?'Invalid request.':e.message||'Unable to compare candidates.'},400)}
};}

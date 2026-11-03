import type {WorkspaceMode} from './workspace-navigation';
type Row=Record<string,any>;

export function swipeApplication(mode:WorkspaceMode,applications:Row[],itemId:string,jobId?:string):Row|undefined {
 return applications.find(a=>a.side===mode&&(mode==='candidate'?a.jobId===itemId:a.jobId===jobId&&a.candidateId===itemId));
}
export function swipeQueue(mode:WorkspaceMode,items:Row[],applications:Row[],passed:string[],jobId?:string,ownCandidateId?:string):Row[] {
 const seen=new Set<string>();
 return items.filter(item=>{
  if(!item?.id||seen.has(item.id)||passed.includes(item.id)||mode==='employer'&&item.id===ownCandidateId)return false;
  seen.add(item.id);
  const app=swipeApplication(mode,applications,item.id,jobId);
  return !app||!['closed','withdrawn'].includes(app.stage)&&!(mode==='candidate'?app.candidateInterest:app.employerInterest);
 });
}
export function swipeDirection(dx:number,dy:number):'left'|'right'|null {
 return Math.abs(dx)>=85&&Math.abs(dx)>Math.abs(dy)*1.5?(dx>0?'right':'left'):null;
}
export function mutualInterest(applications:Row[],payload:Row):Row|undefined {
 return applications.find(a=>a.side===payload.side&&a.jobId===payload.jobId&&(payload.side==='candidate'||a.candidateId===payload.candidateId)&&a.candidateInterest&&a.employerInterest&&!['closed','withdrawn'].includes(a.stage));
}
export function storedPasses(value:string|null):string[] {
 try{const parsed=JSON.parse(value||'[]');return Array.isArray(parsed)?Array.from(new Set(parsed.filter((id:unknown):id is string=>typeof id==='string'&&id.length>0&&id.length<=120))).slice(-1000):[]}catch{return []}
}

export function isOneSidedInterestNotice(text:string):boolean {
 return /^A candidate is interested in [^\n]+\.$/.test(text)||/^[^\n]+ is interested in your profile\.$/.test(text);
}

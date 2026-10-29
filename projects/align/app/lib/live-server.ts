import {blocked,defaultPrivacy,defaultPreferences,type Privacy} from './live';
import {isVerificationAdmin,verificationFields} from './verification';

type Row=Record<string,any>;
const now=()=>new Date().toISOString();
const id=()=>crypto.randomUUID();
const parse=(v:string|undefined,fallback:any={})=>{try{return JSON.parse(v||'')}catch{return fallback}};
const out=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
class Problem extends Error{constructor(message:string,public status=400){super(message)}}
function text(v:unknown,max=200,required=true){if(typeof v!=='string')throw new Problem('Enter valid text.');const s=v.trim();if((required&&!s)||s.length>max)throw new Problem(`Text must be ${required?'1':'0'}–${max} characters.`);return s}
function num(v:unknown,min:number,max:number){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new Problem(`Enter a number between ${min} and ${max}.`);return v}
function list(v:unknown,max=25,length=150){if(!Array.isArray(v)||v.length>max)throw new Problem('Invalid list.');return [...new Set(v.map(x=>text(x,length)))];}
function date(v:unknown){const s=text(v,50);if(!Number.isFinite(Date.parse(s)))throw new Problem('Enter a valid date.');return new Date(s).toISOString()}
function day(v:unknown){if(v==null||v==='')return '';const s=text(v,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||new Date(s).toISOString().slice(0,10)!==s)throw new Problem('Enter a valid calendar date.');return s}
function domain(v:unknown){const s=text(v,200).toLowerCase();if(!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(s))throw new Problem('Enter a domain such as company.com, without https://.');return s}
function identity(req:Request){const userId=req.headers.get('oai-authenticated-user-id');if(!userId)return null;let name=req.headers.get('oai-authenticated-user-full-name')||'';if(req.headers.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8'){try{name=decodeURIComponent(name)}catch{name=''}}return {id:userId,email:(req.headers.get('oai-authenticated-user-email')||'').toLowerCase(),name}}
function privacy(v:any):Privacy{if(!v||typeof v.discoverable!=='boolean'||!['never','matched','interested'].includes(v.contactVisibility))throw new Problem('Choose valid privacy options.');return {discoverable:v.discoverable,hiddenCompanies:list(v.hiddenCompanies,100,100),hiddenDomains:list(v.hiddenDomains,100,200).map(domain),contactVisibility:v.contactVisibility}}
function publicJob(row:Row){return {...parse(row.data),id:row.id,companyId:row.company_id,companyName:row.company_name,domain:row.domain,domainVerifiedAt:row.verified_at,verifiedAt:row.review_status==='approved'?row.company_reviewed_at:null,status:row.status,confirmedAt:row.confirmed_at,expiresAt:row.expires_at,active:row.status==='open'&&row.expires_at>now()&&Boolean(row.verified_at)&&row.review_status==='approved'};}
function candidateData(row:Row,company:Row,application?:Row){const p=parse(row.privacy,defaultPrivacy) as Privacy;const d=parse(row.data);const mutual=Boolean(application?.candidate_interest&&application?.employer_interest);const contact=p.contactVisibility==='interested'?Boolean(application?.candidate_interest):p.contactVisibility==='matched'&&mutual;return {...verificationFields(row),id:row.id,name:d.name,title:d.title,location:d.location,skills:d.skills,bio:d.bio,availableFrom:d.availableFrom,email:contact?d.email:'',links:contact?d.links:'',contactShared:contact,updatedAt:row.updated_at};}

export function createMarket(db:D1Database,fetcher:typeof fetch=fetch,options:{adminEmails?:string}={}){
  const query=(sql:string,...args:any[])=>db.prepare(sql).bind(...args);
  const all=async(sql:string,...args:any[])=>(await query(sql,...args).all<Row>()).results||[];
  const one=(sql:string,...args:any[])=>query(sql,...args).first<Row>();
  const run=(sql:string,...args:any[])=>query(sql,...args).run();
  async function chunks(ids:string[],sql:(placeholders:string)=>string){const rows:Row[]=[];for(let offset=0;offset<ids.length;offset+=80){const batch=ids.slice(offset,offset+80);rows.push(...await all(sql(batch.map(()=>'?').join(',')),...batch))}return rows}
  async function membership(userId:string,companyId:string,owner=false){const row=await one('SELECT c.*,m.role FROM live_companies c JOIN live_members m ON m.company_id=c.id WHERE c.id=? AND m.user_id=?',companyId,userId);if(!row||(owner&&row.role!=='owner'))throw new Problem('You do not have access to this company.',403);return row}
  async function myProfile(userId:string){return one('SELECT * FROM live_profiles WHERE user_id=?',userId)}
  async function companyUsers(companyId:string){return all('SELECT DISTINCT user_id FROM live_members WHERE company_id=? AND user_id IS NOT NULL',companyId)}
  async function notify(userId:string,body:string,key=id()){await run('INSERT OR IGNORE INTO live_notifications(id,user_id,body,created_at) VALUES(?,?,?,?)',key,userId,body,now())}
  async function notifyCompany(companyId:string,body:string,key?:string){for(const member of await companyUsers(companyId))await notify(member.user_id,body,key?key+':'+member.user_id:undefined)}
  async function access(userId:string,applicationId:string,requireMutual=false){
    const a=await one('SELECT * FROM live_applications WHERE id=?',applicationId);if(!a)throw new Problem('Application not found.',404);
    const candidate=a.candidate_user_id===userId;
    const company=candidate?await one('SELECT * FROM live_companies WHERE id=?',a.company_id):await membership(userId,a.company_id);
    const profile=await one('SELECT * FROM live_profiles WHERE id=?',a.candidate_id);
    if(!candidate&&(!profile||blocked(parse(profile.privacy,defaultPrivacy),company as any)||a.stage==='withdrawn'))throw new Problem('This profile is no longer available to your company.',403);
    if(requireMutual&&(!a.candidate_interest||!a.employer_interest||['withdrawn','closed'].includes(a.stage)))throw new Problem('An active mutual match is required.',403);
    return {a,candidate,company:company!,profile:profile!};
  }
  async function GET(req:Request){try{
    const user=identity(req);
    const companies=await all('SELECT id,name,domain,verified_at,review_status,reviewed_at FROM live_companies ORDER BY name LIMIT 500');
    const publicJobs=await all("SELECT j.*,c.name company_name,c.domain,c.verified_at,c.review_status,c.reviewed_at company_reviewed_at FROM live_jobs j JOIN live_companies c ON c.id=j.company_id WHERE j.status='open' AND j.expires_at>? AND c.verified_at IS NOT NULL AND c.review_status='approved' ORDER BY j.created_at DESC LIMIT 500",now());
    const base={signedIn:Boolean(user),admin:isVerificationAdmin(req,options.adminEmails),user,jobs:publicJobs.map(publicJob),companies:companies.map(c=>({id:c.id,name:c.name,domain:c.domain,verifiedAt:c.review_status==='approved'?c.reviewed_at:null}))};
    if(!user)return out({...base,organizations:[],profiles:[],applications:[],messages:{},slots:[],interviews:[],notifications:[],settings:{preferences:defaultPreferences},profile:null,invites:[]});
    const organizations=await all('SELECT c.*,m.role FROM live_companies c JOIN live_members m ON m.company_id=c.id WHERE m.user_id=? ORDER BY c.created_at',user.id);
    const invited=await all('SELECT m.id,c.name,c.domain FROM live_members m JOIN live_companies c ON c.id=m.company_id WHERE m.email=? AND m.user_id IS NULL',user.email);
    const selectedId=new URL(req.url).searchParams.get('companyId')||organizations[0]?.id;
    const selected=organizations.find(c=>c.id===selectedId);
    if(selectedId&&!selected)throw new Problem('Company access denied.',403);
    const profile=await myProfile(user.id);
    const setting=await one('SELECT data FROM live_settings WHERE user_id=?',user.id);
    const ownedIds=organizations.map(c=>c.id);
    const applicationSelect='SELECT a.*,p.data profile_data,p.privacy profile_privacy,p.updated_at profile_updated_at,p.photo_key profile_photo_key,p.identity_verified_at profile_verified_at,p.verified_name profile_verified_name,j.data job_data,j.status job_status,j.confirmed_at job_confirmed_at,j.expires_at job_expires_at,c.name company_name,c.domain company_domain,c.verified_at company_verified_at,c.review_status company_review_status,c.reviewed_at company_reviewed_at FROM live_applications a JOIN live_profiles p ON p.id=a.candidate_id JOIN live_jobs j ON j.id=a.job_id JOIN live_companies c ON c.id=a.company_id';
    const records=await all(applicationSelect+' WHERE a.candidate_user_id=? OR EXISTS(SELECT 1 FROM live_members m WHERE m.company_id=a.company_id AND m.user_id=?) ORDER BY a.updated_at DESC LIMIT 200',user.id,user.id);
    const relevantCompanies=[...new Set(records.map(a=>a.company_id))];
    const relatedMembers=await chunks(relevantCompanies,p=>`SELECT company_id,user_id FROM live_members WHERE company_id IN (${p}) AND user_id IS NOT NULL`);
    const applications:Row[]=[],messages:Record<string,Row[]>={},peers=new Set<string>();
    for(const a of records){
      const mine=a.candidate_user_id===user.id;
      const p={id:a.candidate_id,data:a.profile_data,privacy:a.profile_privacy,updated_at:a.profile_updated_at,photo_key:a.profile_photo_key,identity_verified_at:a.profile_verified_at,verified_name:a.profile_verified_name};
      const c={id:a.company_id,domain:a.company_domain};
      const j={id:a.job_id,company_id:a.company_id,data:a.job_data,status:a.job_status,confirmed_at:a.job_confirmed_at,expires_at:a.job_expires_at,company_name:a.company_name,domain:a.company_domain,verified_at:a.company_verified_at,review_status:a.company_review_status,company_reviewed_at:a.company_reviewed_at};
      if(!mine&&(blocked(parse(p.privacy,defaultPrivacy),c as any)||a.stage==='withdrawn'))continue;
      const data=parse(a.data);const shared={answers:data.answers||{},history:data.history||[],...(mine?{}:{shortlisted:Boolean(data.shortlisted),teamNotes:data.teamNotes||''})};
      applications.push({id:a.id,candidateId:a.candidate_id,candidateUserId:mine?user.id:undefined,jobId:a.job_id,companyId:a.company_id,candidateInterest:Boolean(a.candidate_interest),employerInterest:Boolean(a.employer_interest),stage:a.stage,data:shared,createdAt:a.created_at,updatedAt:a.updated_at,side:mine?'candidate':'employer',job:publicJob(j),candidate:mine?{...parse(p.data),...verificationFields(p),id:p.id}:candidateData(p,c,a)});
      if(a.candidate_interest&&a.employer_interest&&!['withdrawn','closed'].includes(a.stage)){
        messages[a.id]=[];
        if(mine){for(const member of relatedMembers.filter(m=>m.company_id===a.company_id))peers.add(member.user_id)}else peers.add(a.candidate_user_id);
      }
    }
    const readableMatches=Object.keys(messages);
    if(readableMatches.length){const rows=await chunks(readableMatches,p=>`SELECT id,application_id,sender_id,body,created_at FROM live_messages WHERE application_id IN (${p}) ORDER BY created_at DESC,id DESC LIMIT 2000`);for(const m of rows.sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id))){const application=records.find(a=>a.id===m.application_id)!;messages[m.application_id].push({id:m.id,text:m.body,time:m.created_at,mine:m.sender_id===user.id,sender:m.sender_id===application.candidate_user_id?'Candidate':'Hiring team'})}}
    let profiles:Row[]=[];let team:Row[]=[];let companyJobs:Row[]=[];
    if(selected){
      const rows=await all('SELECT * FROM live_profiles WHERE user_id<>? ORDER BY updated_at DESC LIMIT 500',user.id);
      profiles=rows.filter(p=>parse(p.privacy).discoverable&&!blocked(parse(p.privacy,defaultPrivacy),selected as any)).map(p=>candidateData(p,selected,records.find(a=>a.company_id===selected.id&&a.candidate_id===p.id&&a.stage!=='withdrawn')));
      team=await all('SELECT id,email,role,user_id FROM live_members WHERE company_id=?',selected.id);
      companyJobs=(await all('SELECT j.*,c.name company_name,c.domain,c.verified_at,c.review_status,c.reviewed_at company_reviewed_at FROM live_jobs j JOIN live_companies c ON c.id=j.company_id WHERE j.company_id=? ORDER BY j.created_at DESC',selected.id)).map(publicJob);
    }
    const ownSlots=await all('SELECT s.* FROM live_slots s WHERE s.owner_id=? AND s.starts_at>? AND NOT EXISTS(SELECT 1 FROM live_interviews i WHERE i.slot_id=s.id) ORDER BY s.starts_at LIMIT 100',user.id,now());
    const partnerSlots=await all("SELECT s.* FROM live_slots s WHERE s.owner_id<>? AND s.starts_at>? AND NOT EXISTS(SELECT 1 FROM live_interviews i WHERE i.slot_id=s.id) AND EXISTS(SELECT 1 FROM live_applications a WHERE a.candidate_interest=1 AND a.employer_interest=1 AND a.stage NOT IN ('withdrawn','closed') AND ((a.candidate_user_id=? AND EXISTS(SELECT 1 FROM live_members m WHERE m.company_id=a.company_id AND m.user_id=s.owner_id)) OR (a.candidate_user_id=s.owner_id AND EXISTS(SELECT 1 FROM live_members m WHERE m.company_id=a.company_id AND m.user_id=?)))) ORDER BY s.starts_at LIMIT 500",user.id,now(),user.id,user.id);
    const slotResults=[...ownSlots,...partnerSlots].map(s=>({id:s.id,mine:s.owner_id===user.id,startsAt:s.starts_at,endsAt:s.ends_at,applicationIds:[] as string[]}));
    // Slot eligibility is checked precisely again at booking time. Avoid leaking unrelated slots.
    for(const slot of slotResults){const original=[...ownSlots,...partnerSlots].find(s=>s.id===slot.id)!;slot.applicationIds=[];for(const a of records){if(!messages[a.id])continue;if(a.candidate_user_id===user.id){if(relatedMembers.some(m=>m.company_id===a.company_id&&m.user_id===original.owner_id))slot.applicationIds.push(a.id)}else if(ownedIds.includes(a.company_id)&&a.candidate_user_id===original.owner_id)slot.applicationIds.push(a.id)}}
    const appIds=applications.map(a=>a.id);
    const interviews=(await chunks(appIds,p=>`SELECT * FROM live_interviews WHERE application_id IN (${p}) ORDER BY starts_at DESC LIMIT 200`)).sort((a,b)=>b.starts_at.localeCompare(a.starts_at));
    const alerts=await all('SELECT id,body,created_at,read_at FROM live_notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100',user.id);
    return out({...base,organizations:organizations.map(c=>({id:c.id,name:c.name,domain:c.domain,verifiedAt:c.verified_at,reviewStatus:c.review_status,reviewedAt:c.reviewed_at,reviewReason:c.review_reason,reviewRequestedAt:c.review_requested_at,role:c.role,...(c.role==='owner'?{verificationToken:c.verification_token}:{})})),invites:invited,currentCompanyId:selected?.id,team:team.map(m=>({id:m.id,email:m.email,role:m.role,accepted:Boolean(m.user_id)})),companyJobs,profile:profile?{...parse(profile.data),...verificationFields(profile),id:profile.id,privacy:parse(profile.privacy,defaultPrivacy)}:null,profiles,applications,messages,slots:slotResults.filter(s=>s.mine||s.applicationIds.length),interviews:interviews.map(i=>({id:i.id,applicationId:i.application_id,startsAt:i.starts_at,endsAt:i.ends_at,status:i.status,notes:i.notes})),notifications:alerts.map(n=>({id:n.id,text:n.body,time:n.created_at,read:Boolean(n.read_at)})),settings:parse(setting?.data,{preferences:defaultPreferences})});
  }catch(e){return error(e)}}

  async function POST(req:Request){try{
    const user=identity(req);if(!user)throw new Problem('Sign in with ChatGPT to use live hiring.',401);
    if(req.headers.get('origin')!==new URL(req.url).origin)throw new Problem('Invalid origin.',403);
    if(Number(req.headers.get('content-length'))>100000)throw new Problem('Request too large.',413);
    const raw=await req.text();if(raw.length>100000)throw new Problem('Request too large.',413);
    let b:Row;try{b=JSON.parse(raw)}catch{throw new Problem('Invalid request.')}
    if(!b||typeof b!=='object')throw new Problem('Invalid request.');
    switch(b.action){
    case 'settings':{
      const p=b.preferences;if(!p||!Array.isArray(p.workModes)||p.workModes.some((m:any)=>!['Remote','Hybrid','On-site'].includes(m)))throw new Problem('Invalid preferences.');
      const previous=await one('SELECT data FROM live_settings WHERE user_id=?',user.id);
      const data={...parse(previous?.data),preferences:{salaryMin:num(p.salaryMin,0,2000000),workModes:list(p.workModes,3),location:text(p.location,100,false),travelMax:num(p.travelMax,0,100),availableFrom:day(p.availableFrom),hideConflicts:Boolean(p.hideConflicts),verifiedOnly:Boolean(p.verifiedOnly)}};
      await run('INSERT INTO live_settings(user_id,data,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at',user.id,JSON.stringify(data),now());break;
    }
    case 'profile':{
      const d=b.profile;const p=privacy(d?.privacy);
      const contact=text(d.email||'',180,false);if(contact&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact))throw new Problem('Enter a valid contact email.');
      const links=text(d.links||'',300,false);if(links&&!/^https?:\/\//i.test(links))throw new Problem('Use an https:// portfolio URL.');
      const data={name:text(d.name,70),title:text(d.title,100),location:text(d.location,100),skills:text(d.skills,1000),bio:text(d.bio||'',1000,false),email:contact,links,availableFrom:day(d.availableFrom)};
      const existing=await myProfile(user.id);const profileId=existing?.id||id();
      await run('INSERT INTO live_profiles(id,user_id,data,privacy,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,privacy=excluded.privacy,updated_at=excluded.updated_at',profileId,user.id,JSON.stringify(data),JSON.stringify(p),now());
      if(existing&&parse(existing.data).name?.trim().toLowerCase()!==data.name.trim().toLowerCase())await run('UPDATE live_profiles SET identity_verified_at=NULL,verified_name=NULL WHERE id=?',existing.id);
      if(existing){const open=await all('SELECT a.*,c.domain FROM live_applications a JOIN live_companies c ON c.id=a.company_id WHERE a.candidate_user_id=?',user.id);for(const a of open){if(blocked(p,{id:a.company_id,domain:a.domain})&&a.stage!=='withdrawn'){await run("UPDATE live_applications SET stage='withdrawn',updated_at=? WHERE id=?",now(),a.id);await run("UPDATE live_interviews SET status='cancelled' WHERE application_id=? AND status='confirmed' AND starts_at>?",a.id,now());await notifyCompany(a.company_id,'A candidate withdrew their application.')}}}
      break;
    }
    case 'company':{
      if((await all('SELECT id FROM live_companies WHERE owner_id=?',user.id)).length>=5)throw new Problem('You can create up to five companies.');
      const companyId=id(),companyDomain=domain(b.domain),name=text(b.name,100);
      if(await one('SELECT id FROM live_companies WHERE domain=?',companyDomain))throw new Problem('This domain already has a company account. Ask its owner to invite you.');
      if(!user.email)throw new Problem('Your sign-in must provide an email address.');
      await db.batch([query('INSERT INTO live_companies(id,owner_id,name,domain,verification_token,created_at) VALUES(?,?,?,?,?,?)',companyId,user.id,name,companyDomain,'align='+id(),now()),query('INSERT INTO live_members(id,company_id,email,user_id,role) VALUES(?,?,?,?,?)',id(),companyId,user.email,user.id,'owner')]);break;
    }
    case 'verify':{
      const c=await membership(user.id,text(b.companyId,100),true);
      const response=await fetcher('https://cloudflare-dns.com/dns-query?name='+encodeURIComponent('_align-verify.'+c.domain)+'&type=TXT',{headers:{accept:'application/dns-json'},signal:AbortSignal.timeout(10000)});
      if(!response.ok)throw new Problem('The DNS lookup is unavailable. Try again later.',503);
      const dns=await response.json() as {Answer?:{type:number;data:string}[]};
      const valid=dns.Answer?.some(a=>a.type===16&&a.data.replace(/"\s*"/g,'').replace(/^"|"$/g,'')===c.verification_token);
      if(!valid)throw new Problem('The verification TXT record was not found yet. Check the record and allow time for DNS to update.');
      await run('UPDATE live_companies SET verified_at=? WHERE id=?',now(),c.id);break;
    }
    case 'invite':{
      const c=await membership(user.id,text(b.companyId,100),true);const email=text(b.email,180).toLowerCase();
      if(!c.verified_at)throw new Problem('Verify your company domain before adding hiring teammates.');
      if(email.split('@').length!==2||email.split('@')[1]!==c.domain)throw new Problem('Use a teammate’s email at your verified company domain.');
      if((await all('SELECT id FROM live_members WHERE company_id=?',c.id)).length>=30)throw new Problem('A company can have up to 30 teammates.');
      await run('INSERT OR IGNORE INTO live_members(id,company_id,email,role) VALUES(?,?,?,?)',id(),c.id,email,'recruiter');break;
    }
    case 'acceptInvite':{
      const invite=await one('SELECT * FROM live_members WHERE id=? AND email=? AND user_id IS NULL',text(b.inviteId,100),user.email);if(!invite)throw new Problem('Invitation not found for your signed-in email.',404);
      await run('UPDATE live_members SET user_id=? WHERE id=? AND email=? AND user_id IS NULL',user.id,invite.id,user.email);break;
    }
    case 'removeMember':{
      const c=await membership(user.id,text(b.companyId,100),true);await run("DELETE FROM live_members WHERE id=? AND company_id=? AND role<>'owner'",text(b.memberId,100),c.id);break;
    }
    case 'job':{
      const c=await membership(user.id,text(b.companyId,100));if(!c.verified_at||c.review_status!=='approved')throw new Problem('Verify the company domain and get admin approval before publishing or editing jobs.',403);const d=b.job;
      const skills=list(d.skills,30,80);if(!skills.length)throw new Problem('Add at least one required skill.');
      if(!['Remote','Hybrid','On-site'].includes(d.mode))throw new Problem('Choose a work arrangement.');
      const questions=list(d.questions||[],3,250);
      const data={title:text(d.title,100),location:text(d.location,100),mode:d.mode,salary:num(d.salary,1,2000),max:num(d.max,1,2000),skills,about:text(d.about,3000),travelPercent:num(d.travelPercent,0,100),startBy:day(d.startBy),questions};
      if(data.salary>data.max)throw new Problem('Maximum salary must be at least the minimum.');
      const timestamp=now(),expires=new Date(Date.now()+30*86400000).toISOString();
      if(d.id){const existing=await one('SELECT * FROM live_jobs WHERE id=? AND company_id=?',text(d.id,100),c.id);if(!existing)throw new Problem('Role not found.',404);const result=await run("UPDATE live_jobs SET data=?,confirmed_at=?,expires_at=?,status=? WHERE id=? AND company_id=? AND EXISTS(SELECT 1 FROM live_companies c WHERE c.id=live_jobs.company_id AND c.verified_at IS NOT NULL AND c.review_status='approved')",JSON.stringify(data),timestamp,expires,'open',existing.id,c.id);if(!result.meta.changes)throw new Problem('Company verification changed. Refresh before publishing.',409)}
      else {const result=await run("INSERT INTO live_jobs(id,company_id,data,status,confirmed_at,expires_at,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM live_companies WHERE id=? AND verified_at IS NOT NULL AND review_status='approved')",id(),c.id,JSON.stringify(data),'open',timestamp,expires,timestamp,c.id);if(!result.meta.changes)throw new Problem('Company verification changed. Refresh before publishing.',409)}
      break;
    }
    case 'jobStatus':{
      const j=await one('SELECT * FROM live_jobs WHERE id=?',text(b.jobId,100));if(!j)throw new Problem('Role not found.',404);const company=await membership(user.id,j.company_id);
      if(b.status==='open'&&(!company.verified_at||company.review_status!=='approved'))throw new Problem('Company verification and admin approval are required to publish or reopen a role.',403);
      if(!['open','closed'].includes(b.status))throw new Problem('Invalid role status.');
      const result=await run('UPDATE live_jobs SET status=?,confirmed_at=?,expires_at=? WHERE id=?'+(b.status==='open'?" AND EXISTS(SELECT 1 FROM live_companies c WHERE c.id=live_jobs.company_id AND c.verified_at IS NOT NULL AND c.review_status='approved')":''),b.status,now(),new Date(Date.now()+30*86400000).toISOString(),j.id);if(!result.meta.changes)throw new Problem('Company verification changed. Refresh before publishing.',409);break;
    }
    case 'interest':{
      const j=await one('SELECT * FROM live_jobs WHERE id=?',text(b.jobId,100));if(!j||j.status!=='open'||j.expires_at<=now())throw new Problem('This role is no longer open.',409);
      const c=(await one('SELECT * FROM live_companies WHERE id=?',j.company_id))!;if(!c.verified_at||c.review_status!=='approved')throw new Problem('This company must complete verification before recruiting.',403);
      const side=b.side;if(!['candidate','employer'].includes(side))throw new Problem('Invalid interest.');
      const p=side==='candidate'?await myProfile(user.id):await one('SELECT * FROM live_profiles WHERE id=?',text(b.candidateId,100));
      if(!p)throw new Problem('Create a live candidate profile first.');
      if((await companyUsers(j.company_id)).some(m=>m.user_id===p.user_id))throw new Problem('You cannot apply to a role at a company you manage.');
      const privacyData=parse(p.privacy,defaultPrivacy) as Privacy;
      if(blocked(privacyData,c as any))throw new Problem('This company is hidden in the candidate’s privacy settings.',403);
      if(side==='employer'){await membership(user.id,c.id);const inbound=await one('SELECT candidate_interest FROM live_applications WHERE candidate_id=? AND job_id=?',p.id,j.id);if(!privacyData.discoverable&&!inbound?.candidate_interest)throw new Problem('This candidate is not discoverable.',403)}
      let answers:Record<string,string>={};
      if(side==='candidate'){const questions=parse(j.data).questions||[];for(const question of questions)answers[question]=text(b.answers?.[question],1500)}
      const existing=await one('SELECT * FROM live_applications WHERE candidate_id=? AND job_id=?',p.id,j.id);
      if(existing&&['withdrawn','closed'].includes(existing.stage))throw new Problem('This application is closed. Choose another role.');
      const applicationId=existing?.id||id();const timestamp=now();
      const data=existing?parse(existing.data):{answers:{},history:[{stage:'interested',time:timestamp,by:side==='candidate'?'Candidate':'Hiring team'}]};if(side==='candidate')data.answers=answers;
      // A single upsert preserves the other side’s flag when two people like at once.
      const flag=side==='candidate'?'candidate_interest':'employer_interest';
      await db.batch([query(`INSERT INTO live_applications(id,candidate_id,candidate_user_id,job_id,company_id,candidate_interest,employer_interest,stage,data,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(candidate_id,job_id) DO UPDATE SET ${flag}=1,data=${side==='candidate'?'json_set(live_applications.data,\'$.answers\',json(excluded.data)->\'$.answers\')':'live_applications.data'},updated_at=excluded.updated_at`,applicationId,p.id,p.user_id,j.id,c.id,side==='candidate'?1:0,side==='employer'?1:0,'interested',JSON.stringify(data),timestamp,timestamp),query("UPDATE live_applications SET stage='matched',updated_at=? WHERE candidate_id=? AND job_id=? AND candidate_interest=1 AND employer_interest=1 AND stage='interested'",timestamp,p.id,j.id)]);
      const a=(await one('SELECT * FROM live_applications WHERE candidate_id=? AND job_id=?',p.id,j.id))!;
      if(a.candidate_interest&&a.employer_interest){await notify(p.user_id,`You matched with ${c.name} for ${parse(j.data).title}.`,a.id+':match:'+p.user_id);await notifyCompany(c.id,`Mutual match for ${parse(j.data).title}.`,a.id+':match')}
      else if(side==='candidate')await notifyCompany(c.id,`A candidate is interested in ${parse(j.data).title}.`,a.id+':interest');
      else await notify(p.user_id,`${c.name} is interested in your profile.`,a.id+':interest:'+p.user_id);
      break;
    }
    case 'stage':{
      const {a,candidate}=await access(user.id,text(b.applicationId,100));const allowed=candidate?['withdrawn']:['conversation','interview','offer','closed'];
      if(!allowed.includes(b.stage))throw new Problem('Invalid stage change.',403);
      if(!candidate&&(!a.candidate_interest||!a.employer_interest))throw new Problem('A mutual match is required first.');
      if(['withdrawn','closed'].includes(a.stage))throw new Problem('This application is already closed.',409);
      const data=parse(a.data);data.history=[...(data.history||[]),{stage:b.stage,time:now(),by:candidate?'Candidate':'Hiring team'}].slice(-100);
      await run('UPDATE live_applications SET stage=?,data=?,updated_at=? WHERE id=?',b.stage,JSON.stringify(data),now(),a.id);
      if(['withdrawn','closed'].includes(b.stage))await run("UPDATE live_interviews SET status='cancelled' WHERE application_id=? AND status='confirmed' AND starts_at>?",a.id,now());
      if(candidate)await notifyCompany(a.company_id,'A candidate withdrew their application.');else await notify(a.candidate_user_id,`Your application status changed to ${b.stage}.`);break;
    }
    case 'teamNotes':{
      const {a,candidate}=await access(user.id,text(b.applicationId,100));if(candidate)throw new Problem('Hiring team access required.',403);
      const data=parse(a.data);data.teamNotes=text(b.notes||'',3000,false);data.shortlisted=Boolean(b.shortlisted);
      await run('UPDATE live_applications SET data=?,updated_at=? WHERE id=?',JSON.stringify(data),now(),a.id);break;
    }
    case 'message':{
      const {a,candidate}=await access(user.id,text(b.applicationId,100),true);const body=text(b.text,3000);
      const recent=await one('SELECT COUNT(*) count FROM live_messages WHERE sender_id=? AND created_at>?',user.id,new Date(Date.now()-60000).toISOString());if((recent?.count||0)>=20)throw new Problem('Please wait a moment before sending another message.',429);
      await db.batch([query('INSERT INTO live_messages(id,application_id,sender_id,body,created_at) VALUES(?,?,?,?,?)',id(),a.id,user.id,body,now()),query("UPDATE live_applications SET stage=CASE WHEN stage='matched' THEN 'conversation' ELSE stage END,updated_at=? WHERE id=?",now(),a.id)]);
      if(candidate)await notifyCompany(a.company_id,'A candidate sent a message.');else await notify(a.candidate_user_id,'Your hiring team sent a message.');break;
    }
    case 'slot':{
      const starts=date(b.startsAt),ends=date(b.endsAt);const length=(Date.parse(ends)-Date.parse(starts))/60000;
      if(starts<=now()||Date.parse(starts)>Date.now()+180*86400000||length<15||length>120)throw new Problem('Publish a future slot of 15–120 minutes within the next six months.');
      const clash=await one('SELECT id FROM live_slots WHERE owner_id=? AND starts_at<? AND ends_at>?',user.id,ends,starts);if(clash)throw new Problem('This overlaps one of your published slots.');
      if((await all('SELECT id FROM live_slots WHERE owner_id=? AND starts_at>?',user.id,now())).length>=100)throw new Problem('You can publish up to 100 upcoming slots.');
      await run('INSERT INTO live_slots(id,owner_id,starts_at,ends_at,created_at) VALUES(?,?,?,?,?)',id(),user.id,starts,ends,now());break;
    }
    case 'removeSlot':{
      await run('DELETE FROM live_slots WHERE id=? AND owner_id=? AND NOT EXISTS(SELECT 1 FROM live_interviews i WHERE i.slot_id=live_slots.id)',text(b.slotId,100),user.id);break;
    }
    case 'book':{
      const {a,candidate}=await access(user.id,text(b.applicationId,100),true);const slot=await one('SELECT * FROM live_slots WHERE id=?',text(b.slotId,100));
      if(!slot||slot.owner_id===user.id||slot.starts_at<=now())throw new Problem('This slot is unavailable.',409);
      if(candidate){if(!(await companyUsers(a.company_id)).some(m=>m.user_id===slot.owner_id))throw new Problem('This slot does not belong to your match.',403)}
      else if(slot.owner_id!==a.candidate_user_id)throw new Problem('This slot does not belong to your match.',403);
      const notes=text(b.notes||'',1500,false);
      const result=await run("INSERT OR IGNORE INTO live_interviews(id,application_id,slot_id,host_id,guest_id,starts_at,ends_at,status,notes,created_at) SELECT ?,?,?,?,?,?,?,'confirmed',?,? WHERE NOT EXISTS(SELECT 1 FROM live_interviews WHERE status='confirmed' AND starts_at<? AND ends_at>? AND (host_id IN (?,?) OR guest_id IN (?,?)))",id(),a.id,slot.id,slot.owner_id,user.id,slot.starts_at,slot.ends_at,notes,now(),slot.ends_at,slot.starts_at,slot.owner_id,user.id,slot.owner_id,user.id);
      if(!result.meta.changes)throw new Problem('This slot was booked or conflicts with another interview. Refresh and choose another.',409);
      await run("UPDATE live_applications SET stage='interview',updated_at=? WHERE id=?",now(),a.id);
      await notify(a.candidate_user_id,'Your interview is booked. Open Schedule for the time and calendar file.');await notifyCompany(a.company_id,'An interview is booked. Open Schedule for details.');break;
    }
    case 'cancelInterview':{
      const interview=await one('SELECT * FROM live_interviews WHERE id=?',text(b.interviewId,100));if(!interview)throw new Problem('Interview not found.',404);const {a}=await access(user.id,interview.application_id);
      await run("UPDATE live_interviews SET status='cancelled' WHERE id=?",interview.id);await notify(a.candidate_user_id,'An interview was cancelled. Arrange another time in Schedule.');await notifyCompany(a.company_id,'An interview was cancelled. Arrange another time in Schedule.');break;
    }
    case 'readNotifications':await run('UPDATE live_notifications SET read_at=? WHERE user_id=? AND read_at IS NULL',now(),user.id);break;
    default:throw new Problem('Unknown action.');
    }
    return out({ok:true});
  }catch(e){return error(e)}}
  function error(e:unknown){if(e instanceof Problem)return out({error:e.message},e.status);console.error('Live hiring request failed',e instanceof Error?e.message:'Unknown error');return out({error:'Unable to complete this request. Please try again.'},500)}
  return {GET,POST};
}

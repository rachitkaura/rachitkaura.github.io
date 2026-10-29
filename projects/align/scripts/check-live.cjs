const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript');
const {DatabaseSync}=require('node:sqlite');
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,file);
const {createMarket}=require('../app/lib/live-server.ts');
const {defaultPrivacy,preferenceFit,defaultPreferences,coachFeedback,calendarFile}=require('../app/lib/live.ts');
const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
for(const file of fs.readdirSync(path.join(__dirname,'../drizzle')).filter(x=>x.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync(path.join(__dirname,'../drizzle',file),'utf8'));
let queryCount=0;
const DB={prepare(sql){const stmt=sqlite.prepare(sql);let args=[];return {bind(...values){assert(values.length<=100,'D1 statement exceeds the parameter limit');queryCount++;args=values;return this},async all(){return {results:stmt.all(...args)}},async first(){return stmt.get(...args)||null},async run(){const result=stmt.run(...args);return {success:true,meta:{changes:Number(result.changes)}}}}},async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const stmt of statements)results.push(await stmt.run());sqlite.exec('COMMIT');return results}catch(e){sqlite.exec('ROLLBACK');throw e}}};
let dnsToken='';const market=createMarket(DB,async url=>{assert(String(url).includes('_align-verify.team.test'));return Response.json({Answer:[{type:16,data:'"'+dnsToken+'"'}]})});
const origin='https://align.test';
function req(user,body,url='/api/live',requestOrigin=origin){const email={owner:'owner@team.test',teammate:'teammate@team.test',intruder:'intruder@evil.test',alice:'alice@personal.test',bob:'bob@personal.test'}[user]||'';return new Request(origin+url,{method:body?'POST':'GET',headers:{...(user?{'oai-authenticated-user-id':user,'oai-authenticated-user-email':email}:{}),origin:requestOrigin,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})})}
async function post(user,body,status=200,otherOrigin){const r=await market.POST(req(user,body,'/api/live',otherOrigin));const d=await r.json();assert.equal(r.status,status,JSON.stringify({body,error:d}));return d}
async function get(user,url){const r=await market.GET(req(user,null,url));assert.equal(r.status,200,JSON.stringify(await r.clone().json()));return r.json()}
const person=(name,privacy={...defaultPrivacy,discoverable:true})=>({name,title:'Program Lead',location:'Toronto',skills:'JavaScript, Program management',bio:'I coordinate useful projects.',email:name.toLowerCase()+'@contact.test',links:'https://example.com',availableFrom:'',privacy});
const next=(days,hours=0)=>new Date(Date.now()+days*86400000+hours*3600000).toISOString();
(async()=>{
  await post(null,{action:'company'},401);await post('owner',{action:'company'},403,'https://evil.test');
  assert.equal((await get()).signedIn,false);
  await post('owner',{action:'company',name:'Team',domain:'team.test'});
  let owner=await get('owner');const company=owner.organizations[0];dnsToken=company.verificationToken;
  assert.equal(company.verifiedAt,null);assert.equal((await get()).companies[0].verificationToken,undefined);
  await post('intruder',{action:'job',companyId:company.id,job:{}},403);
  const jobData={title:'Technical Program Lead',location:'Toronto',mode:'Hybrid',salary:130,max:170,skills:['Program management','JavaScript'],about:'Lead a real project.',travelPercent:10,startBy:'',questions:['Why this role?']};
  await post('owner',{action:'job',companyId:company.id,job:jobData},403);
  await post('owner',{action:'invite',companyId:company.id,email:'teammate@team.test'},400);
  await post('owner',{action:'verify',companyId:company.id});
  sqlite.prepare("UPDATE live_companies SET review_status='approved',reviewed_at=? WHERE id=?").run(new Date().toISOString(),company.id);
  await post('owner',{action:'job',companyId:company.id,job:jobData});const job=(await get()).jobs[0];
  await post('alice',{action:'profile',profile:person('Alice')});await post('bob',{action:'profile',profile:person('Bob')});
  owner=await get('owner');const alice=owner.profiles.find(p=>p.name==='Alice');assert.equal(alice.email,'');assert.equal(alice.links,'');assert.equal((await get('intruder')).profiles.length,0);
  await post('owner',{action:'interest',side:'employer',jobId:job.id,candidateId:alice.id});
  await post('alice',{action:'interest',side:'candidate',jobId:job.id,answers:{}},400);
  await post('alice',{action:'interest',side:'candidate',jobId:job.id,answers:{'Why this role?':'I have relevant project experience.'}});
  let a=(await get('alice')).applications[0];assert.equal(a.stage,'matched');assert(a.candidateInterest&&a.employerInterest);
  owner=await get('owner');assert.equal(owner.applications[0].candidate.email,'alice@contact.test');
  await post('owner',{action:'teamNotes',applicationId:a.id,notes:'Team only',shortlisted:true});
  assert.equal((await get('alice')).applications[0].data.teamNotes,undefined);
  await post('intruder',{action:'message',applicationId:a.id,text:'Unauthorized'},403);
  await post('alice',{action:'message',applicationId:a.id,text:'Hello, hiring team!'});
  owner=await get('owner');assert.equal(owner.messages[a.id][0].text,'Hello, hiring team!');assert.equal(owner.messages[a.id][0].mine,false);assert.equal(owner.applications[0].stage,'conversation');
  await post('owner',{action:'message',applicationId:a.id,text:'Thanks, Alice!'});assert.equal((await get('alice')).messages[a.id].length,2);
  await post('alice',{action:'stage',applicationId:a.id,stage:'offer'},403);
  await post('owner',{action:'slot',startsAt:next(2),endsAt:next(2,.5)});
  let aliceData=await get('alice');const slot=aliceData.slots.find(s=>!s.mine);assert(slot.applicationIds.includes(a.id));assert.equal((await get('intruder')).slots.length,0);
  await post('intruder',{action:'book',applicationId:a.id,slotId:slot.id},403);
  await post('alice',{action:'book',applicationId:a.id,slotId:slot.id,notes:'https://example.com/meeting'});
  await post('alice',{action:'book',applicationId:a.id,slotId:slot.id,notes:''},409);
  owner=await get('owner');assert.equal(owner.interviews[0].status,'confirmed');assert.equal(owner.applications[0].stage,'interview');assert.equal((await get('alice')).interviews[0].id,owner.interviews[0].id);
  await post('owner',{action:'stage',applicationId:a.id,stage:'offer'});assert.equal((await get('alice')).applications[0].stage,'offer');
  await post('owner',{action:'verify',companyId:company.id});assert((await get()).companies[0].verifiedAt);
  await post('owner',{action:'invite',companyId:company.id,email:'intruder@evil.test'},400);
  await post('owner',{action:'invite',companyId:company.id,email:'teammate@team.test'});
  const invite=(await get('teammate')).invites[0];await post('intruder',{action:'acceptInvite',inviteId:invite.id},404);await post('teammate',{action:'acceptInvite',inviteId:invite.id});
  const teammate=await get('teammate');assert.equal(teammate.organizations[0].verificationToken,undefined);assert.equal(teammate.messages[a.id].length,2);await post('teammate',{action:'verify',companyId:company.id},403);
  await post('alice',{action:'profile',profile:person('Alice',{...defaultPrivacy,discoverable:true,contactVisibility:'never'})});assert.equal((await get('owner')).applications[0].candidate.email,'');
  await post('alice',{action:'profile',profile:person('Alice',{...defaultPrivacy,discoverable:true,hiddenCompanies:[company.id]})});
  owner=await get('owner');assert(!owner.profiles.some(p=>p.id===alice.id));assert(!owner.applications.some(x=>x.id===a.id));assert.equal(owner.messages[a.id],undefined);
  aliceData=await get('alice');assert.equal(aliceData.applications[0].stage,'withdrawn');assert.equal(aliceData.interviews[0].status,'cancelled');
  await post('owner',{action:'message',applicationId:a.id,text:'Blocked'},403);
  // A hidden profile can still explicitly apply and be liked back.
  await post('bob',{action:'profile',profile:person('Bob',defaultPrivacy)});
  await post('bob',{action:'interest',side:'candidate',jobId:job.id,answers:{'Why this role?':'I can help.'}});
  const bobApp=(await get('bob')).applications[0];await post('owner',{action:'interest',side:'employer',jobId:job.id,candidateId:bobApp.candidateId});assert.equal((await get('bob')).applications[0].stage,'matched');
  await post('owner',{action:'removeMember',companyId:company.id,memberId:teammate.team.find(m=>m.email==='teammate@team.test').id});assert.equal((await get('teammate')).organizations.length,0);await post('teammate',{action:'message',applicationId:bobApp.id,text:'No access'},403);
  sqlite.prepare("UPDATE live_jobs SET expires_at='2000-01-01T00:00:00.000Z' WHERE id=?").run(job.id);assert.equal((await get()).jobs.length,0);await post('alice',{action:'interest',side:'candidate',jobId:job.id},409);
  const conflict=preferenceFit({...defaultPreferences,salaryMin:180000,workModes:['Remote'],location:'Ottawa',travelMax:0,availableFrom:'2027-03-01'},{...job,startBy:'2027-02-01'});assert.equal(conflict.conflicts.length,5);
  const feedback=coachFeedback('I led a project for our customer and reduced delivery time by 20%.','star');assert(feedback.checks[0].ok&&feedback.checks[1].ok&&feedback.checks[2].ok);assert(!feedback.checks[3].ok);
  const ics=calendarFile({id:'event',startsAt:next(2),endsAt:next(2,.5),notes:'Notes, with; punctuation\nand a new line'},'Interview');assert(ics.includes('TRIGGER:-PT15M'));assert(ics.includes('Notes\\, with\\; punctuation\\nand a new line'));
  // The live inbox stays inside D1 statement and binding limits with 200 applications.
  const bobRow=sqlite.prepare('SELECT * FROM live_profiles WHERE user_id=?').get('bob');
  for(let i=0;i<201;i++){
    const jobId='scale-job-'+i,applicationId='scale-application-'+i,time=new Date().toISOString();
    sqlite.prepare('INSERT INTO live_jobs(id,company_id,data,status,confirmed_at,expires_at,created_at) VALUES(?,?,?,?,?,?,?)').run(jobId,company.id,JSON.stringify(jobData),'open',time,next(30),time);
    sqlite.prepare('INSERT INTO live_applications(id,candidate_id,candidate_user_id,job_id,company_id,candidate_interest,employer_interest,stage,data,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(applicationId,bobRow.id,'bob',jobId,company.id,1,1,'matched','{}',time,time);
  }
  queryCount=0;const scaled=await get('bob');assert.equal(scaled.applications.length,200);assert(queryCount<30,'Inbox reads should use bounded bulk queries');
  console.log('Passed: real SQLite migrations, shared matching, screening validation, participant message access, contact redaction, company blocks, booking conflict protection, shared status, company DNS verification, team membership, private inbound profiles, expiry, preference conflicts, guided feedback, and ICS reminders.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>sqlite.close());

const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript');
const {DatabaseSync}=require('node:sqlite');
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,file);
const {createMarket}=require('../app/lib/live-server.ts'),{createWorkflows}=require('../app/lib/workflows-server.ts'),{createSwipeServer}=require('../app/lib/swipe-server.ts'),{createRanking}=require('../app/lib/ranking-server.ts'),{createHandoff}=require('../app/lib/handoff-server.ts'),{createEmailPreferences,processEmailNotifications}=require('../app/lib/email-notifications.ts'),{roleRanking}=require('../app/lib/role-criteria.ts'),{rankCandidate}=require('../app/lib/ranking.ts'),{defaultPrivacy}=require('../app/lib/live.ts'),{createVerification}=require('../app/lib/verification.ts');
const {createRemoteOutbox}=require('../app/lib/remote-outbox.ts');
const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync(path.join('drizzle',file),'utf8'));
const db={prepare(sql){let args=[];const stmt=sqlite.prepare(sql);return {bind(...v){assert(v.length<=100);args=v;return this},async first(){return stmt.get(...args)||null},async all(){return {results:stmt.all(...args)}},async run(){return {meta:{changes:Number(stmt.run(...args).changes)}}}}},async batch(list){sqlite.exec('BEGIN');try{const out=[];for(const s of list)out.push(await s.run());sqlite.exec('COMMIT');return out}catch(e){sqlite.exec('ROLLBACK');throw e}}};
const origin='https://align.test',future=days=>new Date(Date.now()+days*86400000).toISOString();
function req(uid,body,url='/api/live',other=origin){return new Request(origin+url,{method:body?'POST':'GET',headers:{...(uid?{'oai-authenticated-user-id':uid,'oai-authenticated-user-email':uid+'@account.test'}:{}),origin:other,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})})}
let checks=0;function eq(a,b,msg){assert.deepEqual(a,b,msg);checks++}function ok(x,msg){assert(x,msg);checks++}
const market=createMarket(db),wf=createWorkflows(db),handoff=createHandoff(db);
async function call(fn,user,body,status=200,url,other){const r=await fn(req(user,body,url,other));const d=await r.json();eq(r.status,status,JSON.stringify(d));return d}
const post=(u,b,status=200)=>call(market.POST,u,b,status),get=u=>call(market.GET,u);
(async()=>{
 await post('owner',{action:'company',name:'Team',domain:'team.test'});let employer=await get('owner'),company=employer.organizations[0];sqlite.prepare("UPDATE live_companies SET verified_at=?,review_status='approved',reviewed_at=? WHERE id=?").run(future(0),future(0),company.id);
 const jd={title:'Program Lead',location:'Toronto',mode:'Remote',salary:100,max:150,skills:['JavaScript','Risk management'],about:'Lead a useful delivery program.',travelPercent:0,startBy:future(30).slice(0,10),questions:[],criteria:{trainable:['Internal tooling'],transferable:'Equivalent delivery work counts.',minYears:5},first90Days:'Map dependencies and deliver the first release.',reportsTo:'Head of Delivery',hiringContact:'Hiring manager',interviewProcess:'Two conversations.',timeCommitment:'90 minutes total.'};
 for(let i=0;i<4;i++)await post('owner',{action:'job',companyId:company.id,job:{...jd,title:'Program Lead '+i}});
 let jobs=(await get('owner')).companyJobs;for(const j of jobs)await post('owner',{action:'jobStatus',jobId:j.id,status:'open'});
 jobs=(await get('owner')).companyJobs;
 eq(sqlite.prepare('SELECT COUNT(*) n FROM hiring_calibrations').get().n,0,'Publication uses role requirements without mandatory fictional calibration.');
 const profile={name:'Alice',title:'Program Lead',location:'Toronto',skills:'JS',bio:'I deliver useful projects.',experienceYears:6,experienceSummary:'Led risk management for cross-team releases.',experience:'PRIVATE CV MATERIAL',education:'PRIVATE EDUCATION',workValues:['Ownership'],availableFrom:future(5).slice(0,10),email:'private-contact@contact.test',links:'',privacy:{...defaultPrivacy,discoverable:true}};
 await post('alice',{action:'profile',profile});await post('bob',{action:'profile',profile:{...profile,name:'Bob'}});let alice=(await get('alice')).profile;
 // The published role is the single source of fit for both sides, regardless of personal weights.
 const rank=createRanking(db),result=await call(rank,'owner',{action:'preview',companyId:company.id,jobId:jobs[0].id,preferences:{skills:1,experience:1,values:100,valuesWanted:['Ownership']}});
 const row=result.rows.find(r=>r.candidate.id===alice.id),candidateScore=rankCandidate(alice,jobs[0],roleRanking(jobs[0]));eq(row.score,candidateScore.score);eq(row.metrics.some(m=>m.key==='values'),false);eq(rankCandidate({...alice,workValues:[]},jobs[0],roleRanking(jobs[0])).score,row.score);
 const discovered=(await get('owner')).profiles.find(p=>p.id===alice.id);eq(discovered.experience,undefined);eq(discovered.education,undefined);eq(discovered.email,'');
 // Publishing one summary requires explicit consent and ownership; artifacts stay private.
 const card={action:'card',title:'Safer releases',skills:'Risk management',problem:'Release owners had conflicting plans across teams.',contribution:'I mapped dependencies and introduced a shared risk review.',outcome:'The team agreed a measurable release plan for the pilot.',artifact:'https://example.test/private-artifact'};
 await call(wf,'alice',card);const cardId=(await call(wf,'alice')).cards[0].id;
 await post('alice',{action:'featuredExample',cardId,consent:false},400);await post('bob',{action:'featuredExample',cardId,consent:true},403);await post('alice',{action:'featuredExample',cardId,consent:true});
 let published=(await get('owner')).profiles.find(p=>p.id===alice.id).featuredExample;eq(published.title,card.title);eq(published.artifact,undefined);
 await call(wf,'alice',{...card,id:cardId,title:'Updated release story'});eq((await get('owner')).profiles.find(p=>p.id===alice.id).featuredExample,null,'Editing a source revokes its public excerpt until explicit republishing.');
 alice=(await get('alice')).profile;
 // Durable delivery continues in a new server instance with no client polling.
 let clock=Date.now(),sleepers=[],background=[];const queue=createSwipeServer(db,{clock:()=>clock,sleep:ms=>new Promise(resolve=>sleepers.push({ms,resolve}))});
 const handle=(user,body,status=200)=>call(r=>queue.handle(r,p=>background.push(p)),user,body,status,'/api/swipes');
 const payload=job=>({action:'interest',side:'candidate',jobId:job.id,answers:{},profileVersion:alice.updatedAt,roleVersion:job.confirmedAt});
 await handle(null,{action:'queue'},401);await handle('alice',{action:'queue',actorId:'bob',id:'wrong',label:'Role',payload:payload(jobs[0])},400);
 let accepted=await handle('alice',{action:'queue',actorId:'alice',id:'undo-1',label:'First role',payload:payload(jobs[0])},202);eq(accepted.entry.dueAt-clock,10000);eq((await get('alice')).applications.length,0);clock+=9999;await handle('bob',{action:'undo',id:'undo-1'},409);await handle('alice',{action:'undo',id:'undo-1'});clock++;sleepers.splice(0).forEach(t=>t.resolve());await Promise.all(background.splice(0));eq((await get('alice')).applications.length,0);
 accepted=await handle('alice',{action:'queue',actorId:'alice',id:'send-1',label:'Second role',payload:payload(jobs[1])},202);clock=accepted.entry.dueAt;await handle('alice',{action:'undo',id:'send-1'},409);
 // Simulate a recovered Worker processing persisted D1 state, not the original browser.
 await createSwipeServer(db,{clock:()=>clock}).process();sleepers.splice(0).forEach(t=>t.resolve());await Promise.all(background.splice(0));const delivery=sqlite.prepare("SELECT state,error FROM pending_swipes WHERE id='send-1'").get();eq(delivery.state,'sent',JSON.stringify(delivery));
 let a=(await get('alice')).applications.find(a=>a.jobId===jobs[1].id);ok(a);eq((await get('owner')).applications.length,0,'Candidate-only interest stays anonymous.');eq((await get('owner')).notifications.length,0);
 await Promise.all([queue.process(),queue.process()]);eq(sqlite.prepare('SELECT COUNT(*) n FROM live_applications WHERE job_id=?').get(jobs[1].id).n,1);
 // Stale role versions are revalidated at final delivery, without losing the saved failure.
 accepted=await handle('alice',{action:'queue',actorId:'alice',id:'stale-1',label:'Third role',payload:payload(jobs[2])},202);sqlite.prepare("UPDATE live_jobs SET status='closed' WHERE id=?").run(jobs[2].id);clock=accepted.entry.dueAt;await queue.process();sleepers.splice(0).forEach(t=>t.resolve());await Promise.all(background.splice(0));eq(sqlite.prepare("SELECT state FROM pending_swipes WHERE id='stale-1'").get().state,'failed');eq(sqlite.prepare('SELECT COUNT(*) n FROM live_applications WHERE job_id=?').get(jobs[2].id).n,0);
 await post('owner',{action:'interest',side:'employer',jobId:jobs[1].id,candidateId:alice.id});a=(await get('alice')).applications.find(a=>a.jobId===jobs[1].id);eq(a.stage,'matched');
 const step={owner:'employer',text:'Confirm a time for the manager conversation.',dueAt:future(2)};
 await post('bob',{action:'nextStep',applicationId:a.id,step},403);await post('alice',{action:'nextStep',applicationId:a.id,step:{...step,owner:'anyone'}},400);await post('alice',{action:'nextStep',applicationId:a.id,step});eq((await get('owner')).applications.find(x=>x.id===a.id).data.nextStep.text,step.text);
 await call(handoff,'owner',null,403,'/api/handoff?applicationId='+a.id);await post('alice',{action:'profile',profile:{...profile,privacy:{...profile.privacy,allowHandoffExport:true}}});await call(wf,'alice',{action:'share',cardId,applicationId:a.id});
 const packet=await call(handoff,'owner',null,200,'/api/handoff?applicationId='+a.id);eq(packet.candidate.email,'private-contact@contact.test');eq(packet.sharedWork.length,1);ok(!JSON.stringify(packet).includes('PRIVATE CV MATERIAL'));ok(!JSON.stringify(packet).includes('PRIVATE EDUCATION'));eq(packet.candidate.resume,undefined);eq(packet.teamNotes,undefined);
 await call(handoff,'bob',null,403,'/api/handoff?applicationId='+a.id);await post('alice',{action:'profile',profile:{...profile,privacy:{...profile.privacy,allowHandoffExport:false}}});await call(handoff,'owner',null,403,'/api/handoff?applicationId='+a.id);
 // Email opt-in is account-bound; missing setup never pretends to deliver.
 const off=createEmailPreferences(db,{});eq((await call(off,'alice',null,200,'/api/notification-settings')).configured,false);await call(off,'alice',{enabled:true,events:['matches']},503,'/api/notification-settings');let sends=0;await processEmailNotifications(db,{},()=>{sends++;throw Error('Should not send')});eq(sends,0);
 const env={ALIGN_EMAIL_API_KEY:'integration-test-only',ALIGN_EMAIL_FROM:'Align <notifications@team.test>',ALIGN_PUBLIC_ORIGIN:origin},prefs=createEmailPreferences(db,env);await call(prefs,'alice',{enabled:true,email:'attacker@elsewhere.test',events:['matches']},200,'/api/notification-settings');
 sqlite.prepare('INSERT INTO live_notifications(id,user_id,body,created_at) VALUES(?,?,?,?)').run('email-test','alice','Mutual match update.',future(.00001));
 await processEmailNotifications(db,env,async(url,init)=>{eq(url,'https://api.resend.com/emails');const body=JSON.parse(init.body);eq(body.to,['alice@account.test']);ok(!body.text.includes('PRIVATE'));ok(init.headers['Idempotency-Key']);sends++;return Response.json({id:'provider-test'})});eq(sends,1);await processEmailNotifications(db,env,async()=>{throw Error('Duplicate email')});eq(sends,1);
 // Backpressure does not consume unsent attempts or reveal legacy unilateral notices.
 for(let i=0;i<3;i++)sqlite.prepare('INSERT INTO live_notifications(id,user_id,body,created_at) VALUES(?,?,?,?)').run('email-burst-'+i,'alice','Mutual match update.',future(.00002));
 sqlite.prepare('INSERT INTO live_notifications(id,user_id,body,created_at) VALUES(?,?,?,?)').run('email-private-swipe','alice','A candidate is interested in this role.',future(.00002));
 const burstSend=async()=>{sends++;return Response.json({id:'mock-burst'})};
 await processEmailNotifications(db,env,burstSend);eq(sends,3);
 await processEmailNotifications(db,env,burstSend);eq(sends,4);
 await processEmailNotifications(db,env,burstSend);eq(sends,4);
 eq(sqlite.prepare("SELECT state FROM email_deliveries WHERE id='email-private-swipe'").get().state,'cancelled');
 await call(prefs,'alice',{enabled:false,events:['matches']},200,'/api/notification-settings');eq((await call(prefs,'alice',null,200,'/api/notification-settings')).enabled,false);
 // Reconcile an accepted swipe whose HTTP response was lost before a later sent receipt.
 let remoteRows=[],watch=()=>{},receipts=0;
 const remote=createRemoteOutbox({request:async(_url,init)=>{if(init?.method==='POST')throw Error('Simulated lost response');return Response.json({entries:remoteRows,actorId:'alice',serverNow:Date.now()})},onChange:rows=>watch(rows),onSent:()=>receipts++});
 const nextChange=predicate=>new Promise(resolve=>{watch=rows=>{if(predicate(rows)){watch=()=>{};resolve(rows)}}});
 let changed=nextChange(()=>true);remote.start();await changed;
 changed=nextChange(rows=>rows.some(e=>e.state==='failed'));
 const remoteId=remote.enqueue({actorId:'alice',label:'A saved role',payload:payload(jobs[0])});await changed;
 remoteRows=[{id:remoteId,actorId:'alice',label:'A saved role',payload:payload(jobs[0]),dueAt:Date.now()-1000,state:'sent'}];
 changed=nextChange(rows=>rows.length===0);remote.sync();await changed;remote.stop();eq(remote.snapshot().length,0);eq(receipts,1);
 await handle('alice',{action:'dismiss',id:'never-accepted'});
 const paused=createVerification(db,{delete:async()=>{},get:async()=>null});const imageReq=new Request(origin+'/api/verification',{method:'POST',headers:{'oai-authenticated-user-id':'alice',origin,'Content-Type':'multipart/form-data; boundary=test'},body:'test'});eq((await paused.POST(imageReq)).status,410,'The launch cannot accept new ID uploads.');
 console.log(`Focused hiring passed: ${checks} assertions covering short publication, shared rubric, private fields, explicit summaries, background delivery without a browser, exact Undo boundaries, recovery, stale roles, anonymity, next-step authorization, export consent, email opt-in/idempotency, and paused ID collection.`);
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>sqlite.close());

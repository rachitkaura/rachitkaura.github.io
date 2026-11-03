import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,relative} from 'node:path';
import {createRequire} from 'node:module';
import ts from 'typescript';

// Exercise the actual pure client engine without a browser, network or database.
const root=resolve('.'),out=mkdtempSync(join(tmpdir(),'align-demo-test-')),done=new Set();
function compile(file){
 file=resolve(file);if(done.has(file))return;done.add(file);
 const code=readFileSync(file,'utf8'),destination=join(out,relative(root,file).replace(/\.tsx?$/,'.js'));
 mkdirSync(dirname(destination),{recursive:true});writeFileSync(destination,ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);
 for(const match of code.matchAll(/from\s+['"]([^'"]+)['"]/g)){if(!match[1].startsWith('.'))continue;let target=resolve(dirname(file),match[1]);try{readFileSync(target+'.ts');target+='.ts'}catch{target+='.tsx'}compile(target)}
}
compile(join(root,'app/lib/demo-store.ts'));
const require=createRequire(import.meta.url),{createDemoStore,createDemoState,DEMO_STORAGE_KEY}=require(join(out,'app/lib/demo-store.js'));
class MemoryStorage{
 values=new Map([['align-preview','leave-live-preview-alone'],['align-theme','dark']]);
 getItem(k){return this.values.get(k)||null}setItem(k,v){this.values.set(k,v)}removeItem(k){this.values.delete(k)}
}
let calls=0;const originalFetch=globalThis.fetch;globalThis.fetch=()=>{calls++;throw Error('The demo must never use the live network')};
let assertions=0;
function ok(value,message){assert.ok(value,message);assertions++}
function eq(a,b,message){assert.deepEqual(a,b,message);assertions++}
async function call(store,path,body,expected=200){const r=await store.request(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:undefined);eq(r.status,expected);return r.json()}
try{
 // Expanded fixtures form a complete, scoped set of example workflows.
 const fixtureStore=createDemoStore(new MemoryStorage()),fixture=fixtureStore.snapshot();
 eq(fixture.roles.length,20);eq(fixture.people.length,24);eq(fixture.companies.length,9);eq(fixture.organizations.length,4);eq(fixture.cards.length,6);eq(fixture.interviews.length,4);
 for(const key of ['roles','people','companies','applications','interviews','cards'])eq(new Set(fixture[key].map(row=>row.id)).size,fixture[key].length,'Unique '+key+' IDs');
 eq(new Set(fixture.applications.map(row=>row.candidateId+':'+row.jobId)).size,fixture.applications.length);
 ok(fixture.roles.every(job=>fixture.companies.some(company=>company.id===job.companyId)&&job.skills.length&&Date.parse(job.expiresAt)>Date.now()));
 ok(fixture.people.every(person=>person.email.endsWith('.example')));
 ok(fixture.people.filter(person=>person.id!==fixture.profile.id).every(person=>!person.featuredExample||!fixture.cards.some(card=>card.id===person.featuredExample.id)));
 ok(fixture.applications.every(app=>fixture.roles.some(job=>job.id===app.jobId)&&fixture.people.some(person=>person.id===app.candidateId)));
 ok(fixture.applications.every(app=>fixture.roles.find(job=>job.id===app.jobId).questions.every(question=>Boolean(app.data.answers[question]))));
 ok(Object.keys(fixture.messages).every(key=>fixture.applications.some(app=>app.id===key&&app.candidateInterest&&app.employerInterest)));
 ok(fixture.interviews.every(interview=>fixture.applications.some(app=>app.id===interview.applicationId&&app.candidateInterest&&app.employerInterest)&&fixture.slots.some(slot=>slot.id===interview.slotId&&slot.booked)&&Date.parse(interview.endsAt)>Date.parse(interview.startsAt)));
 ok(fixture.batches.every(batch=>fixture.roles.some(job=>job.id===batch.jobId)&&batch.reservations.every(reservation=>fixture.people.some(person=>person.id===reservation.candidateId))));
 const candidateFixture=await call(fixtureStore,'/api/live');eq(candidateFixture.interviews.length,2);
 ok(candidateFixture.interviews.every(interview=>fixture.applications.find(app=>app.id===interview.applicationId).candidateId===fixture.profile.id));
 const scopedSlot=candidateFixture.slots.find(slot=>slot.id==='demo-slot-extra-available-0');eq(scopedSlot.applicationIds,['demo-app-extra-alex-ai']);
 await call(fixtureStore,'/api/live',{action:'book',slotId:scopedSlot.id,applicationId:fixture.applications[0].id},400);
 fixtureStore.setRole('employer');
 for(const companyId of ['demo-forma','demo-lumen','demo-harbour']){const scoped=await call(fixtureStore,'/api/live?companyId='+companyId);eq(scoped.interviews.length,1);ok(scoped.interviews.every(interview=>fixture.applications.find(app=>app.id===interview.applicationId).companyId===companyId));ok(!scoped.applications.some(app=>app.side==='employer'&&!app.employerInterest));ok(scoped.slots.every(slot=>slot.applicationIds.every(id=>fixture.applications.find(app=>app.id===id).companyId===companyId)));}
 await call(fixtureStore,'/api/workflows',{action:'outcome',reservationId:'demo-reservation-extra-0',outcome:'Advance to conversation',note:'Discuss the fictional platform coordination example.'});
 const reviewedFixture=await call(fixtureStore,'/api/live?companyId=demo-forma'),reviewedApp=reviewedFixture.applications.find(app=>app.id==='demo-app-extra-marcus-platform'&&app.side==='employer');
 ok(reviewedApp.candidateInterest&&reviewedApp.employerInterest&&reviewedApp.stage==='matched');ok(reviewedFixture.messages[reviewedApp.id].length>0);
 // Upgrade an older saved demo once, preserving edits, private data and queue storage.
 const legacy=createDemoState();delete legacy.seedRevision;
 legacy.roles=legacy.roles.filter(job=>Number(job.id.split('-').at(-1))<=6);legacy.people=legacy.people.slice(0,8);legacy.companies=legacy.companies.slice(0,5);legacy.organizations=legacy.organizations.slice(0,2);
 legacy.applications=legacy.applications.filter(app=>!app.id.startsWith('demo-app-extra-'));legacy.interviews=[];legacy.slots=legacy.slots.filter(slot=>!slot.id.startsWith('demo-slot-extra-'));legacy.cards=legacy.cards.filter(card=>!card.id.startsWith('demo-proof-extra-'));legacy.batches=legacy.batches.filter(batch=>!batch.id.startsWith('demo-batch-extra-'));legacy.calibrations=legacy.calibrations.filter(round=>legacy.roles.some(job=>job.id===round.jobId));legacy.notifications=legacy.notifications.filter(note=>note.id!=='demo-notification-expanded');legacy.messages=Object.fromEntries(Object.entries(legacy.messages).filter(([key])=>legacy.applications.some(app=>app.id===key)));
 legacy.profile.name='A saved demo name';legacy.profile.resume={name:'private-local-resume.txt'};legacy.profile.education='A private profile note';legacy.profile.privacy.hiddenDomains=['private.example'];legacy.roles[0].title='My edited demo role';legacy.workspace.profiles[0].bio='My existing private draft';legacy.applications[0].stage='closed';legacy.applications[0].data.teamNotes='Keep the saved team note';
 legacy.messages[legacy.applications[0].id].push({id:'saved-user-message',from:'candidate',text:'Saved locally before more examples.',time:new Date().toISOString()});
 const legacyStorage=new MemoryStorage();legacyStorage.setItem(DEMO_STORAGE_KEY,JSON.stringify(legacy));legacyStorage.setItem('align-demo-swipe:keep','["demo-role-5"]');legacyStorage.setItem('align-demo-pending-swipes-v1','leave-pending-swipes-alone');
 const upgraded=createDemoStore(legacyStorage),upgradedState=upgraded.snapshot();
 eq(upgradedState.roles.length,20);eq(upgradedState.people.length,24);eq(upgradedState.profile,legacy.profile);eq(upgradedState.roles[0],legacy.roles[0]);eq(upgradedState.workspace,legacy.workspace);eq(upgradedState.applications[0],legacy.applications[0]);eq(upgradedState.messages[legacy.applications[0].id],legacy.messages[legacy.applications[0].id]);
 ok(upgradedState.people.slice(8).every(person=>person.resume===null&&person.education!=='A private profile note'&&!person.privacy.hiddenDomains.includes('private.example')));
 eq(legacyStorage.getItem('align-demo-swipe:keep'),'["demo-role-5"]');eq(legacyStorage.getItem('align-demo-pending-swipes-v1'),'leave-pending-swipes-alone');eq(JSON.parse(legacyStorage.getItem(DEMO_STORAGE_KEY)).seedRevision,2);eq(createDemoStore(legacyStorage).snapshot(),upgradedState);
 upgraded.setRole('employer');await call(upgraded,'/api/live',{action:'jobStatus',companyId:'demo-forma',jobId:'demo-role-7',status:'closed'});eq(createDemoStore(legacyStorage).snapshot().roles.find(job=>job.id==='demo-role-7').active,false);
 // A published excerpt is artifact-free and revocation survives browser reloads.
 const summaryStorage=new MemoryStorage(),summaryStore=createDemoStore(summaryStorage);
 const summaryCard=(await call(summaryStore,'/api/workflows')).cards[0];
 await call(summaryStore,'/api/live',{action:'featuredExample',cardId:summaryCard.id,consent:true});
 let summaryLive=await call(summaryStore,'/api/live');
 eq(summaryLive.profiles.find(p=>p.id===summaryLive.profile.id).featuredExample.artifact,undefined);
 const summaryReload=createDemoStore(summaryStorage);
 await call(summaryReload,'/api/workflows',{...summaryCard,permissionConfirmed:true,action:'card',title:'An edited fictional result'});
 summaryLive=await call(summaryReload,'/api/live');
 eq(summaryLive.profile.featuredExample,null);
 eq(summaryLive.profiles.find(p=>p.id===summaryLive.profile.id).featuredExample,null);
 const summaryRanking=await call(summaryReload,'/api/ranking',{action:'preview',jobId:summaryLive.jobs[0].id});
 ok(summaryRanking.rows.every(r=>r.candidate.experience===undefined&&r.candidate.education===undefined));
 // The swipe UI and list UI must update the same application and conversation.
 const swipeStore=createDemoStore(new MemoryStorage());
 let swipeLive=await call(swipeStore,'/api/live');
 ok(!swipeLive.applications.some(a=>a.side==='candidate'&&!a.candidateInterest));
 const incomingRole=swipeStore.snapshot().applications.find(a=>a.candidateId===swipeStore.snapshot().profile.id&&!a.candidateInterest&&a.employerInterest);
 await call(swipeStore,'/api/live',{action:'interest',side:'candidate',jobId:incomingRole.jobId,answers:{}});
 swipeLive=await call(swipeStore,'/api/live');
 const candidateMatch=swipeLive.applications.find(a=>a.id===incomingRole.id&&a.side==='candidate');
 ok(candidateMatch.candidateInterest&&candidateMatch.employerInterest);eq(candidateMatch.stage,'matched');ok(swipeLive.messages[candidateMatch.id].length>0);
 swipeStore.setRole('employer');swipeLive=await call(swipeStore,'/api/live');
 ok(!swipeLive.applications.some(a=>a.side==='employer'&&!a.employerInterest));
 const incomingPerson=swipeStore.snapshot().applications.find(a=>a.companyId==='demo-forma'&&a.candidateInterest&&!a.employerInterest);
 await call(swipeStore,'/api/live',{action:'interest',side:'employer',jobId:incomingPerson.jobId,candidateId:incomingPerson.candidateId});
 swipeLive=await call(swipeStore,'/api/live');
 const employerMatch=swipeLive.applications.find(a=>a.id===incomingPerson.id&&a.side==='employer');
 ok(employerMatch.candidateInterest&&employerMatch.employerInterest);eq(employerMatch.stage,'matched');ok(swipeLive.messages[employerMatch.id].length>0);
 eq(swipeLive.applications.filter(a=>a.side==='employer'&&a.jobId===incomingPerson.jobId&&a.candidateId===incomingPerson.candidateId).length,1);
 const storage=new MemoryStorage(),store=createDemoStore(storage),other=createDemoStore(new MemoryStorage());
 let live=await call(store,'/api/live');eq(live.signedIn,true);eq(live.jobs.length,20);eq(store.snapshot().people.length,24);eq(live.profiles.length,24);ok(live.profile.experience.length>60);eq((await call(store,'/api/workspace')).data.premium,true);
 ok(live.organizations.every(o=>o.reviewStatus==='approved'));ok(live.jobs.every(j=>Date.parse(j.expiresAt)>Date.now()));
 const app=live.applications.find(a=>a.side==='candidate'&&a.candidateInterest&&a.employerInterest),job=live.jobs[0],companyId=job.companyId;

 await call(store,'/api/live',{action:'message',applicationId:app.id,text:'A local-only test message.'});
 live=await call(store,'/api/live');ok(live.messages[app.id].some(m=>m.text==='A local-only test message.'&&m.mine));
 ok(!Object.values((await call(other,'/api/live')).messages).flat().some(m=>m.text==='A local-only test message.'));
 const reloaded=createDemoStore(storage);ok(Object.values((await call(reloaded,'/api/live')).messages).flat().some(m=>m.text==='A local-only test message.'));
 store.setRole('employer');live=await call(store,'/api/live');ok(live.messages[app.id].some(m=>m.text==='A local-only test message.'&&!m.mine));
 await call(store,'/api/live',{action:'message',applicationId:app.id,text:'The fictional hiring team replies.'});store.setRole('candidate');
 ok((await call(store,'/api/live')).messages[app.id].some(m=>m.text==='The fictional hiring team replies.'&&!m.mine));

 await call(store,'/api/live',{action:'interest',side:'candidate',jobId:'demo-role-5',answers:{}});live=await call(store,'/api/live');ok(live.applications.some(a=>a.jobId==='demo-role-5'&&a.stage==='matched'));
 const beforeBooking=live.interviews.length,slot=live.slots.find(s=>!s.mine);await call(store,'/api/live',{action:'book',slotId:slot.id,applicationId:app.id,notes:'Fictional demo interview.'});
 live=await call(store,'/api/live');const booked=live.interviews.find(interview=>interview.slotId===slot.id);eq(live.interviews.length,beforeBooking+1);eq(booked.status,'confirmed');ok(!live.slots.some(s=>s.id===slot.id));
 await call(store,'/api/live',{action:'book',slotId:slot.id,applicationId:app.id},400);
 store.setRole('employer');eq((await call(store,'/api/live')).interviews.find(interview=>interview.id===booked.id).status,'confirmed');
 await call(store,'/api/live',{action:'cancelInterview',interviewId:booked.id});eq((await call(store,'/api/live')).interviews.find(interview=>interview.id===booked.id).status,'cancelled');
 await call(store,'/api/live',{action:'teamNotes',applicationId:app.id,notes:'Discuss the customer handoff example.',shortlisted:true});ok((await call(store,'/api/live')).applications.find(a=>a.id===app.id).data.shortlisted);

 let pref=live.settings.ranking[companyId+':'+job.id];let ranked=await call(store,'/api/ranking',{action:'preview',jobId:job.id,companyId,preferences:pref});eq(ranked.rows.length,24);ok(ranked.rows.every(r=>r.score===null||(r.score>=0&&r.score<=100)));ok(ranked.rows.some(r=>r.needsReview));
 pref={...pref,skills:100,experience:0,availability:0,values:0,desirable:0};ranked=await call(store,'/api/ranking',{action:'preview',jobId:job.id,companyId,preferences:pref});eq(ranked.rows.find(r=>r.candidate.id==='demo-alex').score,72);
 await call(store,'/api/ranking',{action:'save',jobId:job.id,companyId,preferences:pref},409);eq(ranked.rows.find(r=>r.candidate.id==='demo-alex').metrics.some(m=>m.key==='values'),false);

 store.setRole('candidate');let flows=await call(store,'/api/workflows');const batch=flows.batches.find(b=>b.id==='demo-batch'),full=flows.batches.find(b=>b.id==='demo-batch-full');
 await call(store,'/api/workflows',{action:'reserve',batchId:batch.id});flows=await call(store,'/api/workflows');eq(flows.batches.find(b=>b.id===batch.id).reservations[0].status,'reserved');
 await call(store,'/api/workflows',{action:'reserve',batchId:full.id});eq((await call(store,'/api/workflows')).batches.find(b=>b.id===full.id).reservations[0].status,'waitlisted');
 store.setRole('employer');flows=await call(store,'/api/workflows?companyId='+companyId);const reservation=flows.batches.find(b=>b.id===batch.id).reservations.find(r=>r.applicationId===app.id);
 await call(store,'/api/workflows',{action:'outcome',reservationId:reservation.id,outcome:'Advance to conversation',note:'Your relevant delivery example supports a focused conversation.'});store.setRole('candidate');eq((await call(store,'/api/workflows')).batches.find(b=>b.id===batch.id).reservations[0].outcome,'Advance to conversation');
 const wait=(await call(store,'/api/workflows')).batches.find(b=>b.id===full.id).reservations[0];await call(store,'/api/workflows',{action:'cancelReservation',reservationId:wait.id});eq((await call(store,'/api/workflows')).batches.find(b=>b.id===full.id).counts.occupied,3);

 await call(store,'/api/workflows',{action:'card',title:'A test work example',skills:'Program management',problem:'A fictional team needed a clear release plan.',contribution:'I created the plan and aligned the owners.',outcome:'Each workstream had an agreed owner and deadline.',artifact:''});
 flows=await call(store,'/api/workflows');const card=flows.cards.find(c=>c.title==='A test work example');ok(card);
 await call(store,'/api/workflows',{action:'share',cardId:card.id,applicationId:app.id});
 flows=await call(store,'/api/workflows');eq(flows.shares.filter(s=>s.cardId===card.id&&s.applicationId===app.id).length,1);
 await call(store,'/api/workflows',{action:'share',cardId:card.id,applicationId:app.id});
 flows=await call(store,'/api/workflows');eq(flows.shares.filter(s=>s.cardId===card.id&&s.applicationId===app.id).length,1,'Sharing twice must keep one visible share.');
 store.setRole('employer');flows=await call(store,'/api/workflows?companyId='+companyId);const share=flows.shares.find(s=>s.cardId===card.id);ok(share);
 const previousReview=share.review;
 await call(store,'/api/workflows',{action:'reviewProof',shareId:share.id,review:'Follow-up requested',question:'short'},400);
 eq((await call(store,'/api/workflows?companyId='+companyId)).shares.find(s=>s.id===share.id).review,previousReview,'A rejected follow-up must not change the saved review.');
 await call(store,'/api/workflows',{action:'reviewProof',shareId:share.id,review:'Unknown status',question:'A sufficiently long example question.'},400);
 eq((await call(store,'/api/workflows?companyId='+companyId)).shares.find(s=>s.id===share.id).review,previousReview);
 await call(store,'/api/workflows',{action:'reviewProof',shareId:share.id,review:'Follow-up requested',question:'How did you agree the release dependencies with each team?'});store.setRole('candidate');eq((await call(store,'/api/workflows')).shares.find(s=>s.id===share.id).review,'Follow-up requested');
 await call(store,'/api/workflows',{action:'deleteCard',cardId:card.id});ok(!(await call(store,'/api/workflows')).shares.some(s=>s.cardId===card.id));

 store.setRole('employer');await call(store,'/api/live',{action:'job',companyId,job:{title:'Demo Platform Lead',location:'Toronto, ON',mode:'Remote',salary:140,max:175,skills:['Program management','Risk management'],about:'Coordinate a fictional platform launch.',travelPercent:0,questions:[]}});
 live=await call(store,'/api/live');const draft=live.companyJobs.find(j=>j.title==='Demo Platform Lead');eq(draft.status,'draft');
 await call(store,'/api/live',{action:'jobStatus',jobId:draft.id,status:'open'});
 await call(store,'/api/workflows',{action:'startCalibration',jobId:draft.id,reviewerId:'demo-manager'});flows=await call(store,'/api/workflows?companyId='+companyId);const round=flows.calibrations.find(c=>c.jobId===draft.id);eq(round.complete,true);
 await call(store,'/api/workflows',{action:'approveCalibration',calibrationId:round.id,essential:'Own a relevant delivery outcome.',trainable:'Specific tools can be learned during onboarding.',transferable:'Comparable delivery methods count.',resolution:'Accept equivalent experience with a clear result.'});
 await call(store,'/api/live',{action:'jobStatus',jobId:draft.id,status:'open'});ok((await call(store,'/api/live')).jobs.some(j=>j.id===draft.id));
 await call(store,'/api/live',{action:'job',companyId,job:{...draft,title:'Demo Platform Lead v2'}});await call(store,'/api/live',{action:'jobStatus',jobId:draft.id,status:'open'});ok((await call(store,'/api/workflows?companyId='+companyId)).calibrations.find(c=>c.id===round.id).stale);

 store.setRole('candidate');const workspace=(await call(store,'/api/workspace')).data;
 await call(store,'/api/live',{action:'profile',profile:{...live.profile,privacy:{...live.profile.privacy,discoverable:false}}});
 const employerVisibleTitle=live.profile.title;workspace.profiles[0].title='An edited sample career profile';await call(store,'/api/workspace',workspace);live=await call(store,'/api/live');eq(live.profile.title,employerVisibleTitle);eq((await call(store,'/api/workspace')).data.profiles[0].title,'An edited sample career profile');eq(live.profile.privacy.discoverable,false);
 await call(store,'/api/verification',{action:'approveProfile'},400);await call(store,'/api/not-a-demo-route',{action:'noop'},404);await call(store,'https://another.example/api/live',{action:'noop'},403);
 eq(calls,0);eq(storage.getItem('align-preview'),'leave-live-preview-alone');eq(storage.getItem('align-theme'),'dark');ok(storage.getItem(DEMO_STORAGE_KEY));
 store.reset();live=await call(store,'/api/live');eq(live.jobs.length,20);eq(live.interviews.length,2);eq(live.profile.name,'Alex Morgan');ok(!Object.values(live.messages).flat().some(m=>m.text==='A local-only test message.'));
 const corrupt=new MemoryStorage();corrupt.setItem(DEMO_STORAGE_KEY,'not json');eq((await call(createDemoStore(corrupt),'/api/live')).jobs.length,20);
 const blocked={getItem(){throw Error('disabled')},setItem(){throw Error('disabled')},removeItem(){}};const session=createDemoStore(blocked);await call(session,'/api/live',{action:'message',applicationId:(await call(session,'/api/live')).applications[0].id,text:'Works without localStorage.'});eq(session.persistent,false);
 console.log(`Demo integration checks passed: ${assertions} assertions; zero network requests.`);
}finally{globalThis.fetch=originalFetch;rmSync(out,{recursive:true,force:true})}

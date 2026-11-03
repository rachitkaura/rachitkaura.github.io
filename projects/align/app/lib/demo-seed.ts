import {featuredSummary} from './featured-example';
import {roleSnapshot} from './application-workflow';
import {defaultPrivacy} from './live';
import {defaultRanking} from './ranking';

type Row=Record<string,any>;
export const DEMO_SEED_REVISION=2;
const copy=<T,>(value:T):T=>structuredClone(value);
const future=(days:number,hour=15)=>{const value=new Date();value.setUTCDate(value.getUTCDate()+days);value.setUTCHours(hour,0,0,0);return value.toISOString()};
const day=(offset:number)=>future(offset).slice(0,10);

// Stable IDs let existing browser sessions gain examples without resetting edits.
export function expandDemoState(state:Row,makeCalibration:(jobId:string)=>Row){
 if(state.seedRevision>=DEMO_SEED_REVISION)return false;
 const now=new Date().toISOString();
 function add(key:string,rows:Row[]){state[key]??=[];const ids=new Set(state[key].map((row:Row)=>row.id));for(const row of rows)if(!ids.has(row.id)){state[key].push(copy(row));ids.add(row.id)}}
 const companies=[
  {id:'demo-lumen',name:'Lumen Labs',domain:'lumen.example'},
  {id:'demo-harbour',name:'Harbour Works',domain:'harbour.example'},
  {id:'demo-cedar',name:'Cedar Systems',domain:'cedar.example'},
  {id:'demo-mosaic',name:'Mosaic Health',domain:'mosaic.example'},
 ].map(company=>({...company,verifiedAt:now,reviewStatus:'approved',reviewedAt:now}));
 add('companies',companies);
 add('organizations',companies.slice(0,2).map(company=>({...company,role:'owner'})));
 const roleSeeds=[
  {number:7,company:'demo-forma',title:'Senior Technical Program Manager',location:'Toronto, ON',mode:'Remote',salary:170,max:210,years:8,
   skills:['Program management','Risk management','Cloud','Stakeholder management','SQL'],about:'Coordinate a multi-team platform launch, make dependencies visible, and help engineering and customer teams agree on practical delivery milestones.',outcome:'Agree a shared launch plan, map the top dependencies, and complete one release-readiness review.',questions:['Which multi-team release best shows how you manage dependencies?']},
  {number:8,company:'demo-forma',title:'Platform Delivery Lead',location:'Calgary, AB',mode:'Remote',salary:145,max:185,years:5,
   skills:['Delivery','Cloud','Infrastructure','Risk management','Program management'],about:'Guide a cloud platform upgrade across infrastructure and application teams. Build clear release plans and improve how incidents feed back into delivery.',outcome:'Map the rollout, agree service-readiness checks, and deliver the first migration milestone.'},
  {number:9,company:'demo-forma',title:'Data Program Manager',location:'Montreal, QC',mode:'Hybrid',salary:140,max:180,years:5,
   skills:['SQL','Analytics','Data platforms','Program management','Data governance'],about:'Bring product, analytics, and engineering together around a shared data roadmap. Clarify ownership and make data-quality decisions easier to follow.',outcome:'Publish a data ownership map and deliver one agreed improvement to a reporting pipeline.'},
  {number:10,company:'demo-forma',title:'Security Program Manager',location:'Ottawa, ON',mode:'Remote',salary:155,max:195,years:6,
   skills:['Security','Risk management','Cloud','Program management','Stakeholder management'],about:'Turn security priorities into achievable engineering plans. Coordinate reviews, document trade-offs, and help teams close high-priority risks.',outcome:'Agree a prioritized risk register, identify accountable owners, and finish one remediation milestone.'},
  {number:11,company:'demo-orbit',title:'Growth Product Manager',location:'Toronto, ON',mode:'Hybrid',salary:135,max:175,years:4,
   skills:['Product strategy','Analytics','Customer research','Experimentation','Roadmapping'],about:'Explore how new customers discover value in a subscription product. Use research and small experiments to shape an evidence-based growth roadmap.',outcome:'Map the onboarding funnel and run two clearly defined product experiments.'},
  {number:12,company:'demo-orbit',title:'Design Program Manager',location:'Vancouver, BC',mode:'Remote',salary:130,max:165,years:4,
   skills:['Design operations','Program management','Accessibility','Process improvement','Stakeholder management'],about:'Help design, research, and engineering deliver accessible product experiences. Make planning, research requests, and design reviews easier to coordinate.',outcome:'Create a shared design intake process and complete an accessibility-focused delivery pilot.'},
  {number:13,company:'demo-lumen',title:'AI Product Manager',location:'Waterloo, ON',mode:'Remote',salary:160,max:205,years:5,
   skills:['AI & ML','Product strategy','APIs','Analytics','Customer research'],about:'Shape a practical AI assistant for business workflows. Work with research and engineering to define useful capabilities, evaluation criteria, and responsible release plans.',outcome:'Define one customer problem, establish an evaluation baseline, and pilot a narrowly scoped capability.'},
  {number:14,company:'demo-lumen',title:'ML Platform Technical Program Manager',location:'Ottawa, ON',mode:'Remote',salary:175,max:220,years:7,
   skills:['AI & ML','Python','MLOps','Cloud','Program management'],about:'Coordinate the tools and infrastructure that support model development. Connect data readiness, evaluation, reliability, and release work across specialist teams.',outcome:'Map the model release process and deliver an agreed improvement to evaluation or deployment readiness.',questions:['Describe a reliability or data-quality trade-off you helped resolve.']},
  {number:15,company:'demo-lumen',title:'Customer Solutions Engineer',location:'Quebec City, QC',mode:'Remote',salary:120,max:160,years:3,
   skills:['APIs','JavaScript','SQL','Customer research','Cloud'],about:'Help customers connect a new workflow product to their existing systems. Explain technical options clearly and turn recurring integration problems into reusable guidance.',outcome:'Complete two sample integrations and publish a troubleshooting guide for a recurring customer issue.'},
  {number:16,company:'demo-harbour',title:'Delivery Manager',location:'Halifax, NS',mode:'Remote',salary:135,max:170,years:5,
   skills:['Delivery','Program management','Risk management','Stakeholder management','Operations'],about:'Keep a cross-functional service launch moving without losing sight of customer needs. Establish clear ownership, realistic commitments, and useful delivery reporting.',outcome:'Agree a delivery baseline and complete the first service-launch milestone with named owners.'},
  {number:17,company:'demo-harbour',title:'Product Operations Manager',location:'Winnipeg, MB',mode:'Remote',salary:125,max:160,years:4,
   skills:['Operations','Process improvement','Customer research','Analytics','Strategy'],about:'Build the routines that help product teams learn from customers and make clear decisions. Improve feedback intake, planning, and communication between teams.',outcome:'Introduce a shared feedback taxonomy and test a simpler planning process with one team.'},
  {number:18,company:'demo-cedar',title:'Cloud Program Manager',location:'Calgary, AB',mode:'Remote',salary:150,max:195,years:6,
   skills:['Cloud','Infrastructure','Program management','Delivery','Risk management'],about:'Coordinate a staged migration to a shared cloud platform. Keep service owners aligned on readiness, operational handoffs, and the trade-offs behind each release.',outcome:'Map migration dependencies and complete one low-risk workload migration with a tested rollback plan.'},
  {number:19,company:'demo-cedar',title:'Developer Experience Lead',location:'Montreal, QC',mode:'Remote',salary:155,max:200,years:6,
   skills:['APIs','JavaScript','Developer experience','Cloud','Product strategy'],about:'Make an internal developer platform easier to adopt. Pair developer research with technical delivery to improve documentation, onboarding, and everyday workflows.',outcome:'Identify the largest onboarding friction and ship a measured improvement with developer feedback.'},
  {number:20,company:'demo-mosaic',title:'Technical Program Manager, Digital Health',location:'Ottawa, ON',mode:'On-site',salary:140,max:180,years:5,
   skills:['Program management','APIs','Risk management','Data governance','Stakeholder management'],about:'Coordinate a fictional digital-health platform program with engineering and service teams. Make integration dependencies, access decisions, and delivery risks explicit.',outcome:'Agree an integration plan and document the ownership and acceptance criteria for a first release.'},
 ];
 const roles=roleSeeds.map(seed=>{
  const company=state.companies.find((row:Row)=>row.id===seed.company);
  return {id:'demo-role-'+seed.number,companyId:seed.company,companyName:company.name,title:seed.title,location:seed.location,mode:seed.mode,salary:seed.salary,max:seed.max,
   skills:seed.skills,about:seed.about,questions:'questions' in seed?seed.questions:[],travelPercent:seed.mode==='On-site'?10:0,startBy:day(35),
   verifiedAt:now,confirmedAt:now,expiresAt:future(30),status:'open',version:1,active:true,
   criteria:{trainable:['Internal tools','Team-specific processes'],transferable:'Comparable delivery outcomes in another industry are welcome.',minYears:seed.years},
   first90Days:seed.outcome,reportsTo:seed.company==='demo-lumen'?'Head of AI Products':'Head of Product & Delivery',hiringContact:'Morgan Blake · fictional hiring manager',
   interviewProcess:'Introductory call, role-specific discussion, final team conversation.',timeCommitment:'About two hours across three conversations. No take-home assignment.'};
 });
 add('roles',roles);
 const peopleSeeds=[
  {id:'emma',name:'Emma Wilson',title:'Senior Technical Program Manager',location:'Toronto, ON',years:10,start:14,skills:'Program management, Risk management, SQL, Stakeholder management, Cloud',values:['Ownership','Documentation','Collaboration'],summary:'Led coordinated platform releases across five engineering teams and introduced a shared dependency review.'},
  {id:'daniel',name:'Daniel Okafor',title:'ML Platform Lead',location:'Ottawa, ON',years:8,start:28,skills:'AI & ML, Python, MLOps, Cloud, Data quality',values:['Quality','Learning','Documentation'],summary:'Built model-delivery workflows and worked with data and infrastructure teams to improve evaluation readiness.'},
  {id:'sofia',name:'Sofia Martin',title:'Data Program Manager',location:'Montreal, QC',years:6,start:21,skills:'SQL, Analytics, Data platforms, Program management, Data governance',values:['Collaboration','Quality','Ownership'],summary:'Coordinated data-platform improvements and clarified reporting ownership across product and operations.'},
  {id:'liam',name:'Liam Reed',title:'Platform Engineer',location:'Calgary, AB',years:5,start:7,skills:'Cloud, Infrastructure, APIs, JavaScript, Delivery',values:['Autonomy','Quality','Documentation'],summary:'Delivered cloud migration work, wrote operational runbooks, and supported engineering teams adopting a shared platform.'},
  {id:'aisha',name:'Aisha Rahman',title:'Product Operations Manager',location:'Halifax, NS',years:7,start:14,skills:'Operations, Process improvement, Customer research, Analytics, Strategy',values:['Customer focus','Collaboration','Ownership'],summary:'Improved customer feedback intake and introduced simpler product-planning routines across distributed teams.'},
  {id:'ethan',name:'Ethan Wong',title:'Security Technical Program Manager',location:'Vancouver, BC',years:9,start:35,skills:'Security, Risk management, Cloud, Program management, Stakeholder management',values:['Quality','Documentation','Ownership'],summary:'Coordinated security remediation programs and translated risk decisions into clear engineering milestones.'},
  {id:'olivia',name:'Olivia Brooks',title:'UX Research Lead',location:'Toronto, ON',years:6,start:21,skills:'Customer research, Experimentation, Accessibility, Facilitation, Product strategy',values:['Customer focus','Learning','Collaboration'],summary:'Led customer research programs and helped product teams turn findings into practical release decisions.'},
  {id:'lucas',name:'Lucas Bernard',title:'Customer Solutions Engineer',location:'Quebec City, QC',years:4,start:14,skills:'APIs, JavaScript, SQL, Customer research, Cloud',values:['Customer focus','Learning','Documentation'],summary:'Built customer integrations, investigated recurring API issues, and published reusable troubleshooting guidance.'},
  {id:'grace',name:'Grace Mensah',title:'Delivery Manager',location:'Winnipeg, MB',years:8,start:28,skills:'Delivery, Program management, Risk management, Stakeholder management, Operations',values:['Collaboration','Ownership','Adaptability'],summary:'Led service launches across engineering and operations, with clear milestones, handoffs, and release decisions.'},
  {id:'arjun',name:'Arjun Desai',title:'AI Product Manager',location:'Waterloo, ON',years:5,start:14,skills:'AI & ML, Product strategy, APIs, Analytics, Customer research',values:['Learning','Customer focus','Quality'],summary:'Defined AI-assisted workflows, coordinated customer pilots, and established evaluation criteria with engineering.'},
  {id:'chloe',name:'Chloe Nguyen',title:'Design Program Manager',location:'Ottawa, ON',years:6,start:21,skills:'Design operations, Program management, Accessibility, Process improvement, Stakeholder management',values:['Collaboration','Documentation','Quality'],summary:'Coordinated design and engineering planning and introduced accessible review practices for product releases.'},
  {id:'nathan',name:'Nathan Clarke',title:'Data Engineer',location:'Edmonton, AB',years:4,start:7,skills:'SQL, Python, Data platforms, Analytics, Cloud',values:['Autonomy','Quality','Learning'],summary:'Built analytics pipelines and worked with product teams to make data-quality expectations and ownership explicit.'},
  {id:'isabella',name:'Isabella Silva',title:'Technical Product Manager',location:'Victoria, BC',years:7,start:28,skills:'APIs, Product strategy, Roadmapping, Cloud, JavaScript',values:['Ownership','Customer focus','Documentation'],summary:'Owned an API platform roadmap and guided customers through a staged migration with clear compatibility decisions.'},
  {id:'owen',name:'Owen Carter',title:'Program Coordinator',location:'London, ON',years:2,start:7,skills:'Stakeholder management, Documentation, Operations, Program management',values:['Learning','Collaboration','Adaptability'],summary:'Maintained project updates, tracked action owners, and helped teams prepare clear release-readiness notes.'},
  {id:'zoe',name:'Zoe Laurent',title:'Developer Experience Lead',location:'Montreal, QC',years:9,start:42,skills:'APIs, JavaScript, Developer experience, Cloud, Product strategy',values:['Autonomy','Learning','Customer focus'],summary:'Improved developer onboarding and coordinated API documentation, tooling, and platform-adoption work.'},
  {id:'marcus',name:'Marcus Bennett',title:'Program Analyst',location:'Saskatoon, SK',years:null,start:null,skills:'Analytics, Documentation, Stakeholder management',values:['Learning','Documentation'],summary:'Supported reporting and project coordination. Relevant years and availability are intentionally left open for discussion.'},
 ];
 const people:Row[]=peopleSeeds.map(seed=>({id:'demo-'+seed.id,updatedAt:now,name:seed.name,title:seed.title,location:seed.location,skills:seed.skills,bio:seed.summary,
  experienceYears:seed.years,experienceSummary:seed.summary,experience:seed.summary,availableFrom:seed.start===null?'':day(seed.start),workValues:seed.values,
  email:seed.id+'@demo.align.example',links:'',education:'Fictional demo profile',resume:null,
  privacy:{...copy(defaultPrivacy),discoverable:true,allowHandoffExport:!['marcus','olivia','owen'].includes(seed.id)}}));
 const cards=[
  {id:'demo-proof-extra-release',title:'A release plan everyone could use',skills:'Program management, Risk management',problem:'Engineering teams were tracking dependencies in separate plans.',contribution:'I mapped the dependencies and introduced a short shared readiness review.',outcome:'All twelve release dependencies had a named owner before the fictional launch. Sample figures.',artifact:''},
  {id:'demo-proof-extra-evaluation',title:'A repeatable model release checklist',skills:'AI & ML, MLOps, Quality',problem:'Evaluation evidence was difficult to compare between model releases.',contribution:'I brought data, evaluation, and deployment checks into one release checklist.',outcome:'The fictional pilot cut manual preparation from thirty minutes to ten. Sample figures.',artifact:''},
  {id:'demo-proof-extra-intake',title:'Customer feedback with a clear owner',skills:'Operations, Customer research, Analytics',problem:'Repeated customer issues were being discussed in several places.',contribution:'I introduced a shared taxonomy and a weekly review of unresolved feedback.',outcome:'The sample team reviewed every priority item with an owner and next step during the pilot.',artifact:''},
  {id:'demo-proof-extra-api',title:'A calmer API migration',skills:'APIs, JavaScript, Developer experience',problem:'Customers were unsure which integration changes they needed to make.',contribution:'I coordinated a compatibility guide, sample integration, and staged rollout.',outcome:'The fictional pilot reduced repeated migration questions by twenty percent. Sample figures.',artifact:''},
 ];
 for(const [personId,index] of [['demo-emma',0],['demo-daniel',1],['demo-aisha',2],['demo-zoe',3]] as const){
  const person=people.find(row=>row.id===personId);if(person)person.featuredExample=featuredSummary({...cards[index],id:personId+'-story'});
 }
 add('people',people);add('cards',cards);
 const appSeeds=[
  {id:'alex-senior',person:state.profile.id,job:7,stage:'conversation',text:'Could you walk us through a release where several teams depended on one another?',reply:'I can share how I mapped owners, tracked risks, and agreed readiness checks.',next:'Share a brief outline of the cross-team release example.',owner:'candidate'},
  {id:'alex-ai',person:state.profile.id,job:13,stage:'interview',text:'We would like to discuss how you would plan an AI product pilot.',reply:'I would be happy to explain the problem definition, evaluation, and rollout approach.',next:'Review the sample interview agenda.',owner:'candidate'},
  {id:'alex-delivery',person:state.profile.id,job:16,stage:'matched',text:'Your delivery experience looks relevant to our sample service-launch role. Welcome to the conversation.'},
  {id:'alex-cloud',person:state.profile.id,job:18,stage:'offer',text:'After the sample conversations, we would like to discuss an illustrative offer and your questions.',reply:'Thank you. I would like to discuss team priorities and the proposed start date.',next:'Send questions for the sample offer discussion.',owner:'candidate'},
  {id:'alex-growth',person:state.profile.id,job:11,stage:'closed',text:'This fictional role has been filled. Thank you for trying the application workflow.',reply:'Thanks for the update. I will keep exploring the other sample roles.'},
  {id:'alex-data',person:state.profile.id,job:9,stage:'interested',text:''},
  {id:'emma-senior',person:'demo-emma',job:7,stage:'interview',text:'We would like to discuss your platform release example in a sample interview.',reply:'I can explain the dependencies, trade-offs, and delivery outcomes.',next:'Confirm who will join the sample interview.',owner:'employer'},
  {id:'sofia-data',person:'demo-sofia',job:9,stage:'conversation',text:'Which data-quality problem would you use as your first example?',reply:'I would discuss how we clarified ownership and acceptance criteria for a reporting pipeline.',next:'Share the outline of the data-platform example.',owner:'candidate'},
  {id:'ethan-security',person:'demo-ethan',job:10,stage:'matched',text:'We would be interested in hearing how you turn security risks into delivery milestones.'},
  {id:'grace-platform',person:'demo-grace',job:8,stage:'offer',text:'The sample team would like to discuss an illustrative offer after the delivery conversations.',reply:'I would like to understand the first migration milestone and the service-owner handoff.',next:'Clarify the sample delivery priorities and proposed start date.',owner:'employer'},
  {id:'marcus-senior',person:'demo-marcus',job:7,stage:'interested',text:''},
  {id:'marcus-platform',person:'demo-marcus',job:8,stage:'interested',text:''},
  {id:'owen-platform',person:'demo-owen',job:8,stage:'interested',text:''},
  {id:'liam-platform',person:'demo-liam',job:1,stage:'conversation',text:'Could you share an example of coordinating a platform migration?',reply:'I can explain how we agreed readiness checks and tested the operational handoff.',next:'Confirm the agenda for a technical delivery conversation.',owner:'employer'},
  {id:'olivia-research',person:'demo-olivia',job:1,stage:'matched',text:'We would like to explore how your research and facilitation experience could transfer to this sample role.'},
  {id:'daniel-ml',person:'demo-daniel',job:14,stage:'conversation',text:'How did your team decide that a model release was ready?',reply:'We used shared data, evaluation, and deployment checks, with explicit owners for unresolved risks.',next:'Share an outline of the model release checklist.',owner:'candidate'},
  {id:'zoe-solutions',person:'demo-zoe',job:15,stage:'matched',text:'Your developer-platform work could make for a useful sample integration conversation.'},
  {id:'aisha-operations',person:'demo-aisha',job:17,stage:'interview',text:'We would like to discuss your customer-feedback intake example in a sample interview.',reply:'I can describe how the team agreed the taxonomy and tracked unresolved feedback.',next:'Confirm the participants and questions for the sample interview.',owner:'employer'},
 ];
 state.messages??={};
 for(const [index,seed] of appSeeds.entries()){
  const job=state.roles.find((row:Row)=>row.id==='demo-role-'+seed.job);
  if(!job||state.applications.some((row:Row)=>row.candidateId===seed.person&&row.jobId===job.id))continue;
  const appId='demo-app-extra-'+seed.id,mutual=seed.stage!=='interested';
  const start=Date.now()-(index%5+1)*86400000;
  const time=(minutes:number)=>new Date(start+minutes*60000).toISOString();
  const firstStage=mutual?'matched':'interested',history=[{stage:firstStage,by:'Demo workspace',time:time(0)}];
  if(seed.stage!==firstStage)history.push({stage:seed.stage,by:'Demo workspace',time:time(30)});
  const answers=Object.fromEntries(job.questions.map((question:string)=>[question,job.skills.includes('MLOps')?'Fictional example: The team compared data-quality and reliability checks, documented a rollback plan, and agreed the release decision with service owners.':'Fictional example: I helped track owners and dependencies for a cross-team delivery and prepared the readiness notes for the release discussion.']));
  const data:Row={answers,history,shortlisted:seed.stage==='offer',teamNotes:seed.stage==='offer'?'Discuss the sample priorities and start date.':'',submittedRole:roleSnapshot(job)};
  if('next' in seed)data.nextStep={owner:seed.owner,text:seed.next,dueAt:future(seed.stage==='interview'?1:3),updatedBy:'Demo workspace',updatedAt:now};
  add('applications',[{id:appId,candidateId:seed.person,jobId:job.id,companyId:job.companyId,stage:seed.stage,candidateInterest:true,employerInterest:mutual,updatedAt:time(30),data}]);
  if(mutual){
   state.messages[appId]=[{id:appId+'-message-1',from:'employer',text:seed.text,time:time(5)}];
   if('reply' in seed)state.messages[appId].push({id:appId+'-message-2',from:'candidate',text:seed.reply,time:time(15)});
   if('next' in seed)state.messages[appId].push({id:appId+'-message-3',from:'employer',text:seed.owner==='employer'?'We’ll '+seed.next.charAt(0).toLowerCase()+seed.next.slice(1):'Sounds good. '+seed.next,time:time(30)});
  }
 }
 for(const seed of [
  {app:'alex-ai',offset:5,hour:16,notes:'Fictional AI-product conversation: customer problem, evaluation, and rollout.'},
  {app:'emma-senior',offset:2,hour:17,notes:'Fictional platform-program conversation: dependencies and release readiness.'},
  {app:'aisha-operations',offset:4,hour:15,notes:'Fictional product-operations conversation: feedback intake and decision routines.'},
  {app:'alex-cloud',offset:-2,hour:16,notes:'Past fictional cloud-program conversation, before the sample offer discussion.'},
 ]){
  const appId='demo-app-extra-'+seed.app;
  if(!state.applications.some((row:Row)=>row.id===appId))continue;
  const startsAt=future(seed.offset,seed.hour),endsAt=new Date(Date.parse(startsAt)+45*60000).toISOString(),slotId='demo-slot-extra-'+seed.app;
  add('slots',[{id:slotId,owner:'employer',startsAt,endsAt,booked:true}]);
  add('interviews',[{id:'demo-interview-extra-'+seed.app,slotId,applicationId:appId,status:'confirmed',startsAt,endsAt,notes:seed.notes}]);
 }
 add('slots',[6,7,8,9].map((offset,index)=>({id:'demo-slot-extra-available-'+index,owner:index===3?'candidate':'employer',applicationIds:['demo-app-extra-'+['alex-ai','alex-delivery','alex-senior','alex-senior'][index]],startsAt:future(offset,16),endsAt:new Date(Date.parse(future(offset,16))+30*60000).toISOString()})));
 add('batches',[
  {id:'demo-batch-extra-platform',jobId:'demo-role-8',title:'Platform Delivery Lead',companyName:'Forma',capacity:3,deadline:future(8),open:true,reservations:['demo-marcus','demo-owen'].map((candidateId,index)=>({id:'demo-reservation-extra-'+index,candidateId,status:'reserved',createdAt:now}))},
  {id:'demo-batch-extra-health',jobId:'demo-role-20',title:'Technical Program Manager, Digital Health',companyName:'Mosaic Health',capacity:2,deadline:future(10),open:true,reservations:[]},
 ]);
 state.settings??={};state.settings.ranking??={};
 for(const job of roles){
  const key=job.companyId+':'+job.id;
  state.settings.ranking[key]??={...defaultRanking,minYears:job.criteria.minYears,startBy:job.startBy};
  if(state.organizations.some((row:Row)=>row.id===job.companyId)&&!state.calibrations.some((row:Row)=>row.jobId===job.id))add('calibrations',[{...makeCalibration(job.id),id:'demo-calibration-extra-'+job.id}]);
 }
 add('notifications',[{id:'demo-notification-expanded',text:'More fictional roles, profiles, conversations and interview examples are ready to explore.',time:now,read:false}]);
 state.seedRevision=DEMO_SEED_REVISION;
 return true;
}

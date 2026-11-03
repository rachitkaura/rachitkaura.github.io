type Row=Record<string,any>;
export const projectTypes={employment:'Employment',contract:'Contract work',volunteer:'Volunteering',personal:'Personal project',simulation:'Simulation / practice',unspecified:'Not specified'} as const;
export const ownershipLevels={owned:'Owned',coowned:'Co-owned',contributed:'Contributed',observed:'Observed',unspecified:'Not specified'} as const;
export const artifactTypes={none:'No artifact shared',public:'Public work',redacted:'Redacted work',reconstruction:'Recreated example',simulation:'Simulation / practice'} as const;
export const evidenceChecks={employment:{label:'Employment dates confirmed',help:'Confirm only the dates and employment relationship supported by the source. This does not confirm performance.'},artifact:{label:'Artifact reviewed',help:'Describe the material inspected. Reviewing an artifact alone does not establish authorship or impact.'},contribution:{label:'Contribution corroborated',help:'Record what a person who worked with the candidate directly observed. Candidate permission is required before contacting a reference.'},capability:{label:'Capability demonstrated',help:'Describe the job-related task and observed performance. A task demonstrates current capability, not past employment or results.'}} as const;
const text=(value:any,label:string,max:number,min=0)=>{if(value!==undefined&&typeof value!=='string')throw Error(`${label} must be text.`);const v=(value||'').trim();if(v.length<min||v.length>max)throw Error(`${label}: enter ${min}–${max} characters.`);return v};
const choice=(value:any,options:Row,fallback:string,label:string)=>{if(value===undefined||value==='')return fallback;if(typeof value!=='string'||!Object.hasOwn(options,value))throw Error(`Choose a valid ${label}.`);return value};
export function normalizeProjectCard(input:Row){
 const structured=input.schemaVersion===2;
 const artifact=text(input.artifact,'Artifact link',1000);
 if(artifact){let u:URL;try{u=new URL(artifact)}catch{throw Error('Use an HTTPS artifact link.')}if(u.protocol!=='https:'||u.username||u.password)throw Error('Use an HTTPS artifact link without embedded credentials.');}
 const projectType=choice(input.projectType,projectTypes,'unspecified','project type'),ownership=choice(input.ownership,ownershipLevels,'unspecified','ownership level');
 if(structured&&(projectType==='unspecified'||ownership==='unspecified'))throw Error('Choose the project type and your level of ownership.');
 const startedOn=text(input.startedOn,'Start month',7),endedOn=text(input.endedOn,'End month',7),month=/^\d{4}-(0[1-9]|1[0-2])$/;
 if(startedOn&&(!month.test(startedOn)||startedOn>new Date().toISOString().slice(0,7))||endedOn&&(!month.test(endedOn)||!startedOn||endedOn<startedOn||endedOn>new Date().toISOString().slice(0,7)))throw Error('Use valid project months, with the end on or after the start and no future dates.');
 const artifactType=choice(input.artifactType,artifactTypes,artifact?'public':'none','artifact type');
 if(artifact&&artifactType==='none')throw Error('Describe the artifact type for the link you added.');
 if(projectType==='simulation'&&artifactType!=='none'&&artifactType!=='simulation')throw Error('Label a simulation artifact as simulation / practice.');
 if(structured&&input.permissionConfirmed!==true)throw Error('Confirm that you have permission to share this example.');
 return {schemaVersion:structured?2:1,title:text(input.title,'Title',120,1),skills:text(input.skills,'Skills',500,1),problem:text(input.problem,'Problem',1500,20),contribution:text(input.contribution,'Personal contribution',2000,20),outcome:text(input.outcome,'Outcome',1500,20),projectType,context:text(input.context,'Project context',200),startedOn,endedOn,scope:text(input.scope,'Project scope',1200,structured?20:0),ownership,decision:text(input.decision,'Decision and trade-offs',1500,structured?20:0),measurement:text(input.measurement,'Measurement method',1200,structured?20:0),limitations:text(input.limitations,'Limitations',1200,structured?10:0),toolsUsed:text(input.toolsUsed,'Tools and assistance',600),artifact,artifactType,evidenceNote:text(input.evidenceNote,'Evidence description',800)};
}
export function projectGaps(card:Row):string[]{return [!card.scope&&'Project scope',(!card.projectType||card.projectType==='unspecified')&&'Project type',(!card.ownership||card.ownership==='unspecified')&&'Ownership',!card.decision&&'Decisions',!card.measurement&&'Measurement',!card.limitations&&'Limitations'].filter(Boolean) as string[];}
export function normalizeEvidenceCheck(input:Row){
 if(typeof input.kind!=='string'||!Object.hasOwn(evidenceChecks,input.kind))throw Error('Choose a specific evidence check.');
 if(input.kind==='contribution'&&input.permissionConfirmed!==true)throw Error('Confirm candidate permission for the reference check.');
 if(input.attested!==true)throw Error('Confirm that you personally completed the check described.');
 return {kind:input.kind,scope:text(input.scope,'What you checked',1200,20),source:text(input.source,'Source used',800,20),limits:text(input.limits,'What remains unconfirmed',800,10)};
}
export function checkLabel(kind:string){return evidenceChecks[kind as keyof typeof evidenceChecks]?.label||'Evidence check';}
// Keep the durable account identifier in storage, separate from candidate-facing attribution.
export function evidenceChecksForView(checks:Row[]){return checks.map(({reviewerId,...check})=>check);}
export function safeArtifact(value:unknown):string{try{const url=new URL(String(value));return url.protocol==='https:'&&!url.username&&!url.password?url.href:''}catch{return ''}}

import {normalizeSkill,splitSkills} from './career';
const phrases:Record<string,string[]>={
 javascript:['javascript','js'],typescript:['typescript','ts'],react:['react','reactjs','react.js'],
 'node js':['node.js','nodejs','node js'],'amazon web services':['aws','amazon web services'],
 'google cloud platform':['gcp','google cloud platform'],azure:['azure','microsoft azure'],
 'program management':['program management','program mgmt'],'project management':['project management','project mgmt'],
 'stakeholder management':['stakeholder management','stakeholder mgmt'],
 'risk management':['risk management','risk mgmt','risk mitigation','risk assessment'],
 analytics:['analytics','data analytics','data analysis'],
 'continuous integration continuous delivery':['ci/cd','ci cd','continuous integration continuous delivery'],
};
const plain=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[./_–—-]+/g,' ').replace(/\s+/g,' ').trim();
export function uniqueRequirements(skills:string[]){const seen=new Set<string>();return skills.filter(s=>{const key=normalizeSkill(s);if(!key||seen.has(key))return false;seen.add(key);return true})}
export function findSkillEvidence(candidate:any,required:string,useExperience=true){
 const key=normalizeSkill(required);const listed=splitSkills(candidate.skills||'').find(s=>normalizeSkill(s)===key);
 if(listed)return {skill:required,source:'Listed skill',quote:listed};
 if(!useExperience)return null;
 const options=[required,key,...(phrases[key]||[])].map(plain);
 const sentences=String(candidate.experienceSummary||'').split(/\n|(?<=[.!?])\s+/).map(s=>s.trim()).filter(Boolean);
 for(const sentence of sentences){
  // Conservative lexical evidence only: aspirations, negations and training-only mentions do not qualify.
  if(/\b(no|not|never|without|lack|lacks|lacking|learning|studying|beginner|aspiring|course|courses)\b|\b(want|hope|plan|interested)\s+to\b/i.test(sentence))continue;
  const text=' '+plain(sentence)+' ';
  if(options.some(v=>{const escaped=v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp('(^|[^a-z0-9+])'+escaped+'(?=$|[^a-z0-9+])','i').test(text)}))return {skill:required,source:'Experience mention',quote:sentence};
 }
 return null;
}

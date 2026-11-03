import {splitSkills} from './career';
import {workValues} from './work-preferences';
export {workValues} from './work-preferences';
export const defaultRanking={skills:70,experience:20,availability:10,values:0,desirable:0,useExperienceEvidence:true,minYears:0,startBy:'',desiredSkills:'',valuesWanted:[] as string[]};
export type RankingPreferences=typeof defaultRanking;
export function rankingPreferences(input:any):RankingPreferences{
 const p={...defaultRanking,...input};
 for(const k of ['skills','experience','availability','values','desirable','minYears'])if(typeof p[k]!=='number'||!Number.isFinite(p[k])||p[k]<0||p[k]>(k==='minYears'?60:100))throw Error('Choose valid weights and experience requirements.');
 if(!['skills','experience','availability','desirable'].some(k=>p[k]>0))throw Error('Give at least one scored criterion a weight. Working preferences are conversation topics.');
 if(typeof p.startBy!=='string'||(p.startBy&&(!/^\d{4}-\d{2}-\d{2}$/.test(p.startBy)||!Number.isFinite(Date.parse(p.startBy))||new Date(p.startBy).toISOString().slice(0,10)!==p.startBy)))throw Error('Choose a valid start date.');
 if(typeof p.desiredSkills!=='string'||p.desiredSkills.length>1000)throw Error('Keep desirable skills under 1,000 characters.');
 if(!Array.isArray(p.valuesWanted)||p.valuesWanted.length>10||p.valuesWanted.some((x:any)=>!workValues.includes(x)))throw Error('Choose work-related values from the list.');
 if(typeof p.useExperienceEvidence!=='boolean')throw Error('Choose whether to include experience evidence.');
 // Accept legacy fields for compatibility, but never restore a work-preference weight.
 return {useExperienceEvidence:p.useExperienceEvidence,skills:p.skills,experience:p.experience,availability:p.availability,values:0,desirable:p.desirable,minYears:p.minYears,startBy:p.startBy,desiredSkills:p.desiredSkills,valuesWanted:[]};
}
import {findSkillEvidence,uniqueRequirements} from './fit-evidence';
export function rankCandidate(candidate:any,job:any,p:RankingPreferences){
 const requirements=uniqueRequirements(job.skills||[]),desired=uniqueRequirements(splitSkills(p.desiredSkills));
 const skillEvidence=requirements.map(s=>findSkillEvidence(candidate,s,p.useExperienceEvidence)).filter((e):e is NonNullable<typeof e>=>Boolean(e));
 const matched=skillEvidence.map(e=>e.skill),nice=desired.filter(s=>findSkillEvidence(candidate,s,p.useExperienceEvidence));
 const skillKnown=Boolean(candidate.skills?.trim()||(p.useExperienceEvidence&&candidate.experienceSummary?.trim()));
 const metrics=[
 {key:'skills',label:'Required skills',weight:p.skills,active:requirements.length>0,score:skillKnown?Math.round(matched.length/requirements.length*100):null,reason:`${matched.length} of ${requirements.length} required skills supported`,evidence:matched.join(', ')},
 {key:'experience',label:'Relevant experience',weight:p.experience,active:p.minYears>0,score:candidate.experienceYears==null?null:Math.round(Math.min(1,candidate.experienceYears/p.minYears)*100),reason:candidate.experienceYears==null?'Not provided':`${candidate.experienceYears} self-reported relevant years; target ${p.minYears}+`,evidence:candidate.experienceSummary||''},
 {key:'availability',label:'Start-date alignment',weight:p.availability,active:Boolean(p.startBy),score:!candidate.availableFrom?null:candidate.availableFrom<=p.startBy?100:0,reason:candidate.availableFrom?`Available ${candidate.availableFrom}; preferred by ${p.startBy}`:'Not provided',evidence:''},
 {key:'desirable',label:'Desirable skills',weight:p.desirable,active:desired.length>0,score:skillKnown?Math.round(nice.length/desired.length*100):null,reason:`${nice.length} of ${desired.length} desirable skills supported`,evidence:nice.join(', ')},
 ].filter(m=>m.active&&m.weight>0);
 const known=metrics.filter(m=>m.score!==null),total=metrics.reduce((n,m)=>n+m.weight,0),observed=known.reduce((n,m)=>n+m.weight,0);
 const missingSkills=requirements.filter(s=>!matched.includes(s));
 const strengths=metrics.filter(m=>m.score!==null&&m.score>=80).map(m=>m.reason);
 const gaps=metrics.filter(m=>m.score!==null&&m.score<80).map(m=>m.reason);
 const questions=missingSkills.slice(0,2).map(s=>`What professional example can you share of ${s}?`);
 if(p.minYears&&candidate.experienceYears==null)questions.push('How many years of relevant experience would you bring to this role?');
 if(p.startBy&&(!candidate.availableFrom||candidate.availableFrom>p.startBy))questions.push(`What start date could you commit to? The preferred date is ${p.startBy}.`);
 return {candidate,score:observed?Math.round(known.reduce((n,m)=>n+m.weight*m.score!,0)/observed):null,coverage:total?Math.round(observed/total*100):0,metrics,missingSkills,skillEvidence,strengths,gaps,questions,needsReview:observed<total};
}

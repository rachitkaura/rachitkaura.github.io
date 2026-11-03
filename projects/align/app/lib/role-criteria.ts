import {splitSkills} from './career';
import {uniqueRequirements} from './fit-evidence';
import type {RankingPreferences} from './ranking';

export type RoleCriteria={trainable:string[];transferable:string;minYears:number};
export function roleCriteria(job:any){
 const required=uniqueRequirements(Array.isArray(job?.skills)?job.skills:job?.requiredSkills||job?.tags||[]);
 const c=job?.criteria||{};
 return {required,trainable:uniqueRequirements(Array.isArray(c.trainable)?c.trainable:splitSkills(String(c.trainable||''))),transferable:String(c.transferable||''),minYears:Number.isFinite(c.minYears)?Math.max(0,c.minYears):0,startBy:job?.startBy||''};
}
// One role-owned rubric for candidates and employers. Work-style labels never affect a score.
export function roleRanking(job:any):RankingPreferences{
 const c=roleCriteria(job);
 return {skills:70,experience:20,availability:10,values:0,desirable:0,useExperienceEvidence:true,minYears:c.minYears,startBy:c.startBy,desiredSkills:'',valuesWanted:[]};
}
export function roleReady(job:any){return Boolean(job?.title?.trim()&&job?.about?.trim()&&job?.location?.trim()&&roleCriteria(job).required.length&&job.salary>0&&job.max>=job.salary&&['Remote','Hybrid','On-site'].includes(job.mode));}

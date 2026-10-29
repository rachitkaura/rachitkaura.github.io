import type {Item,Profile} from '../data';
import {skillFit} from './career';

export type Preferences={salaryMin:number;workModes:string[];location:string;travelMax:number;availableFrom:string;hideConflicts:boolean;verifiedOnly:boolean};
export const defaultPreferences:Preferences={salaryMin:0,workModes:[],location:'',travelMax:100,availableFrom:'',hideConflicts:false,verifiedOnly:false};
export type Privacy={discoverable:boolean;hiddenCompanies:string[];hiddenDomains:string[];contactVisibility:'never'|'matched'|'interested'};
export const defaultPrivacy:Privacy={discoverable:false,hiddenCompanies:[],hiddenDomains:[],contactVisibility:'matched'};
export function preferenceFit(p:Preferences,job:any){
  const conflicts:string[]=[],unknown:string[]=[];
  if(p.salaryMin&&job.max*1000<p.salaryMin)conflicts.push('Salary ceiling is below your minimum');
  if(p.workModes.length&&!p.workModes.includes(job.mode))conflicts.push('Work arrangement differs');
  if(p.location&&job.mode!=='Remote'&&!job.location.toLowerCase().includes(p.location.toLowerCase()))conflicts.push('Location differs');
  if(job.travelPercent==null&&p.travelMax<100)unknown.push('Travel not specified');
  else if(job.travelPercent>p.travelMax)conflicts.push('Travel exceeds your limit');
  if(p.availableFrom&&job.startBy&&p.availableFrom>job.startBy)conflicts.push('Start date is before your availability');
  else if(p.availableFrom&&!job.startBy)unknown.push('Start date not specified');
  return {conflicts,unknown};
}
export function blocked(privacy:Privacy,company:{id:string;domain:string}){
  return privacy.hiddenCompanies.includes(company.id)||privacy.hiddenDomains.map(x=>x.toLowerCase()).includes(company.domain.toLowerCase());
}
export function asItem(job:any):Item{return {id:job.id,name:job.companyName||job.name||'Company',title:job.title,location:job.location||'',mode:job.mode||'Remote',salary:job.salary||0,max:job.max||0,tags:job.skills||[],requiredSkills:job.skills||[],about:job.about||'',perks:[],color:'#d5ddd3',symbol:'◒',interested:false};}
export function coachQuestions(profile:Profile,role:Item){const fit=skillFit(profile,role);return [
  {id:'intro',title:`Why this ${role.title} role?`,prompt:`Connect your experience to the work at ${role.name}. What would you bring, and what do you want to learn?`,kind:'motivation'},
  {id:'evidence',title:`Show your ${fit.matched[0]?.required||role.tags[0]||'relevant'} experience.`,prompt:'Describe a specific situation, your responsibility, the actions you personally took, and the outcome.',kind:'star'},
  {id:'challenge',title:'Tell me about a difficult tradeoff.',prompt:`Use an example relevant to ${role.title}. What alternatives did you consider, who did you involve, and what happened?`,kind:'star'},
  {id:'gap',title:fit.missing[0]?`How would you approach ${fit.missing[0]}?`:'What would your first 30 days look like?',prompt:fit.missing[0]?'Be honest about your current level. Explain transferable experience and how you would close the gap.':'Explain what you would learn, whom you would meet, and how you would define an early success.',kind:'learning'},
];}
export function coachFeedback(answer:string,kind:string){
  const words=answer.trim().split(/\s+/).filter(Boolean).length;
  const checks=[{label:'Specific context',ok:/\b(project|team|customer|client|launch|deadline|situation|when|while|at my|during)\b/i.test(answer)},
    {label:'Your actions',ok:/\bI\s+(?:\w+\s+){0,2}(led|built|created|managed|decided|designed|coordinated|tested|analy[sz]ed|changed|worked|learned|would|will|prioriti[sz]ed|implemented|resolved|delivered)\b/i.test(answer)},
    {label:kind==='learning'?'Concrete learning steps':'Outcome or reflection',ok:kind==='learning'?/\b(practi[cs]e|course|project|mentor|feedback|learn|review|study|build|test)\b/i.test(answer):/\b(result|outcome|learned|improved|reduced|increased|delivered|saved|achieved|feedback|measured|because)\b|\d+\s*(%|days|weeks|hours|users|customers)/i.test(answer)},
    {label:'Enough detail to discuss',ok:words>=65&&words<=250}];
  return {words,checks,tips:checks.filter(c=>!c.ok).map(c=>c.label==='Specific context'?'Name a real project and explain the challenge.':c.label==='Your actions'?'Say what you personally did and why you chose that approach.':c.label==='Enough detail to discuss'?(words<65?'Add detail: aim for roughly 65–250 words, then practise aloud.':'Tighten the answer: aim for roughly 65–250 words.'):'Add the outcome or what you learned. Use numbers only when you can substantiate them.')};
}
export function skillPlan(skill:string,role:Item){return {skill,
  learn:`Review the core concepts of ${skill} and how this team uses it. Identify what you already know before choosing a learning resource.`,
  project:`Build a small ${skill} case study related to ${role.title}: define a problem, explain your approach, and document the outcome.`,
  evidence:`Review your past work for an example of ${skill}. If you have evidence, add it to your profile in your own words; otherwise track it as a learning goal.`,
  discuss:`Practise explaining your current ${skill} level honestly, your transferable experience, and your next learning step.`};}
export function calendarFile(interview:any,title:string){
  const stamp=(v:string)=>new Date(v).toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
  const escape=(v:string)=>v.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Align//Interview//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${interview.id}@align`,`DTSTAMP:${stamp(new Date().toISOString())}`,`DTSTART:${stamp(interview.startsAt)}`,`DTEND:${stamp(interview.endsAt)}`,`SUMMARY:${escape(title)}`,`DESCRIPTION:${escape(interview.notes||'Interview booked in Align.')}`,'STATUS:CONFIRMED','BEGIN:VALARM','TRIGGER:-PT15M','ACTION:DISPLAY','DESCRIPTION:Align interview in 15 minutes','END:VALARM','END:VEVENT','END:VCALENDAR'];
  // RFC 5545 folding uses octets, not JavaScript string length.
  return lines.flatMap(line=>{const result:string[]=[];let part='',size=0;for(const c of line){const n=new TextEncoder().encode(c).length;if(size+n>73){result.push(part);part=' ';size=1}part+=c;size+=n}result.push(part);return result}).join('\r\n')+'\r\n';
}

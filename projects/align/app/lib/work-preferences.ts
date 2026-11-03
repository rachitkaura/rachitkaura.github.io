// Keep the stored values stable so existing profile selections survive label changes.
export const workPreferenceGroups=[
 {title:'Teamwork & communication',options:[
  {value:'Collaboration',label:'Collaboration',description:'Solve problems and make plans with teammates.'},
  {value:'Documentation',label:'Clear written decisions',description:'Keep decisions and next steps easy to find.'},
  {value:'Feedback',label:'Regular feedback',description:'Get useful, specific feedback while work is in progress.'},
  {value:'Async communication',label:'Flexible communication',description:'Use written updates so people can respond without another meeting.'},
 ]},
 {title:'Independence & responsibility',options:[
  {value:'Autonomy',label:'Autonomy',description:'Have clear goals and room to choose how to reach them.'},
  {value:'Ownership',label:'Ownership',description:'Follow work from the first decision through to the result.'},
  {value:'Adaptability',label:'Changing priorities',description:'Adjust plans as new information or priorities emerge.'},
 ]},
 {title:'Impact & growth',options:[
  {value:'Customer focus',label:'Customer connection',description:'Understand the people using your work and learn from them.'},
  {value:'Quality',label:'Time for quality',description:'Have time to check the details and make work dependable.'},
  {value:'Learning',label:'Learning & growth',description:'Build new skills with support, practice and development time.'},
 ]},
];
export const workPreferenceOptions=workPreferenceGroups.flatMap(group=>group.options);
export const workValues=workPreferenceOptions.map(option=>option.value);
export function selectedWorkPreferences(values:unknown){
 const chosen=new Set(Array.isArray(values)?values:[]);
 return workPreferenceOptions.filter(option=>chosen.has(option.value));
}
export const workPreferencesScoringNote='Working preferences do not affect profile-fit scores, candidate order or discovery.';
export const profileFitExplanation='Profile fit uses the role’s required skills, relevant experience and preferred start date. Missing details are left out of the score.';

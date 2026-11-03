import type {WorkspaceMode} from './workspace-navigation';
export type DemoStepId='swipe'|'fit'|'review'|'proof'|'criteria'|'rank'|'evidence'|'nextstep';
export type DemoGuideAction=DemoStepId|'start';
export type DemoNavigation={tab:string;sequence:number;jobId?:string;guideStep?:DemoGuideAction};
export type DemoGuideStep={id:DemoStepId;title:string;task:string;help:string};
export const demoSteps:Record<WorkspaceMode,DemoGuideStep[]>={
 candidate:[
  {id:'swipe',title:'Swipe to connect',task:'Swipe',help:'Pass privately, or like a role. Mutual interest opens a conversation in Inbox.'},
  {id:'fit',title:'Check your fit',task:'Swipe',help:'View the listed skills and gaps for the sample Forma role.'},
  {id:'nextstep',title:'Agree a next step',task:'Messages',help:'Open a sample mutual conversation. Choose who acts next and when an update is expected.'},
  {id:'proof',title:'Share your work',task:'Work proof',help:'Read a work example, select an application, and share it.'}
 ],
 employer:[
  {id:'swipe',title:'Swipe to connect',task:'Swipe',help:'Choose a role and like a candidate. A mutual like opens the same Inbox used by your hiring team.'},
  {id:'criteria',title:'Review hiring criteria',task:'Hiring',help:'Open the short role editor. Essentials, trainable gaps, and the interview process are shared with candidates.'},
  {id:'rank',title:'Compare candidates',task:'Candidate ranking',help:'Open Alex Morgan’s score and the supporting evidence.'},
  {id:'nextstep',title:'Keep the conversation moving',task:'Messages',help:'Open a mutual match and agree a clear next action with an update date.'}
 ]
};
// Focus without native auto-scrolling, then perform one deliberate viewport move.
export function revealDemoTarget(target:HTMLElement|null){
 if(!target)return;
 target.querySelector<HTMLDetailsElement>('details[data-demo-expand]')?.setAttribute('open','');
 target.focus({preventScroll:true});
 target.scrollIntoView({block:'start',behavior:'auto'});
}

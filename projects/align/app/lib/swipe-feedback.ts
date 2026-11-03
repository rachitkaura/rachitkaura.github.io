import {SWIPE_UNDO_MS,type PendingInterest} from './interest-outbox';

export function swipeFeedback(entries:PendingInterest[],now:number){
 const pending=entries.filter(entry=>entry.state!=='failed');
 const attention=entries.filter(entry=>entry.state==='failed'||Boolean(entry.error));
 // Live responses arrive newest first; demo records arrive oldest first.
 const newest=(list:PendingInterest[])=>list.reduce<PendingInterest|undefined>((latest,entry)=>!latest||entry.dueAt>latest.dueAt?entry:latest,undefined);
 const latest=newest(pending)||newest(attention);
 const milliseconds=latest?Math.max(0,latest.dueAt-now):0;
 const remaining=Math.ceil(milliseconds/1000);
 const canUndo=Boolean(latest?.state==='queued'&&milliseconds>0);
 const status=!latest?'':latest.state==='failed'?'Needs attention':latest.state==='saving'?'Saving swipe…':canUndo?`Sending in ${remaining}s`:'Sending…';
 return {latest,pendingCount:pending.length,attentionCount:attention.length,remaining,canUndo,status,progress:canUndo?Math.min(100,milliseconds/SWIPE_UNDO_MS*100):0};
}

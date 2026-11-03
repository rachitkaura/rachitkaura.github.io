'use client';
import {useId} from 'react';
import {workPreferenceGroups,selectedWorkPreferences,workPreferencesScoringNote,profileFitExplanation} from '../lib/work-preferences';

export function WorkPreferencesEditor({values,onChange}:{values:unknown;onChange:(values:string[])=>void}){
 const description=useId(),selected=selectedWorkPreferences(values),stored=selected.map(option=>option.value);
 return <details className="ux-details work-preferences-editor">
  <summary>How you like to work<small>Optional · {selected.length?`${selected.length} selected`:'choose what matters to you'}</small></summary>
  <p id={description}>Which conditions help you do your best work? Choose any that matter to you, or leave this blank to discuss later.</p>
  <div className="work-preferences-note"><b>Conversation topics</b><p>{workPreferencesScoringNote} Employers who can view your profile can see your selections.</p></div>
  {workPreferenceGroups.map(group=><fieldset className="work-preferences-group" key={group.title} aria-describedby={description}>
   <legend>{group.title}</legend>
   <div className="work-preferences-options">{group.options.map(option=><label className={'work-preference-option'+(stored.includes(option.value)?' is-selected':'')} key={option.value}>
    <input type="checkbox" checked={stored.includes(option.value)} onChange={e=>onChange(e.target.checked?[...stored,option.value]:stored.filter(value=>value!==option.value))}/>
    <span><b>{option.label}</b><small>{option.description}</small></span>
   </label>)}</div>
  </fieldset>)}
  <p className="work-preferences-footnote">Leaving this blank has no effect on your score or who can discover you. Change your choices whenever your needs change.</p>
 </details>;
}

export function WorkPreferencesSummary({values,own=false}:{values:unknown;own?:boolean}){
 const selected=selectedWorkPreferences(values);
 return <details className="ux-details work-preferences-summary">
  <summary>{own?'How you like to work':'How they like to work'}<small>Conversation topics · {selected.length?`${selected.length} selected`:'no preferences added'}</small></summary>
  <p>{workPreferencesScoringNote} {own?'Your selections help start a conversation about the team’s day-to-day work.':'Use these self-reported preferences to discuss the team’s day-to-day work.'}</p>
  {selected.length?<dl>{selected.map(option=><div key={option.value}><dt>{option.label}</dt><dd>{option.description}</dd></div>)}</dl>:<p>{own?'You can add preferences in Edit profile & privacy, or discuss them later.':'The candidate has left this optional section blank. Ask what helps them do their best work.'}</p>}
 </details>;
}

export function ProfileFitExplanation(){return <p className="work-preferences-scoring-note">{profileFitExplanation} {workPreferencesScoringNote}</p>}

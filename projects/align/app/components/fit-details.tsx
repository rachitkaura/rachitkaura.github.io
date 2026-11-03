'use client';
import {Check,Minus,ArrowRight,FileText} from 'lucide-react';
import {rankCandidate} from '../lib/ranking';
import {roleCriteria,roleRanking} from '../lib/role-criteria';
import type {Item,Profile} from '../data';
import {ProfileFitExplanation} from './work-preferences';

function displayDay(value:string){
 const date=new Date(value+'T12:00:00Z');
 return Number.isFinite(date.getTime())?date.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}):value;
}

export function MatchBreakdown({profile,role,onEdit,onPrepare}:{profile:Profile;role:Item;onEdit:()=>void;onPrepare:()=>void}){
 const criteria=roleCriteria(role),fit=rankCandidate(profile,{...role,skills:criteria.required},roleRanking(role));
 const matched=fit.skillEvidence.map(e=>e.skill),hasDetails=fit.metrics.some(m=>m.key!=='skills');
 const quotes=new Map<string,string[]>();
 for(const evidence of fit.skillEvidence)if(evidence.source==='Experience mention'){
  quotes.set(evidence.quote,[...(quotes.get(evidence.quote)||[]),evidence.skill]);
 }
 return <div className="match-breakdown fit-details">
  <header className="fit-details-heading">
   <span className="eyebrow">ROLE FIT</span>
   <h2>How you match</h2>
   <p className="fit-role-title">{role.title}<span>{role.name}</span></p>
  </header>

  <section className="fit-overview" aria-label="Your profile fit">
   <div className="fit-overview-score">{fit.score===null?<strong className="fit-score-empty">Not scored yet</strong>:<><strong>{fit.score}</strong><span>/100</span></>}<small>Profile fit</small></div>
   <div className="fit-overview-summary"><b>{criteria.required.length?`${matched.length} of ${criteria.required.length} required skills shown`:'No required skills listed yet'}</b><p>Based on the details in your profile.</p></div>
  </section>
  {fit.needsReview&&<p className="fit-incomplete" role="note">Some profile details are missing. Adding them may change your score.</p>}

  {criteria.required.length>0&&<>
   <section className="fit-skill-group" aria-label="Matching skills">
    <h3>What matches <span>{matched.length}</span></h3>
    {matched.length?<ul className="fit-skill-chips fit-skills-shown">{matched.map(skill=><li key={skill}><Check size={16} aria-hidden="true"/><span>{skill}</span></li>)}</ul>:<p>No matching skills found in your profile yet.</p>}
   </section>
   {fit.missingSkills.length>0&&<section className="fit-skill-group" aria-label="Skills not shown in your profile">
    <h3>Not shown in your profile <span>{fit.missingSkills.length}</span></h3>
    <ul className="fit-skill-chips">{fit.missingSkills.map(skill=><li key={skill}><Minus size={16} aria-hidden="true"/><span>{skill}</span></li>)}</ul>
    <p className="fit-section-hint">Add any relevant skills or experience you haven’t included.</p>
   </section>}
  </>}

  {hasDetails&&<section className="fit-other-details" aria-label="Experience and start date"><h3>Other role requirements</h3><dl>
   {criteria.minYears>0&&<div><dt>Relevant experience</dt><dd>{profile.experienceYears==null?'Not added yet':`${profile.experienceYears} ${profile.experienceYears===1?'year':'years'} listed`}<small>Role asks for {criteria.minYears}+ years</small></dd></div>}
   {criteria.startBy&&<div><dt>Start date</dt><dd>{profile.availableFrom?`Available ${displayDay(profile.availableFrom)}`:'Not added yet'}<small>Preferred by {displayDay(criteria.startBy)}</small></dd></div>}
  </dl></section>}

  <div className="fit-next-actions"><button className="primary-btn" onClick={onEdit}>{fit.score===null?'Add profile details':'Update profile'}<ArrowRight size={16}/></button><button className="text-link" onClick={onPrepare}><FileText size={16}/>Prepare résumé & cover letter</button><small>Optional document drafts stay private.</small></div>

  <div className="fit-more-details">
   {quotes.size>0&&<details className="ux-details"><summary>See the experience behind your matches</summary><p>From your shared work summary:</p>{Array.from(quotes,([quote,skills])=><div className="fit-quote" key={quote}><b>{skills.join(', ')}</b><blockquote>{quote}</blockquote></div>)}</details>}
   {(criteria.trainable.length>0||criteria.transferable)&&<details className="ux-details"><summary>What you can learn or bring from other work</summary>{criteria.trainable.length>0&&<><h4>The company can teach</h4><p>{criteria.trainable.join(', ')}</p></>}{criteria.transferable&&<><h4>Other experience they accept</h4><p>{criteria.transferable}</p></>}</details>}
   <details className="ux-details"><summary>How this score works</summary><ProfileFitExplanation/><p>Skills count most. You and the hiring team see the same requirements. Private document drafts aren’t used in this comparison.</p></details>
  </div>
 </div>;
}

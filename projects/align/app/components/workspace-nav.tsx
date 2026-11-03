'use client';
import type {MouseEvent} from 'react';
import {contextItems,routeHref,type WorkspaceMode} from '../lib/workspace-navigation';
export function TaskLinks({items,active,mode,onNavigate,label,className=''}:{items:string[][];active:string;mode:WorkspaceMode;onNavigate:(task:string)=>void;label:string;className?:string}){return <nav className={className} aria-label={label}>{items.map(([title,task])=><a key={task} href={routeHref('',{mode,task})} aria-current={active===task?'page':undefined} onClick={(e:MouseEvent<HTMLAnchorElement>)=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();onNavigate(task)}}>{title}</a>)}</nav>}
export function ContextNav({mode,task,onNavigate}:{mode:WorkspaceMode;task:string;onNavigate:(task:string)=>void}){const items=contextItems(mode,task);return items.length?<TaskLinks items={items} active={task} mode={mode} onNavigate={onNavigate} className="ux-context-nav" label="Section navigation"/>:null}

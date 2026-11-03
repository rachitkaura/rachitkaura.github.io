'use client';
import {createContext,useContext,useMemo,type ReactNode} from 'react';
import {createDemoStore} from './demo-store';
import type {Item} from '../data';

type Api={request:typeof fetch;isDemo:boolean;setDemoRole:(role:'candidate'|'employer')=>void;resetDemo:()=>void;getDemoCatalog?:()=>{jobs:Item[];candidates:Item[]}};
const live:Api={request:(input,init)=>globalThis.fetch(input,init),isDemo:false,setDemoRole:()=>{},resetDemo:()=>{}};
const Context=createContext<Api>(live);
export const useAppApi=()=>useContext(Context);
export function DemoProvider({children}:{children:ReactNode}){
 const api=useMemo(()=>{
  let storage:Storage|undefined;try{if(typeof window!=='undefined')storage=window.localStorage}catch{}
  const store=createDemoStore(storage);
  return {isDemo:true,request:store.request as typeof fetch,setDemoRole:store.setRole,resetDemo:store.reset,getDemoCatalog:store.catalog};
 },[]);
 return <Context.Provider value={api}>{children}</Context.Provider>;
}

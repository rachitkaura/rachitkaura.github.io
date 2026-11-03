import type {Metadata} from 'next';
import AlignApp from '../components/align-app';
import {DemoProvider} from '../lib/client-api';
export const metadata:Metadata={title:'Try Align — Interactive hiring demo',description:'Explore candidate and employer workspaces with sample data. Try skill matching, candidate ranking, review batches, application packs, messaging and scheduling without signing in.'};
export default function DemoPage(){return <DemoProvider><AlignApp/></DemoProvider>}

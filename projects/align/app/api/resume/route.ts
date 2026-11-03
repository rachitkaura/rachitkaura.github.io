import {env} from 'cloudflare:workers';
import {createDocuments} from '../../lib/document-server';
export async function POST(req:Request){return createDocuments(env.DB!,env.BUCKET!).POST(req)}
export async function GET(req:Request){return createDocuments(env.DB!,env.BUCKET!).GET(req)}

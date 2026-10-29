import {env} from 'cloudflare:workers';
import {createMarket} from '../../lib/live-server';
export async function GET(req:Request){return createMarket(env.DB!,fetch,{adminEmails:env.ALIGN_ADMIN_EMAILS}).GET(req)}
export async function POST(req:Request){return createMarket(env.DB!,fetch,{adminEmails:env.ALIGN_ADMIN_EMAILS}).POST(req)}

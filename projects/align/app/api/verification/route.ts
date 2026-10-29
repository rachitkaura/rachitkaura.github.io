import {env} from 'cloudflare:workers';
import {createVerification} from '../../lib/verification';
export async function GET(req:Request){return createVerification(env.DB!,env.BUCKET!,env.ALIGN_ADMIN_EMAILS).GET(req)}
export async function POST(req:Request){return createVerification(env.DB!,env.BUCKET!,env.ALIGN_ADMIN_EMAILS).POST(req)}

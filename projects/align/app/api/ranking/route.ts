import {env} from 'cloudflare:workers';
import {createRanking} from '../../lib/ranking-server';
export async function POST(req:Request){return createRanking(env.DB!,{adminEmails:env.ALIGN_ADMIN_EMAILS})(req)}

export async function GET(){return Response.json({engine:'builtin',externalAI:false},{headers:{'Cache-Control':'private, no-store'}})}

import {z} from 'zod';
export function isCommunityUrl(value:string):boolean {
 try {const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&u.hostname.includes('.')&&!/^(localhost|127\.|0\.|169\.254\.|10\.|192\.168\.)/i.test(u.hostname);}catch{return false;}
}
export const communityLinkSchema=z.object({label:z.string().trim().min(1).max(60),url:z.string().trim().max(2000).refine(isCommunityUrl,'Use a full HTTPS group link without a username or password')});
export const communityLinksSchema=z.array(communityLinkSchema).max(5,'Add up to five group links');
export type CommunityLink=z.infer<typeof communityLinkSchema>;
export function safeCommunityLinks(value:unknown):CommunityLink[]{const parsed=communityLinksSchema.safeParse(value);return parsed.success?parsed.data:[];}
export function communityProvider(url:string){try{const h=new URL(url).hostname.toLowerCase();return h==='chat.whatsapp.com'||h==='whatsapp.com'||h.endsWith('.whatsapp.com')?'WhatsApp':h==='t.me'||h==='telegram.me'?'Telegram':'Community';}catch{return 'Community';}}

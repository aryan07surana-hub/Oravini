import type {CommunityLink} from '@shared/webinarCommunity';
import {communityProvider,isCommunityUrl} from '@shared/webinarCommunity';
import {btn} from './ui';
export default function CommunityLinksEditor({links,onChange}:{links:CommunityLink[];onChange:(links:CommunityLink[])=>void}){
 const update=(i:number,key:keyof CommunityLink,value:string)=>onChange(links.map((row,n)=>n===i?{...row,[key]:value}:row));
 return <section id="community" className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4" data-testid="community-workflow-editor">
 <div><p className="text-xs uppercase tracking-widest text-[#d4b461] mb-2">Registration → Join community → Attend webinar</p><h2 className="text-lg font-semibold text-white">Optional: invite registrants to your group</h2><p className="mt-2 text-sm text-zinc-400">Choose whether to add this step. Set the group links registrants see after signup. Use WhatsApp, Telegram or any HTTPS community invite. This replaces email/SMS reminders. Nothing is sent automatically and nobody is added to a group.</p></div>
 <label className="flex items-center gap-3 text-sm text-zinc-300"><input type="checkbox" checked={links.length>0} onChange={e=>onChange(e.target.checked?[{label:'Join our group',url:''}]:[])} />Enable optional community step</label>
 {links.map((row,i)=><div key={i} className="grid sm:grid-cols-[1fr_1.4fr_auto] gap-3 rounded-lg border border-white/10 p-3">
 <label className="text-xs text-zinc-400">Button label<input data-testid={`community-label-${i}`} className="mt-1 w-full rounded-lg bg-black/30 border border-white/10 p-2 text-sm text-white" value={row.label} maxLength={60} onChange={e=>update(i,'label',e.target.value)} placeholder="Join our WhatsApp group"/></label>
 <label className="text-xs text-zinc-400">Group invite link<input data-testid={`community-url-${i}`} className="mt-1 w-full rounded-lg bg-black/30 border border-white/10 p-2 text-sm text-white" value={row.url} maxLength={2000} onChange={e=>update(i,'url',e.target.value)} placeholder="https://chat.whatsapp.com/…" aria-invalid={!!row.url&&!isCommunityUrl(row.url)}/><span className="block mt-1">{row.url&&!isCommunityUrl(row.url)?'Use a valid HTTPS group invite link.':communityProvider(row.url)}</span></label>
 <button type="button" className={btn('ghost','sm')} onClick={()=>onChange(links.filter((_,n)=>n!==i))} aria-label={`Remove group link ${i+1}`}>Remove</button></div>)}
 <button type="button" disabled={links.length>=5} className={btn('secondary','sm')} onClick={()=>onChange([...links,{label:'',url:''}])}>Add group link</button>
 {links.length===0&&<p className="text-xs text-zinc-500">No group links yet. Registrants will still see the webinar and calendar links. Add a group to make it their primary next step.</p>}
 <p className="text-xs text-zinc-500">The first group is the primary button. Up to five links. Check who can access each invite before sharing it.</p>
 </section>;
}

import {useEffect,useState} from "react";
import {TERM_PLANS,TERM_STEPS,TERM_CREDIT_BONUS,PLAN_RIGHTS_V2,monthlyCredits,termPrice} from "@shared/pricingV2";
import {MOST_POPULAR_PLAN,PLAN_PRESENTATION} from "@shared/pricingPresentationV2";
export {TERM_PLANS,TERM_STEPS,WORK_WITH_US_DRAFT,monthlyCredits,termPrice} from "@shared/pricingV2";
const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(n);
// Final prices are always visible. Checkout requires the verified server catalog and gate.
export type BillingStatus={checkoutOpen:boolean;fulfillmentOpen:boolean;freeEnrollmentEnabled?:boolean;offers:null|{planId:string;termMonths:number;amountCents:number;discountPercent:number;monthlyAllowance:number}[]};
export function displayOffer(status:BillingStatus|null,planId:string,price:number,months:number){
 const final=!!(status?.checkoutOpen&&status.offers);
 const o=final?status!.offers!.find(x=>x.planId===planId&&x.termMonths===months):null;
 if(o){const total=o.amountCents/100;return {final:true,discount:o.discountPercent,normal:price*months,total,monthly:Math.round(total/months*100)/100,credits:o.monthlyAllowance};}
 const d=termPrice(planId,price,months);return {final:false,...d,credits:null as number|null};
}
export const termLabel=(m:number)=>`${m} calendar ${m===1?"month":"months"}`;
export type PricingProps={showInternalNotes?:boolean;onSelectFree?:()=>Promise<void>;onPaymentVerified?:()=>Promise<void>;statusOverride?:BillingStatus};
export default function TermPricingPreview({showInternalNotes=false,onSelectFree,onPaymentVerified,statusOverride}:PricingProps={}){
 const initial=Number(new URLSearchParams(typeof location==="undefined"?"":location.search).get("term"))||1;
 const [status,setStatus]=useState<BillingStatus|null>(statusOverride??null);
 const [notice,setNotice]=useState<string|null>(null);
 const [busy,setBusy]=useState<string|null>(null);
 useEffect(()=>{if(statusOverride){setStatus(statusOverride);return;}fetch("/api/billing/v2/status").then(r=>r.ok?r.json():null).then(setStatus).catch(()=>setStatus(null));},[statusOverride]);
 // Return from Whop: the redirect proves nothing; the server re-verifies the payment.
 useEffect(()=>{const pid=new URLSearchParams(location.search).get("payment_id");if(!pid||!status?.fulfillmentOpen)return;
  fetch("/api/billing/v2/reconcile",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({paymentId:pid})})
   .then(async r=>{const j=await r.json().catch(()=>({}));const verified=j.result==="fulfilled"||j.result==="already-fulfilled";setNotice(verified?"Payment verified. Your prepaid plan is active.":j.result==="existing-term"?"You already have an active prepaid term. Your payment is kept for review; contact support.":"We could not verify this payment yet. If you were charged, contact support.");if(verified&&onPaymentVerified){try{await onPaymentVerified();}catch{setNotice("Payment verified. We could not open your dashboard. Reload this page to continue with your current plan.");}}})
   .catch(()=>setNotice("We could not verify this payment yet."));},[status?.fulfillmentOpen]);
 const final=!!(status?.checkoutOpen&&status.offers);
 async function selectFree(){if(!status?.freeEnrollmentEnabled||!onSelectFree)return;setBusy("free");setNotice(null);try{await onSelectFree();}catch{setNotice("We could not confirm the 100-credit Free plan. Your current account and plan are unchanged. Please try again.");}finally{setBusy(null);}}
 async function buy(planId:string,termMonths:number){setBusy(planId);setNotice(null);
  try{const r=await fetch("/api/billing/v2/checkout",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({planId,termMonths})});
   const j=await r.json().catch(()=>({}));
   if(r.status===401){location.href="/login";return;}
   if(r.ok&&typeof j.purchaseUrl==="string"&&/^https:\/\/([a-z0-9-]+\.)*whop\.com\//i.test(j.purchaseUrl)){location.href=j.purchaseUrl;return;}
   setNotice(j.message==="existing-term"?`You already have an active prepaid term until ${new Date(j.endsAt).toLocaleDateString()}. A new term can start after it ends.`:j.message==="legacy-subscriber-migration-required"?"Your current subscription stays as it is. Contact support to move to prepaid terms.":"Checkout is not available right now.");
  }catch{setNotice("Checkout is not available right now.");}finally{setBusy(null);}}
 const [selectedTerms,setSelectedTerms]=useState<Record<string,number>>(()=>Object.fromEntries(TERM_PLANS.map(plan=>[plan.id,(plan.terms as readonly number[]).includes(initial)?initial:1])));
 return <main className="pricing-shell"><style>{`
.pricing-shell *{box-sizing:border-box}
.pricing-shell{--blue:#2e78ef;--blue-deep:#1d4ba8;--ink:#101828;--sub:#5b6575;--faint:#8a94a3;--line:#e3e9f3;--tint:#eff5fd;background:#fff;color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,sans-serif;max-width:1248px;margin:0 auto;padding:68px 24px 56px;-webkit-font-smoothing:antialiased}
.eyebrow{display:inline-flex;align-items:center;gap:7px;color:var(--blue);background:var(--tint);border-radius:99px;padding:6px 12px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.eyebrow:before{content:"";width:6px;height:6px;border-radius:50%;background:var(--blue)}
.pricing-header{text-align:center;max-width:800px;margin:0 auto 36px}
.pricing-header h1{font-size:clamp(34px,4.6vw,56px);font-weight:800;letter-spacing:-.035em;line-height:1.05;margin:20px 0 20px;color:var(--ink)}
.pricing-header h1 span{color:var(--blue)}
.sub{color:var(--sub);font-size:15px;line-height:1.7;margin:0 auto;max-width:640px}
.preview-pill{display:inline-block;margin-top:22px;white-space:nowrap;padding:7px 14px;border:1px solid #d6e4f5;border-radius:99px;background:#fff;color:var(--blue);font-size:10px;letter-spacing:.09em;font-weight:700}
.per-plan-note{text-align:center;color:var(--sub);font-size:13px;margin:0 0 10px}
.offer-note{text-align:center;color:var(--sub);font-size:12px;line-height:1.7;margin:0 0 22px}
.cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;align-items:stretch}
.price-card{--accent:var(--blue);--border:var(--line);display:flex;flex-direction:column;position:relative;overflow:hidden;padding:30px 24px 24px;border:1px solid var(--border);border-radius:20px;background:#fff;min-width:0;box-shadow:0 1px 2px rgba(16,24,40,.04);transition:transform .3s cubic-bezier(.16,1,.3,1),box-shadow .3s,border-color .2s}
.price-card.plan-free{--accent:#5b6575}
.price-card.featured{--border:var(--blue);background:linear-gradient(180deg,#f3f8ff 0,#fff 46%);box-shadow:0 0 0 3px rgba(46,120,239,.12),0 24px 48px -24px rgba(46,120,239,.45)}
.price-card.featured:before{content:"";position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#88c0fd,var(--blue),#88c0fd)}
.popular{position:absolute;right:14px;top:16px;color:#fff;background:var(--blue);box-shadow:0 6px 16px -6px rgba(46,120,239,.7);border-radius:99px;padding:5px 10px;font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase}
.plan-tier{font-size:10px;font-weight:700;letter-spacing:.12em;color:var(--accent);margin:0 0 10px;text-transform:uppercase}
.price-card.unavailable{opacity:.7}
.price-card h2{font-size:22px;font-weight:700;line-height:1.2;letter-spacing:-.02em;margin:0 0 6px;color:var(--ink)}
.kind{font-size:13px;color:var(--sub);line-height:1.55;min-height:40px;margin:0 0 16px}
.plan-fit{background:#f7f9fd;border:1px solid var(--line);border-radius:14px;padding:14px 13px;min-height:140px;margin:0 0 18px}
.plan-fit strong{display:block;color:var(--ink);font-size:13px;line-height:1.5;margin-bottom:7px}
.plan-fit p{color:var(--sub);font-size:12px;line-height:1.65;margin:0}
.compare-note{color:var(--sub);border:1px solid #d6e4f5;background:var(--tint);border-radius:14px;padding:16px 20px;font-size:13px;line-height:1.75;margin:0 0 28px}
.compare-note strong{color:var(--blue-deep)}
.save{font-size:11px;font-weight:600;color:var(--blue);background:var(--tint);border:1px solid #d6e4f5;border-radius:99px;padding:5px 10px;display:inline-block;width:fit-content;min-height:26px;line-height:1.4}
.save.neutral{color:var(--faint);background:#f7f9fd;border-color:var(--line)}
.old{font-size:12px;color:var(--faint);margin:17px 0 7px;min-height:16px}
.total{font-size:40px;letter-spacing:-.04em;font-weight:800;line-height:1;margin:0 0 12px;color:var(--ink)}
.billing{font-size:12px;color:var(--sub);line-height:1.6;min-height:38px;margin:0}
.effective{font-size:13px;font-weight:600;margin:12px 0 16px;color:var(--blue)}
.slider-wrap{padding:13px;background:#f7f9fd;border:1px solid var(--line);border-radius:14px;margin:2px 0 16px}
.slider-label{display:flex;justify-content:space-between;gap:5px;color:var(--sub);font-size:11px;margin-bottom:10px}
.slider-label strong{color:var(--blue);font-size:11px;white-space:nowrap}
.term-slider{display:block;width:100%;height:22px;accent-color:var(--blue);cursor:pointer;margin:0}
.term-slider:focus-visible{outline:2px solid var(--blue);outline-offset:4px;border-radius:9px}
.slider-ticks{display:flex;justify-content:space-between;color:var(--faint);font-size:10px;margin-top:7px}
.slider-ticks .selected{color:var(--blue);font-weight:700}
.slider-help{color:var(--faint);font-size:11px;line-height:1.6;margin:9px 0 0}
.divider{height:1px;background:var(--line);margin:12px 0 18px}
.included{font-size:10px;font-weight:700;letter-spacing:.12em;color:var(--faint);margin:0 0 14px}
.feature{font-size:13px;line-height:1.6;margin:0 0 11px;color:#344054}
.check{color:var(--blue)}
.off{color:var(--faint)}
.cost{font-size:12px;line-height:1.6;color:var(--sub);border-top:1px solid var(--line);padding-top:13px;margin:8px 0 22px}
.buy{border:1px solid var(--line);background:#f4f7fc;color:var(--faint);border-radius:12px;padding:14px 8px;font-size:13px;font-weight:600;cursor:not-allowed;width:100%;margin-top:auto}
.buy.buy-live{background:var(--blue);color:#fff;border-color:var(--blue);font-weight:700;cursor:pointer;box-shadow:0 8px 20px -8px rgba(46,120,239,.7);transition:background .2s,transform .2s}
.buy.buy-live:hover{background:#2566d6}
.buy.buy-live:disabled{opacity:.6;cursor:wait}
.elite-card{position:relative;isolation:isolate;overflow:hidden;margin-top:24px;padding:52px 40px 38px;border-radius:24px;text-align:center;color:#fff;background:linear-gradient(135deg,#2e78ef 0,#1d4ba8 100%);box-shadow:0 28px 60px -28px rgba(46,120,239,.7)}
.elite-card:before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px);background-size:40px 40px;-webkit-mask-image:radial-gradient(ellipse at 50% 30%,#000 20%,transparent 75%);mask-image:radial-gradient(ellipse at 50% 30%,#000 20%,transparent 75%)}
.elite-badge{display:inline-block;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.35);color:#fff;border-radius:99px;padding:6px 13px;font-size:10px;letter-spacing:.1em;font-weight:700;text-transform:uppercase;margin-bottom:18px}
.elite-card h2{font-size:clamp(28px,4vw,44px);font-weight:800;letter-spacing:-.03em;line-height:1.1;margin:0 0 20px;color:#fff}
.elite-card h2 span{color:#cfe2ff}
.elite-price{font-size:42px;line-height:1;font-weight:800;color:#fff;margin:0 0 12px}
.elite-summary{font-size:14px;line-height:1.7;color:rgba(255,255,255,.8);margin:0 auto 25px}
.elite-list{display:flex;flex-wrap:wrap;justify-content:center;gap:12px 25px;font-size:13px;line-height:1.7;color:rgba(255,255,255,.9);margin-bottom:30px}
.elite-list span:before{content:"✓";color:#fff;margin-right:8px;font-weight:700}
.elite-link{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;background:#fff;color:var(--blue-deep);font-size:14px;font-weight:700;border-radius:99px;padding:15px 30px;box-shadow:0 10px 24px -10px rgba(0,0,0,.4);transition:transform .2s}
.elite-link:hover{transform:translateY(-1px)}
.elite-link:focus-visible{outline:3px solid #fff;outline-offset:5px}
.elite-note{max-width:650px;margin:20px auto 0;font-size:11px;line-height:1.8;color:rgba(255,255,255,.7)}
.bottom{border:1px solid #d6e4f5;background:var(--tint);border-radius:14px;padding:18px 20px;margin-top:26px;font-size:12px;line-height:1.75;color:var(--sub)}
.bottom strong{color:var(--blue-deep)}
.foot{font-size:11px;line-height:1.8;color:var(--faint);margin:17px 0 0}
@media(hover:hover){.price-card:hover{transform:translateY(-4px);border-color:rgba(46,120,239,.5);box-shadow:0 20px 44px -22px rgba(46,120,239,.4)}.price-card.featured:hover{box-shadow:0 0 0 3px rgba(46,120,239,.16),0 28px 56px -24px rgba(46,120,239,.55)}}
@media(max-width:1080px){.cards{grid-template-columns:repeat(2,minmax(0,1fr))}.price-card{padding:30px 26px 26px}}
@media(max-width:580px){.kind,.plan-fit{min-height:0}.pricing-shell{padding:42px 16px 30px}.pricing-header{margin-bottom:28px}.pricing-header h1{font-size:36px}.sub{font-size:13px}.cards{grid-template-columns:1fr;gap:16px}.price-card{padding:30px 24px 24px}.billing{min-height:0}.total{font-size:42px}.elite-card{padding:38px 22px 28px;border-radius:20px}.elite-card h2{font-size:29px;line-height:1.2}.elite-price{font-size:38px}.elite-list{flex-direction:column;gap:9px;text-align:left;margin:24px auto;max-width:265px}.elite-summary{font-size:12px}.elite-link{width:100%;font-size:13px;padding:15px 12px}.bottom{padding:15px}.offer-note{font-size:11px}}
@media(prefers-reduced-motion:reduce){.price-card{transition:none}.price-card:hover{transform:none}}
 `}</style>
 <header className="pricing-header"><div><span className="eyebrow">Simple pricing</span><h1>Start free.<br/><span>Scale when ready.</span></h1><p className="sub">Choose your plan and see the full prepaid total before checkout. Prepay for 1, 3, 6 or 12 calendar months with one payment. Nothing renews automatically. Monthly allowances stay monthly, even when you pay for a longer term.</p></div><span className="preview-pill">PREPAID · NO AUTO-RENEWAL</span></header>
 {notice&&<p className="offer-note" role="status">{notice}</p>}
 <p className="per-plan-note">Choose a prepaid term inside each plan. Each slider updates only its own price.</p>
 <p className="offer-note">One payment covers the whole term. Access ends automatically after the last calendar month. No auto-renewal.</p>{!final&&<p className="offer-note" role="status">Payments are temporarily unavailable. Your current account and plan are unchanged.</p>}
 <p className="compare-note"><strong>Pro or Growth + Video?</strong> Both include webinars. Pro gives you more video storage and streaming. Growth + Video gives you more base AI credits. AI tools use credits per action.</p>
 <section className="cards">{TERM_PLANS.map((plan,index)=>{const months=selectedTerms[plan.id];const offer=displayOffer(status,plan.id,plan.price,months);const available=(plan.terms as readonly number[]).includes(months);return <article key={plan.id} className={`price-card plan-${plan.id} ${plan.id===MOST_POPULAR_PLAN?"featured":""} ${!available?"unavailable":""}`}><p className="plan-tier">Tier {index+1}</p>{plan.id===MOST_POPULAR_PLAN&&<span className="popular">Most Popular</span>}<h2>{plan.name}</h2><p className="kind">{PLAN_PRESENTATION[plan.id].audience}</p><div className="plan-fit"><strong>{PLAN_PRESENTATION[plan.id].difference}</strong><p>{PLAN_PRESENTATION[plan.id].detail}</p></div><span className={`save ${!available||!offer.discount?"neutral":""}`}>{plan.id==="free"?"Free access":!available?"Not offered for this term":offer.discount?`Save ${money(offer.normal-offer.total)} (${offer.discount}%)`:"No term discount"}</span><p className="old">{available&&offer.discount?<><s>{money(offer.normal)}</s> normal total</>:plan.id==="free"?"No payment required":available?"Standard price, prepaid":"Available for 1 or 3 months"}</p><p className="total">{available?money(offer.total):"Not available"}</p><p className="billing">{plan.id==="free"?"Free plan, no prepaid term":available?`Total prepaid for ${termLabel(months)} · no auto-renewal`:"Choose a shorter term above"}</p><p className="effective">{plan.id==="free"?"100 credits / month, no rollover":available?`${money(offer.monthly)} / month effective`:"No price or discount applied"}</p>{plan.id!=="free"&&months>1&&<p className="slider-help">Includes +{TERM_CREDIT_BONUS[months as keyof typeof TERM_CREDIT_BONUS]} bonus credits each month.</p>}{plan.id!=="free"&&<div className="slider-wrap"><label htmlFor={`term-${plan.id}`} className="slider-label">Prepaid term <strong>{months} {months===1?"month":"months"}</strong></label><input id={`term-${plan.id}`} className="term-slider" type="range" min="0" max={plan.terms.length-1} step="1" value={(plan.terms as readonly number[]).indexOf(months)} aria-label={`${plan.name} prepaid term`} aria-valuetext={`${months} ${months===1?"month":"months"}, prepaid`} onChange={event=>setSelectedTerms(old=>({...old,[plan.id]:plan.terms[Number(event.target.value)]}))}/><div className="slider-ticks" aria-hidden="true">{plan.terms.map(n=><span key={n} className={months===n?"selected":""}>{n}mo</span>)}</div><p className="slider-help">Drag or use arrow keys.</p></div>}<div className="divider"/><p className="included">{plan.id==="free"?"FREE ALLOWANCE":"MONTHLY ALLOWANCES"}</p><p className="feature"><span className="check">✓</span> {offer.credits??monthlyCredits(plan.id,plan.credits,months)} app credits{plan.id==="free"?" / month, no rollover":" / month"}</p><p className="feature"><span className="check">✓</span> Core AI tools: ideas, scripts, carousels and Content Coach</p><p className={`feature ${!PLAN_RIGHTS_V2[plan.id].competitorDeep?"off":""}`}>{PLAN_RIGHTS_V2[plan.id].competitorDeep?"✓ Deep Competitor Analysis":"— Deep Competitor Analysis not included"}</p><p className={`feature ${!plan.webinars?"off":""}`}>{plan.webinars?"✓ Webinars included":"— Webinars not included"}</p><p className={`feature ${!plan.video?"off":""}`}>{plan.video?`✓ ${plan.video.storage} GB hosted-video storage`:"— Hosted-video storage not included"}</p><p className={`feature ${!plan.video?"off":""}`}>{plan.video?`✓ ${plan.video.stream} GB streaming / month`:"— Video streaming not included"}</p>{!final&&showInternalNotes&&<p className="cost">{plan.id==="growth_video"?"Optional draft AI cap, if selected: ":"Internal planning guard: "}{money(plan.ai)} maximum included AI provider cost per month. App credits and feature limits apply together. This cost guard is not a cash balance or a live feature.{plan.id==="growth_video"?" At the 1-month price, about 65% remains after AI and assumed payment fees only. Term discounts reduce this. Video, infrastructure, free users and team costs are extra. Not a 65% all-in margin guarantee.":""}</p>}{final&&plan.id!=="free"&&available?<button className="buy buy-live" disabled={busy!==null} onClick={()=>buy(plan.id,months)}>{busy===plan.id?"Opening Whop checkout…":`Prepay ${termLabel(months)}`}</button>:plan.id==="free"&&status?.freeEnrollmentEnabled?(onSelectFree?<button className="buy buy-live" disabled={busy!==null} onClick={selectFree}>{busy==="free"?"Confirming Free plan…":"Choose Free · 100 credits/month"}</button>:<a className="buy buy-live" style={{textAlign:"center",textDecoration:"none"}} href="/login?tab=register">Start Free</a>):<button className="buy" disabled>{plan.id==="free"?"Free plan":available?"Payments temporarily unavailable":"This term is not offered"}</button>}</article>})}</section>
 <section className="elite-card" aria-label="Work with us Tier 5"><span className="elite-badge">Tier 5 · Exclusive</span><h2>Elite · <span>Work With Us</span></h2><p className="elite-price">Apply</p><p className="elite-summary">Unlimited credits · Custom upfront pricing</p><div className="elite-list"><span>Work directly with the Oravini team</span><span>A done-with-you engagement</span></div><a className="elite-link" href="/brandverse">Learn About Tier 5 →</a><p className="elite-note">Not a self-serve subscription. Scope and upfront price are agreed before starting. Existing Elite accounts keep their current access.</p></section>
 <aside className="bottom"><strong>Prepaid, not a subscription.</strong> You pay once through Whop for the calendar months you choose. Access starts when your payment is verified and ends automatically after the last month. Nothing renews. Each month your credit allowance resets to the amount shown, including the term bonus. Unused monthly credits don't roll over. Purchased bonus credits are kept. Tax may apply at checkout.</aside>
 <p className="foot">Monthly allowances apply to each calendar month, not the whole prepaid term. Storage is occupied space; streaming is viewer-delivered data. Existing Elite and admin access are unchanged.</p>
 </main>;
  }

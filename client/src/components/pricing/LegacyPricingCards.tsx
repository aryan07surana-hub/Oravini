import {useState} from 'react';
import {TERM_STEPS,TERM_CREDIT_BONUS,proposedOffer} from '@shared/pricingV2';
import {LEGACY_PRICING_PLANS as PLANS} from '@shared/pricingFeaturesV2';
const GOLD='#d4b461',GOLD_BRIGHT='#f0c84b';
export default function LegacyPricingCards(){
 const initial=Number(new URLSearchParams(location.search).get('term'))||1;
 const [terms,setTerms]=useState<Record<string,number>>(()=>Object.fromEntries(PLANS.map(p=>[p.slug,p.slug==='free'?1:(TERM_STEPS as readonly number[]).includes(initial)?initial:1])));
 const confirming:string|null=null;
 return <><p style={{fontSize:12,color:GOLD,marginBottom:24}}>Staging review only. Checkout off. Term discounts are draft, not final.</p>
        {/* Plan grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, width: "100%", maxWidth: 1100, marginBottom: 24 }}>
          {PLANS.map(plan => {
            const months=terms[plan.slug] || 1; const offer=proposedOffer(plan.slug,months);
            

            return (
            <div key={plan.slug} style={{ background: plan.bg, border: `1px solid ${plan.border}`, borderRadius: 20, padding: "30px 24px", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", boxShadow: plan.highlight ? `0 0 50px rgba(212,180,97,0.12)` : "none", transition: "transform 0.2s, box-shadow 0.2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "none"; }}>
              {plan.highlight && (
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
              )}
              {plan.highlight && (
                <div style={{ position: "absolute", top: 14, right: 14, fontSize: 9, fontWeight: 800, color: "#000", background: GOLD, borderRadius: 99, padding: "3px 8px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Most Popular</div>
              )}
              <div style={{ fontSize: 10, fontWeight: 700, color: plan.accent, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>{plan.tier}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 6 }}>{plan.name}</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 3, marginBottom: 5 }}>
                <span style={{ fontSize: plan.price === "Free" ? 30 : 36, fontWeight: 900, color: plan.accent, lineHeight: 1 }}>{plan.slug==="free"?"Free":`$${offer.price.total.toFixed(2)}`}</span>
                {plan.period && <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", paddingBottom: 3 }}>{months===1?"/mo":`/${months}mo`}</span>}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 22, fontWeight: 500 }}>{offer.monthlyCredits} credits / month{plan.slug==="free"?" · no rollover":""}</div>

              {plan.slug!=="free"&&<div style={{marginBottom:20,color:"rgba(255,255,255,0.5)",fontSize:11}}><label htmlFor={`term-${plan.slug}`}>Prepaid term: <strong style={{color:plan.accent}}>{months} {months===1?"month":"months"}</strong></label><input id={`term-${plan.slug}`} aria-label={`${plan.name} prepaid term`} aria-valuetext={`${months} months, ${offer.monthlyCredits} credits per month`} type="range" min="0" max="3" step="1" value={TERM_STEPS.indexOf(months as any)} onChange={e=>setTerms(old=>({...old,[plan.slug]:TERM_STEPS[Number(e.target.value)]}))} style={{display:"block",width:"100%",accentColor:plan.accent,margin:"12px 0 8px"}}/><div style={{display:"flex",justifyContent:"space-between"}}>{TERM_STEPS.map(n=><span key={n}>{n}mo</span>)}</div><p style={{lineHeight:1.6,margin:"12px 0 0"}}>{months>1?`$${offer.price.monthly.toFixed(2)}/month equivalent · ${offer.price.discount?`${offer.price.discount}% draft saving`:"No discount"} · +${TERM_CREDIT_BONUS[months as keyof typeof TERM_CREDIT_BONUS]} bonus credits each month`:"Monthly plan · no bonus credits"}</p></div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1, marginBottom: 24 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
                    <span style={{ color: plan.accent, fontSize: 11, marginTop: 2, flexShrink: 0 }}>{f.includes("not included")?"−":"✓"}</span>
                    <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>{f}</span>
                  </div>
                ))}
              </div>

              <button
                data-testid={`button-plan-${plan.slug}`}
                onClick={() => {}}
                disabled
                style={{ background: plan.highlight ? `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})` : "rgba(255,255,255,0.06)", border: plan.highlight ? "none" : `1px solid ${plan.border}`, color: plan.highlight ? "#000" : plan.accent, fontWeight: 700, fontSize: 14, borderRadius: 10, padding: "12px 20px", cursor: confirming ? "not-allowed" : "pointer", transition: "opacity 0.2s", opacity: confirming && confirming !== plan.slug ? 0.4 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {confirming === plan.slug ? (
                  <><span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(0,0,0,0.2)", borderTopColor: plan.highlight ? "#000" : plan.accent, display: "inline-block", animation: "spin 0.6s linear infinite" }} />Confirming...</>
                ) : (
                  <>Preview only · checkout off</>
                )}
              </button>
            </div>
          )})}
        </div>

        {/* Tier 5 special card */}
        <div style={{ width: "100%", maxWidth: 1100, background: `linear-gradient(135deg, rgba(212,180,97,0.1) 0%, rgba(212,180,97,0.03) 100%)`, border: `1px solid ${GOLD}55`, borderRadius: 24, padding: "clamp(28px, 4vw, 44px) clamp(20px, 4vw, 48px)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 28, position: "relative", overflow: "hidden", boxShadow: `0 0 80px rgba(212,180,97,0.1)` }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${GOLD_BRIGHT}, ${GOLD}, transparent)` }} />
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: "inline-block", fontSize: 9, fontWeight: 800, color: "#000", background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, borderRadius: 99, padding: "3px 12px", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>Tier 5 — Exclusive</div>
            <div style={{ fontSize: "clamp(22px, 3vw, 34px)", fontWeight: 900, lineHeight: 1.1, marginBottom: 10 }}>
              <span style={{ color: GOLD }}>Work with us</span>
            </div>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, maxWidth: 480 }}>
              High-ticket, done-with-you. Unlimited credits and work directly with the Oravini team. Custom upfront, book a call. Existing Elite accounts keep their current access.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}><button disabled style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 15, border: "none", borderRadius: 12, padding: "14px 32px", cursor: "not-allowed", opacity:0.7 }}>Book a call</button></div>
        </div>

<p style={{color:"rgba(255,255,255,0.35)",fontSize:11,lineHeight:1.7}}>AI tools consume app credits per action. Free credits reset monthly without rollover. Paid allowances are monthly within the chosen calendar-month term, not a full term's credits upfront. Webinar email and SMS sending are not included. Proposed storage is occupied space; streaming is delivered data per month. No live subscription or account changes.</p></>;
}

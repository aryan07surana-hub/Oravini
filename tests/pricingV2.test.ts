import test from 'node:test';import assert from 'node:assert/strict';
import {proposedOffer,TERM_PLANS,TERM_STEPS} from '../shared/pricingV2';
import {preparePricingV2Entitlement,pricingV2CreditPeriods} from '../server/pricingV2Proposal';
for(const p of TERM_PLANS){for(const term of p.terms){test(`${p.id}/${term} server/client canonical offer`,()=>{const o=proposedOffer(p.id,term);assert.equal(o.checkoutEnabled,false);assert.equal(o.discountFinal,false);assert.equal(o.variantId,null);assert.equal(o.monthlyCredits,p.credits+(p.id==='free'?0:({1:0,3:150,6:200,12:250}[term])));assert.equal(preparePricingV2Entitlement(p.id,term).activationAllowed,false);assert.deepEqual(pricingV2CreditPeriods(p.id,term).map(x=>x.credits),Array(term).fill(o.monthlyCredits));});}}
test('reject tampered unknown plan/term and no free prepaid term',()=>{for(const t of [0,2,7,NaN,Infinity])assert.throws(()=>proposedOffer('growth',t));assert.throws(()=>proposedOffer('elite',1));assert.throws(()=>proposedOffer('free',3));});
test('annual term grants monthly allowance rather than twelve months upfront',()=>{const periods=pricingV2CreditPeriods('growth_video',12);assert.equal(periods[0].credits,1250);assert.equal(periods.reduce((a,p)=>a+p.credits,0),15000);});
test('Pro has no discount in any term',()=>{for(const t of TERM_STEPS)assert.equal(proposedOffer('pro',t).price.total,59*t);});

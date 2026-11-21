import {proposedOffer,type PricingTerm,type PricingPlan} from '../shared/pricingV2';
// Preparation only. Not wired to startup, reset routines, webhooks or storage.
// Future activation requires verified payment, approved final catalog and persisted
// subscription/term identity. This helper cannot authorize a credit grant.
export function preparePricingV2Entitlement(planId:PricingPlan,months:PricingTerm){const offer=proposedOffer(planId,months);return {...offer,activationAllowed:false as const,requiresVerifiedPayment:planId!=='free',freeResetCadence:planId==='free'?'monthly':null};}
export function pricingV2CreditPeriods(planId:PricingPlan,months:PricingTerm){const offer=proposedOffer(planId,months);return Array.from({length:months},(_,index)=>({periodIndex:index,credits:offer.monthlyCredits}));}

export {calendarMonthBoundary} from '../shared/creditPeriodsV2';

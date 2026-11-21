import {TERM_PLANS} from './pricingV2';
// Source: current server credit-action handlers and COMPETITOR_CREDIT_COSTS.
// Omit legacy unverified support promises, attendance caps and unlimited hosting.
const CORE_FEATURES=[
 'AI content ideas and hashtags','Script generator and Content Coach chat','Carousel text, AI images, add slides and refinement','Story generator and viral hooks / rewrites / angles','Virality tester and content reports','Lead magnet and brand kit generators','ICP Builder and Audience Psychology Map','SOP Generator and AI Content Planner','YouTube and Instagram content analysis','IG Growth Tracker','AI Video Editor chat and Clip Finder','Post Package Generator and text enhancement','DM Tracker: leads, quick replies and sequences','Group community access','Content audit',
];
const COMPETITOR_FEATURES=['Competitor Analysis','Reel vs Reel Comparison','Steal Strategy plan','Content DNA analysis and improvement'];
const webinarFeatures=['Webinar creation and YouTube host setup','Webinar registration and landing pages','Webinar CRM and analytics','Video hosting and VSL pages'];
export const LEGACY_PRICING_PLANS=TERM_PLANS.map(p=>({
 ...p,slug:p.id,tier:p.id==='free'?'Tier 1':p.id==='growth'?'Tier 3':p.id==='pro'?'Tier 4':'Growth + $20 Video',
 accent:p.id==='growth'?'#d4b461':p.id==='pro'?'#34d399':p.id==='growth_video'?'#818cf8':'rgba(255,255,255,0.7)',
 bg:p.id==='growth'?'rgba(212,180,97,0.07)':p.id==='pro'?'rgba(52,211,153,0.05)':p.id==='growth_video'?'rgba(99,102,241,0.06)':'rgba(255,255,255,0.03)',
 border:p.id==='growth'?'rgba(212,180,97,0.35)':p.id==='pro'?'rgba(52,211,153,0.22)':p.id==='growth_video'?'rgba(99,102,241,0.28)':'rgba(255,255,255,0.1)',
 highlight:p.id==='growth',price:p.id==='free'?'Free':`$${p.price}`,period:p.id==='free'?'':'/mo',
 features:[...CORE_FEATURES,...(p.id==='free'?['Competitor deep analysis not included']:COMPETITOR_FEATURES),...(p.video?[...webinarFeatures,`${p.video.storage} GB occupied video storage`,`${p.video.stream} GB streaming / month`]:['Webinars not included','Hosted-video storage not included','Video streaming not included'])],
}));

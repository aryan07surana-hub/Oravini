import type {PricingPlan} from './pricingV2';
// Feature facts: pricingV2 PLAN_RIGHTS_V2 and video caps; competitorCredits server gate.
// Do not imply unlimited use, faster processing, support levels or webinar messaging.
export const PLAN_PRESENTATION:Record<PricingPlan,{audience:string;difference:string;detail:string}>={
 free:{audience:'Try AI content creation',difference:'Start with the essentials',detail:'Explore core AI tools with 100 credits each month.'},
 growth:{audience:'Publish and research regularly',difference:'Creation + competitor research',detail:'Four times the Free base credits, plus Deep Competitor Analysis.'},
 pro:{audience:'Run webinars and host more video',difference:'More hosting capacity',detail:'Twice the video storage and streaming of Growth + Video.'},
 growth_video:{audience:'Create more AI content with video',difference:'More AI, lighter hosting',detail:'1,000 base AI credits, with webinars and a smaller hosting allowance.'},
};

export const MOST_POPULAR_PLAN:PricingPlan="growth_video";

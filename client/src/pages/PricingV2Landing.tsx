import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import LegacyLanding from './OraviniLanding';
import Pricing from '@/components/video-marketing/TermPricingPreview';
// Preserve the large existing landing page and its route. Preview-only slot
// prevents legacy pricing buttons from being active beside the proposed catalog.
function PreviewLanding(){
 const [slot,setSlot]=useState<HTMLDivElement|null>(null);
 useEffect(()=>{const section=document.querySelector('#pricing');if(!section)return;const node=document.createElement('div');node.className='pricing-v2-slot';section.appendChild(node);setSlot(node);return()=>{node.remove();};},[]);
 return <div className="pricing-v2-host"><style>{'.pricing-v2-host #pricing > :not(.pricing-v2-slot){display:none!important}.pricing-v2-host #pricing{padding:24px 0!important}'}</style><LegacyLanding/>{slot&&createPortal(<Pricing/>,slot)}</div>;
}
export default function PricingV2Landing(){return import.meta.env.VITE_PRICING_V2_PREVIEW==='true'?<PreviewLanding/>:<LegacyLanding/>;}

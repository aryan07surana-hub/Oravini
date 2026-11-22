import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import LegacyLanding from './OraviniLanding';
import Pricing from '@/components/video-marketing/TermPricingPreview';
// Preserve the existing landing page. The pricing slot replaces the old cards.
// Checkout safety comes from the server status, never from a client preview flag.
function PreviewLanding(){
 const [slot,setSlot]=useState<HTMLDivElement|null>(null);
 useEffect(()=>{const section=document.querySelector('#pricing');if(!section)return;const node=document.createElement('div');node.className='pricing-v2-slot';section.appendChild(node);setSlot(node);return()=>{node.remove();};},[]);
 return <div className="pricing-v2-host"><style>{'.pricing-v2-host #pricing > :not(.pricing-v2-slot){display:none!important}.pricing-v2-host #pricing{padding:24px 0!important}'}</style><LegacyLanding/>{slot&&createPortal(<Pricing/>,slot)}</div>;
}
export default function PricingV2Landing(){return <PreviewLanding/>;}

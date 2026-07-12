"use client";

import { useState } from "react";
import styles from "./pricing.module.css";

type Tier = "tier1" | "tier2" | "tier3" | "tier4" | "tier5";

type PricingOption = {
  tier: Tier;
  name: string;
  price: number;
  credits: number;
  features: string[];
  whopCheckoutUrl: string;
};

// 1 credit = $0.01. Powered by Higgsfield.
const AI_VIDEO_MODELS = [
  { id: "wan2_6",              name: "Wan 2.6",           provider: "Wan",        duration: "5s",  credits: 17,  tag: "Creative" },
  { id: "seedance_2_0_mini",   name: "Seedance Mini",     provider: "ByteDance",  duration: "5s",  credits: 18,  tag: "Fast" },
  { id: "kling2_6",            name: "Kling 2.6",         provider: "Kling",      duration: "5s",  credits: 24,  tag: "Popular" },
  { id: "minimax_hailuo",      name: "Minimax Hailuo",    provider: "Hailuo",     duration: "6s",  credits: 33,  tag: "Cinematic" },
  { id: "seedance_2_0",        name: "Seedance 2.0",      provider: "ByteDance",  duration: "5s",  credits: 30,  tag: "4K Quality" },
  { id: "cinematic_studio_3_0",name: "Cinema Studio 3.0", provider: "Higgsfield", duration: "5s",  credits: 40,  tag: "Premium" },
];

const AI_MODELS_ADDON = {
  price: 25,
  whopAddonUrl: "https://whop.com/checkout/addon_aimodels",
};

const VIDEO_MARKETING_ADDON = {
  price: 20,
  features: [
    "Video Hosting Platform",
    "Webinar Integration",
    "Multi-platform Publishing",
    "Advanced Analytics Dashboard",
    "A/B Testing Tools",
    "Custom Branding",
    "Unlimited video storage",
  ],
  whopAddonUrl: "https://whop.com/checkout/addon_videomarketing",
};

const PRICING_TIERS: PricingOption[] = [
  {
    tier: "tier1",
    name: "Free",
    price: 0,
    credits: 150,
    features: [
      "150 AI credits/month",
      "2 free AI videos/week (Wan 2.6)",
      "AI Day Planner",
      "Basic scheduling tools",
      "Community support",
      "AI content ideas",
      "Partial audit preview",
    ],
    whopCheckoutUrl: "https://whop.com/checkout/plan_free",
  },
  {
    tier: "tier2",
    name: "Starter",
    price: 19,
    credits: 400,
    features: [
      "400 AI credits/month",
      "Everything in Free",
      "Unlimited daily plans",
      "Full audit access",
      "Email support",
      "Advanced analytics dashboard",
      "AI Video Models add-on available",
    ],
    whopCheckoutUrl: "https://whop.com/checkout/plan_starter123",
  },
  {
    tier: "tier3",
    name: "Growth",
    price: 49,
    credits: 1000,
    features: [
      "1,000 AI credits/month",
      "Everything in Starter",
      "AI Video Models add-on available",
      "Video Marketing add-on available",
      "White-label branding",
      "API access",
      "Priority support",
    ],
    whopCheckoutUrl: "https://whop.com/checkout/plan_professional456",
  },
  {
    tier: "tier4",
    name: "Pro",
    price: 69,
    credits: 2500,
    features: [
      "2,500 AI credits/month",
      "Everything in Growth",
      "AI Video Models — FREE",
      "Video Marketing — FREE",
      "Unlimited team members",
      "Dedicated account manager",
      "Priority support",
    ],
    whopCheckoutUrl: "https://whop.com/checkout/plan_business789",
  },
  {
    tier: "tier5",
    name: "Enterprise",
    price: 99,
    credits: 7000,
    features: [
      "7,000 AI credits/month",
      "Everything in Pro",
      "All AI Video Models included",
      "Video Marketing included",
      "White-glove onboarding",
      "Custom SLA",
      "Dedicated infrastructure",
      "Volume credit discounts",
    ],
    whopCheckoutUrl: "https://whop.com/checkout/plan_enterprise999",
  },
];

export default function PricingPage() {
  const [selectedTier, setSelectedTier] = useState<Tier>("tier3");
  const [includeAiModels, setIncludeAiModels] = useState(false);
  const [includeVideoMarketing, setIncludeVideoMarketing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewType, setPreviewType] = useState<"webinar" | "video-hosting" | null>(null);

  const selectedPlan = PRICING_TIERS.find((p) => p.tier === selectedTier)!;

  const canAddAiModels = selectedTier !== "tier1";
  const aiModelsIncluded = selectedTier === "tier4" || selectedTier === "tier5";

  const canAddVideoMarketing = selectedTier === "tier3" || selectedTier === "tier4" || selectedTier === "tier5";
  const videoMarketingIncluded = selectedTier === "tier4" || selectedTier === "tier5";

  const aiModelsAddonCost = !aiModelsIncluded && includeAiModels ? AI_MODELS_ADDON.price : 0;
  const videoMarketingAddonCost = !videoMarketingIncluded && includeVideoMarketing && canAddVideoMarketing
    ? VIDEO_MARKETING_ADDON.price
    : 0;
  const totalPrice = selectedPlan.price + aiModelsAddonCost + videoMarketingAddonCost;

  const handleCheckout = () => {
    if (selectedTier === "tier5") {
      window.location.href = "/pricing/tier5";
      return;
    }
    window.open(selectedPlan.whopCheckoutUrl, "_blank");
  };

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <h1>Choose Your Plan</h1>
        <p>Start with a base plan. Add AI video models or video marketing whenever you're ready.</p>
      </section>

      {/* Free video hook */}
      <div className={styles.freeVideoHook}>
        <span className={styles.hookEmoji}>🎬</span>
        <div>
          <strong>Every account gets 2 free AI videos per week — no credit card needed.</strong>
          <span> Sign up free and start generating with Wan 2.6 today.</span>
        </div>
        <a href={PRICING_TIERS[0].whopCheckoutUrl} className={styles.hookCta}>
          Start Free
        </a>
      </div>

      {/* Tier selector */}
      <section className={styles.tierSelector}>
        <div className={styles.tierGrid}>
          {PRICING_TIERS.map((plan) => (
            <div
              key={plan.tier}
              className={`${styles.tierCard} ${selectedTier === plan.tier ? styles.selected : ""} ${
                plan.tier === "tier4" ? styles.premium : ""
              }`}
              onClick={() => setSelectedTier(plan.tier)}
            >
              {plan.tier === "tier4" && <span className={styles.badge}>Best Value</span>}
              <h3>{plan.name}</h3>
              <p className={styles.price}>${plan.price}/mo</p>
              <p className={styles.credits}>{plan.credits.toLocaleString()} credits/mo</p>
              <ul>
                {plan.features.map((feature, idx) => (
                  <li key={idx}>✓ {feature}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* AI Video Models addon */}
      {canAddAiModels && (
        <section className={styles.addonSection}>
          <div className={styles.addonCard}>
            <div className={styles.addonHeader}>
              <div>
                <h2>🎬 AI Video Models</h2>
                {aiModelsIncluded
                  ? <p className={styles.addonPrice}>Included with your plan</p>
                  : <p className={styles.addonPrice}>+${AI_MODELS_ADDON.price}/mo</p>
                }
                <p className={styles.addonSubtitle}>
                  Access Kling 2.6, Seedance 2.0, Wan 2.6, Minimax, Cinema Studio 3.0 — pay only for what you generate using your credits.
                </p>
              </div>
              {!aiModelsIncluded && (
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={includeAiModels}
                    onChange={(e) => setIncludeAiModels(e.target.checked)}
                  />
                  <span className={styles.slider}></span>
                </label>
              )}
            </div>

            <div className={styles.modelGrid}>
              {AI_VIDEO_MODELS.map((model) => (
                <div key={model.id} className={styles.modelCard}>
                  <div className={styles.modelTag}>{model.tag}</div>
                  <h4>{model.name}</h4>
                  <p className={styles.modelProvider}>{model.provider}</p>
                  <p className={styles.modelDuration}>{model.duration} clip</p>
                  <p className={styles.modelCredits}>{model.credits} credits/gen</p>
                  <p className={styles.modelCost}>(${(model.credits * 0.01).toFixed(2)} per video)</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Video Marketing addon */}
      {canAddVideoMarketing && (
        <section className={styles.addonSection}>
          <div className={styles.addonCard}>
            <div className={styles.addonHeader}>
              <div>
                <h2>📺 Video Marketing Suite</h2>
                {videoMarketingIncluded
                  ? <p className={styles.addonPrice}>Included with your plan</p>
                  : <p className={styles.addonPrice}>+${VIDEO_MARKETING_ADDON.price}/mo</p>
                }
              </div>
              {!videoMarketingIncluded && (
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={includeVideoMarketing}
                    onChange={(e) => setIncludeVideoMarketing(e.target.checked)}
                  />
                  <span className={styles.slider}></span>
                </label>
              )}
            </div>

            <div className={styles.addonFeatures}>
              <div className={styles.featureGrid}>
                {VIDEO_MARKETING_ADDON.features.map((feature, idx) => (
                  <div key={idx} className={styles.featureItem}>✓ {feature}</div>
                ))}
              </div>
            </div>

            <div className={styles.previewSection}>
              <h3>Live Previews:</h3>
              <div className={styles.previewButtons}>
                <button className={styles.previewButton} onClick={() => { setPreviewType("webinar"); setShowPreview(true); }}>
                  👁️ Webinar Platform
                </button>
                <button className={styles.previewButton} onClick={() => { setPreviewType("video-hosting"); setShowPreview(true); }}>
                  👁️ Video Hosting
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Order summary */}
      <section className={styles.checkout}>
        <div className={styles.summary}>
          <h2>Order Summary</h2>
          <div className={styles.summaryLine}>
            <span>{selectedPlan.name} Plan — {selectedPlan.credits.toLocaleString()} credits/mo</span>
            <span>${selectedPlan.price}/mo</span>
          </div>
          {!aiModelsIncluded && includeAiModels && (
            <div className={styles.summaryLine}>
              <span>AI Video Models</span>
              <span>+${AI_MODELS_ADDON.price}/mo</span>
            </div>
          )}
          {aiModelsIncluded && (
            <div className={styles.summaryLine}>
              <span>AI Video Models</span>
              <span className={styles.included}>Included</span>
            </div>
          )}
          {!videoMarketingIncluded && includeVideoMarketing && canAddVideoMarketing && (
            <div className={styles.summaryLine}>
              <span>Video Marketing Suite</span>
              <span>+${VIDEO_MARKETING_ADDON.price}/mo</span>
            </div>
          )}
          {videoMarketingIncluded && (
            <div className={styles.summaryLine}>
              <span>Video Marketing Suite</span>
              <span className={styles.included}>Included</span>
            </div>
          )}
          <div className={styles.summaryTotal}>
            <span>Total</span>
            <span>${totalPrice}/mo</span>
          </div>
          <button className={styles.checkoutButton} onClick={handleCheckout}>
            {selectedTier === "tier5" ? "Explore Enterprise" : "Proceed to Whop Checkout"}
          </button>
          <p className={styles.checkoutNote}>Redirected to Whop for secure payment</p>
        </div>
      </section>

      {/* Preview modal */}
      {showPreview && (
        <div className={styles.modal} onClick={() => setShowPreview(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeButton} onClick={() => setShowPreview(false)}>✕</button>
            {previewType === "webinar" && <WebinarPreview />}
            {previewType === "video-hosting" && <VideoHostingPreview />}
            <div className={styles.modalFooter}>
              <button className={styles.backToPricingButton} onClick={() => setShowPreview(false)}>
                ← Back to Pricing
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function WebinarPreview() {
  return (
    <div className={styles.preview}>
      <h2>🎤 Webinar Platform Preview</h2>
      <div className={styles.previewContent}>
        <div className={styles.webinarInterface}>
          <div className={styles.videoArea}>
            <div className={styles.mockVideo}>📹 Live Webinar Stream</div>
          </div>
          <div className={styles.chatArea}>
            <h3>Live Chat</h3>
            <div className={styles.chatMessages}>
              <div className={styles.message}><strong>John:</strong> Great presentation!</div>
              <div className={styles.message}><strong>Sarah:</strong> Can you share the slides?</div>
            </div>
          </div>
        </div>
        <div className={styles.features}>
          <h3>Features:</h3>
          <ul>
            <li>HD live streaming</li>
            <li>Interactive Q&A</li>
            <li>Screen sharing</li>
            <li>Recording & replay</li>
            <li>Attendee analytics</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function VideoHostingPreview() {
  return (
    <div className={styles.preview}>
      <h2>📺 Video Hosting Platform Preview</h2>
      <div className={styles.previewContent}>
        <div className={styles.videoLibrary}>
          <div className={styles.videoItem}><div className={styles.thumbnail}>🎬</div><p>Product Demo</p></div>
          <div className={styles.videoItem}><div className={styles.thumbnail}>🎬</div><p>Tutorial Series</p></div>
          <div className={styles.videoItem}><div className={styles.thumbnail}>🎬</div><p>Customer Stories</p></div>
        </div>
        <div className={styles.features}>
          <h3>Features:</h3>
          <ul>
            <li>Unlimited storage</li>
            <li>Custom video player</li>
            <li>Embed anywhere</li>
            <li>Advanced analytics</li>
            <li>CDN delivery</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

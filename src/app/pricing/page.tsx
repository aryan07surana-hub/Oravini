"use client";

import { useState } from "react";
import styles from "./pricing.module.css";

type Tier = "tier1" | "tier2" | "tier3" | "tier4" | "tier5";

type PricingOption = {
  tier: Tier;
  name: string;
  price: number;
  features: string[];
  whopCheckoutUrl: string;
};

const PRICING_TIERS: PricingOption[] = [
  {
    tier: "tier1",
    name: "Free",
    price: 0,
    features: ["AI Day Planner", "Basic scheduling", "5 plans per day", "Community support"],
    whopCheckoutUrl: "https://whop.com/checkout/plan_free",
  },
  {
    tier: "tier2",
    name: "Starter",
    price: 19,
    features: ["Everything in Free", "Unlimited plans", "Email support", "Advanced analytics", "Team collaboration"],
    whopCheckoutUrl: "https://whop.com/checkout/plan_starter123",
  },
  {
    tier: "tier3",
    name: "Professional",
    price: 49,
    features: [
      "Everything in Starter",
      "White-label solution",
      "API access",
      "Custom integrations",
      "Priority support",
    ],
    whopCheckoutUrl: "https://whop.com/checkout/plan_professional456",
  },
  {
    tier: "tier4",
    name: "Business",
    price: 59,
    features: [
      "Everything in Professional",
      "Unlimited team members",
      "Custom development",
      "SLA guarantee",
      "24/7 phone support",
      "Dedicated account manager",
    ],
    whopCheckoutUrl: "https://whop.com/checkout/plan_business789",
  },
  {
    tier: "tier5",
    name: "Enterprise",
    price: 99,
    features: [
      "Everything in Business",
      "Video Marketing Included FREE",
      "White-glove onboarding",
      "Custom SLA",
      "Dedicated infrastructure",
      "Annual contract discounts",
    ],
    whopCheckoutUrl: "https://whop.com/checkout/plan_enterprise999",
  },
];

const VIDEO_MARKETING_ADDON = {
  price: 20,
  features: [
    "AI Video Generation",
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

export default function PricingPage() {
  const [selectedTier, setSelectedTier] = useState<Tier>("tier3");
  const [includeVideoMarketing, setIncludeVideoMarketing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewType, setPreviewType] = useState<"webinar" | "video-hosting" | "video-marketing" | null>(null);

  const selectedPlan = PRICING_TIERS.find((p) => p.tier === selectedTier)!;
  
  const getVideoMarketingPrice = () => {
    if (selectedTier === "tier1" || selectedTier === "tier2") return null;
    if (selectedTier === "tier3") return 20;
    if (selectedTier === "tier4") return 0;
    if (selectedTier === "tier5") return "included";
    return null;
  };
  
  const videoMarketingPrice = getVideoMarketingPrice();
  const canAddVideoMarketing = selectedTier === "tier3" || selectedTier === "tier4" || selectedTier === "tier5";
  const videoMarketingIncluded = selectedTier === "tier5";
  
  const totalPrice = selectedPlan.price + 
    (includeVideoMarketing && selectedTier === "tier3" ? 20 : 0);

  const handleCheckout = () => {
    if (includeVideoMarketing && canAddVideoMarketing) {
      window.open(VIDEO_MARKETING_ADDON.whopAddonUrl, "_blank");
    } else {
      window.open(selectedPlan.whopCheckoutUrl, "_blank");
    }
  };

  const openPreview = (type: "webinar" | "video-hosting" | "video-marketing") => {
    setPreviewType(type);
    setShowPreview(true);
  };

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <h1>Choose Your Plan</h1>
        <p>Select the perfect tier for your needs. Business & Enterprise tiers can add Video Marketing.</p>
      </section>

      <section className={styles.tierSelector}>
        <div className={styles.tierGrid}>
          {PRICING_TIERS.map((plan) => (
            <div
              key={plan.tier}
              className={`${styles.tierCard} ${selectedTier === plan.tier ? styles.selected : ""} ${
                plan.tier === "tier3" || plan.tier === "tier4" ? styles.premium : ""
              }`}
              onClick={() => setSelectedTier(plan.tier)}
            >
              {(plan.tier === "tier3" || plan.tier === "tier4" || plan.tier === "tier5") && (
                <span className={styles.badge}>
                  {plan.tier === "tier5" ? "Video Marketing Included" : "Video Marketing Available"}
                </span>
              )}
              <h3>{plan.name}</h3>
              <p className={styles.price}>${plan.price}/mo</p>
              <ul>
                {plan.features.map((feature, idx) => (
                  <li key={idx}>✓ {feature}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {canAddVideoMarketing && !videoMarketingIncluded && (
        <section className={styles.addonSection}>
          <div className={styles.addonCard}>
            <div className={styles.addonHeader}>
              <div>
                <h2>🎥 Video Marketing Add-On</h2>
                {selectedTier === "tier3" && <p className={styles.addonPrice}>+$20/mo</p>}
                {selectedTier === "tier4" && <p className={styles.addonPrice}>FREE with Business Plan</p>}
              </div>
              <label className={styles.toggle}>
                <input type="checkbox" checked={includeVideoMarketing} onChange={(e) => setIncludeVideoMarketing(e.target.checked)} />
                <span className={styles.slider}></span>
              </label>
            </div>

            <div className={styles.addonFeatures}>
              <h3>What's Included:</h3>
              <div className={styles.featureGrid}>
                {VIDEO_MARKETING_ADDON.features.map((feature, idx) => (
                  <div key={idx} className={styles.featureItem}>
                    ✓ {feature}
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.previewSection}>
              <h3>Get a Live Preview:</h3>
              <div className={styles.previewButtons}>
                <button className={styles.previewButton} onClick={() => openPreview("webinar")}>
                  👁️ Preview Webinar Platform
                </button>
                <button className={styles.previewButton} onClick={() => openPreview("video-hosting")}>
                  👁️ Preview Video Hosting
                </button>
                <button className={styles.previewButton} onClick={() => openPreview("video-marketing")}>
                  👁️ Preview Video Marketing
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className={styles.checkout}>
        <div className={styles.summary}>
          <h2>Order Summary</h2>
          <div className={styles.summaryLine}>
            <span>{selectedPlan.name} Plan</span>
            <span>${selectedPlan.price}/mo</span>
          </div>
          {includeVideoMarketing && selectedTier === "tier3" && (
            <div className={styles.summaryLine}>
              <span>Video Marketing Add-On</span>
              <span>+$20/mo</span>
            </div>
          )}
          {includeVideoMarketing && selectedTier === "tier4" && (
            <div className={styles.summaryLine}>
              <span>Video Marketing Add-On</span>
              <span>FREE</span>
            </div>
          )}
          <div className={styles.summaryTotal}>
            <span>Total</span>
            <span>${totalPrice}/mo</span>
          </div>
          <button className={styles.checkoutButton} onClick={handleCheckout}>
            Proceed to Whop Checkout
          </button>
          <p className={styles.checkoutNote}>You'll be redirected to Whop for secure payment</p>
        </div>
      </section>

      {showPreview && (
        <div className={styles.modal} onClick={() => setShowPreview(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeButton} onClick={() => setShowPreview(false)}>
              ✕
            </button>
            {previewType === "webinar" && <WebinarPreview />}
            {previewType === "video-hosting" && <VideoHostingPreview />}
            {previewType === "video-marketing" && <VideoMarketingPreview />}
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
              <div className={styles.message}>
                <strong>John:</strong> Great presentation!
              </div>
              <div className={styles.message}>
                <strong>Sarah:</strong> Can you share the slides?
              </div>
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
          <div className={styles.videoItem}>
            <div className={styles.thumbnail}>🎬</div>
            <p>Product Demo</p>
          </div>
          <div className={styles.videoItem}>
            <div className={styles.thumbnail}>🎬</div>
            <p>Tutorial Series</p>
          </div>
          <div className={styles.videoItem}>
            <div className={styles.thumbnail}>🎬</div>
            <p>Customer Stories</p>
          </div>
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

function VideoMarketingPreview() {
  return (
    <div className={styles.preview}>
      <h2>🎥 Video Marketing Platform Preview</h2>
      <div className={styles.previewContent}>
        <div className={styles.marketingDashboard}>
          <div className={styles.dashSection}>
            <h3>AI Video Generator</h3>
            <textarea placeholder="Describe your video..." rows={3} />
            <button>Generate Video</button>
          </div>
          <div className={styles.dashSection}>
            <h3>Campaign Analytics</h3>
            <div className={styles.stats}>
              <div>
                <strong>1.2M</strong>
                <span>Views</span>
              </div>
              <div>
                <strong>45K</strong>
                <span>Clicks</span>
              </div>
              <div>
                <strong>3.8%</strong>
                <span>CTR</span>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.features}>
          <h3>Features:</h3>
          <ul>
            <li>AI-powered video creation</li>
            <li>Multi-platform publishing</li>
            <li>A/B testing</li>
            <li>Performance tracking</li>
            <li>Custom branding</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import styles from "./video-marketing.module.css";

type Tier = "free" | "pro" | "enterprise";

export default function VideoMarketingPage() {
  const [selectedTier, setSelectedTier] = useState<Tier>("pro");

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <h1>Video Marketing Platform</h1>
        <p className={styles.subtitle}>
          Create, manage, and optimize your video marketing campaigns with AI-powered tools
        </p>
      </section>

      <section className={styles.features}>
        <h2>What You Get</h2>
        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <h3>AI Video Generation</h3>
            <p>Generate marketing videos from text prompts</p>
          </div>
          <div className={styles.featureCard}>
            <h3>Campaign Analytics</h3>
            <p>Track performance across all platforms</p>
          </div>
          <div className={styles.featureCard}>
            <h3>Multi-Platform Publishing</h3>
            <p>Publish to YouTube, TikTok, Instagram instantly</p>
          </div>
          <div className={styles.featureCard}>
            <h3>A/B Testing</h3>
            <p>Test thumbnails, titles, and content variations</p>
          </div>
        </div>
      </section>

      <section className={styles.pricing}>
        <h2>Choose Your Plan</h2>
        <div className={styles.pricingGrid}>
          <div className={`${styles.pricingCard} ${selectedTier === "free" ? styles.selected : ""}`}>
            <h3>Free</h3>
            <p className={styles.price}>$0/mo</p>
            <ul>
              <li>View platform features</li>
              <li>Read documentation</li>
              <li>Community support</li>
              <li className={styles.disabled}>No video marketing access</li>
            </ul>
            <button className={styles.ctaButton} onClick={() => setSelectedTier("free")}>
              View Only
            </button>
          </div>

          <div className={`${styles.pricingCard} ${styles.featured} ${selectedTier === "pro" ? styles.selected : ""}`}>
            <span className={styles.badge}>Most Popular</span>
            <h3>Pro</h3>
            <p className={styles.price}>$49/mo</p>
            <ul>
              <li>✓ Full video marketing access</li>
              <li>✓ 50 videos per month</li>
              <li>✓ AI-powered generation</li>
              <li>✓ Analytics dashboard</li>
              <li>✓ Multi-platform publishing</li>
            </ul>
            <button className={styles.ctaButton} onClick={() => setSelectedTier("pro")}>
              Start Pro Trial
            </button>
          </div>

          <div className={`${styles.pricingCard} ${selectedTier === "enterprise" ? styles.selected : ""}`}>
            <h3>Enterprise</h3>
            <p className={styles.price}>$199/mo</p>
            <ul>
              <li>✓ Everything in Pro</li>
              <li>✓ Unlimited videos</li>
              <li>✓ Priority support</li>
              <li>✓ Custom integrations</li>
              <li>✓ Dedicated account manager</li>
            </ul>
            <button className={styles.ctaButton} onClick={() => setSelectedTier("enterprise")}>
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      <section className={styles.cta}>
        <h2>Ready to Transform Your Video Marketing?</h2>
        <p>Join thousands of marketers already using our platform</p>
        <button className={styles.primaryCta}>Get Started Free</button>
      </section>
    </main>
  );
}

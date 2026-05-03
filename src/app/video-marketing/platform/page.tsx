"use client";

import { useEffect, useState } from "react";
import { getVideoMarketingAccess, type User } from "@/lib/access-control";
import styles from "./platform.module.css";

export default function VideoMarketingPlatform() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user")
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const access = getVideoMarketingAccess(user);

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!access.canUse) {
    return (
      <div className={styles.locked}>
        <h1>🔒 Video Marketing Platform</h1>
        <p>{access.reason}</p>
        <a href="/video-marketing" className={styles.upgradeButton}>
          View Plans & Upgrade
        </a>
      </div>
    );
  }

  return (
    <main className={styles.platform}>
      <header className={styles.header}>
        <h1>Video Marketing Platform</h1>
        <div className={styles.userInfo}>
          <span>{user?.email}</span>
          <span className={styles.tierBadge}>{user?.tier.toUpperCase()}</span>
        </div>
      </header>

      <div className={styles.dashboard}>
        <section className={styles.section}>
          <h2>AI Video Generator</h2>
          <textarea placeholder="Describe your video..." className={styles.textarea} rows={4} />
          <button className={styles.generateButton}>Generate Video</button>
        </section>

        <section className={styles.section}>
          <h2>Your Videos</h2>
          <div className={styles.videoGrid}>
            <div className={styles.videoCard}>
              <div className={styles.thumbnail}>📹</div>
              <p>Product Launch Video</p>
            </div>
            <div className={styles.videoCard}>
              <div className={styles.thumbnail}>📹</div>
              <p>Brand Story</p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Analytics</h2>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <h3>1.2M</h3>
              <p>Total Views</p>
            </div>
            <div className={styles.stat}>
              <h3>45K</h3>
              <p>Engagements</p>
            </div>
            <div className={styles.stat}>
              <h3>3.8%</h3>
              <p>Conversion Rate</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

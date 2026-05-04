"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./dashboard.module.css";

type CreditData = {
  remaining: number;
  total: number;
  resetDate: string;
  tier: string;
  percentageUsed: number;
};

type Transaction = {
  id: string;
  action: string;
  creditsUsed: number;
  timestamp: string;
};

export default function DashboardPage() {
  const [credits, setCredits] = useState<CreditData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [balanceRes, historyRes] = await Promise.all([
        fetch("/api/credits/balance"),
        fetch("/api/credits/history"),
      ]);

      const balanceData = await balanceRes.json();
      const historyData = await historyRes.json();

      setCredits(balanceData);
      setTransactions(historyData.transactions);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading dashboard...</div>;
  }

  if (!credits) {
    return <div className={styles.error}>Failed to load credit data</div>;
  }

  const isLow = credits.percentageUsed >= 80;
  const resetDate = new Date(credits.resetDate).toLocaleDateString();

  return (
    <main className={styles.page}>
      <h1>Dashboard</h1>

      {isLow && (
        <div className={styles.alert}>
          <span>⚠️</span>
          <div>
            <strong>Running low on credits!</strong>
            <p>You've used {credits.percentageUsed}% of your monthly credits.</p>
          </div>
          <Link href="/pricing" className={styles.upgradeButton}>
            Upgrade Plan
          </Link>
        </div>
      )}

      <div className={styles.grid}>
        <div className={styles.card}>
          <h2>AI Credits</h2>
          <div className={styles.creditDisplay}>
            <div className={styles.creditNumber}>
              <span className={styles.remaining}>{credits.remaining}</span>
              <span className={styles.total}>/ {credits.total}</span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${100 - credits.percentageUsed}%`,
                  background: isLow ? "#ff4444" : "#4CAF50",
                }}
              />
            </div>
            <p className={styles.resetInfo}>Resets on {resetDate}</p>
          </div>
        </div>

        <div className={styles.card}>
          <h2>Your Plan</h2>
          <div className={styles.planInfo}>
            <p className={styles.tierName}>{getTierName(credits.tier)}</p>
            <p className={styles.tierCredits}>{credits.total} credits/month</p>
            <Link href="/pricing" className={styles.changePlanButton}>
              Change Plan
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.historySection}>
        <h2>Recent Activity</h2>
        {transactions.length === 0 ? (
          <p className={styles.emptyState}>No activity yet. Start using AI features to see your usage here!</p>
        ) : (
          <div className={styles.transactionList}>
            {transactions.map((t) => (
              <div key={t.id} className={styles.transaction}>
                <div className={styles.transactionInfo}>
                  <span className={styles.transactionAction}>{formatAction(t.action)}</span>
                  <span className={styles.transactionTime}>{formatTime(t.timestamp)}</span>
                </div>
                <span className={styles.transactionCredits}>-{t.creditsUsed} credits</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function getTierName(tier: string): string {
  const names: Record<string, string> = {
    tier1: "Free",
    tier2: "Starter",
    tier3: "Growth",
    tier4: "Pro",
    tier5: "Enterprise",
  };
  return names[tier] || tier;
}

function formatAction(action: string): string {
  const actions: Record<string, string> = {
    day_plan: "AI Day Plan Generated",
    content_idea: "AI Content Idea",
    video_script: "Video Script Generated",
  };
  return actions[action] || action;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

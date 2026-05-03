"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./credit-widget.module.css";

type CreditBalance = {
  remaining: number;
  total: number;
  percentageUsed: number;
};

export default function CreditWidget() {
  const [credits, setCredits] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCredits();
  }, []);

  const fetchCredits = async () => {
    try {
      const response = await fetch("/api/credits/balance");
      const data = await response.json();
      setCredits({
        remaining: data.remaining,
        total: data.total,
        percentageUsed: data.percentageUsed,
      });
    } catch (error) {
      console.error("Failed to fetch credits:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.widget}>Loading...</div>;
  }

  if (!credits) {
    return null;
  }

  const isLow = credits.percentageUsed >= 80;

  return (
    <Link href="/dashboard" className={`${styles.widget} ${isLow ? styles.low : ""}`}>
      <span className={styles.icon}>⚡</span>
      <span className={styles.text}>
        {credits.remaining}/{credits.total}
      </span>
      {isLow && <span className={styles.alert}>!</span>}
    </Link>
  );
}

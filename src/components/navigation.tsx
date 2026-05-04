import Link from "next/link";
import CreditWidget from "./credit-widget";
import styles from "./navigation.module.css";

export default function Navigation() {
  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          DayMap AI
        </Link>
        <div className={styles.links}>
          <Link href="/">Planner</Link>
          <Link href="/video-marketing">Video Marketing</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/dashboard">Dashboard</Link>
        </div>
        <CreditWidget />
      </div>
    </nav>
  );
}

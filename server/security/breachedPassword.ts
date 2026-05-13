/**
 * Breached Password Check
 * 
 * Uses the HaveIBeenPwned API with k-anonymity model.
 * Only sends the first 5 characters of the SHA-1 hash — the full password
 * never leaves the server.
 */

import { createHash } from "crypto";

/**
 * Check if a password has appeared in known data breaches.
 * Returns the number of times it appeared, or 0 if not found.
 */
export async function checkBreachedPassword(password: string): Promise<{
  breached: boolean;
  count: number;
}> {
  try {
    // SHA-1 hash the password
    const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
    const prefix = sha1.substring(0, 5);
    const suffix = sha1.substring(5);

    // Query HIBP API with k-anonymity (only send first 5 chars of hash)
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        "User-Agent": "Oravini-Security-Check",
      },
    });

    if (!response.ok) {
      // If API is down, don't block the user — just warn
      console.warn("[security] HIBP API returned non-200:", response.status);
      return { breached: false, count: 0 };
    }

    const text = await response.text();
    const lines = text.split("\n");

    for (const line of lines) {
      const [hashSuffix, countStr] = line.split(":");
      if (hashSuffix?.trim() === suffix) {
        const count = parseInt(countStr?.trim() || "0", 10);
        return { breached: true, count };
      }
    }

    return { breached: false, count: 0 };
  } catch (err) {
    // Network error — don't block registration, just log
    console.warn("[security] HIBP check failed:", err);
    return { breached: false, count: 0 };
  }
}

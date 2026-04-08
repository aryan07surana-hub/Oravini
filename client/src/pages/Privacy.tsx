export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-[#d4b461] mb-2">Privacy Policy</h1>
          <p className="text-zinc-400 text-sm">Last updated: March 20, 2026</p>
        </div>

        <div className="space-y-8 text-zinc-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. About Us</h2>
            <p>
              Brandverse ("we", "our", or "us") operates the Brandverse Client Portal, a SaaS platform
              designed to help content creators and businesses manage their social media growth, track
              performance analytics, and communicate with their team.
            </p>
            <p className="mt-2">
              For any privacy-related questions, contact us at:{" "}
              <a href="mailto:support.oravini@gmail.com" className="text-[#d4b461] hover:underline">
                support.oravini@gmail.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-white">Account information:</strong> Name, email address, and
                password (stored as a secure hash).
              </li>
              <li>
                <strong className="text-white">Instagram profile data:</strong> Public profile metrics,
                post engagement data, follower counts, and content performance statistics retrieved via
                the Instagram Graph API and Meta's platforms.
              </li>
              <li>
                <strong className="text-white">Content data:</strong> Posts, captions, scheduled content,
                and performance tracking data you upload or connect through our platform.
              </li>
              <li>
                <strong className="text-white">Communication data:</strong> Messages sent through our
                in-app chat and DM tracking features.
              </li>
              <li>
                <strong className="text-white">Usage data:</strong> How you interact with the platform,
                pages visited, and features used.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To provide and operate the Brandverse platform and its features</li>
              <li>To display your Instagram analytics and content performance</li>
              <li>To generate AI-powered content ideas and scripts using your profile context</li>
              <li>To send you notifications related to your account and content</li>
              <li>To improve and develop our platform</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Third-Party Services</h2>
            <p className="mb-3">
              We use the following third-party services to power features of our platform. Each has its
              own privacy policy governing their data use:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-white">Meta / Instagram Graph API</strong> — Used to access
                your Instagram profile, post metrics, and messaging features. Governed by{" "}
                <a
                  href="https://www.facebook.com/privacy/policy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#d4b461] hover:underline"
                >
                  Meta's Privacy Policy
                </a>
                .
              </li>
              <li>
                <strong className="text-white">Apify</strong> — Used to collect publicly available
                Instagram data for competitor analysis. Governed by{" "}
                <a
                  href="https://apify.com/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#d4b461] hover:underline"
                >
                  Apify's Privacy Policy
                </a>
                .
              </li>
              <li>
                <strong className="text-white">Groq</strong> — Used to power AI content generation
                features. Governed by{" "}
                <a
                  href="https://groq.com/privacy-policy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#d4b461] hover:underline"
                >
                  Groq's Privacy Policy
                </a>
                .
              </li>
              <li>
                <strong className="text-white">OpenRouter</strong> — Used to power AI analytics and
                reporting features. Governed by{" "}
                <a
                  href="https://openrouter.ai/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#d4b461] hover:underline"
                >
                  OpenRouter's Privacy Policy
                </a>
                .
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Instagram Data Usage</h2>
            <p className="mb-2">
              When you connect your Instagram account, we access data in accordance with Meta's Platform
              Policy. Specifically:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>We only access data you have explicitly authorised</li>
              <li>
                We use Instagram data solely to provide features within this platform (analytics, scheduling,
                DM tracking)
              </li>
              <li>We do not sell your Instagram data to third parties</li>
              <li>
                We do not use your Instagram data to target advertising outside of this platform
              </li>
              <li>
                You can revoke our access to your Instagram account at any time through Instagram's
                Settings → Apps and Websites
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Data Storage and Security</h2>
            <p>
              Your data is stored in a secure PostgreSQL database. We implement industry-standard security
              measures including encrypted connections (HTTPS), hashed passwords, and session-based
              authentication. We do not store your Instagram password — access is granted via OAuth
              tokens only.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. If you request account deletion,
              we will delete your personal data within 30 days, except where we are required by law to
              retain it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Your Rights</h2>
            <p className="mb-2">You have the right to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Withdraw consent for data processing at any time</li>
              <li>Data portability — receive a copy of your data in a machine-readable format</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email us at{" "}
              <a href="mailto:support.oravini@gmail.com" className="text-[#d4b461] hover:underline">
                support.oravini@gmail.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Cookies</h2>
            <p>
              We use session cookies strictly necessary to keep you logged in. We do not use tracking
              cookies or advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Children's Privacy</h2>
            <p>
              Our platform is not intended for users under the age of 13. We do not knowingly collect
              personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Admin Access Controls &amp; Data Visibility</h2>
            <p className="mb-3">
              Brandverse operates a tiered access control policy that governs what our admin team can
              view and interact with across client accounts. This policy is designed to protect your
              privacy while ensuring we can provide timely support when needed.
            </p>
            <ul className="list-disc pl-5 space-y-2 mb-3">
              <li>
                <strong className="text-white">Tier 5 (Elite) clients</strong> — Admin has standard
                account management access by default, enabling proactive support and account monitoring.
              </li>
              <li>
                <strong className="text-white">Tier 1 – Tier 4 clients (Free, Starter, Growth, Pro)</strong>{" "}
                — Admin visibility is restricted to <strong className="text-white">name and email address
                only</strong>. No account content, usage details, or sensitive data is accessible by default.
              </li>
              <li>
                <strong className="text-white">Passwords</strong> — Client passwords are never stored in
                plain text and are never visible to the admin. All passwords are stored as one-way
                cryptographic hashes (bcrypt). The admin can only reset a password, never retrieve it.
              </li>
              <li>
                <strong className="text-white">Access requests</strong> — If a client raises a support
                query, the admin must formally submit an internal access request specifying the reason
                for accessing that client's account. This request is logged with a timestamp and reason
                before any expanded access is granted. Clients may request a log of access events
                relating to their account by emailing{" "}
                <a href="mailto:support.oravini@gmail.com" className="text-[#d4b461] hover:underline">
                  support.oravini@gmail.com
                </a>.
              </li>
              <li>
                <strong className="text-white">No tracking without consent</strong> — Admin cannot
                monitor or track a Tier 1–4 client's activity, usage, or account data without first
                logging an access request.
              </li>
            </ul>
            <p>
              This policy is enforced at the admin dashboard level and is intended to uphold the
              principle of minimum necessary access across all client tiers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant
              changes by email or through the platform. Continued use of the platform after changes
              constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">13. Contact</h2>
            <p>
              For any questions about this Privacy Policy or how we handle your data:
            </p>
            <p className="mt-2">
              Email:{" "}
              <a href="mailto:support.oravini@gmail.com" className="text-[#d4b461] hover:underline">
                support.oravini@gmail.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-zinc-800 text-center text-zinc-500 text-sm">
          <p>© 2026 Brandverse. All rights reserved.</p>
          <a href="/terms" className="text-[#d4b461] hover:underline mt-1 inline-block">
            Terms of Service
          </a>
        </div>
      </div>
    </div>
  );
}

const GOLD = "#d4b461";

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <section id={`section-${num}`}>
      <h2 className="text-xl font-semibold text-white mb-3">{num}. {title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return <li>{children}</li>;
}

const email = "support.oravini@gmail.com";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2" style={{ color: GOLD }}>Privacy Policy</h1>
          <p className="text-zinc-400 text-sm">Last updated: June 1, 2026</p>
          <p className="text-zinc-500 text-sm mt-2">
            This policy explains how Brandverse collects, uses, stores, and protects your personal data.
            We are committed to full transparency — if anything is unclear, email us at{" "}
            <a href={`mailto:${email}`} className="hover:underline" style={{ color: GOLD }}>{email}</a>.
          </p>
        </div>

        {/* Table of Contents */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 mb-10">
          <p className="text-sm font-bold text-white mb-3">Table of Contents</p>
          <ol className="space-y-1.5 text-sm" style={{ color: GOLD }}>
            {[
              ["1", "About Us"],
              ["2", "Information We Collect"],
              ["3", "How We Use Your Information"],
              ["4", "Legal Basis for Processing (GDPR)"],
              ["5", "We Will Never Sell or Share Your Information"],
              ["6", "Data Sharing & Disclosure"],
              ["7", "Instagram & Meta Data Usage"],
              ["8", "AI & Automated Processing"],
              ["9", "Third-Party Services"],
              ["10", "International Data Transfers"],
              ["11", "Data Storage & Security"],
              ["12", "Security Breach Notification"],
              ["13", "Data Retention"],
              ["14", "Account Deletion & Data Erasure"],
              ["15", "Cookies"],
              ["16", "Marketing Communications"],
              ["17", "Referral Program Data"],
              ["18", "Payment Data"],
              ["19", "Your Rights"],
              ["20", "California Residents — CCPA"],
              ["21", "Admin Access Controls"],
              ["22", "Children's Privacy"],
              ["23", "Changes to This Policy"],
              ["24", "Contact"],
            ].map(([n, t]) => (
              <li key={n}>
                <a href={`#section-${n}`} className="hover:underline">{n}. {t}</a>
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-10 text-zinc-300 leading-relaxed">

          <Section num="1" title="About Us">
            <p>
              Brandverse ("we", "our", or "us") operates the Brandverse Client Portal — a SaaS platform
              designed to help content creators and businesses manage social media growth, track performance
              analytics, generate AI-powered content, and communicate with their team.
            </p>
            <p>
              For any privacy-related questions, contact us at:{" "}
              <a href={`mailto:${email}`} className="hover:underline" style={{ color: GOLD }}>{email}</a>
            </p>
          </Section>

          <Section num="2" title="Information We Collect">
            <p>We collect the following categories of data:</p>
            <ul className="list-disc pl-5 space-y-2">
              <Li><strong className="text-white">Account information:</strong> Name, email address, and password (stored as a bcrypt hash — never in plain text).</Li>
              <Li><strong className="text-white">Profile data:</strong> Optional phone number, program type, and plan tier.</Li>
              <Li><strong className="text-white">Instagram & social data:</strong> Public profile metrics, post engagement, follower counts, and content performance statistics retrieved via the Instagram Graph API or public scraping tools.</Li>
              <Li><strong className="text-white">Content data:</strong> Posts, captions, scripts, scheduled content, and performance tracking data you upload or create through the platform.</Li>
              <Li><strong className="text-white">Communication data:</strong> Messages sent through our in-app chat and DM tracking features.</Li>
              <Li><strong className="text-white">Usage data:</strong> Pages visited, features used, and interactions with the platform (used only to improve the product).</Li>
              <Li><strong className="text-white">Referral data:</strong> Referral codes and click tracking if you arrive via a referral link.</Li>
              <Li><strong className="text-white">Survey data:</strong> Onboarding survey responses used to personalise your experience.</Li>
            </ul>
          </Section>

          <Section num="3" title="How We Use Your Information">
            <p>We use your data only to operate and improve Brandverse. Specifically:</p>
            <ul className="list-disc pl-5 space-y-2">
              <Li>To create and manage your account</Li>
              <Li>To provide platform features — analytics, AI tools, scheduling, DM tracking, content calendar</Li>
              <Li>To display your Instagram and YouTube performance data</Li>
              <Li>To generate AI-powered content ideas, scripts, and plans using your profile context</Li>
              <Li>To send transactional notifications (account activity, new documents, call feedback)</Li>
              <Li>To process referrals and award credits</Li>
              <Li>To improve and develop the platform based on usage patterns</Li>
              <Li>To comply with legal obligations</Li>
            </ul>
            <p>We do <strong className="text-white">not</strong> use your data for advertising, profiling, or any purpose outside of operating this platform.</p>
          </Section>

          <Section num="4" title="Legal Basis for Processing (GDPR)">
            <p>If you are located in the European Economic Area (EEA) or UK, we process your personal data under the following legal bases:</p>
            <ul className="list-disc pl-5 space-y-2">
              <Li><strong className="text-white">Contract performance:</strong> Processing necessary to provide the services you signed up for.</Li>
              <Li><strong className="text-white">Legitimate interests:</strong> Improving the platform, preventing fraud, and ensuring security — where these interests are not overridden by your rights.</Li>
              <Li><strong className="text-white">Consent:</strong> Where you have explicitly consented (e.g. connecting your Instagram account, accepting cookies).</Li>
              <Li><strong className="text-white">Legal obligation:</strong> Where we are required to process data to comply with applicable law.</Li>
            </ul>
            <p>You may withdraw consent at any time by contacting us at <a href={`mailto:${email}`} className="hover:underline" style={{ color: GOLD }}>{email}</a>.</p>
          </Section>

          <Section num="5" title="We Will Never Sell or Share Your Information">
            <p>
              This is our core commitment: your personal information, account data, content, and usage activity will{" "}
              <strong className="text-white">never</strong> be sold, rented, traded, or shared with any third party for commercial purposes — ever.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <Li>We do not sell your data to advertisers, data brokers, or any external companies.</Li>
              <Li>We do not share your personal information with partners, affiliates, or sponsors.</Li>
              <Li>We do not use your data to build advertising profiles or target you with ads outside our platform.</Li>
              <Li>Your content, messages, and analytics are yours — we only use them to power the features you use inside Brandverse.</Li>
              <Li>The only time we may disclose information is if required by law (e.g. a valid court order), and even then we will notify you where legally permitted.</Li>
            </ul>
            <p>
              If you ever have concerns, email us at{" "}
              <a href={`mailto:${email}`} className="hover:underline" style={{ color: GOLD }}>{email}</a>{" "}
              and we will respond within 48 hours.
            </p>
          </Section>

          <Section num="6" title="Data Sharing & Disclosure">
            <p>We only share data in the following limited circumstances:</p>
            <ul className="list-disc pl-5 space-y-2">
              <Li><strong className="text-white">Service providers:</strong> We share data with third-party tools that power the platform (listed in Section 9). These providers are contractually bound to use your data only to provide their service to us.</Li>
              <Li><strong className="text-white">Legal requirements:</strong> We may disclose data if required by law, court order, or government authority. We will notify you where legally permitted.</Li>
              <Li><strong className="text-white">Business transfers:</strong> If Brandverse is acquired or merges with another company, your data may be transferred as part of that transaction. We will notify you in advance and you will have the right to delete your account.</Li>
              <Li><strong className="text-white">With your consent:</strong> We will share data with third parties only if you explicitly request or authorise it.</Li>
            </ul>
            <p>We never share data for advertising, marketing, or commercial purposes outside of operating this platform.</p>
          </Section>

          <Section num="7" title="Instagram & Meta Data Usage">
            <p>When you connect your Instagram account, we access data in accordance with Meta's Platform Policy:</p>
            <ul className="list-disc pl-5 space-y-2">
              <Li>We only access data you have explicitly authorised via OAuth.</Li>
              <Li>We use Instagram data solely to provide features within this platform (analytics, scheduling, DM tracking).</Li>
              <Li>We do not sell your Instagram data to any third party.</Li>
              <Li>We do not use your Instagram data to target advertising outside of this platform.</Li>
              <Li>Instagram access tokens are stored securely and used only to fetch your authorised data.</Li>
              <Li>You can revoke our access at any time via Instagram Settings → Apps and Websites.</Li>
              <Li>Upon account deletion, all stored Instagram tokens and associated data are permanently removed.</Li>
            </ul>
          </Section>

          <Section num="8" title="AI & Automated Processing">
            <p>
              Brandverse uses AI models (Groq, Anthropic Claude, OpenRouter) to power content generation, analysis, and planning features. Here is how this works:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <Li>When you use an AI feature, relevant context (your niche, goal, or content) is sent to the AI provider to generate a response.</Li>
              <Li>We do not send personally identifiable information (name, email, phone) to AI providers.</Li>
              <Li>AI-generated content is returned to you and stored in your account. It is not used to train AI models.</Li>
              <Li>No automated decisions that significantly affect you (e.g. account suspension) are made solely by AI — a human is always involved in such decisions.</Li>
              <Li>You have the right to request human review of any automated process that affects your account.</Li>
            </ul>
          </Section>

          <Section num="9" title="Third-Party Services">
            <p>We use the following third-party services. Each governs their own data use:</p>
            <ul className="list-disc pl-5 space-y-2">
              <Li><strong className="text-white">Meta / Instagram Graph API</strong> — Profile, post metrics, messaging. <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: GOLD }}>Meta Privacy Policy</a></Li>
              <Li><strong className="text-white">Apify</strong> — Public Instagram data for competitor analysis. <a href="https://apify.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: GOLD }}>Apify Privacy Policy</a></Li>
              <Li><strong className="text-white">Groq</strong> — AI content generation. <a href="https://groq.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: GOLD }}>Groq Privacy Policy</a></Li>
              <Li><strong className="text-white">Anthropic</strong> — AI deep analysis features. <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: GOLD }}>Anthropic Privacy Policy</a></Li>
              <Li><strong className="text-white">OpenRouter</strong> — AI analytics and reporting. <a href="https://openrouter.ai/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: GOLD }}>OpenRouter Privacy Policy</a></Li>
              <Li><strong className="text-white">Supabase / PostgreSQL</strong> — Secure database hosting for all platform data.</Li>
              <Li><strong className="text-white">Google APIs</strong> — YouTube data and image generation features.</Li>
              <Li><strong className="text-white">Nodemailer / Gmail SMTP</strong> — Transactional email delivery (OTP codes, notifications).</Li>
            </ul>
          </Section>

          <Section num="10" title="International Data Transfers">
            <p>
              Your data is stored in a PostgreSQL database hosted on Supabase infrastructure located in the{" "}
              <strong className="text-white">Asia-Pacific region (Japan)</strong>. AI processing may involve
              servers located in the United States (Groq, Anthropic, OpenRouter).
            </p>
            <p>
              If you are located in the EEA or UK, these transfers are made under appropriate safeguards
              including standard contractual clauses or equivalent data protection frameworks. By using
              Brandverse, you consent to your data being processed in these locations.
            </p>
          </Section>

          <Section num="11" title="Data Storage & Security">
            <p>We take security seriously and implement the following measures:</p>
            <ul className="list-disc pl-5 space-y-2">
              <Li><strong className="text-white">Encrypted connections:</strong> All data is transmitted over HTTPS/TLS.</Li>
              <Li><strong className="text-white">Hashed passwords:</strong> Passwords are stored using bcrypt — never in plain text and never visible to anyone, including admins.</Li>
              <Li><strong className="text-white">Session-based authentication:</strong> Secure, server-side sessions with signed cookies.</Li>
              <Li><strong className="text-white">OAuth tokens:</strong> Instagram access tokens are stored securely and never exposed client-side.</Li>
              <Li><strong className="text-white">Access controls:</strong> Role-based access ensures users can only access their own data.</Li>
              <Li><strong className="text-white">No plain-text secrets:</strong> All API keys and credentials are stored as environment variables, never in code.</Li>
            </ul>
            <p>
              While we implement industry-standard security measures, no system is 100% secure. We encourage
              you to use a strong, unique password and enable any available account security features.
            </p>
          </Section>

          <Section num="12" title="Security Breach Notification">
            <p>
              In the event of a data breach that affects your personal information, we will:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <Li>Notify affected users by email within <strong className="text-white">72 hours</strong> of becoming aware of the breach.</Li>
              <Li>Describe what data was affected, how it happened, and what we are doing to fix it.</Li>
              <Li>Notify relevant data protection authorities where required by law (e.g. GDPR).</Li>
              <Li>Take immediate steps to contain the breach and prevent further exposure.</Li>
            </ul>
            <p>
              If you suspect your account has been compromised, contact us immediately at{" "}
              <a href={`mailto:${email}`} className="hover:underline" style={{ color: GOLD }}>{email}</a>.
            </p>
          </Section>

          <Section num="13" title="Data Retention">
            <p>
              We retain your data for as long as your account is active. Specific retention periods:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <Li><strong className="text-white">Account data:</strong> Retained until you delete your account.</Li>
              <Li><strong className="text-white">Content & analytics:</strong> Retained until you delete your account or request removal.</Li>
              <Li><strong className="text-white">Messages:</strong> Retained until deleted by either party or account deletion.</Li>
              <Li><strong className="text-white">Referral data:</strong> Retained for 12 months after the referral event.</Li>
              <Li><strong className="text-white">Legal/compliance data:</strong> May be retained longer where required by law.</Li>
            </ul>
            <p>After account deletion, all personal data is permanently removed within <strong className="text-white">30 days</strong>.</p>
          </Section>

          <Section num="14" title="Account Deletion & Data Erasure">
            <p>You can delete your account at any time. Here's how:</p>
            <ul className="list-disc pl-5 space-y-2">
              <Li>Go to <strong className="text-white">Settings → Plan & Account → Delete Account</strong> inside the platform.</Li>
              <Li>Complete the short exit survey (required to process deletion).</Li>
              <Li>Your account and all associated data will be permanently deleted within 30 days.</Li>
            </ul>
            <p>Alternatively, email us at <a href={`mailto:${email}`} className="hover:underline" style={{ color: GOLD }}>{email}</a> with the subject "Account Deletion Request" and we will process it within 5 business days.</p>
            <p>Upon deletion, the following is permanently removed: your profile, content, messages, analytics data, Instagram tokens, and all associated records. Anonymised, aggregated data (e.g. platform usage statistics with no personal identifiers) may be retained.</p>
          </Section>

          <Section num="15" title="Cookies" id="cookies">
            <p>We use cookies to make Brandverse work. Here's exactly what we use:</p>
            <ul className="list-disc pl-5 space-y-2">
              <Li><strong className="text-white">Essential session cookies:</strong> Required to keep you logged in. Without these, the platform cannot function. These are never used for tracking.</Li>
              <Li><strong className="text-white">Referral cookies:</strong> If you arrive via a referral link, we store a short-lived cookie (30 days) to credit the referrer. No personal data is stored in this cookie.</Li>
              <Li><strong className="text-white">No tracking cookies:</strong> We do not use Google Analytics, Facebook Pixel, or any third-party tracking or advertising cookies.</Li>
              <Li><strong className="text-white">No profiling:</strong> We do not build behavioural profiles or share cookie data with any external party.</Li>
            </ul>
            <p>
              By continuing to use Brandverse, you consent to our use of essential cookies. You can clear
              cookies at any time through your browser settings — note that clearing session cookies will log you out.
            </p>
          </Section>

          <Section num="16" title="Marketing Communications">
            <p>
              We may send you emails related to your account, such as:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <Li><strong className="text-white">Transactional emails:</strong> OTP codes, password resets, account notifications. These are required for the platform to function and cannot be opted out of.</Li>
              <Li><strong className="text-white">Platform updates:</strong> New features, policy changes, and important announcements.</Li>
              <Li><strong className="text-white">Onboarding sequences:</strong> Automated emails to help you get started after signing up or upgrading.</Li>
            </ul>
            <p>
              To opt out of non-essential emails, click the unsubscribe link in any email or contact us at{" "}
              <a href={`mailto:${email}`} className="hover:underline" style={{ color: GOLD }}>{email}</a>.
              We will process opt-out requests within 5 business days.
            </p>
          </Section>

          <Section num="17" title="Referral Program Data">
            <p>
              If you participate in our referral program, we collect and store:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <Li>Your unique referral code and the link associated with it.</Li>
              <Li>Click data (IP address, timestamp, user agent) when someone clicks your referral link — used only to prevent fraud.</Li>
              <Li>Conversion data when a referred user signs up or upgrades — used to award credits.</Li>
            </ul>
            <p>
              Referral click data is retained for 12 months. IP addresses collected for fraud prevention
              are anonymised after 90 days. We do not share referral data with third parties.
            </p>
          </Section>

          <Section num="18" title="Payment Data">
            <p>
              Brandverse does not directly process or store payment card information. All payments are
              handled by our payment processor. We store only:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <Li>Your plan tier (free, starter, growth, pro, elite)</Li>
              <Li>Whether your plan has been confirmed</Li>
              <Li>Credit balance and transaction history within the platform</Li>
            </ul>
            <p>
              We never see, store, or have access to your full card number, CVV, or banking details.
            </p>
          </Section>

          <Section num="19" title="Your Rights">
            <p>You have the following rights regarding your personal data:</p>
            <ul className="list-disc pl-5 space-y-2">
              <Li><strong className="text-white">Right to access:</strong> Request a copy of all personal data we hold about you.</Li>
              <Li><strong className="text-white">Right to rectification:</strong> Request correction of inaccurate or incomplete data.</Li>
              <Li><strong className="text-white">Right to erasure:</strong> Request deletion of your personal data ("right to be forgotten").</Li>
              <Li><strong className="text-white">Right to restrict processing:</strong> Request that we limit how we use your data.</Li>
              <Li><strong className="text-white">Right to data portability:</strong> Receive a copy of your data in a machine-readable format (JSON/CSV).</Li>
              <Li><strong className="text-white">Right to object:</strong> Object to processing based on legitimate interests.</Li>
              <Li><strong className="text-white">Right to withdraw consent:</strong> Withdraw consent for any processing based on consent at any time.</Li>
              <Li><strong className="text-white">Right to human review:</strong> Request human review of any automated decision that affects you.</Li>
            </ul>
            <p>
              To exercise any of these rights, email{" "}
              <a href={`mailto:${email}`} className="hover:underline" style={{ color: GOLD }}>{email}</a>.
              We will respond within <strong className="text-white">30 days</strong>. We may ask you to verify your identity before processing the request.
            </p>
          </Section>

          <Section num="20" title="California Residents — CCPA">
            <p>
              If you are a California resident, you have additional rights under the California Consumer
              Privacy Act (CCPA):
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <Li><strong className="text-white">Right to know:</strong> Request disclosure of the categories and specific pieces of personal information we have collected about you.</Li>
              <Li><strong className="text-white">Right to delete:</strong> Request deletion of your personal information, subject to certain exceptions.</Li>
              <Li><strong className="text-white">Right to opt-out of sale:</strong> We do not sell personal information. There is nothing to opt out of.</Li>
              <Li><strong className="text-white">Right to non-discrimination:</strong> We will not discriminate against you for exercising your CCPA rights.</Li>
            </ul>
            <p>
              To submit a CCPA request, email{" "}
              <a href={`mailto:${email}`} className="hover:underline" style={{ color: GOLD }}>{email}</a>{" "}
              with the subject "CCPA Request". We will respond within 45 days.
            </p>
          </Section>

          <Section num="21" title="Admin Access Controls & Data Visibility">
            <p>
              Brandverse operates a tiered access control policy governing what our admin team can view:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <Li><strong className="text-white">Elite (Tier 5) clients:</strong> Admin has standard account management access for proactive support.</Li>
              <Li><strong className="text-white">Tier 1–4 clients:</strong> Admin visibility is restricted to name and email only. No content, usage details, or sensitive data is accessible by default.</Li>
              <Li><strong className="text-white">Passwords:</strong> Never stored in plain text. Stored as bcrypt hashes. Admins can only reset passwords, never retrieve them.</Li>
              <Li><strong className="text-white">Access requests:</strong> Any expanded admin access requires a logged internal request with a timestamp and reason. Clients may request an access log by emailing <a href={`mailto:${email}`} className="hover:underline" style={{ color: GOLD }}>{email}</a>.</Li>
              <Li><strong className="text-white">No tracking without consent:</strong> Admin cannot monitor Tier 1–4 client activity without first logging an access request.</Li>
            </ul>
          </Section>

          <Section num="22" title="Children's Privacy">
            <p>
              Brandverse is not intended for users under the age of 13. We do not knowingly collect
              personal information from children under 13. If we become aware that a child under 13 has
              provided us with personal data, we will delete it immediately. If you believe a child has
              provided us with their data, contact us at{" "}
              <a href={`mailto:${email}`} className="hover:underline" style={{ color: GOLD }}>{email}</a>.
            </p>
          </Section>

          <Section num="23" title="Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. When we do:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <Li>We will update the "Last updated" date at the top of this page.</Li>
              <Li>For significant changes, we will notify you by email and/or in-platform notification at least 14 days before the changes take effect.</Li>
              <Li>Continued use of the platform after changes constitutes acceptance of the updated policy.</Li>
              <Li>If you do not agree with the changes, you may delete your account before they take effect.</Li>
            </ul>
          </Section>

          <Section num="24" title="Contact">
            <p>For any questions, concerns, or requests regarding this Privacy Policy or your data:</p>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 mt-2 space-y-1">
              <p><strong className="text-white">Brandverse</strong></p>
              <p>Email: <a href={`mailto:${email}`} className="hover:underline" style={{ color: GOLD }}>{email}</a></p>
              <p className="text-zinc-500 text-sm">Response time: within 48 hours for general queries, 30 days for formal data requests.</p>
            </div>
          </Section>

        </div>

        <div className="mt-12 pt-8 border-t border-zinc-800 text-center text-zinc-500 text-sm">
          <p>© 2026 Brandverse. All rights reserved.</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <a href="/terms" className="hover:underline" style={{ color: GOLD }}>Terms of Service</a>
            <span>·</span>
            <a href={`mailto:${email}`} className="hover:underline" style={{ color: GOLD }}>Contact Us</a>
          </div>
        </div>
      </div>
    </div>
  );
}

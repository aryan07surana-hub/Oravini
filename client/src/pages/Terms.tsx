const GOLD = "#d4b461";
const email = "support.oravini@gmail.com";

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <section id={`section-${num}`}>
      <h2 className="text-xl font-semibold text-white mb-3">{num}. {title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default function Terms() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">

        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2" style={{ color: GOLD }}>Terms of Service</h1>
          <p className="text-zinc-400 text-sm">Last updated: June 1, 2026</p>
          <p className="text-zinc-500 text-sm mt-2">
            By accessing or using Brandverse, you agree to these Terms. If you do not agree, do not use the platform.
            Questions? Email <a href={`mailto:${email}`} className="hover:underline" style={{ color: GOLD }}>{email}</a>
          </p>
        </div>

        {/* TOC */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 mb-10">
          <p className="text-sm font-bold text-white mb-3">Table of Contents</p>
          <ol className="space-y-1.5 text-sm" style={{ color: GOLD }}>
            {[
              ["1","Agreement to Terms"],["2","Eligibility"],["3","Your Account"],
              ["4","Acceptable Use"],["5","Prohibited Conduct"],["6","Instagram & Meta Integration"],
              ["7","AI-Generated Content"],["8","Intellectual Property"],["9","Credits & Billing"],
              ["10","Refund Policy"],["11","Service Availability"],["12","Limitation of Liability"],
              ["13","Indemnification"],["14","Termination"],["15","Dispute Resolution"],
              ["16","Governing Law"],["17","Changes to Terms"],["18","Contact"],
            ].map(([n, t]) => (
              <li key={n}><a href={`#section-${n}`} className="hover:underline">{n}. {t}</a></li>
            ))}
          </ol>
        </div>

        <div className="space-y-10 text-zinc-300 leading-relaxed">

          <Section num="1" title="Agreement to Terms">
            <p>
              By creating an account or using the Brandverse Client Portal ("the Platform"), you confirm
              that you have read, understood, and agree to be bound by these Terms of Service and our{" "}
              <a href="/privacy" className="hover:underline" style={{ color: GOLD }}>Privacy Policy</a>.
              These Terms form a legally binding agreement between you and Brandverse.
            </p>
          </Section>

          <Section num="2" title="Eligibility">
            <p>To use Brandverse, you must:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Be at least 13 years of age (or the minimum age required in your jurisdiction)</li>
              <li>Have the legal capacity to enter into a binding agreement</li>
              <li>Not be prohibited from using the platform under applicable law</li>
              <li>Provide accurate and truthful information when creating your account</li>
            </ul>
            <p>By using the platform, you represent and warrant that you meet all eligibility requirements.</p>
          </Section>

          <Section num="3" title="Your Account">
            <ul className="list-disc pl-5 space-y-2">
              <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
              <li>You are fully responsible for all activity that occurs under your account.</li>
              <li>You must notify us immediately at <a href={`mailto:${email}`} className="hover:underline" style={{ color: GOLD }}>{email}</a> if you suspect unauthorised access.</li>
              <li>You may not share your account with others or create accounts on behalf of third parties without permission.</li>
              <li>We reserve the right to suspend accounts that show signs of unauthorised access or policy violations.</li>
            </ul>
          </Section>

          <Section num="4" title="Acceptable Use">
            <p>You agree to use the Platform only for lawful purposes and in accordance with these Terms. You must:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Use the platform only for its intended purpose — managing your social media growth and content strategy</li>
              <li>Comply with all applicable local, national, and international laws and regulations</li>
              <li>Respect the intellectual property rights of others</li>
              <li>Use AI-generated content responsibly and review it before publishing</li>
              <li>Keep your account information accurate and up to date</li>
            </ul>
          </Section>

          <Section num="5" title="Prohibited Conduct">
            <p>You must not:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Violate Meta's Platform Policy, Instagram's Terms of Use, or YouTube's Terms of Service</li>
              <li>Use the platform to spam, harass, or send unsolicited messages to others</li>
              <li>Attempt to gain unauthorised access to any part of the platform or its infrastructure</li>
              <li>Scrape, copy, reverse-engineer, or redistribute platform content or code without permission</li>
              <li>Use the platform to generate, distribute, or promote illegal, harmful, or offensive content</li>
              <li>Impersonate any person or entity or misrepresent your affiliation with any person or entity</li>
              <li>Introduce malware, viruses, or any malicious code into the platform</li>
              <li>Use the platform in any way that could damage, disable, or impair its operation</li>
              <li>Circumvent any security, access control, or rate-limiting measures</li>
              <li>Use AI tools to generate content that violates any third-party platform's policies</li>
            </ul>
            <p>Violation of these prohibitions may result in immediate account suspension or termination.</p>
          </Section>

          <Section num="6" title="Instagram & Meta Integration">
            <p>By connecting your Instagram account, you also agree to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><a href="https://www.facebook.com/terms.php" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: GOLD }}>Meta's Terms of Service</a></li>
              <li><a href="https://developers.facebook.com/policy/" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: GOLD }}>Meta Platform Policy</a></li>
              <li><a href="https://help.instagram.com/581066165581870" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: GOLD }}>Instagram Community Guidelines</a></li>
            </ul>
            <p>
              You are solely responsible for ensuring your use of Instagram features complies with Meta's
              policies. Brandverse is not liable for any account restrictions, bans, or penalties imposed
              by Meta or Instagram as a result of your use of the platform.
            </p>
          </Section>

          <Section num="7" title="AI-Generated Content">
            <p>
              AI-generated content (scripts, ideas, plans, analyses) provided by the platform is for
              informational and creative assistance only.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>You are solely responsible for reviewing, editing, and taking responsibility for any content you publish.</li>
              <li>Brandverse does not guarantee the accuracy, completeness, or suitability of AI-generated content.</li>
              <li>AI content may occasionally contain errors, outdated information, or inaccuracies — always review before use.</li>
              <li>You must not use AI tools to generate content that is defamatory, misleading, or violates any law.</li>
              <li>Brandverse is not liable for any consequences arising from your use or publication of AI-generated content.</li>
            </ul>
          </Section>

          <Section num="8" title="Intellectual Property">
            <ul className="list-disc pl-5 space-y-2">
              <li>The platform, including its design, code, branding, and features, is owned by Brandverse and protected by intellectual property laws.</li>
              <li>You retain full ownership of all content you upload, create, or generate through the platform.</li>
              <li>By using the platform, you grant Brandverse a limited, non-exclusive licence to process and display your content solely to provide the service to you.</li>
              <li>This licence does not allow us to sell, redistribute, or use your content for any purpose outside of operating the platform.</li>
              <li>You may not copy, reproduce, or distribute any part of the platform without our written permission.</li>
            </ul>
          </Section>

          <Section num="9" title="Credits & Billing">
            <ul className="list-disc pl-5 space-y-2">
              <li>Certain features require credits. Credits are deducted when you use AI tools, analytics, or other credit-based features.</li>
              <li>Credits are non-transferable and have no cash value.</li>
              <li>Your plan tier determines your monthly credit allowance. Credits reset on a monthly basis.</li>
              <li>Unused credits do not roll over to the next month unless otherwise stated.</li>
              <li>We reserve the right to adjust credit costs for features with reasonable notice.</li>
            </ul>
          </Section>

          <Section num="10" title="Refund Policy">
            <p>
              Due to the digital nature of the platform and the immediate access to features upon payment,
              all purchases are generally non-refundable. However:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>If you experience a technical issue that prevents you from accessing the platform, contact us within 7 days and we will review your case.</li>
              <li>Refund requests are evaluated on a case-by-case basis at our discretion.</li>
              <li>To request a refund, email <a href={`mailto:${email}`} className="hover:underline" style={{ color: GOLD }}>{email}</a> with your account details and reason.</li>
            </ul>
          </Section>

          <Section num="11" title="Service Availability">
            <p>
              We strive to maintain high availability but do not guarantee uninterrupted access. We may
              perform maintenance, updates, or experience downtime beyond our control. Third-party
              integrations (Instagram, Groq, Anthropic, Apify) are subject to their own availability
              and may affect platform features. We are not liable for any losses resulting from service
              interruptions.
            </p>
          </Section>

          <Section num="12" title="Limitation of Liability">
            <p>
              To the fullest extent permitted by applicable law, Brandverse and its team shall not be
              liable for any indirect, incidental, special, consequential, or punitive damages, including
              but not limited to:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Loss of profits, revenue, or business opportunities</li>
              <li>Loss of data or content</li>
              <li>Account restrictions imposed by Meta, Instagram, or YouTube</li>
              <li>Consequences of AI-generated content you publish</li>
              <li>Service interruptions or downtime</li>
            </ul>
            <p>
              Our total liability to you for any claim arising from your use of the platform shall not
              exceed the amount you paid to Brandverse in the 3 months preceding the claim.
            </p>
          </Section>

          <Section num="13" title="Indemnification">
            <p>
              You agree to indemnify, defend, and hold harmless Brandverse and its team from any claims,
              damages, losses, or expenses (including legal fees) arising from:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Your use of the platform in violation of these Terms</li>
              <li>Content you upload, create, or publish through the platform</li>
              <li>Your violation of any third-party rights or applicable law</li>
            </ul>
          </Section>

          <Section num="14" title="Termination">
            <ul className="list-disc pl-5 space-y-2">
              <li>We reserve the right to suspend or terminate your account at any time if you violate these Terms, with or without notice.</li>
              <li>You may delete your account at any time via Settings → Plan & Account → Delete Account, or by emailing <a href={`mailto:${email}`} className="hover:underline" style={{ color: GOLD }}>{email}</a>.</li>
              <li>Upon termination, your access to the platform will cease immediately.</li>
              <li>Sections relating to intellectual property, limitation of liability, and indemnification survive termination.</li>
            </ul>
          </Section>

          <Section num="15" title="Dispute Resolution">
            <p>
              In the event of a dispute, we ask that you first contact us at{" "}
              <a href={`mailto:${email}`} className="hover:underline" style={{ color: GOLD }}>{email}</a>{" "}
              to attempt to resolve the matter informally. We will respond within 10 business days.
              If the dispute cannot be resolved informally, both parties agree to pursue resolution
              through mediation before initiating formal legal proceedings.
            </p>
          </Section>

          <Section num="16" title="Governing Law">
            <p>
              These Terms are governed by and construed in accordance with applicable law. Any unresolved
              disputes shall be subject to the exclusive jurisdiction of the courts in the applicable
              territory. If any provision of these Terms is found to be unenforceable, the remaining
              provisions will continue in full force and effect.
            </p>
          </Section>

          <Section num="17" title="Changes to Terms">
            <ul className="list-disc pl-5 space-y-2">
              <li>We may update these Terms from time to time. We will update the "Last updated" date at the top.</li>
              <li>For material changes, we will notify you by email at least 14 days before they take effect.</li>
              <li>Continued use of the platform after changes constitutes acceptance of the revised Terms.</li>
              <li>If you do not agree with the changes, you may delete your account before they take effect.</li>
            </ul>
          </Section>

          <Section num="18" title="Contact">
            <p>For questions about these Terms:</p>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 mt-2 space-y-1">
              <p><strong className="text-white">Brandverse</strong></p>
              <p>Email: <a href={`mailto:${email}`} className="hover:underline" style={{ color: GOLD }}>{email}</a></p>
              <p className="text-zinc-500 text-sm">Response time: within 48 hours.</p>
            </div>
          </Section>

        </div>

        <div className="mt-12 pt-8 border-t border-zinc-800 text-center text-zinc-500 text-sm">
          <p>© 2026 Brandverse. All rights reserved.</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <a href="/privacy" className="hover:underline" style={{ color: GOLD }}>Privacy Policy</a>
            <span>·</span>
            <a href={`mailto:${email}`} className="hover:underline" style={{ color: GOLD }}>Contact Us</a>
          </div>
        </div>
      </div>
    </div>
  );
}

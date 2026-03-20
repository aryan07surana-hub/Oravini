export default function Terms() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-[#d4b461] mb-2">Terms of Service</h1>
          <p className="text-zinc-400 text-sm">Last updated: March 20, 2026</p>
        </div>

        <div className="space-y-8 text-zinc-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Agreement to Terms</h2>
            <p>
              By accessing or using the Brandverse Client Portal ("the Platform"), you agree to be bound
              by these Terms of Service. If you do not agree to these terms, do not use the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Use of the Platform</h2>
            <p className="mb-2">You agree to use the Platform only for lawful purposes. You must not:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Violate any applicable laws or regulations</li>
              <li>Violate Meta's Platform Policy or Instagram's Terms of Use</li>
              <li>Use the Platform to spam, harass, or send unsolicited messages</li>
              <li>Attempt to gain unauthorised access to any part of the Platform</li>
              <li>Scrape, copy, or redistribute Platform content without permission</li>
              <li>Use the Platform to infringe on any intellectual property rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials. You
              are fully responsible for all activity that occurs under your account. Notify us immediately
              at{" "}
              <a href="mailto:support@brandverse.co" className="text-[#d4b461] hover:underline">
                support@brandverse.co
              </a>{" "}
              if you suspect unauthorised access.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Instagram and Meta Integration</h2>
            <p className="mb-2">
              The Platform integrates with Instagram and Meta's APIs. By using these features, you also
              agree to be bound by:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <a
                  href="https://www.facebook.com/terms.php"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#d4b461] hover:underline"
                >
                  Meta's Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="https://developers.facebook.com/policy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#d4b461] hover:underline"
                >
                  Meta Platform Policy
                </a>
              </li>
              <li>
                <a
                  href="https://help.instagram.com/581066165581870"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#d4b461] hover:underline"
                >
                  Instagram's Community Guidelines
                </a>
              </li>
            </ul>
            <p className="mt-3">
              You are solely responsible for ensuring your use of Instagram automation features complies
              with Meta's policies. Brandverse is not liable for any account restrictions imposed by Meta
              or Instagram.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. AI-Generated Content</h2>
            <p>
              AI-generated content (scripts, ideas, analyses) provided by the Platform is for informational
              and creative assistance purposes only. You are solely responsible for reviewing, editing,
              and taking responsibility for any content you publish. Brandverse does not guarantee the
              accuracy, completeness, or suitability of AI-generated content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Intellectual Property</h2>
            <p>
              The Platform, including its design, code, and content, is owned by Brandverse and is
              protected by intellectual property laws. You retain ownership of all content you upload
              or create through the Platform. By using the Platform, you grant us a limited licence to
              process and display your content solely to provide the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, Brandverse shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages, including but not limited to loss
              of profits, data, or business opportunities, arising from your use of the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Service Availability</h2>
            <p>
              We strive to maintain high availability of the Platform but do not guarantee uninterrupted
              access. We may perform maintenance, updates, or experience downtime beyond our control.
              Third-party integrations (Instagram, Apify, Groq, OpenRouter) are subject to their own
              availability and may affect Platform features.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account at any time if you violate these
              Terms. You may also request account deletion by contacting us at{" "}
              <a href="mailto:support@brandverse.co" className="text-[#d4b461] hover:underline">
                support@brandverse.co
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the Platform after changes
              constitutes your acceptance of the revised Terms. We will notify you of material changes
              via email or in-platform notification.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Governing Law</h2>
            <p>
              These Terms are governed by and construed in accordance with applicable law. Any disputes
              shall be resolved through good-faith negotiation before pursuing formal legal action.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">12. Contact</h2>
            <p>
              For questions about these Terms:
            </p>
            <p className="mt-2">
              Email:{" "}
              <a href="mailto:support@brandverse.co" className="text-[#d4b461] hover:underline">
                support@brandverse.co
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-zinc-800 text-center text-zinc-500 text-sm">
          <p>© 2026 Brandverse. All rights reserved.</p>
          <a href="/privacy" className="text-[#d4b461] hover:underline mt-1 inline-block">
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
}

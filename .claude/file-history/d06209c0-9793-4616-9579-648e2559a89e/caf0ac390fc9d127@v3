"use client";
// Force deployment: Complete Enterprise landing with ROI Calculator & Chatbot

import { useState } from "react";
import styles from "./tier5.module.css";

export default function Tier5Page() {
  const [activeTab, setActiveTab] = useState<"30" | "60" | "90">("30");
  
  // ROI Calculator State
  const [monthlyRevenue, setMonthlyRevenue] = useState(50000);
  const [hoursOnContent, setHoursOnContent] = useState(20);
  const [hourlyRate, setHourlyRate] = useState(250);
  const [monthlyLeads, setMonthlyLeads] = useState(100);
  const [closeRate, setCloseRate] = useState(10);
  const [showROI, setShowROI] = useState(true);
  
  // Chatbot State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{role: 'bot' | 'user', text: string}>>([{
    role: 'bot',
    text: "Hey! 👋 I'm here to help you understand our custom platform development. What questions do you have?"
  }]);
  const [userInput, setUserInput] = useState("");
  
  // ROI Calculations
  const timeSaved = hoursOnContent * 0.75;
  const timeSavedValue = (timeSaved * 4 * hourlyRate);
  const currentSales = (monthlyLeads * closeRate) / 100;
  const improvedCloseRate = closeRate * 1.3;
  const newSales = (monthlyLeads * improvedCloseRate) / 100;
  const extraSales = newSales - currentSales;
  const avgDealSize = monthlyRevenue / currentSales || 5000;
  const extraRevenue = extraSales * avgDealSize;
  const totalValue = timeSavedValue + extraRevenue;
  
  const calculateROI = () => {
    setShowROI(true);
  };
  
  // Chatbot Logic
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    
    const newMessages = [...chatMessages, { role: 'user' as const, text: userInput }];
    setChatMessages(newMessages);
    
    const response = getBotResponse(userInput.toLowerCase());
    
    setTimeout(() => {
      setChatMessages([...newMessages, { role: 'bot' as const, text: response }]);
    }, 500);
    
    setUserInput("");
  };
  
  const getBotResponse = (input: string): string => {
    if (input.includes('price') || input.includes('cost') || input.includes('how much')) {
      return "Investment varies based on your specific needs and platform complexity. We'll discuss pricing on the discovery call after understanding your requirements. Think of this as building your business's core infrastructure.";
    }
    
    if (input.includes('feature') || input.includes('include') || input.includes('what do i get')) {
      return "You get: Custom-built software platform, AI workers & automation, custom CRM, course delivery system, marketing automation, analytics, and ongoing development. Everything is built specifically for YOUR business!";
    }
    
    if (input.includes('platform') || input.includes('custom') || input.includes('build')) {
      return "We build you a proprietary software platform from scratch—not white-labeling. It's 100% your brand, designed around your methodology, with AI workers and automation built specifically for your processes.";
    }
    
    if (input.includes('who') || input.includes('right for me') || input.includes('qualify')) {
      return "This is for established coaches, consultants, course creators, and info entrepreneurs doing $10K+/month who want to scale with their own proprietary technology.";
    }
    
    if (input.includes('call') || input.includes('demo') || input.includes('meeting')) {
      return "The platform discovery call is a free session where we dive deep into your business, sketch out what your custom platform could look like, and discuss investment & timeline. Ready to book? Click the button above!";
    }
    
    if (input.includes('timeline') || input.includes('how long') || input.includes('when')) {
      return "Most platforms are built in 90 days: Days 1-30 (Discovery & Architecture), Days 31-60 (Development), Days 61-90 (Testing & Launch). Then we provide ongoing development as you grow.";
    }
    
    return "Great question! I'd recommend booking a free platform discovery call so we can dive deeper into your specific situation. Or feel free to ask me about: platform features, timeline, who it's for, or anything else!";
  };

  return (
    <main className={styles.page}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>Enterprise Solution</p>
          <h1>Scale Your Info Offer Without the Overwhelm</h1>
          <p className={styles.lede}>
            We help coaches, consultants, and info entrepreneurs scale to 7-figures with unlimited AI automation, sales team enablement, and white-glove support. Stop trading time for money. Start building a real business.
          </p>
          <div className={styles.heroCTA}>
            <a href="https://calendly.com/your-link" className={styles.primaryButton} target="_blank" rel="noopener noreferrer">
              📅 Book Your Strategy Call
            </a>
            <a href="#roi-calculator" className={styles.secondaryButton}>
              📊 Calculate Your ROI ↓
            </a>
            <p className={styles.ctaNote}>Free 30-minute consultation • No pressure, just value</p>
          </div>
        </div>
        <div className={styles.heroVideo}>
          <div className={styles.videoWrapper}>
            <div className={styles.videoPlaceholder}>
              <span>🎥</span>
              <p>Your VSL Video Goes Here</p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive ROI Calculator */}
      <section id="roi-calculator" className={styles.roiCalculatorSection}>
        <div className={styles.sectionHeader}>
          <h2>Calculate Your Platform ROI</h2>
          <p className={styles.subtitle}>See how much value a custom platform brings to YOUR business</p>
        </div>

        <div className={styles.calculatorCard}>
          <div className={styles.calculatorInputs}>
            <h3>Tell us about your business:</h3>

            <div className={styles.inputGroup}>
              <label>
                💰 Monthly Revenue:
                <div className={styles.inputWrapper}>
                  <span className={styles.inputPrefix}>$</span>
                  <input
                    type="number"
                    value={monthlyRevenue}
                    onChange={(e) => setMonthlyRevenue(Number(e.target.value))}
                    min="0"
                  />
                </div>
              </label>
            </div>

            <div className={styles.inputGroup}>
              <label>
                ⏰ Hours/week on manual tasks:
                <div className={styles.inputWrapper}>
                  <input
                    type="number"
                    value={hoursOnContent}
                    onChange={(e) => setHoursOnContent(Number(e.target.value))}
                    min="0"
                  />
                  <span className={styles.inputSuffix}>hours</span>
                </div>
              </label>
            </div>

            <div className={styles.inputGroup}>
              <label>
                💵 Your hourly rate:
                <div className={styles.inputWrapper}>
                  <span className={styles.inputPrefix}>$</span>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(Number(e.target.value))}
                    min="0"
                  />
                  <span className={styles.inputSuffix}>/hr</span>
                </div>
              </label>
            </div>

            <div className={styles.inputGroup}>
              <label>
                📊 Monthly leads:
                <div className={styles.inputWrapper}>
                  <input
                    type="number"
                    value={monthlyLeads}
                    onChange={(e) => setMonthlyLeads(Number(e.target.value))}
                    min="0"
                  />
                  <span className={styles.inputSuffix}>leads</span>
                </div>
              </label>
            </div>

            <div className={styles.inputGroup}>
              <label>
                📈 Current close rate:
                <div className={styles.inputWrapper}>
                  <input
                    type="number"
                    value={closeRate}
                    onChange={(e) => setCloseRate(Number(e.target.value))}
                    min="0"
                    max="100"
                  />
                  <span className={styles.inputSuffix}>%</span>
                </div>
              </label>
            </div>

            <button className={styles.calculateButton} onClick={calculateROI}>
              Recalculate My ROI
            </button>
          </div>

          {showROI && (
            <div className={styles.calculatorResults}>
              <h3>🎯 Your Platform ROI</h3>

              <div className={styles.resultCard}>
                <div className={styles.resultRow}>
                  <span>💰 Time Saved Value:</span>
                  <strong>${timeSavedValue.toLocaleString()}/mo</strong>
                </div>
                <p className={styles.resultDetail}>
                  Save {timeSaved.toFixed(1)} hours/week × ${hourlyRate}/hr = ${(timeSaved * hourlyRate).toLocaleString()}/week
                </p>
              </div>

              <div className={styles.resultCard}>
                <div className={styles.resultRow}>
                  <span>📈 Extra Revenue:</span>
                  <strong>${extraRevenue.toLocaleString()}/mo</strong>
                </div>
                <p className={styles.resultDetail}>
                  {extraSales.toFixed(1)} extra sales/month × ${avgDealSize.toLocaleString()} avg deal size
                </p>
              </div>

              <div className={styles.resultDivider}></div>

              <div className={styles.resultRow}>
                <span>✅ Total Monthly Value:</span>
                <strong className={styles.totalValue}>${totalValue.toLocaleString()}</strong>
              </div>

              <div className={styles.roiHighlight}>
                <p>That&apos;s massive value from automation and AI workers! 🎉</p>
                <p className={styles.roiNote}>
                  And this doesn&apos;t even count the competitive advantage of having your own proprietary platform.
                </p>
              </div>

              <a href="https://calendly.com/your-link" className={styles.primaryButton} target="_blank" rel="noopener noreferrer">
                Book My Platform Discovery Call →
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Before/After Section */}
      <section className={styles.beforeAfterSection}>
        <div className={styles.sectionHeader}>
          <h2>Before vs After: The Transformation</h2>
          <p className={styles.subtitle}>See what happens when you have your own custom-built platform</p>
        </div>
        <div className={styles.beforeAfterGrid}>
          <div className={styles.beforeCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardIcon}>😰</span>
              <h3>Before: Using Generic Tools</h3>
            </div>
            <ul className={styles.beforeAfterList}>
              <li>❌ Juggling 10+ different software tools</li>
              <li>❌ Manual processes eating 30+ hours/week</li>
              <li>❌ Generic automation that doesn't fit your methodology</li>
              <li>❌ Clients see you're using off-the-shelf software</li>
              <li>❌ Limited by what existing tools can do</li>
              <li>❌ Paying $500-2000/mo for multiple subscriptions</li>
              <li>❌ Can't scale without hiring more people</li>
              <li>❌ No competitive advantage in your niche</li>
            </ul>
          </div>
          <div className={styles.afterCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardIcon}>🚀</span>
              <h3>After: Your Custom Platform</h3>
            </div>
            <ul className={styles.beforeAfterList}>
              <li>✅ One unified platform built specifically for YOU</li>
              <li>✅ AI workers handling 80% of repetitive tasks</li>
              <li>✅ Custom automation matching your exact processes</li>
              <li>✅ Clients think YOU built this proprietary technology</li>
              <li>✅ Unlimited possibilities—we build what you need</li>
              <li>✅ One platform, one system, fully integrated</li>
              <li>✅ Scale to 10x clients without adding team members</li>
              <li>✅ Proprietary platform = unbeatable competitive moat</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Solution Overview */}
      <section className={styles.solutionSection}>
        <div className={styles.solutionContent}>
          <p className={styles.eyebrow}>The Complete Solution</p>
          <h2>Everything You Need to Scale Your Info Business</h2>
          <p className={styles.solutionLede}>
            We give you the complete infrastructure to scale your coaching, consulting, or info business—from AI-powered content creation to sales automation and white-glove support. Stop trading time for money. Start building a real business.
          </p>
          <div className={styles.solutionHighlights}>
            <div className={styles.highlight}>
              <span>♾️</span>
              <div>
                <h4>Unlimited AI Automation</h4>
                <p>Create unlimited content, automate workflows, and scale without limits</p>
              </div>
            </div>
            <div className={styles.highlight}>
              <span>👥</span>
              <div>
                <h4>Sales Team Enablement</h4>
                <p>CRM, lead management, and automated follow-ups that actually convert</p>
              </div>
            </div>
            <div className={styles.highlight}>
              <span>🎯</span>
              <div>
                <h4>White-Glove Support</h4>
                <p>Dedicated account manager, custom SLA, and priority everything</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What We Do For You */}
      <section className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <h2>Everything We Do For You</h2>
          <p className={styles.subtitle}>The complete toolkit to scale your info business</p>
        </div>

        <div className={styles.featuresList}>
          {/* Sales Team Enablement */}
          <div className={styles.featureBlock}>
            <div className={styles.featureIcon}>📊</div>
            <div className={styles.featureContent}>
              <h3>Sales Team Enablement</h3>
              <p>Empower your sales team with enterprise-grade tools that close more deals</p>
              <ul>
                <li>✓ Full CRM integration with your existing tools</li>
                <li>✓ Automated lead scoring and qualification</li>
                <li>✓ Smart follow-up sequences that convert</li>
                <li>✓ Real-time pipeline visibility and reporting</li>
                <li>✓ Team performance analytics and coaching insights</li>
                <li>✓ Custom sales playbooks and scripts</li>
              </ul>
            </div>
          </div>

          {/* Content Production at Scale */}
          <div className={styles.featureBlock}>
            <div className={styles.featureIcon}>🚀</div>
            <div className={styles.featureContent}>
              <h3>Content Production at Scale</h3>
              <p>Create unlimited content across all platforms without the time investment</p>
              <ul>
                <li>✓ Unlimited AI credits—no caps, no limits</li>
                <li>✓ Batch content creation for weeks in advance</li>
                <li>✓ Multi-platform distribution (Instagram, LinkedIn, YouTube, TikTok)</li>
                <li>✓ AI-powered video generation and editing</li>
                <li>✓ Content calendar automation</li>
                <li>✓ Brand voice consistency across all content</li>
              </ul>
            </div>
          </div>

          {/* Info Product Management */}
          <div className={styles.featureBlock}>
            <div className={styles.featureIcon}>📚</div>
            <div className={styles.featureContent}>
              <h3>Info Product Management</h3>
              <p>Host, deliver, and manage all your digital products in one place</p>
              <ul>
                <li>✓ Course hosting with unlimited storage</li>
                <li>✓ Membership site builder with custom branding</li>
                <li>✓ Digital product delivery and licensing</li>
                <li>✓ Drip content scheduling and automation</li>
                <li>✓ Student progress tracking and engagement</li>
                <li>✓ Integrated payment processing and invoicing</li>
              </ul>
            </div>
          </div>

          {/* Mentorship & Coaching Tools */}
          <div className={styles.featureBlock}>
            <div className={styles.featureIcon}>🎓</div>
            <div className={styles.featureContent}>
              <h3>Mentorship & Coaching Tools</h3>
              <p>Manage your coaching clients and mentorship programs effortlessly</p>
              <ul>
                <li>✓ Advanced scheduling with Calendly integration</li>
                <li>✓ Client portal with progress tracking</li>
                <li>✓ Session notes and action item management</li>
                <li>✓ Automated check-ins and accountability</li>
                <li>✓ Resource library for clients</li>
                <li>✓ Group coaching and cohort management</li>
              </ul>
            </div>
          </div>

          {/* White-Glove Support */}
          <div className={styles.featureBlock}>
            <div className={styles.featureIcon}>💎</div>
            <div className={styles.featureContent}>
              <h3>White-Glove Support</h3>
              <p>You're not just a customer—you're a partner. We're invested in your success</p>
              <ul>
                <li>✓ Dedicated account manager (direct line access)</li>
                <li>✓ Custom SLA with guaranteed response times</li>
                <li>✓ Priority support across all channels</li>
                <li>✓ Quarterly strategy sessions</li>
                <li>✓ Custom feature development for your needs</li>
                <li>✓ White-glove onboarding and migration</li>
              </ul>
            </div>
          </div>

          {/* Advanced Analytics */}
          <div className={styles.featureBlock}>
            <div className={styles.featureIcon}>📈</div>
            <div className={styles.featureContent}>
              <h3>Advanced Analytics & Optimization</h3>
              <p>Data-driven insights to optimize every part of your business</p>
              <ul>
                <li>✓ Revenue tracking and forecasting</li>
                <li>✓ Conversion funnel optimization</li>
                <li>✓ Team performance dashboards</li>
                <li>✓ Content performance analytics</li>
                <li>✓ Customer lifetime value tracking</li>
                <li>✓ Custom reporting and data exports</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Build Timeline */}
      <section className={styles.expectationSection}>
        <div className={styles.sectionHeader}>
          <h2>What to Expect: Your First 90 Days</h2>
          <p className={styles.subtitle}>We set clear expectations—here's exactly what happens</p>
        </div>

        <div className={styles.tabButtons}>
          <button 
            className={`${styles.tabButton} ${activeTab === "30" ? styles.active : ""}`}
            onClick={() => setActiveTab("30")}
          >
            First 30 Days
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === "60" ? styles.active : ""}`}
            onClick={() => setActiveTab("60")}
          >
            Days 31-60
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === "90" ? styles.active : ""}`}
            onClick={() => setActiveTab("90")}
          >
            Days 61-90
          </button>
        </div>

        <div className={styles.tabContent}>
          {activeTab === "30" && (
            <div className={styles.timelineContent}>
              <h3>🚀 Foundation & Setup</h3>
              <div className={styles.timelineGrid}>
                <div className={styles.timelineItem}>
                  <span className={styles.week}>Week 1</span>
                  <h4>Onboarding & Discovery</h4>
                  <ul>
                    <li>Kickoff call with your dedicated account manager</li>
                    <li>Deep-dive into your business, goals, and challenges</li>
                    <li>Account setup and team access configuration</li>
                    <li>Integration planning (CRM, tools, platforms)</li>
                  </ul>
                </div>
                <div className={styles.timelineItem}>
                  <span className={styles.week}>Week 2</span>
                  <h4>System Integration</h4>
                  <ul>
                    <li>Connect your existing tools and platforms</li>
                    <li>Import your content, courses, and client data</li>
                    <li>Set up your sales pipeline and workflows</li>
                    <li>Configure automation rules and triggers</li>
                  </ul>
                </div>
                <div className={styles.timelineItem}>
                  <span className={styles.week}>Week 3</span>
                  <h4>Team Training</h4>
                  <ul>
                    <li>Live training sessions for you and your team</li>
                    <li>Sales team enablement workshop</li>
                    <li>Content creation workflow setup</li>
                    <li>Best practices and optimization tips</li>
                  </ul>
                </div>
                <div className={styles.timelineItem}>
                  <span className={styles.week}>Week 4</span>
                  <h4>Go Live</h4>
                  <ul>
                    <li>Launch your first automated campaigns</li>
                    <li>Start creating content at scale</li>
                    <li>Sales team begins using new tools</li>
                    <li>First check-in and optimization session</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === "60" && (
            <div className={styles.timelineContent}>
              <h3>📈 Optimization & Growth</h3>
              <div className={styles.timelineGrid}>
                <div className={styles.timelineItem}>
                  <span className={styles.week}>Week 5-6</span>
                  <h4>Data Collection & Analysis</h4>
                  <ul>
                    <li>Monitor performance across all systems</li>
                    <li>Identify bottlenecks and opportunities</li>
                    <li>A/B test content and sales approaches</li>
                    <li>Refine automation workflows</li>
                  </ul>
                </div>
                <div className={styles.timelineItem}>
                  <span className={styles.week}>Week 7-8</span>
                  <h4>Scale & Optimize</h4>
                  <ul>
                    <li>Increase content production volume</li>
                    <li>Optimize sales conversion rates</li>
                    <li>Launch new campaigns and funnels</li>
                    <li>Expand to additional platforms</li>
                  </ul>
                </div>
              </div>
              <div className={styles.milestone}>
                <h4>🎯 60-Day Milestone Goals:</h4>
                <ul>
                  <li>✓ 3x content output without additional time investment</li>
                  <li>✓ 20%+ improvement in sales conversion rates</li>
                  <li>✓ Fully automated lead nurture sequences</li>
                  <li>✓ Team operating independently with systems</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "90" && (
            <div className={styles.timelineContent}>
              <h3>🚀 Full Scale & Expansion</h3>
              <div className={styles.timelineGrid}>
                <div className={styles.timelineItem}>
                  <span className={styles.week}>Week 9-12</span>
                  <h4>Advanced Strategies</h4>
                  <ul>
                    <li>Launch advanced automation sequences</li>
                    <li>Implement predictive analytics</li>
                    <li>Scale to new markets or offerings</li>
                    <li>Custom feature development (if needed)</li>
                  </ul>
                </div>
                <div className={styles.timelineItem}>
                  <span className={styles.week}>Week 13+</span>
                  <h4>Continuous Growth</h4>
                  <ul>
                    <li>Quarterly strategy sessions</li>
                    <li>Ongoing optimization and refinement</li>
                    <li>New feature rollouts and updates</li>
                    <li>Scale support as you grow</li>
                  </ul>
                </div>
              </div>
              <div className={styles.milestone}>
                <h4>🎯 90-Day Success Metrics:</h4>
                <ul>
                  <li>✓ 5x+ content production capacity</li>
                  <li>✓ 30%+ increase in qualified leads</li>
                  <li>✓ 25%+ improvement in close rates</li>
                  <li>✓ 10+ hours/week saved on manual tasks</li>
                  <li>✓ Clear path to next revenue milestone</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section className={styles.faqSection}>
        <div className={styles.sectionHeader}>
          <h2>Frequently Asked Questions</h2>
          <p className={styles.subtitle}>Everything you need to know about Enterprise</p>
        </div>

        <div className={styles.faqGrid}>
          <div className={styles.faqItem}>
            <h3>Who is Enterprise for?</h3>
            <p>
              Enterprise is designed for established info entrepreneurs, coaches, course creators, and digital product sellers who are ready to scale. If you're doing $10K+/month and feeling the growing pains of manual processes, Enterprise is for you.
            </p>
          </div>

          <div className={styles.faqItem}>
            <h3>How is this different from the Pro plan?</h3>
            <p>
              Enterprise includes unlimited AI credits (vs 500), dedicated account manager, custom SLA, white-glove onboarding, quarterly strategy sessions, and custom feature development. You also get priority access to new features and direct line to our team.
            </p>
          </div>

          <div className={styles.faqItem}>
            <h3>What happens on the strategy call?</h3>
            <p>
              We'll dive deep into your business, understand your goals and challenges, and create a custom roadmap for your success. No pressure, no sales pitch—just a genuine conversation about how we can help you scale. If it's not a fit, we'll tell you.
            </p>
          </div>

          <div className={styles.faqItem}>
            <h3>Can I migrate from another platform?</h3>
            <p>
              Absolutely! Our white-glove onboarding includes full migration support. We'll help you move your content, courses, client data, and integrations. Our team handles the heavy lifting so you can focus on your business.
            </p>
          </div>

          <div className={styles.faqItem}>
            <h3>What integrations do you support?</h3>
            <p>
              We integrate with all major platforms: Stripe, PayPal, Calendly, Zoom, Slack, HubSpot, Salesforce, Zapier, and more. Need a custom integration? We'll build it for you as part of Enterprise.
            </p>
          </div>

          <div className={styles.faqItem}>
            <h3>Is there a contract or can I cancel anytime?</h3>
            <p>
              No long-term contracts required. You can cancel anytime. We also offer a 30-day money-back guarantee—if you're not seeing value, we'll refund you, no questions asked.
            </p>
          </div>

          <div className={styles.faqItem}>
            <h3>How quickly can I get started?</h3>
            <p>
              Most clients are fully onboarded within 2-3 weeks. We move as fast as you do. Some clients prefer a slower rollout, others want to go all-in immediately. We adapt to your timeline and needs.
            </p>
          </div>

          <div className={styles.faqItem}>
            <h3>What kind of support do I get?</h3>
            <p>
              You get a dedicated account manager with direct access (email, Slack, or phone). Custom SLA with guaranteed response times. Priority support across all channels. Plus quarterly strategy sessions to ensure you're maximizing the platform.
            </p>
          </div>
        </div>
      </section>

      {/* Custom Platform Add-On Section */}
      <section className={styles.customPlatformSection}>
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>For Serious Scalers</p>
          <h2>Want Us to Build Your Own Software Platform?</h2>
          <p className={styles.subtitle}>Take it to the next level with a proprietary platform built specifically for your business</p>
        </div>

        <div className={styles.platformContent}>
          <p className={styles.platformLede}>
            Beyond our Enterprise solution, we also build custom software platforms for select clients who want to take their info business to the absolute next level. If you want proprietary technology that becomes your competitive advantage, let's talk.
          </p>

          <div className={styles.platformFeatures}>
            <div className={styles.platformFeature}>
              <span>🏗️</span>
              <div>
                <h4>Custom-Built Platform</h4>
                <p>We build you a proprietary software platform from scratch—100% your brand, designed around your methodology</p>
              </div>
            </div>
            <div className={styles.platformFeature}>
              <span>🤖</span>
              <div>
                <h4>AI Workers & Automation</h4>
                <p>Custom AI agents trained on your content and processes, automating 80% of repetitive tasks</p>
              </div>
            </div>
            <div className={styles.platformFeature}>
              <span>⚡</span>
              <div>
                <h4>Ongoing Development</h4>
                <p>We keep building and improving your platform as your business grows—you're never stuck</p>
              </div>
            </div>
          </div>

          <div className={styles.platformCTA}>
            <p>Interested in a custom platform? Let's discuss it on your strategy call.</p>
            <a href="https://calendly.com/your-link" className={styles.primaryButton} target="_blank" rel="noopener noreferrer">
              Book Your Strategy Call
            </a>
          </div>
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section className={styles.socialProofSection}>
        <div className={styles.sectionHeader}>
          <h2>Real Results from Custom Platforms</h2>
          <p className={styles.subtitle}>See how custom platforms transform info businesses</p>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <h3>10x</h3>
            <p>Scale capacity without hiring</p>
          </div>
          <div className={styles.statCard}>
            <h3>80%</h3>
            <p>Tasks automated by AI workers</p>
          </div>
          <div className={styles.statCard}>
            <h3>90 days</h3>
            <p>From discovery to launch</p>
          </div>
          <div className={styles.statCard}>
            <h3>100%</h3>
            <p>Your brand, your platform</p>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className={styles.comparisonSection}>
        <div className={styles.sectionHeader}>
          <h2>Generic Tools vs Custom Platform</h2>
          <p className={styles.subtitle}>See the difference a custom-built platform makes</p>
        </div>

        <div className={styles.comparisonTable}>
          <div className={styles.comparisonHeader}>
            <div className={styles.comparisonCell}></div>
            <div className={styles.comparisonCell}>
              <h3>Generic SaaS</h3>
              <p className={styles.comparisonPrice}>$500-2000/mo</p>
            </div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>
              <h3>Custom Platform</h3>
              <p className={styles.comparisonPrice}>Custom Investment</p>
              <span className={styles.recommendedBadge}>Recommended</span>
            </div>
          </div>

          <div className={styles.comparisonRow}>
            <div className={styles.comparisonCell}><strong>Platform Type</strong></div>
            <div className={styles.comparisonCell}>Shared SaaS</div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>Built for YOU</div>
          </div>

          <div className={styles.comparisonRow}>
            <div className={styles.comparisonCell}><strong>Branding</strong></div>
            <div className={styles.comparisonCell}>Their brand</div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>100% Your Brand</div>
          </div>

          <div className={styles.comparisonRow}>
            <div className={styles.comparisonCell}><strong>Features</strong></div>
            <div className={styles.comparisonCell}>What they built</div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>What YOU need</div>
          </div>

          <div className={styles.comparisonRow}>
            <div className={styles.comparisonCell}><strong>AI Workers</strong></div>
            <div className={styles.comparisonCell}>Generic AI</div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>Trained on YOUR methodology</div>
          </div>

          <div className={styles.comparisonRow}>
            <div className={styles.comparisonCell}><strong>Automation</strong></div>
            <div className={styles.comparisonCell}>Pre-built workflows</div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>Custom to your processes</div>
          </div>

          <div className={styles.comparisonRow}>
            <div className={styles.comparisonCell}><strong>Scalability</strong></div>
            <div className={styles.comparisonCell}>Limited by tool</div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>Unlimited growth</div>
          </div>

          <div className={styles.comparisonRow}>
            <div className={styles.comparisonCell}><strong>Competitive Advantage</strong></div>
            <div className={styles.comparisonCell}>✗ None</div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>✓ Proprietary tech</div>
          </div>

          <div className={styles.comparisonRow}>
            <div className={styles.comparisonCell}><strong>Ongoing Development</strong></div>
            <div className={styles.comparisonCell}>Their roadmap</div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>YOUR roadmap</div>
          </div>

          <div className={styles.comparisonRow}>
            <div className={styles.comparisonCell}><strong>Client Perception</strong></div>
            <div className={styles.comparisonCell}>Using generic tools</div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>YOU built this</div>
          </div>

          <div className={styles.comparisonRow}>
            <div className={styles.comparisonCell}><strong>Best For</strong></div>
            <div className={styles.comparisonCell}>Getting started</div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>Serious scaling</div>
          </div>
        </div>

        <div className={styles.comparisonCTA}>
          <p>Ready to build your competitive advantage?</p>
          <a href="https://calendly.com/your-link" className={styles.primaryButton} target="_blank" rel="noopener noreferrer">
            Book Your Platform Discovery Call
          </a>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className={styles.finalCTA}>
        <div className={styles.ctaContent}>
          <h2>Ready to Build Your Platform?</h2>
          <p className={styles.ctaLede}>
            Book a free platform discovery call and let's design your custom software solution together. No pressure, no pitch—just a real conversation about what we can build for your business.
          </p>

          <div className={styles.ctaBox}>
            <h3>What Happens on the Discovery Call:</h3>
            <div className={styles.ctaSteps}>
              <div className={styles.ctaStep}>
                <span className={styles.stepNumber}>1</span>
                <div>
                  <h4>Deep Dive</h4>
                  <p>We learn about your business, niche, processes, and goals</p>
                </div>
              </div>
              <div className={styles.ctaStep}>
                <span className={styles.stepNumber}>2</span>
                <div>
                  <h4>Platform Design</h4>
                  <p>We sketch out what your custom platform could look like</p>
                </div>
              </div>
              <div className={styles.ctaStep}>
                <span className={styles.stepNumber}>3</span>
                <div>
                  <h4>Investment & Timeline</h4>
                  <p>We discuss pricing, timeline, and next steps if it's a fit</p>
                </div>
              </div>
            </div>

            <div className={styles.calendlyEmbed}>
              <div className={styles.calendlyPlaceholder}>
                <p>📅 Calendly booking widget will be embedded here</p>
                <a href="https://calendly.com/your-link" className={styles.primaryButton} target="_blank" rel="noopener noreferrer">
                  Book Your Platform Discovery Call
                </a>
              </div>
            </div>

            <div className={styles.ctaFooter}>
              <p>✓ No credit card required</p>
              <p>✓ No pressure or sales pitch</p>
              <p>✓ Just value and clarity</p>
            </div>
          </div>
        </div>
      </section>

      {/* Back to Pricing Link */}
      <div className={styles.backLink}>
        <a href="/pricing">← Back to All Plans</a>
      </div>

      {/* Chatbot */}
      <div className={`${styles.chatbot} ${chatOpen ? styles.chatbotOpen : ''}`}>
        {!chatOpen ? (
          <div className={styles.chatbotLauncher}>
            <button className={styles.chatbotToggle} onClick={() => setChatOpen(true)}>
              💬
              <span className={styles.chatbotBadge}>1</span>
            </button>
            <span className={styles.chatLabel}>Need help?</span>
          </div>
        ) : (
          <div className={styles.chatbotWindow}>
            <div className={styles.chatbotHeader}>
              <div>
                <h4>Platform Assistant</h4>
                <p>Usually replies instantly</p>
              </div>
              <button className={styles.chatbotClose} onClick={() => setChatOpen(false)}>✕</button>
            </div>
            
            <div className={styles.chatbotMessages}>
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`${styles.chatMessage} ${styles[msg.role]}`}>
                  {msg.role === 'bot' && <div className={styles.chatAvatar}>🤖</div>}
                  <div className={styles.chatBubble}>{msg.text}</div>
                  {msg.role === 'user' && <div className={styles.chatAvatar}>👤</div>}
                </div>
              ))}
            </div>
            
            <form className={styles.chatbotInput} onSubmit={handleChatSubmit}>
              <input 
                type="text" 
                placeholder="Ask about platform features, timeline, pricing..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
              />
              <button type="submit">Send</button>
            </form>
            
            <div className={styles.chatbotQuickActions}>
              <button onClick={() => setUserInput("What's included in the platform?")}>What's included?</button>
              <button onClick={() => setUserInput("How much does it cost?")}>Pricing</button>
              <button onClick={() => setUserInput("How long does it take?")}>Timeline</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

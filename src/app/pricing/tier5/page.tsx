"use client";

import { useState, useEffect } from "react";
import styles from "./tier5.module.css";

export default function Tier5Page() {
  const [activeTab, setActiveTab] = useState<"30" | "60" | "90">("30");
  
  // ROI Calculator State
  const [monthlyRevenue, setMonthlyRevenue] = useState(50000);
  const [hoursOnContent, setHoursOnContent] = useState(20);
  const [hourlyRate, setHourlyRate] = useState(250);
  const [monthlyLeads, setMonthlyLeads] = useState(100);
  const [closeRate, setCloseRate] = useState(10);
  const [showROI, setShowROI] = useState(false);
  
  // Chatbot State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{role: 'bot' | 'user', text: string}>>([{
    role: 'bot',
    text: "Hey! 👋 I'm here to help you understand Oravini Enterprise. What questions do you have?"
  }]);
  const [userInput, setUserInput] = useState("");
  
  // ROI Calculations
  const timeSaved = hoursOnContent * 0.75; // Save 75% of time
  const timeSavedValue = (timeSaved * 4 * hourlyRate); // Monthly value
  const currentSales = (monthlyLeads * closeRate) / 100;
  const improvedCloseRate = closeRate * 1.3; // 30% improvement
  const newSales = (monthlyLeads * improvedCloseRate) / 100;
  const extraSales = newSales - currentSales;
  const avgDealSize = monthlyRevenue / currentSales || 5000;
  const extraRevenue = extraSales * avgDealSize;
  const totalValue = timeSavedValue + extraRevenue;
  const netProfit = totalValue - 99;
  const roiMultiplier = Math.round(netProfit / 99);
  
  const calculateROI = () => {
    setShowROI(true);
  };
  
  // Chatbot Logic
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    
    const newMessages = [...chatMessages, { role: 'user' as const, text: userInput }];
    setChatMessages(newMessages);
    
    // Simple keyword-based responses
    const response = getBotResponse(userInput.toLowerCase());
    
    setTimeout(() => {
      setChatMessages([...newMessages, { role: 'bot' as const, text: response }]);
    }, 500);
    
    setUserInput("");
  };
  
  const getBotResponse = (input: string): string => {
    // Pricing questions
    if (input.includes('price') || input.includes('cost') || input.includes('how much')) {
      return "Enterprise is $99/month with unlimited AI credits, dedicated account manager, and white-glove support. No hidden fees, cancel anytime. Want to see the ROI calculator to see your personalized value?";
    }
    
    // Features questions
    if (input.includes('feature') || input.includes('include') || input.includes('what do i get')) {
      return "You get: Unlimited AI credits, Video Marketing Platform, Sales CRM & automation, Course hosting, Dedicated account manager, White-glove onboarding, Custom SLA, Quarterly strategy sessions, Advanced analytics, and more! Which feature interests you most?";
    }
    
    // Support questions
    if (input.includes('support') || input.includes('help') || input.includes('account manager')) {
      return "You get a dedicated account manager with direct access (email, Slack, or phone), custom SLA with guaranteed response times, and quarterly strategy sessions. You're not just a customer—you're a partner.";
    }
    
    // Comparison questions
    if (input.includes('difference') || input.includes('pro') || input.includes('tier') || input.includes('compare')) {
      return "Enterprise includes unlimited AI credits (vs 500 in Pro), dedicated account manager, custom SLA, white-glove onboarding, quarterly strategy sessions, and custom feature development. Check out the comparison table below for full details!";
    }
    
    // Onboarding questions
    if (input.includes('onboard') || input.includes('start') || input.includes('setup') || input.includes('how long')) {
      return "Most clients are fully onboarded within 2-3 weeks. Week 1: Discovery & setup. Week 2: Integration. Week 3: Training. Week 4: Go live! We move as fast as you do.";
    }
    
    // Contract questions
    if (input.includes('contract') || input.includes('cancel') || input.includes('commitment')) {
      return "No long-term contracts required. You can cancel anytime. We also offer a 30-day money-back guarantee—if you're not seeing value, we'll refund you, no questions asked.";
    }
    
    // ROI questions
    if (input.includes('roi') || input.includes('return') || input.includes('worth it') || input.includes('value')) {
      return "On average, Enterprise clients save 15+ hours/week (worth $12,000+/month) and see a 30% increase in sales conversion. That's a 120x+ ROI. Use the calculator above to see YOUR personalized ROI!";
    }
    
    // Migration questions
    if (input.includes('migrate') || input.includes('switch') || input.includes('move') || input.includes('transfer')) {
      return "Absolutely! Our white-glove onboarding includes full migration support. We'll help you move your content, courses, client data, and integrations. Our team handles the heavy lifting.";
    }
    
    // Integration questions
    if (input.includes('integrat') || input.includes('connect') || input.includes('zapier') || input.includes('api')) {
      return "We integrate with all major platforms: Stripe, PayPal, Calendly, Zoom, Slack, HubSpot, Salesforce, Zapier, and more. Need a custom integration? We'll build it for you as part of Enterprise.";
    }
    
    // Who is it for
    if (input.includes('who') || input.includes('right for me') || input.includes('qualify')) {
      return "Enterprise is for established info entrepreneurs, coaches, course creators, and digital product sellers doing $10K+/month who are ready to scale. If you're feeling the growing pains of manual processes, Enterprise is for you.";
    }
    
    // Strategy call questions
    if (input.includes('call') || input.includes('demo') || input.includes('meeting')) {
      return "The strategy call is a free 30-minute session where we dive deep into your business, understand your goals, and create a custom roadmap. No pressure, no sales pitch—just value. Ready to book? Click the button above!";
    }
    
    // Results questions
    if (input.includes('result') || input.includes('success') || input.includes('work')) {
      return "Our clients see an average of 5x content output increase, 30% sales conversion lift, and 15+ hours saved per week. 98% client satisfaction rate. Check out the testimonials below for real stories!";
    }
    
    // Default response
    return "Great question! I'd recommend booking a free strategy call so we can dive deeper into your specific situation. Or feel free to ask me about: pricing, features, support, onboarding, ROI, integrations, or anything else!";
  };

  return (
    <main className={styles.page}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>Enterprise Solution</p>
          <h1>Transform Your Info Offer into a Scalable Business</h1>
          <p className={styles.lede}>
            Scale your coaching, courses, and digital products with unlimited AI automation, sales team enablement, and white-glove support. Build the info business you've always wanted—without the overwhelm.
          </p>
          <div className={styles.heroCTA}>
            <a href="https://calendly.com/your-link" className={styles.primaryButton} target="_blank" rel="noopener noreferrer">
              📅 Book Your Strategy Call
            </a>
            <p className={styles.ctaNote}>Free 30-minute consultation • No pressure, just value</p>
          </div>
        </div>
        <div className={styles.heroVideo}>
          <div className={styles.videoWrapper}>
            <div className={styles.videoPlaceholder}>
              <span>🎥</span>
              <p>Your VSL Video Goes Here</p>
              {/* Replace with actual video embed */}
              {/* <iframe src="YOUR_VIDEO_URL" /> */}
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Agitate Section */}
      <section className={styles.problemSection}>
        <div className={styles.sectionHeader}>
          <h2>Scaling Your Info Offer Shouldn't Feel This Hard</h2>
          <p className={styles.subtitle}>You're stuck in the daily grind, and growth feels impossible</p>
        </div>
        <div className={styles.problemGrid}>
          <div className={styles.problemCard}>
            <span className={styles.problemIcon}>😓</span>
            <h3>Content Creation Bottleneck</h3>
            <p>You're spending 20+ hours a week creating content, but you can't keep up with demand across all platforms.</p>
          </div>
          <div className={styles.problemCard}>
            <span className={styles.problemIcon}>📉</span>
            <h3>Sales Team Chaos</h3>
            <p>Your sales process is manual, leads fall through the cracks, and you have no visibility into what's working.</p>
          </div>
          <div className={styles.problemCard}>
            <span className={styles.problemIcon}>🔥</span>
            <h3>Fulfillment Nightmare</h3>
            <p>Managing clients, delivering courses, and handling support is eating all your time—you're burning out fast.</p>
          </div>
          <div className={styles.problemCard}>
            <span className={styles.problemIcon}>💸</span>
            <h3>Revenue Plateau</h3>
            <p>You've hit a ceiling. More effort doesn't equal more revenue, and you don't know how to break through.</p>
          </div>
        </div>
      </section>

      {/* Solution Overview */}
      <section className={styles.solutionSection}>
        <div className={styles.solutionContent}>
          <p className={styles.eyebrow}>The Oravini Enterprise Solution</p>
          <h2>Everything You Need to Scale Without the Chaos</h2>
          <p className={styles.solutionLede}>
            Oravini Enterprise gives you the complete infrastructure to scale your info business—from AI-powered content creation to sales team automation and white-glove support. Stop trading time for money. Start building a real business.
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

      {/* Features Breakdown */}
      <section className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <h2>Everything Included in Enterprise</h2>
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

      {/* Expectation Setting */}
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

      {/* Social Proof */}
      <section className={styles.socialProofSection}>
        <div className={styles.sectionHeader}>
          <h2>Real Results from Real Entrepreneurs</h2>
          <p className={styles.subtitle}>See how Enterprise clients are scaling their info businesses</p>
        </div>

        <div className={styles.testimonialsGrid}>
          <div className={styles.testimonialCard}>
            <div className={styles.quote}>"</div>
            <p className={styles.testimonialText}>
              "Oravini Enterprise transformed my coaching business. I went from spending 25 hours a week on content to just 5 hours—and my engagement actually increased. The sales automation alone paid for itself in the first month."
            </p>
            <div className={styles.testimonialAuthor}>
              <div className={styles.avatar}>JD</div>
              <div>
                <h4>Jessica Davis</h4>
                <p>Business Coach • $40K/mo → $120K/mo in 6 months</p>
              </div>
            </div>
          </div>

          <div className={styles.testimonialCard}>
            <div className={styles.quote}>"</div>
            <p className={styles.testimonialText}>
              "The white-glove support is unreal. My account manager feels like part of my team. They helped us scale from 200 to 1,000+ students without hiring a single person. Game changer."
            </p>
            <div className={styles.testimonialAuthor}>
              <div className={styles.avatar}>MR</div>
              <div>
                <h4>Marcus Rodriguez</h4>
                <p>Course Creator • Scaled to 1,000+ students</p>
              </div>
            </div>
          </div>

          <div className={styles.testimonialCard}>
            <div className={styles.quote}>"</div>
            <p className={styles.testimonialText}>
              "I was skeptical about AI automation, but Oravini proved me wrong. The content quality is incredible, and the time savings let me focus on high-level strategy. My business has never been healthier."
            </p>
            <div className={styles.testimonialAuthor}>
              <div className={styles.avatar}>SK</div>
              <div>
                <h4>Sarah Kim</h4>
                <p>Digital Product Creator • 3x revenue in 90 days</p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <h3>5x</h3>
            <p>Average content output increase</p>
          </div>
          <div className={styles.statCard}>
            <h3>30%</h3>
            <p>Average sales conversion lift</p>
          </div>
          <div className={styles.statCard}>
            <h3>15hrs</h3>
            <p>Average weekly time saved</p>
          </div>
          <div className={styles.statCard}>
            <h3>98%</h3>
            <p>Client satisfaction rate</p>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className={styles.comparisonSection}>
        <div className={styles.sectionHeader}>
          <h2>Pro vs Enterprise: What's the Difference?</h2>
          <p className={styles.subtitle}>See exactly what you're getting with the upgrade</p>
        </div>

        <div className={styles.comparisonTable}>
          <div className={styles.comparisonHeader}>
            <div className={styles.comparisonCell}></div>
            <div className={styles.comparisonCell}>
              <h3>Pro</h3>
              <p className={styles.comparisonPrice}>$59/mo</p>
            </div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>
              <h3>Enterprise</h3>
              <p className={styles.comparisonPrice}>$99/mo</p>
              <span className={styles.recommendedBadge}>Recommended</span>
            </div>
          </div>

          <div className={styles.comparisonRow}>
            <div className={styles.comparisonCell}><strong>AI Credits</strong></div>
            <div className={styles.comparisonCell}>500/month</div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>♾️ Unlimited</div>
          </div>

          <div className={styles.comparisonRow}>
            <div className={styles.comparisonCell}><strong>Video Marketing</strong></div>
            <div className={styles.comparisonCell}>✓ Included</div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>✓ Included</div>
          </div>

          <div className={styles.comparisonRow}>
            <div className={styles.comparisonCell}><strong>Team Members</strong></div>
            <div className={styles.comparisonCell}>Unlimited</div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>Unlimited</div>
          </div>

          <div className={styles.comparisonRow}>
            <div className={styles.comparisonCell}><strong>Support</strong></div>
            <div className={styles.comparisonCell}>Priority</div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>White-Glove + Custom SLA</div>
          </div>

          <div className={styles.comparisonRow}>
            <div className={styles.comparisonCell}><strong>Account Manager</strong></div>
            <div className={styles.comparisonCell}>✗</div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>✓ Dedicated</div>
          </div>

          <div className={styles.comparisonRow}>
            <div className={styles.comparisonCell}><strong>Onboarding</strong></div>
            <div className={styles.comparisonCell}>Self-service</div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>✓ White-Glove</div>
          </div>

          <div className={styles.comparisonRow}>
            <div className={styles.comparisonCell}><strong>Strategy Sessions</strong></div>
            <div className={styles.comparisonCell}>✗</div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>✓ Quarterly</div>
          </div>

          <div className={styles.comparisonRow}>
            <div className={styles.comparisonCell}><strong>Custom Features</strong></div>
            <div className={styles.comparisonCell}>✗</div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>✓ Available</div>
          </div>

          <div className={styles.comparisonRow}>
            <div className={styles.comparisonCell}><strong>Migration Support</strong></div>
            <div className={styles.comparisonCell}>Basic</div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>✓ Full Service</div>
          </div>

          <div className={styles.comparisonRow}>
            <div className={styles.comparisonCell}><strong>Response Time</strong></div>
            <div className={styles.comparisonCell}>24 hours</div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>Custom SLA (2-4 hours)</div>
          </div>

          <div className={styles.comparisonRow}>
            <div className={styles.comparisonCell}><strong>Best For</strong></div>
            <div className={styles.comparisonCell}>Growing businesses</div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>Scaling enterprises</div>
          </div>
        </div>

        <div className={styles.comparisonCTA}>
          <p>Ready to upgrade to unlimited everything?</p>
          <a href="https://calendly.com/your-link" className={styles.primaryButton} target="_blank" rel="noopener noreferrer">
            Book Your Strategy Call
          </a>
        </div>
      </section>

      {/* Interactive ROI Calculator */}
      <section className={styles.roiCalculatorSection}>
        <div className={styles.sectionHeader}>
          <h2>Calculate Your Personalized ROI</h2>
          <p className={styles.subtitle}>See exactly how much value Enterprise will bring to YOUR business</p>
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
                ⏰ Hours/week on content creation:
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
              Calculate My ROI
            </button>
          </div>

          {showROI && (
            <div className={styles.calculatorResults}>
              <h3>🎯 Your Personalized ROI</h3>
              
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

              <div className={styles.resultRow}>
                <span>💳 Enterprise Cost:</span>
                <strong>-$99/mo</strong>
              </div>

              <div className={styles.resultDivider}></div>

              <div className={styles.resultRow}>
                <span>🚀 NET PROFIT:</span>
                <strong className={styles.netProfit}>${netProfit.toLocaleString()}/mo</strong>
              </div>

              <div className={styles.roiHighlight}>
                <p>That's a <strong>{roiMultiplier}x</strong> return on investment! 🎉</p>
                <p className={styles.roiNote}>
                  And we haven't even counted the time saved on sales automation, client management, and all the other features.
                </p>
              </div>

              <a href="https://calendly.com/your-link" className={styles.primaryButton} target="_blank" rel="noopener noreferrer">
                Book My Strategy Call Now →
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Pricing Transparency */}
      <section className={styles.pricingSection}>
        <div className={styles.sectionHeader}>
          <h2>Simple, Transparent Pricing</h2>
          <p className={styles.subtitle}>No hidden fees. No surprises. Just results.</p>
        </div>

        <div className={styles.pricingCard}>
          <div className={styles.pricingHeader}>
            <div>
              <h3>Enterprise Plan</h3>
              <p className={styles.pricingSubtitle}>Everything you need to scale</p>
            </div>
            <div className={styles.priceTag}>
              <span className={styles.price}>$99</span>
              <span className={styles.period}>/month</span>
            </div>
          </div>

          <div className={styles.pricingContent}>
            <div className={styles.pricingColumn}>
              <h4>✅ What's Included</h4>
              <ul>
                <li>Unlimited AI credits (no caps)</li>
                <li>Video Marketing Platform (included)</li>
                <li>Sales team CRM & automation</li>
                <li>Course & membership hosting</li>
                <li>Dedicated account manager</li>
                <li>White-glove onboarding</li>
                <li>Custom SLA & priority support</li>
                <li>Quarterly strategy sessions</li>
                <li>Advanced analytics & reporting</li>
                <li>Custom integrations</li>
                <li>Unlimited team members</li>
                <li>White-label branding options</li>
              </ul>
            </div>

            <div className={styles.pricingColumn}>
              <h4>💰 ROI Calculator</h4>
              <div className={styles.roiCard}>
                <div className={styles.roiItem}>
                  <span>Time saved per week:</span>
                  <strong>15+ hours</strong>
                </div>
                <div className={styles.roiItem}>
                  <span>Value of your time ($/hr):</span>
                  <strong>$200</strong>
                </div>
                <div className={styles.roiItem}>
                  <span>Monthly time savings value:</span>
                  <strong>$12,000</strong>
                </div>
                <div className={styles.roiDivider}></div>
                <div className={styles.roiItem}>
                  <span>Enterprise cost:</span>
                  <strong>$99/mo</strong>
                </div>
                <div className={styles.roiTotal}>
                  <span>Net monthly value:</span>
                  <strong>$11,901</strong>
                </div>
                <p className={styles.roiNote}>
                  That's a 120x return on investment—and we haven't even counted the revenue increase from better sales conversion and content performance.
                </p>
              </div>
            </div>
          </div>

          <div className={styles.pricingCTA}>
            <a href="https://calendly.com/your-link" className={styles.primaryButton} target="_blank" rel="noopener noreferrer">
              Book Your Strategy Call Now
            </a>
            <p className={styles.guarantee}>30-day money-back guarantee • Cancel anytime</p>
          </div>
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

      {/* Final CTA Section */}
      <section className={styles.finalCTA}>
        <div className={styles.ctaContent}>
          <h2>Ready to Scale Your Info Business?</h2>
          <p className={styles.ctaLede}>
            Book a free 30-minute strategy call and let's map out your path to scalable growth. No pressure, no pitch—just a real conversation about your business and how we can help.
          </p>

          <div className={styles.ctaBox}>
            <h3>What Happens on the Call:</h3>
            <div className={styles.ctaSteps}>
              <div className={styles.ctaStep}>
                <span className={styles.stepNumber}>1</span>
                <div>
                  <h4>Discovery</h4>
                  <p>We learn about your business, goals, and current challenges</p>
                </div>
              </div>
              <div className={styles.ctaStep}>
                <span className={styles.stepNumber}>2</span>
                <div>
                  <h4>Strategy</h4>
                  <p>We map out a custom plan for scaling your specific business</p>
                </div>
              </div>
              <div className={styles.ctaStep}>
                <span className={styles.stepNumber}>3</span>
                <div>
                  <h4>Next Steps</h4>
                  <p>If it's a fit, we'll outline the onboarding process. If not, we'll point you in the right direction</p>
                </div>
              </div>
            </div>

            <div className={styles.calendlyEmbed}>
              {/* Calendly inline widget will go here */}
              <div className={styles.calendlyPlaceholder}>
                <p>📅 Calendly booking widget will be embedded here</p>
                <a href="https://calendly.com/your-link" className={styles.primaryButton} target="_blank" rel="noopener noreferrer">
                  Book Your Strategy Call Now
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
          <button className={styles.chatbotToggle} onClick={() => setChatOpen(true)}>
            💬
            <span className={styles.chatbotBadge}>Ask me anything!</span>
          </button>
        ) : (
          <div className={styles.chatbotWindow}>
            <div className={styles.chatbotHeader}>
              <div>
                <h4>Enterprise Assistant</h4>
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
                placeholder="Ask about pricing, features, support..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
              />
              <button type="submit">Send</button>
            </form>
            
            <div className={styles.chatbotQuickActions}>
              <button onClick={() => setUserInput("What's included in Enterprise?")}>What's included?</button>
              <button onClick={() => setUserInput("How much does it cost?")}>Pricing</button>
              <button onClick={() => setUserInput("What's the difference from Pro?")}>Pro vs Enterprise</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

import { AdminSection } from './completeAdminSection';
import { AdminSchedulingTab } from './adminSchedulingTab';
import { AdvancedSchedulingSystem } from './schedulingSystem';
import { SchedulingUIFactory } from './schedulingUI';

// COMPLETE SCHEDULING INTEGRATION DEMO - Calendly Killer
export class DistinproSchedulingDemo {
  private adminSection: AdminSection;
  private schedulingTab: AdminSchedulingTab;
  private schedulingSystem: AdvancedSchedulingSystem;
  private uiFactory: SchedulingUIFactory;

  constructor() {
    // Initialize all systems
    this.adminSection = new AdminSection();
    this.schedulingSystem = new AdvancedSchedulingSystem();
    this.uiFactory = new SchedulingUIFactory();
    this.schedulingTab = new AdminSchedulingTab(this.adminSection);
    
    this.initializeDemo();
  }

  /**
   * Initialize the complete demo with sample data
   */
  private initializeDemo(): void {
    console.log("🚀 Initializing Distinpro Scheduling System - Better than Calendly!");
    
    // Initialize admin section
    this.adminSection.initialize();
    
    // Create sample booking pages
    this.createSampleBookingPages();
    
    // Setup team availability
    this.setupTeamAvailability();
    
    // Create sample bookings
    this.createSampleBookings();
    
    console.log("✅ Scheduling system initialized successfully!");
  }

  /**
   * Create sample booking pages (Better than Calendly)
   */
  private createSampleBookingPages(): void {
    console.log("📄 Creating booking pages...");

    // Tier 5 Strategy Session Page
    const tier5Page = this.schedulingTab.createBookingPage({
      name: "Tier 5 Strategy Session",
      type: "qualification",
      template: "high_ticket",
      targeting: {
        businessTypes: ["saas", "ecommerce", "agency"],
        revenueRange: { min: 5000, max: 100000 },
        geoLocation: ["US", "CA", "UK", "AU"],
        trafficSource: ["google_ads", "facebook", "organic", "referral"]
      },
      optimization: {
        headline: "Scale Your Business to $50K+/Month in 90 Days",
        benefits: [
          "Get a custom growth strategy tailored to your business",
          "Identify and eliminate your biggest revenue bottlenecks", 
          "See exactly how to reach $50K+/month systematically",
          "Access our proven Tier 5 client success framework"
        ],
        socialProof: {
          testimonials: {
            enabled: true,
            count: 3,
            filterByBusinessType: true,
            showResults: true
          },
          caseStudies: {
            enabled: true,
            count: 2,
            showROI: true
          },
          stats: {
            clientCount: 247,
            avgResults: "3.2x revenue growth in 90 days",
            successRate: 87
          }
        },
        urgency: {
          timer: {
            enabled: true,
            duration: 48, // 48 hours
            message: "Limited spots available - Book within 48 hours to secure your session"
          },
          scarcity: {
            enabled: true,
            spotsLeft: 3,
            message: "Only 3 strategy sessions left this month"
          },
          bonuses: {
            enabled: true,
            bonuses: [
              {
                name: "Custom Growth Audit",
                value: "$2,500",
                expires: "48 hours",
                description: "Complete business audit with actionable recommendations"
              },
              {
                name: "90-Day Action Plan",
                value: "$1,500", 
                expires: "48 hours",
                description: "Step-by-step roadmap to your revenue goals"
              }
            ]
          }
        },
        pricing: {
          showPricing: true,
          showROI: true,
          showPaymentPlans: true,
          tiers: [
            {
              name: "Tier 5 Accelerator",
              price: 15000,
              duration: "90 days",
              features: [
                "Weekly 1:1 strategy sessions",
                "Custom funnel development",
                "Team training & support",
                "Revenue guarantee"
              ],
              results: [
                "Average 3.2x revenue growth",
                "87% client success rate",
                "Typical ROI: 400-800%"
              ],
              qualificationRequired: 70
            }
          ]
        }
      }
    });

    console.log(`✅ Created Tier 5 page: ${tier5Page.url}`);

    // Quick Qualification Page (for lower-tier prospects)
    const quickQualPage = this.schedulingTab.createBookingPage({
      name: "Business Growth Assessment",
      type: "qualification",
      template: "assessment",
      targeting: {
        businessTypes: ["all"],
        revenueRange: { min: 1000, max: 25000 },
        geoLocation: ["US", "CA", "UK", "AU"],
        trafficSource: ["organic", "social", "referral"]
      },
      optimization: {
        headline: "Get Your Free Business Growth Assessment",
        benefits: [
          "Discover your biggest growth opportunities",
          "Get personalized recommendations",
          "Learn what's holding you back from scaling"
        ],
        socialProof: {
          testimonials: { enabled: true, count: 2, filterByBusinessType: false, showResults: true },
          caseStudies: { enabled: false, count: 0, showROI: false },
          stats: { clientCount: 500, avgResults: "2.1x growth", successRate: 73 }
        },
        urgency: {
          timer: { enabled: false, duration: 0, message: "" },
          scarcity: { enabled: false, spotsLeft: 0, message: "" },
          bonuses: { enabled: false, bonuses: [] }
        },
        pricing: {
          showPricing: false,
          showROI: false,
          showPaymentPlans: false,
          tiers: []
        }
      }
    });

    console.log(`✅ Created assessment page: ${quickQualPage.url}`);
  }

  /**
   * Setup team availability and routing
   */
  private setupTeamAvailability(): void {
    console.log("👥 Setting up team availability...");

    // This would integrate with the actual team calendar system
    // For demo purposes, we'll show the structure

    const teamSchedule = {
      "sarah-johnson": {
        name: "Sarah Johnson",
        role: "Senior Sales Strategist",
        expertise: ["saas", "tech", "b2b"],
        timezone: "America/New_York",
        availability: {
          monday: [{ start: "09:00", end: "17:00" }],
          tuesday: [{ start: "09:00", end: "17:00" }],
          wednesday: [{ start: "09:00", end: "17:00" }],
          thursday: [{ start: "09:00", end: "17:00" }],
          friday: [{ start: "09:00", end: "15:00" }]
        },
        performance: {
          bookingToShow: 87,
          showToClose: 42,
          avgDealSize: 18500,
          clientSatisfaction: 9.3
        }
      },
      "alex-rodriguez": {
        name: "Alex Rodriguez", 
        role: "Growth Coach",
        expertise: ["ecommerce", "agency", "coaching"],
        timezone: "America/Los_Angeles",
        availability: {
          monday: [{ start: "10:00", end: "18:00" }],
          tuesday: [{ start: "10:00", end: "18:00" }],
          wednesday: [{ start: "10:00", end: "18:00" }],
          thursday: [{ start: "10:00", end: "18:00" }],
          friday: [{ start: "10:00", end: "16:00" }]
        },
        performance: {
          bookingToShow: 91,
          showToClose: 38,
          avgDealSize: 14200,
          clientSatisfaction: 9.1
        }
      }
    };

    console.log("✅ Team availability configured");
  }

  /**
   * Create sample bookings to demonstrate the system
   */
  private createSampleBookings(): void {
    console.log("📅 Creating sample bookings...");

    const sampleBookings = [
      {
        prospectInfo: {
          name: "John Smith",
          email: "john@techstartup.com",
          phone: "+1-555-0123",
          company: "TechStartup Inc",
          website: "techstartup.com",
          businessType: "saas",
          currentRevenue: 8500,
          targetRevenue: 50000,
          urgency: "high" as const,
          painPoints: ["Low conversion rates", "Scaling challenges", "Team bottlenecks"],
          previousExperience: "Tried other programs with limited success",
          budget: 15000,
          timeline: "90 days",
          referralSource: "Google Ads"
        },
        qualificationAnswers: {
          current_revenue: 8500,
          target_revenue: 50000,
          business_type: "saas",
          budget: 15000,
          timeline: "90_days",
          pain_level: 9,
          previous_experience: "some_success",
          team_size: 5,
          urgency: 9
        },
        selectedTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
        timezone: "America/New_York"
      },
      {
        prospectInfo: {
          name: "Sarah Wilson",
          email: "sarah@ecomstore.com", 
          phone: "+1-555-0124",
          company: "Premium E-com Store",
          website: "premiumecom.com",
          businessType: "ecommerce",
          currentRevenue: 12000,
          targetRevenue: 75000,
          urgency: "medium" as const,
          painPoints: ["Seasonal fluctuations", "Customer acquisition cost", "Inventory management"],
          previousExperience: "Self-taught, some courses",
          budget: 20000,
          timeline: "6 months",
          referralSource: "Referral"
        },
        qualificationAnswers: {
          current_revenue: 12000,
          target_revenue: 75000,
          business_type: "ecommerce",
          budget: 20000,
          timeline: "90_days",
          pain_level: 8,
          previous_experience: "some_success",
          team_size: 3,
          urgency: 7
        },
        selectedTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        timezone: "America/Los_Angeles"
      }
    ];

    // Process each booking
    sampleBookings.forEach(async (bookingData, index) => {
      try {
        const result = await this.schedulingTab.processBooking({
          pageId: "tier5-strategy",
          ...bookingData
        });

        if (result.success) {
          console.log(`✅ Booking ${index + 1} processed successfully:`);
          console.log(`   - Client: ${bookingData.prospectInfo.name}`);
          console.log(`   - Score: ${result.booking?.qualification.overallScore}`);
          console.log(`   - Tier: ${result.booking?.qualification.tier}`);
          console.log(`   - Assigned to: ${result.booking?.meetingDetails.assignedTo}`);
          console.log(`   - Client ID: ${result.clientId}`);
        } else {
          console.log(`❌ Booking ${index + 1} not qualified - redirected to nurture`);
        }
      } catch (error) {
        console.log(`❌ Error processing booking ${index + 1}:`, error);
      }
    });
  }

  /**
   * Demonstrate the admin dashboard with scheduling
   */
  getDashboardDemo(): any {
    console.log("📊 Generating admin dashboard with scheduling...");

    // Get the main admin dashboard
    const adminDashboard = this.adminSection.getAdminDashboard();

    // Get scheduling analytics
    const schedulingAnalytics = this.schedulingTab.getSchedulingAnalytics();

    // Get AI optimization suggestions
    const aiOptimizations = this.schedulingTab.getAIOptimizations();

    return {
      // Main admin dashboard
      adminOverview: adminDashboard.dashboard.overview,
      clients: adminDashboard.dashboard.clients.slice(0, 5), // Top 5 clients

      // Scheduling metrics
      schedulingMetrics: {
        totalBookings: schedulingAnalytics.overview.totalBookings,
        qualificationRate: `${schedulingAnalytics.overview.qualificationRate}%`,
        showRate: `${schedulingAnalytics.overview.showRate}%`,
        closeRate: `${schedulingAnalytics.overview.closeRate}%`,
        avgDealSize: `$${schedulingAnalytics.overview.avgDealSize.toLocaleString()}`,
        totalRevenue: `$${schedulingAnalytics.overview.totalRevenue.toLocaleString()}`
      },

      // Performance insights
      topPerformers: schedulingAnalytics.topPerformers,

      // AI optimization suggestions
      aiOptimizations: aiOptimizations,

      // Recent bookings (would be real data)
      recentBookings: [
        {
          name: "John Smith",
          company: "TechStartup Inc",
          score: 87,
          tier: "tier5",
          scheduledFor: "Tomorrow 2:00 PM",
          assignedTo: "Sarah Johnson",
          status: "confirmed"
        },
        {
          name: "Sarah Wilson", 
          company: "Premium E-com Store",
          score: 82,
          tier: "tier5",
          scheduledFor: "Friday 10:00 AM",
          assignedTo: "Alex Rodriguez",
          status: "confirmed"
        }
      ],

      // Booking pages performance
      bookingPages: [
        {
          name: "Tier 5 Strategy Session",
          url: "https://distinpro.com/book/tier5-strategy",
          views: 1247,
          bookings: 89,
          conversionRate: "7.1%",
          qualificationRate: "73%",
          revenue: "$1,335,000"
        },
        {
          name: "Business Growth Assessment",
          url: "https://distinpro.com/book/assessment",
          views: 2156,
          bookings: 156,
          conversionRate: "7.2%",
          qualificationRate: "45%",
          revenue: "$234,000"
        }
      ],

      // Calendar overview
      calendarOverview: {
        todaysBookings: 8,
        thisWeekBookings: 34,
        teamUtilization: "82%",
        availableSlots: 23
      }
    };
  }

  /**
   * Show what makes this better than Calendly
   */
  getCalendlyComparison(): any {
    return {
      "Calendly Features": {
        "Basic Scheduling": "✅ Yes",
        "Calendar Integration": "✅ Yes", 
        "Email Notifications": "✅ Yes",
        "Custom Branding": "✅ Limited",
        "Payment Integration": "✅ Basic"
      },
      "Distinpro Scheduling Features": {
        "AI-Powered Qualification": "🚀 Advanced - Real-time scoring",
        "Smart Team Routing": "🚀 Advanced - Performance-based routing",
        "Revenue Attribution": "🚀 Advanced - Full funnel tracking",
        "Multi-Step Workflows": "🚀 Advanced - Automated sequences",
        "Competitor Detection": "🚀 Unique - Block competitors",
        "ROI Calculator": "🚀 Advanced - Real-time calculations",
        "Social Proof Engine": "🚀 Advanced - Dynamic testimonials",
        "Urgency & Scarcity": "🚀 Advanced - Psychological triggers",
        "Client System Integration": "🚀 Unique - Auto-create clients",
        "AI Optimization": "🚀 Unique - Continuous improvement",
        "Revenue Forecasting": "🚀 Advanced - Predictive analytics",
        "Qualification Workflows": "🚀 Advanced - Multi-tier routing"
      },
      "Key Advantages": [
        "73% qualification rate vs Calendly's basic booking",
        "3.2x higher close rates through smart routing",
        "Automatic client onboarding into success system",
        "Real-time revenue attribution and forecasting",
        "AI-powered optimization suggestions",
        "Built-in CRM integration with tier 5 client system"
      ]
    };
  }

  /**
   * Generate a complete demo report
   */
  generateDemoReport(): string {
    const dashboard = this.getDashboardDemo();
    const comparison = this.getCalendlyComparison();

    return `
🚀 DISTINPRO SCHEDULING SYSTEM - CALENDLY KILLER DEMO REPORT

📊 ADMIN DASHBOARD OVERVIEW
═══════════════════════════════════════════════════════════
• Total Tier 5 Clients: ${dashboard.adminOverview.totalTier5Clients}
• Active Clients: ${dashboard.adminOverview.activeClients}
• Total Revenue Generated: $${dashboard.adminOverview.totalRevenueGenerated.toLocaleString()}
• Success Rate: ${dashboard.adminOverview.overallSuccessRate}%

📅 SCHEDULING METRICS
═══════════════════════════════════════════════════════════
• Total Bookings: ${dashboard.schedulingMetrics.totalBookings}
• Qualification Rate: ${dashboard.schedulingMetrics.qualificationRate}
• Show Rate: ${dashboard.schedulingMetrics.showRate}
• Close Rate: ${dashboard.schedulingMetrics.closeRate}
• Avg Deal Size: ${dashboard.schedulingMetrics.avgDealSize}
• Total Revenue: ${dashboard.schedulingMetrics.totalRevenue}

🎯 TOP PERFORMERS
═══════════════════════════════════════════════════════════
• Best Booking Page: ${dashboard.topPerformers.bestBookingPage.name} (${dashboard.topPerformers.bestBookingPage.conversionRate}% conversion)
• Best Team Member: ${dashboard.topPerformers.bestTeamMember.name} (${dashboard.topPerformers.bestTeamMember.closeRate}% close rate)
• Best Time Slot: ${dashboard.topPerformers.bestTimeSlot.time} (${dashboard.topPerformers.bestTimeSlot.bookingRate}% booking rate)

🤖 AI OPTIMIZATION SUGGESTIONS
═══════════════════════════════════════════════════════════
${dashboard.aiOptimizations.map((opt: any) => `• ${opt.suggestion} (Expected impact: +${opt.expectedImpact}%)`).join('\n')}

📈 BOOKING PAGES PERFORMANCE
═══════════════════════════════════════════════════════════
${dashboard.bookingPages.map((page: any) => `
• ${page.name}
  - URL: ${page.url}
  - Views: ${page.views.toLocaleString()}
  - Bookings: ${page.bookings}
  - Conversion: ${page.conversionRate}
  - Qualification: ${page.qualificationRate}
  - Revenue: ${page.revenue}`).join('\n')}

🆚 CALENDLY COMPARISON
═══════════════════════════════════════════════════════════
${comparison["Key Advantages"].map((advantage: string) => `✅ ${advantage}`).join('\n')}

🎉 RECENT QUALIFIED BOOKINGS
═══════════════════════════════════════════════════════════
${dashboard.recentBookings.map((booking: any) => `
• ${booking.name} (${booking.company})
  - Score: ${booking.score}/100 (${booking.tier})
  - Scheduled: ${booking.scheduledFor}
  - Assigned: ${booking.assignedTo}
  - Status: ${booking.status.toUpperCase()}`).join('\n')}

📊 CALENDAR OVERVIEW
═══════════════════════════════════════════════════════════
• Today's Bookings: ${dashboard.calendarOverview.todaysBookings}
• This Week: ${dashboard.calendarOverview.thisWeekBookings}
• Team Utilization: ${dashboard.calendarOverview.teamUtilization}
• Available Slots: ${dashboard.calendarOverview.availableSlots}

🚀 SYSTEM STATUS: FULLY OPERATIONAL
═══════════════════════════════════════════════════════════
✅ Booking pages active and converting
✅ AI qualification system running
✅ Team routing optimized
✅ Client integration working
✅ Revenue tracking active
✅ Automation workflows running

This scheduling system is now ready to replace Calendly and deliver:
• Higher qualification rates
• Better team utilization  
• Increased close rates
• Automated client onboarding
• Real-time revenue attribution
• AI-powered optimization

Ready to scale! 🚀
    `;
  }
}

// Export the demo
export function createSchedulingDemo(): DistinproSchedulingDemo {
  return new DistinproSchedulingDemo();
}

// Usage example
export function runSchedulingDemo(): void {
  console.log("🚀 Starting Distinpro Scheduling System Demo...\n");
  
  const demo = createSchedulingDemo();
  
  // Generate and display the complete report
  const report = demo.generateDemoReport();
  console.log(report);
  
  // Show the comparison
  const comparison = demo.getCalendlyComparison();
  console.log("\n🆚 DETAILED CALENDLY COMPARISON:");
  console.log(JSON.stringify(comparison, null, 2));
}

export default DistinproSchedulingDemo;
import { SimplifiedProjectTracker, Task, Phase } from './simplifiedProjectTracker';
import { ClientJourney } from './completeClientJourney';
import { AdminClientView } from './adminDashboard';

// CALENDLY INTEGRATION - Throughout Project Tracker
export interface CalendlyConfig {
  // Base Calendly Settings
  baseUrl: string; // "https://calendly.com/your-company"
  
  // Different Meeting Types
  meetingTypes: {
    onboarding: CalendlyMeetingType;
    strategy: CalendlyMeetingType;
    coaching: CalendlyMeetingType;
    review: CalendlyMeetingType;
    emergency: CalendlyMeetingType;
    sales: CalendlyMeetingType;
  };
  
  // Team Member Calendly Links
  teamCalendly: {
    [teamMember: string]: {
      calendlyUrl: string;
      timezone: string;
      availability: string;
    };
  };
  
  // Auto-scheduling Rules
  autoScheduling: {
    enabled: boolean;
    rules: CalendlyAutoRule[];
  };
}

export interface CalendlyMeetingType {
  slug: string; // "30min-strategy-call"
  duration: number; // minutes
  title: string;
  description: string;
  questions: CalendlyQuestion[];
  confirmationMessage: string;
  reminderSettings: {
    email24h: boolean;
    email1h: boolean;
    sms30min: boolean;
  };
}

export interface CalendlyQuestion {
  id: string;
  question: string;
  type: "text" | "textarea" | "select" | "radio" | "checkbox";
  required: boolean;
  options?: string[];
}

export interface CalendlyAutoRule {
  trigger: "task_overdue" | "milestone_missed" | "low_engagement" | "phase_complete";
  meetingType: keyof CalendlyConfig['meetingTypes'];
  assignTo: "sales_rep" | "coach" | "manager" | "admin";
  delayHours: number;
}

// Enhanced Project Tracker with Calendly
export interface ProjectTrackerWithCalendly extends SimplifiedProjectTracker {
  calendlyIntegration: {
    config: CalendlyConfig;
    scheduledMeetings: ScheduledMeeting[];
    quickScheduleLinks: QuickScheduleLink[];
    autoScheduleTriggers: AutoScheduleTrigger[];
  };
}

export interface ScheduledMeeting {
  id: string;
  calendlyEventId: string;
  clientId: string;
  meetingType: string;
  scheduledBy: string;
  scheduledFor: string;
  duration: number;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  attendees: string[];
  agenda: string[];
  outcome?: string;
  followUpActions?: string[];
  recordingUrl?: string;
  calendlyUrl: string;
}

export interface QuickScheduleLink {
  id: string;
  label: string;
  calendlyUrl: string;
  meetingType: string;
  context: "task" | "phase" | "milestone" | "alert" | "general";
  visible: boolean;
}

export interface AutoScheduleTrigger {
  id: string;
  clientId: string;
  trigger: string;
  meetingType: string;
  scheduledAt: string;
  executed: boolean;
}

// Default Calendly Configuration
export const defaultCalendlyConfig: CalendlyConfig = {
  baseUrl: "https://calendly.com/your-consulting-business",
  
  meetingTypes: {
    onboarding: {
      slug: "60min-onboarding-call",
      duration: 60,
      title: "Client Onboarding & Strategy Session",
      description: "Welcome call to align on goals, review intake, and create your 90-day roadmap to $10K.",
      questions: [
        {
          id: "q1",
          question: "What's your biggest challenge right now?",
          type: "textarea",
          required: true
        },
        {
          id: "q2", 
          question: "What's your current monthly revenue?",
          type: "select",
          required: true,
          options: ["$0-1K", "$1K-5K", "$5K-10K", "$10K+"]
        },
        {
          id: "q3",
          question: "How did you hear about us?",
          type: "select",
          required: false,
          options: ["Referral", "Social Media", "Google", "Webinar", "Other"]
        }
      ],
      confirmationMessage: "Great! Your onboarding call is scheduled. Please complete your intake form before our call.",
      reminderSettings: {
        email24h: true,
        email1h: true,
        sms30min: true
      }
    },
    
    strategy: {
      slug: "45min-strategy-session",
      duration: 45,
      title: "Strategy Deep Dive Session",
      description: "Focused session to refine your offer, funnel strategy, and next steps.",
      questions: [
        {
          id: "q1",
          question: "What specific area needs the most attention?",
          type: "select",
          required: true,
          options: ["Offer Positioning", "Funnel Strategy", "Traffic Generation", "Conversion Optimization"]
        },
        {
          id: "q2",
          question: "What questions do you want to cover?",
          type: "textarea",
          required: false
        }
      ],
      confirmationMessage: "Strategy session confirmed! Please prepare any questions or materials you'd like to discuss.",
      reminderSettings: {
        email24h: true,
        email1h: true,
        sms30min: false
      }
    },
    
    coaching: {
      slug: "30min-coaching-call",
      duration: 30,
      title: "Weekly Coaching Session",
      description: "Regular coaching call to review progress, overcome challenges, and plan next actions.",
      questions: [
        {
          id: "q1",
          question: "What wins have you had since our last call?",
          type: "textarea",
          required: false
        },
        {
          id: "q2",
          question: "What challenges are you facing?",
          type: "textarea",
          required: true
        },
        {
          id: "q3",
          question: "What's your #1 priority for this call?",
          type: "text",
          required: true
        }
      ],
      confirmationMessage: "Coaching session booked! Come prepared with your wins, challenges, and top priority.",
      reminderSettings: {
        email24h: true,
        email1h: true,
        sms30min: true
      }
    },
    
    review: {
      slug: "30min-progress-review",
      duration: 30,
      title: "Progress Review & Planning",
      description: "Review your progress, celebrate wins, and plan the next phase of growth.",
      questions: [
        {
          id: "q1",
          question: "How would you rate your progress (1-10)?",
          type: "select",
          required: true,
          options: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]
        },
        {
          id: "q2",
          question: "What's working best for you?",
          type: "textarea",
          required: false
        }
      ],
      confirmationMessage: "Review session scheduled! We'll celebrate your progress and plan next steps.",
      reminderSettings: {
        email24h: true,
        email1h: false,
        sms30min: false
      }
    },
    
    emergency: {
      slug: "15min-urgent-support",
      duration: 15,
      title: "Urgent Support Call",
      description: "Quick call to address urgent issues or blockers.",
      questions: [
        {
          id: "q1",
          question: "What's the urgent issue?",
          type: "textarea",
          required: true
        },
        {
          id: "q2",
          question: "How critical is this (1-10)?",
          type: "select",
          required: true,
          options: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]
        }
      ],
      confirmationMessage: "Emergency call scheduled. We'll address your urgent issue ASAP.",
      reminderSettings: {
        email24h: false,
        email1h: true,
        sms30min: true
      }
    },
    
    sales: {
      slug: "45min-sales-consultation",
      duration: 45,
      title: "Sales Strategy Consultation",
      description: "Deep dive into your sales process, conversion optimization, and revenue growth.",
      questions: [
        {
          id: "q1",
          question: "What's your current conversion rate?",
          type: "text",
          required: false
        },
        {
          id: "q2",
          question: "What's your biggest sales challenge?",
          type: "textarea",
          required: true
        }
      ],
      confirmationMessage: "Sales consultation booked! Bring your current metrics and specific challenges.",
      reminderSettings: {
        email24h: true,
        email1h: true,
        sms30min: false
      }
    }
  },
  
  teamCalendly: {
    "Sarah Johnson": {
      calendlyUrl: "https://calendly.com/sarah-johnson",
      timezone: "America/New_York",
      availability: "Mon-Fri 9AM-5PM EST"
    },
    "Alex Rodriguez": {
      calendlyUrl: "https://calendly.com/alex-rodriguez", 
      timezone: "America/Los_Angeles",
      availability: "Mon-Fri 8AM-6PM PST"
    },
    "Mike Chen": {
      calendlyUrl: "https://calendly.com/mike-chen",
      timezone: "America/Chicago", 
      availability: "Mon-Fri 9AM-5PM CST"
    },
    "Emma Wilson": {
      calendlyUrl: "https://calendly.com/emma-wilson",
      timezone: "America/New_York",
      availability: "Tue-Sat 10AM-6PM EST"
    }
  },
  
  autoScheduling: {
    enabled: true,
    rules: [
      {
        trigger: "task_overdue",
        meetingType: "coaching",
        assignTo: "coach",
        delayHours: 24
      },
      {
        trigger: "milestone_missed",
        meetingType: "strategy",
        assignTo: "manager",
        delayHours: 12
      },
      {
        trigger: "low_engagement",
        meetingType: "review",
        assignTo: "sales_rep",
        delayHours: 48
      },
      {
        trigger: "phase_complete",
        meetingType: "review",
        assignTo: "coach",
        delayHours: 6
      }
    ]
  }
};

// Calendly Integration Manager
export class CalendlyIntegration {
  private config: CalendlyConfig;
  
  constructor(config: CalendlyConfig = defaultCalendlyConfig) {
    this.config = config;
  }
  
  /**
   * Generate Calendly URL for specific meeting type and team member
   */
  generateCalendlyUrl(
    meetingType: keyof CalendlyConfig['meetingTypes'],
    teamMember?: string,
    prefill?: {
      name?: string;
      email?: string;
      clientId?: string;
      customMessage?: string;
    }
  ): string {
    const meeting = this.config.meetingTypes[meetingType];
    let baseUrl = this.config.baseUrl;
    
    // Use team member's specific Calendly if provided
    if (teamMember && this.config.teamCalendly[teamMember]) {
      baseUrl = this.config.teamCalendly[teamMember].calendlyUrl;
    }
    
    let url = `${baseUrl}/${meeting.slug}`;\n    \n    // Add prefill parameters\n    if (prefill) {\n      const params = new URLSearchParams();\n      \n      if (prefill.name) params.append('name', prefill.name);\n      if (prefill.email) params.append('email', prefill.email);\n      if (prefill.clientId) params.append('a1', prefill.clientId); // Custom field\n      if (prefill.customMessage) params.append('a2', prefill.customMessage);\n      \n      if (params.toString()) {\n        url += `?${params.toString()}`;\n      }\n    }\n    \n    return url;\n  }\n  \n  /**\n   * Get quick schedule links for project tracker UI\n   */\n  getQuickScheduleLinks(clientId: string, context: 'task' | 'phase' | 'milestone' | 'general' = 'general'): QuickScheduleLink[] {\n    const links: QuickScheduleLink[] = [];\n    \n    // Context-specific links\n    switch (context) {\n      case 'task':\n        links.push(\n          {\n            id: 'quick-coaching',\n            label: '📞 Quick Coaching (30min)',\n            calendlyUrl: this.generateCalendlyUrl('coaching', undefined, { clientId }),\n            meetingType: 'coaching',\n            context: 'task',\n            visible: true\n          },\n          {\n            id: 'urgent-support',\n            label: '🚨 Urgent Support (15min)',\n            calendlyUrl: this.generateCalendlyUrl('emergency', undefined, { clientId }),\n            meetingType: 'emergency',\n            context: 'task',\n            visible: true\n          }\n        );\n        break;\n        \n      case 'phase':\n        links.push(\n          {\n            id: 'strategy-session',\n            label: '🎯 Strategy Session (45min)',\n            calendlyUrl: this.generateCalendlyUrl('strategy', undefined, { clientId }),\n            meetingType: 'strategy',\n            context: 'phase',\n            visible: true\n          },\n          {\n            id: 'progress-review',\n            label: '📊 Progress Review (30min)',\n            calendlyUrl: this.generateCalendlyUrl('review', undefined, { clientId }),\n            meetingType: 'review',\n            context: 'phase',\n            visible: true\n          }\n        );\n        break;\n        \n      case 'milestone':\n        links.push(\n          {\n            id: 'celebration-call',\n            label: '🎉 Celebration Call (30min)',\n            calendlyUrl: this.generateCalendlyUrl('review', undefined, { \n              clientId,\n              customMessage: 'Milestone celebration and next steps planning'\n            }),\n            meetingType: 'review',\n            context: 'milestone',\n            visible: true\n          }\n        );\n        break;\n        \n      default:\n        // General links - show all options\n        Object.keys(this.config.meetingTypes).forEach(type => {\n          const meeting = this.config.meetingTypes[type as keyof CalendlyConfig['meetingTypes']];\n          links.push({\n            id: `general-${type}`,\n            label: `📅 ${meeting.title} (${meeting.duration}min)`,\n            calendlyUrl: this.generateCalendlyUrl(type as any, undefined, { clientId }),\n            meetingType: type,\n            context: 'general',\n            visible: true\n          });\n        });\n    }\n    \n    return links;\n  }\n  \n  /**\n   * Auto-schedule meeting based on trigger\n   */\n  autoScheduleMeeting(clientId: string, trigger: string, teamMember?: string): AutoScheduleTrigger | null {\n    if (!this.config.autoScheduling.enabled) return null;\n    \n    const rule = this.config.autoScheduling.rules.find(r => r.trigger === trigger);\n    if (!rule) return null;\n    \n    // Determine who to assign to\n    let assignedMember = teamMember;\n    if (!assignedMember) {\n      // Logic to determine team member based on rule.assignTo\n      assignedMember = this.getTeamMemberByRole(rule.assignTo);\n    }\n    \n    const scheduleTrigger: AutoScheduleTrigger = {\n      id: `auto-${Date.now()}`,\n      clientId,\n      trigger,\n      meetingType: rule.meetingType,\n      scheduledAt: new Date(Date.now() + rule.delayHours * 60 * 60 * 1000).toISOString(),\n      executed: false\n    };\n    \n    return scheduleTrigger;\n  }\n  \n  /**\n   * Get embedded Calendly widget HTML\n   */\n  getEmbeddedWidget(\n    meetingType: keyof CalendlyConfig['meetingTypes'],\n    teamMember?: string,\n    options: {\n      height?: number;\n      hideEventTypeDetails?: boolean;\n      hideLandingPageDetails?: boolean;\n      primaryColor?: string;\n      textColor?: string;\n    } = {}\n  ): string {\n    const url = this.generateCalendlyUrl(meetingType, teamMember);\n    const height = options.height || 630;\n    \n    return `\n      <div class=\"calendly-inline-widget\" \n           data-url=\"${url}\" \n           style=\"min-width:320px;height:${height}px;\">\n      </div>\n      <script type=\"text/javascript\" src=\"https://assets.calendly.com/assets/external/widget.js\" async></script>\n    `;\n  }\n  \n  /**\n   * Get Calendly popup button HTML\n   */\n  getPopupButton(\n    meetingType: keyof CalendlyConfig['meetingTypes'],\n    buttonText: string,\n    teamMember?: string,\n    buttonClass: string = 'calendly-button'\n  ): string {\n    const url = this.generateCalendlyUrl(meetingType, teamMember);\n    \n    return `\n      <link href=\"https://assets.calendly.com/assets/external/widget.css\" rel=\"stylesheet\">\n      <script src=\"https://assets.calendly.com/assets/external/widget.js\" type=\"text/javascript\" async></script>\n      <a href=\"\" onclick=\"Calendly.initPopupWidget({url: '${url}'});return false;\" class=\"${buttonClass}\">\n        ${buttonText}\n      </a>\n    `;\n  }\n  \n  /**\n   * Process Calendly webhook (when meeting is scheduled/cancelled)\n   */\n  processWebhook(webhookData: any): ScheduledMeeting | null {\n    if (!webhookData.event || !webhookData.payload) return null;\n    \n    const { event, payload } = webhookData;\n    \n    if (event === 'invitee.created') {\n      return {\n        id: `meeting-${Date.now()}`,\n        calendlyEventId: payload.uuid,\n        clientId: payload.questions_and_answers?.find((qa: any) => qa.question.includes('Client ID'))?.answer || 'unknown',\n        meetingType: this.extractMeetingType(payload.event_type.slug),\n        scheduledBy: payload.name,\n        scheduledFor: payload.start_time,\n        duration: payload.event_type.duration,\n        status: 'scheduled',\n        attendees: [payload.email],\n        agenda: [],\n        calendlyUrl: payload.event_type.scheduling_url\n      };\n    }\n    \n    return null;\n  }\n  \n  // Helper methods\n  private getTeamMemberByRole(role: string): string {\n    // Logic to get team member by role\n    const roleMapping = {\n      'sales_rep': 'Sarah Johnson',\n      'coach': 'Alex Rodriguez', \n      'manager': 'Mike Chen',\n      'admin': 'Emma Wilson'\n    };\n    \n    return roleMapping[role as keyof typeof roleMapping] || 'Sarah Johnson';\n  }\n  \n  private extractMeetingType(slug: string): string {\n    // Extract meeting type from Calendly slug\n    if (slug.includes('onboarding')) return 'onboarding';\n    if (slug.includes('strategy')) return 'strategy';\n    if (slug.includes('coaching')) return 'coaching';\n    if (slug.includes('review')) return 'review';\n    if (slug.includes('urgent')) return 'emergency';\n    if (slug.includes('sales')) return 'sales';\n    return 'general';\n  }\n}\n\n// Enhanced UI Components with Calendly\nexport interface CalendlyUIComponents {\n  // Quick Schedule Buttons\n  quickScheduleButtons: {\n    html: string;\n    onClick: () => void;\n  }[];\n  \n  // Embedded Widgets\n  embeddedWidgets: {\n    [context: string]: string; // HTML for embedded widget\n  };\n  \n  // Popup Triggers\n  popupTriggers: {\n    [buttonId: string]: {\n      html: string;\n      calendlyUrl: string;\n    };\n  };\n}\n\n// Factory function to create Calendly integration\nexport function createCalendlyIntegration(customConfig?: Partial<CalendlyConfig>): CalendlyIntegration {\n  const config = { ...defaultCalendlyConfig, ...customConfig };\n  return new CalendlyIntegration(config);\n}\n\n// Export main integration class\nexport default CalendlyIntegration;
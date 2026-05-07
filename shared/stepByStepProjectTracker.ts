// STEP-BY-STEP PROJECT TRACKER - Horizontal Layout & Clear Progression

export interface StepByStepProjectTracker {
  // Client Info
  client: {
    id: string;
    name: string;
    startDate: string;
    targetDate: string;
  };
  
  // Current Status
  currentStep: number; // 1-5
  overallProgress: number; // 0-100%
  
  // Step-by-Step Journey
  steps: ProjectStep[];
  
  // Quick Actions
  quickActions: QuickAction[];
  
  // Progress Visualization
  progressVisualization: ProgressVisualization;
}

export interface ProjectStep {
  stepNumber: number;
  title: string;
  description: string;
  status: "not_started" | "in_progress" | "completed" | "blocked";
  
  // Step Details
  objective: string;
  estimatedDays: number;
  actualDays?: number;
  
  // Tasks within this step
  tasks: StepTask[];
  
  // Deliverables
  deliverable: {
    name: string;
    description: string;
    status: "pending" | "in_review" | "approved" | "delivered";
    url?: string;
  };
  
  // Calendly Integration
  scheduling: {
    kickoffCall?: CalendlyLink;
    checkInCall?: CalendlyLink;
    completionCall?: CalendlyLink;
  };
  
  // Visual Elements
  ui: {
    icon: string;
    color: string;
    completionPercentage: number;
  };
}

export interface StepTask {
  id: string;
  title: string;
  owner: "client" | "team" | "coach";
  status: "todo" | "doing" | "done" | "blocked";
  dueDate: string;
  priority: "low" | "medium" | "high" | "urgent";
  
  // Help & Scheduling
  helpAvailable: boolean;
  calendlyHelp?: CalendlyLink;
}

export interface CalendlyLink {
  url: string;
  meetingType: string;
  duration: number;
  buttonText: string;
  description: string;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  calendlyUrl: string;
  urgent: boolean;
}

export interface ProgressVisualization {
  // Horizontal Progress Bar
  progressBar: {
    currentStep: number;
    totalSteps: number;
    percentage: number;
    milestones: Milestone[];
  };
  
  // Step Flow Diagram
  stepFlow: {
    steps: StepFlowItem[];
    connections: StepConnection[];
  };
  
  // Revenue Progress
  revenueProgress: {
    current: number;
    target: number;
    milestones: RevenueMilestone[];
  };
}

export interface StepFlowItem {
  stepNumber: number;
  title: string;
  status: "completed" | "current" | "upcoming" | "blocked";
  position: { x: number; y: number };
  size: "small" | "medium" | "large";
}

export interface StepConnection {
  from: number;
  to: number;
  status: "completed" | "active" | "upcoming";
}

export interface Milestone {
  step: number;
  title: string;
  achieved: boolean;
  date?: string;
}

export interface RevenueMilestone {
  amount: number;
  label: string;
  achieved: boolean;
  targetDate: string;
  achievedDate?: string;
}

// DEFAULT STEP-BY-STEP JOURNEY
export const defaultStepByStepJourney: ProjectStep[] = [
  {
    stepNumber: 1,
    title: "Welcome & Setup",
    description: "Get you onboarded and aligned on your path to $10K",
    status: "in_progress",
    objective: "Complete onboarding and establish clear goals and expectations",
    estimatedDays: 7,
    
    tasks: [
      {
        id: "task-1-1",
        title: "Complete intake questionnaire",
        owner: "client",
        status: "doing",
        dueDate: "2024-01-15",
        priority: "urgent",
        helpAvailable: true,
        calendlyHelp: {
          url: "https://calendly.com/onboarding-help",
          meetingType: "onboarding",
          duration: 30,
          buttonText: "📞 Get Onboarding Help",
          description: "Need help with the intake form? Let's walk through it together."
        }
      },
      {
        id: "task-1-2", 
        title: "Upload brand assets & materials",
        owner: "client",
        status: "todo",
        dueDate: "2024-01-17",
        priority: "high",
        helpAvailable: true
      },
      {
        id: "task-1-3",
        title: "Schedule welcome strategy call",
        owner: "team",
        status: "done",
        dueDate: "2024-01-12",
        priority: "medium",
        helpAvailable: false
      }
    ],
    
    deliverable: {
      name: "Onboarding Package",
      description: "Complete client profile, goals, and initial strategy direction",
      status: "in_review"
    },
    
    scheduling: {
      kickoffCall: {
        url: "https://calendly.com/welcome-call",
        meetingType: "strategy",
        duration: 60,
        buttonText: "🚀 Schedule Welcome Call",
        description: "60-minute strategy session to align on your goals and create your roadmap"
      },
      checkInCall: {
        url: "https://calendly.com/onboarding-checkin",
        meetingType: "coaching",
        duration: 30,
        buttonText: "📞 Quick Check-in",
        description: "Quick call to ensure you're on track with onboarding"
      }
    },
    
    ui: {
      icon: "🎯",
      color: "#3B82F6",
      completionPercentage: 65
    }
  },
  
  {
    stepNumber: 2,
    title: "Strategy & Planning",
    description: "Define your offer, messaging, and funnel strategy",
    status: "not_started",
    objective: "Create a clear strategy for your offer and customer acquisition",
    estimatedDays: 10,
    
    tasks: [
      {
        id: "task-2-1",
        title: "Refine your core offer",
        owner: "coach",
        status: "todo",
        dueDate: "2024-01-22",
        priority: "high",
        helpAvailable: true,
        calendlyHelp: {
          url: "https://calendly.com/offer-strategy",
          meetingType: "strategy",
          duration: 45,
          buttonText: "🎯 Offer Strategy Session",
          description: "Deep dive into your offer positioning and pricing strategy"
        }
      },
      {
        id: "task-2-2",
        title: "Create messaging framework",
        owner: "team",
        status: "todo", 
        dueDate: "2024-01-25",
        priority: "medium",
        helpAvailable: true
      },
      {
        id: "task-2-3",
        title: "Design funnel blueprint",
        owner: "team",
        status: "todo",
        dueDate: "2024-01-28",
        priority: "high",
        helpAvailable: true
      }
    ],
    
    deliverable: {
      name: "Strategy Blueprint",
      description: "Complete offer positioning, messaging, and funnel strategy",
      status: "pending"
    },
    
    scheduling: {
      kickoffCall: {
        url: "https://calendly.com/strategy-kickoff",
        meetingType: "strategy",
        duration: 90,
        buttonText: "🚀 Start Strategy Phase",
        description: "90-minute deep dive to create your complete strategy"
      }
    },
    
    ui: {
      icon: "🧠",
      color: "#8B5CF6",
      completionPercentage: 0
    }
  },
  
  {
    stepNumber: 3,
    title: "Build & Create",
    description: "Build your funnel, pages, and marketing assets",
    status: "not_started",
    objective: "Create all the assets needed for your customer acquisition system",
    estimatedDays: 14,
    
    tasks: [
      {
        id: "task-3-1",
        title: "Build landing pages",
        owner: "team",
        status: "todo",
        dueDate: "2024-02-05",
        priority: "high",
        helpAvailable: true
      },
      {
        id: "task-3-2",
        title: "Write email sequences",
        owner: "team", 
        status: "todo",
        dueDate: "2024-02-08",
        priority: "medium",
        helpAvailable: true
      },
      {
        id: "task-3-3",
        title: "Create sales materials",
        owner: "team",
        status: "todo",
        dueDate: "2024-02-10",
        priority: "high",
        helpAvailable: true
      }
    ],
    
    deliverable: {
      name: "Complete Funnel System",
      description: "Landing pages, email sequences, and sales materials ready to launch",
      status: "pending"
    },
    
    ui: {
      icon: "🔨",
      color: "#10B981",
      completionPercentage: 0
    }
  },
  
  {
    stepNumber: 4,
    title: "Launch & Traffic",
    description: "Go live and start driving traffic to your funnel",
    status: "not_started",
    objective: "Launch your system and generate your first leads and sales",
    estimatedDays: 10,
    
    tasks: [
      {
        id: "task-4-1",
        title: "Launch funnel system",
        owner: "team",
        status: "todo",
        dueDate: "2024-02-15",
        priority: "urgent",
        helpAvailable: true
      },
      {
        id: "task-4-2",
        title: "Start content marketing",
        owner: "client",
        status: "todo",
        dueDate: "2024-02-17",
        priority: "high",
        helpAvailable: true
      },
      {
        id: "task-4-3",
        title: "Launch paid advertising",
        owner: "team",
        status: "todo",
        dueDate: "2024-02-20",
        priority: "medium",
        helpAvailable: true
      }
    ],
    
    deliverable: {
      name: "Live System",
      description: "Fully operational funnel generating leads and sales",
      status: "pending"
    },
    
    ui: {
      icon: "🚀",
      color: "#F59E0B",
      completionPercentage: 0
    }
  },
  
  {
    stepNumber: 5,
    title: "Optimize & Scale",
    description: "Optimize performance and scale to $10K/month",
    status: "not_started",
    objective: "Optimize conversion rates and scale to consistent $10K months",
    estimatedDays: 21,
    
    tasks: [
      {
        id: "task-5-1",
        title: "Analyze performance data",
        owner: "coach",
        status: "todo",
        dueDate: "2024-03-01",
        priority: "high",
        helpAvailable: true
      },
      {
        id: "task-5-2",
        title: "Optimize conversion rates",
        owner: "team",
        status: "todo",
        dueDate: "2024-03-05",
        priority: "high",
        helpAvailable: true
      },
      {
        id: "task-5-3",
        title: "Scale traffic & budget",
        owner: "coach",
        status: "todo",
        dueDate: "2024-03-10",
        priority: "medium",
        helpAvailable: true
      }
    ],
    
    deliverable: {
      name: "$10K Achievement",
      description: "Consistent $10K+ monthly revenue with optimized systems",
      status: "pending"
    },
    
    ui: {
      icon: "📈",
      color: "#EF4444",
      completionPercentage: 0
    }
  }
];

// STEP-BY-STEP UI LAYOUT COMPONENTS
export interface StepByStepUILayout {
  // Horizontal Progress Flow
  horizontalFlow: {
    html: string;
    width: string;
    responsive: boolean;
  };
  
  // Current Step Detail View
  currentStepView: {
    html: string;
    tasks: TaskCard[];
    actions: ActionButton[];
  };
  
  // Navigation
  navigation: {
    previousStep?: NavigationButton;
    nextStep?: NavigationButton;
    jumpToStep: NavigationButton[];
  };
  
  // Quick Actions Sidebar
  quickActionsSidebar: {
    html: string;
    actions: QuickAction[];
  };
}

export interface TaskCard {
  task: StepTask;
  html: string;
  actions: {
    markDone: string;
    getHelp: string;
    reschedule: string;
  };
}

export interface ActionButton {
  label: string;
  type: "primary" | "secondary" | "urgent";
  calendlyUrl?: string;
  onClick: string;
  html: string;
}

export interface NavigationButton {
  label: string;
  stepNumber: number;
  enabled: boolean;
  html: string;
}

// FACTORY TO CREATE STEP-BY-STEP UI
export class StepByStepUIFactory {
  
  /**
   * Create complete step-by-step project tracker UI
   */
  createStepByStepUI(tracker: StepByStepProjectTracker): StepByStepUILayout {
    return {
      horizontalFlow: this.createHorizontalFlow(tracker),
      currentStepView: this.createCurrentStepView(tracker),
      navigation: this.createNavigation(tracker),
      quickActionsSidebar: this.createQuickActionsSidebar(tracker)
    };
  }
  
  /**
   * Create horizontal progress flow
   */
  private createHorizontalFlow(tracker: StepByStepProjectTracker): StepByStepUILayout['horizontalFlow'] {
    const steps = tracker.steps;
    const currentStep = tracker.currentStep;
    
    const html = `
      <div class="horizontal-progress-flow">
        <div class="progress-container">
          ${steps.map((step, index) => `
            <div class="step-item ${this.getStepClass(step.status, index + 1, currentStep)}">
              <div class="step-circle">
                <span class="step-icon">${step.ui.icon}</span>
                <span class="step-number">${step.stepNumber}</span>
              </div>
              <div class="step-content">
                <h3 class="step-title">${step.title}</h3>
                <p class="step-description">${step.description}</p>
                <div class="step-progress">
                  <div class="progress-bar" style="width: ${step.ui.completionPercentage}%; background-color: ${step.ui.color}"></div>
                </div>
                <div class="step-actions">
                  ${this.generateStepActions(step, currentStep)}
                </div>
              </div>
              ${index < steps.length - 1 ? '<div class="step-connector"></div>' : ''}
            </div>
          `).join('')}
        </div>
        
        <div class="overall-progress">
          <div class="progress-header">
            <h2>Overall Progress to $10K</h2>
            <span class="progress-percentage">${tracker.overallProgress}%</span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar" style="width: ${tracker.overallProgress}%"></div>
          </div>
          <div class="milestones">
            <div class="milestone ${tracker.overallProgress >= 20 ? 'achieved' : ''}">$1K</div>
            <div class="milestone ${tracker.overallProgress >= 40 ? 'achieved' : ''}">$2.5K</div>
            <div class="milestone ${tracker.overallProgress >= 60 ? 'achieved' : ''}">$5K</div>
            <div class="milestone ${tracker.overallProgress >= 80 ? 'achieved' : ''}">$7.5K</div>
            <div class="milestone ${tracker.overallProgress >= 100 ? 'achieved' : ''}">$10K</div>
          </div>
        </div>
      </div>
    `;
    
    return {
      html,
      width: "100%",
      responsive: true
    };
  }
  
  /**
   * Create current step detail view
   */
  private createCurrentStepView(tracker: StepByStepProjectTracker): StepByStepUILayout['currentStepView'] {
    const currentStep = tracker.steps[tracker.currentStep - 1];
    
    const html = `
      <div class="current-step-view">
        <div class="step-header">
          <div class="step-info">
            <span class="step-badge">Step ${currentStep.stepNumber} of ${tracker.steps.length}</span>
            <h1>${currentStep.title}</h1>
            <p class="step-objective">${currentStep.objective}</p>
          </div>
          <div class="step-stats">
            <div class="stat">
              <span class="stat-value">${currentStep.ui.completionPercentage}%</span>
              <span class="stat-label">Complete</span>
            </div>
            <div class="stat">
              <span class="stat-value">${currentStep.estimatedDays}</span>
              <span class="stat-label">Est. Days</span>
            </div>
            <div class="stat">
              <span class="stat-value">${currentStep.tasks.filter(t => t.status === 'done').length}/${currentStep.tasks.length}</span>
              <span class="stat-label">Tasks Done</span>
            </div>
          </div>
        </div>
        
        <div class="deliverable-section">
          <h3>🎯 Step Goal: ${currentStep.deliverable.name}</h3>
          <p>${currentStep.deliverable.description}</p>
          <span class="deliverable-status ${currentStep.deliverable.status}">${currentStep.deliverable.status.replace('_', ' ')}</span>
        </div>
        
        <div class="tasks-section">
          <h3>📋 Your Tasks</h3>
          <div class="tasks-grid">
            ${currentStep.tasks.map(task => this.createTaskCard(task).html).join('')}
          </div>
        </div>
      </div>
    `;
    
    return {
      html,
      tasks: currentStep.tasks.map(task => this.createTaskCard(task)),
      actions: this.createStepActions(currentStep)
    };
  }
  
  /**
   * Create task card
   */
  private createTaskCard(task: StepTask): TaskCard {
    const html = `
      <div class="task-card ${task.status} ${task.priority}">
        <div class="task-header">
          <div class="task-info">
            <h4>${task.title}</h4>
            <div class="task-meta">
              <span class="task-owner">${task.owner}</span>
              <span class="task-due">Due: ${new Date(task.dueDate).toLocaleDateString()}</span>
              <span class="task-priority priority-${task.priority}">${task.priority}</span>
            </div>
          </div>
          <div class="task-status">
            <span class="status-badge ${task.status}">${task.status.replace('_', ' ')}</span>
          </div>
        </div>
        
        <div class="task-actions">
          ${task.status !== 'done' ? `
            <button class="btn btn-success btn-sm" onclick="markTaskDone('${task.id}')">
              ✅ Mark Done
            </button>
          ` : `
            <span class="completed-badge">✅ Completed</span>
          `}
          
          ${task.helpAvailable ? `
            <button class="btn btn-primary btn-sm" onclick="Calendly.initPopupWidget({url: '${task.calendlyHelp?.url}'});return false;">
              ${task.calendlyHelp?.buttonText || '📞 Get Help'}
            </button>
          ` : ''}
          
          ${task.status === 'blocked' ? `
            <button class="btn btn-danger btn-sm" onclick="Calendly.initPopupWidget({url: 'https://calendly.com/emergency-support'});return false;">
              🚨 Urgent Help
            </button>
          ` : ''}
        </div>
      </div>
    `;
    
    return {
      task,
      html,
      actions: {
        markDone: `<button onclick="markTaskDone('${task.id}')">✅ Done</button>`,
        getHelp: task.helpAvailable ? `<button onclick="getTaskHelp('${task.id}')">📞 Help</button>` : '',
        reschedule: `<button onclick="rescheduleTask('${task.id}')">📅 Reschedule</button>`
      }
    };
  }
  
  /**
   * Create navigation
   */
  private createNavigation(tracker: StepByStepProjectTracker): StepByStepUILayout['navigation'] {
    const currentStep = tracker.currentStep;
    const totalSteps = tracker.steps.length;
    
    return {
      previousStep: currentStep > 1 ? {
        label: `← Step ${currentStep - 1}`,
        stepNumber: currentStep - 1,
        enabled: true,
        html: `<button class="btn btn-outline-primary" onclick="goToStep(${currentStep - 1})">← Previous Step</button>`
      } : undefined,
      
      nextStep: currentStep < totalSteps ? {
        label: `Step ${currentStep + 1} →`,
        stepNumber: currentStep + 1,
        enabled: tracker.steps[currentStep - 1].status === 'completed',
        html: `<button class="btn btn-primary" onclick="goToStep(${currentStep + 1})" ${tracker.steps[currentStep - 1].status !== 'completed' ? 'disabled' : ''}>Next Step →</button>`
      } : undefined,
      
      jumpToStep: tracker.steps.map((step, index) => ({
        label: `${step.stepNumber}. ${step.title}`,
        stepNumber: step.stepNumber,
        enabled: index + 1 <= currentStep || step.status !== 'not_started',
        html: `<button class="step-nav-btn ${index + 1 === currentStep ? 'active' : ''}" onclick="goToStep(${index + 1})">${step.stepNumber}</button>`
      }))
    };
  }
  
  /**
   * Create quick actions sidebar
   */
  private createQuickActionsSidebar(tracker: StepByStepProjectTracker): StepByStepUILayout['quickActionsSidebar'] {
    const html = `
      <div class="quick-actions-sidebar">
        <h3>🚀 Quick Actions</h3>
        
        <div class="action-group">
          <h4>📞 Schedule Support</h4>
          <button class="btn btn-primary btn-block" onclick="Calendly.initPopupWidget({url: 'https://calendly.com/coaching-session'});return false;">
            📞 Coaching Session (30min)
          </button>
          <button class="btn btn-outline-primary btn-block" onclick="Calendly.initPopupWidget({url: 'https://calendly.com/strategy-session'});return false;">
            🎯 Strategy Session (45min)
          </button>
          <button class="btn btn-danger btn-block" onclick="Calendly.initPopupWidget({url: 'https://calendly.com/emergency-support'});return false;">
            🚨 Emergency Support (15min)
          </button>
        </div>
        
        <div class="action-group">
          <h4>📊 Progress</h4>
          <button class="btn btn-success btn-block" onclick="celebrateMilestone()">
            🎉 Celebrate Progress
          </button>
          <button class="btn btn-info btn-block" onclick="viewDetailedProgress()">
            📈 View Detailed Progress
          </button>
        </div>
        
        <div class="action-group">
          <h4>💬 Communication</h4>
          <button class="btn btn-outline-secondary btn-block" onclick="sendMessage()">
            📧 Send Message
          </button>
          <button class="btn btn-outline-secondary btn-block" onclick="requestCallback()">
            📞 Request Callback
          </button>
        </div>
      </div>
    `;
    
    return {
      html,
      actions: tracker.quickActions
    };
  }
  
  // Helper methods
  private getStepClass(status: string, stepNumber: number, currentStep: number): string {
    if (stepNumber < currentStep) return 'completed';
    if (stepNumber === currentStep) return 'current';
    if (status === 'blocked') return 'blocked';
    return 'upcoming';
  }
  
  private generateStepActions(step: ProjectStep, currentStep: number): string {
    if (step.stepNumber < currentStep) {
      return `<button class="btn btn-sm btn-success">✅ Completed</button>`;
    }
    
    if (step.stepNumber === currentStep) {
      return `
        <button class="btn btn-sm btn-primary" onclick="Calendly.initPopupWidget({url: '${step.scheduling.checkInCall?.url}'});return false;">
          📞 Get Support
        </button>
      `;
    }
    
    if (step.stepNumber === currentStep + 1) {
      return `
        <button class="btn btn-sm btn-outline-primary" onclick="Calendly.initPopupWidget({url: '${step.scheduling.kickoffCall?.url}'});return false;">
          🚀 Start Step
        </button>
      `;
    }
    
    return `<span class="text-muted">Coming Soon</span>`;
  }
  
  private createStepActions(step: ProjectStep): ActionButton[] {
    const actions: ActionButton[] = [];
    
    if (step.scheduling.kickoffCall) {
      actions.push({
        label: step.scheduling.kickoffCall.buttonText,
        type: "primary",
        calendlyUrl: step.scheduling.kickoffCall.url,
        onClick: `Calendly.initPopupWidget({url: '${step.scheduling.kickoffCall.url}'});return false;`,
        html: `<button class="btn btn-primary">${step.scheduling.kickoffCall.buttonText}</button>`
      });
    }
    
    if (step.scheduling.checkInCall) {
      actions.push({
        label: step.scheduling.checkInCall.buttonText,
        type: "secondary",
        calendlyUrl: step.scheduling.checkInCall.url,
        onClick: `Calendly.initPopupWidget({url: '${step.scheduling.checkInCall.url}'});return false;`,
        html: `<button class="btn btn-outline-primary">${step.scheduling.checkInCall.buttonText}</button>`
      });
    }
    
    return actions;
  }
}

// Factory function
export function createStepByStepProjectTracker(clientData: {
  id: string;
  name: string;
  startDate: string;
}): StepByStepProjectTracker {
  return {
    client: {
      id: clientData.id,
      name: clientData.name,
      startDate: clientData.startDate,
      targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    },
    currentStep: 1,
    overallProgress: 15,
    steps: defaultStepByStepJourney,
    quickActions: [
      {
        id: "coaching",
        label: "📞 Coaching Session",
        icon: "📞",
        calendlyUrl: "https://calendly.com/coaching-session",
        urgent: false
      },
      {
        id: "emergency",
        label: "🚨 Emergency Support",
        icon: "🚨", 
        calendlyUrl: "https://calendly.com/emergency-support",
        urgent: true
      }
    ],
    progressVisualization: {
      progressBar: {
        currentStep: 1,
        totalSteps: 5,
        percentage: 15,
        milestones: [
          { step: 1, title: "Onboarded", achieved: false },
          { step: 2, title: "Strategy Set", achieved: false },
          { step: 3, title: "System Built", achieved: false },
          { step: 4, title: "Launched", achieved: false },
          { step: 5, title: "$10K Achieved", achieved: false }
        ]
      },
      stepFlow: {
        steps: defaultStepByStepJourney.map((step, index) => ({
          stepNumber: step.stepNumber,
          title: step.title,
          status: index === 0 ? "current" : "upcoming",
          position: { x: index * 200, y: 0 },
          size: "medium"
        })),
        connections: []
      },
      revenueProgress: {
        current: 0,
        target: 10000,
        milestones: [
          { amount: 1000, label: "$1K", achieved: false, targetDate: "2024-02-15" },
          { amount: 2500, label: "$2.5K", achieved: false, targetDate: "2024-03-01" },
          { amount: 5000, label: "$5K", achieved: false, targetDate: "2024-03-15" },
          { amount: 10000, label: "$10K", achieved: false, targetDate: "2024-04-01" }
        ]
      }
    }
  };
}

export default StepByStepUIFactory;
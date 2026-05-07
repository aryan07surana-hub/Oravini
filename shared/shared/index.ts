// Distinpro Advanced Scheduling System - Main Export File

// Core System
export { AdvancedSchedulingSystem } from './schedulingSystem';
export { SchedulingUIFactory } from './schedulingUI';
export { AdminSchedulingTab } from './adminSchedulingTab';

// Optimization Features
export { ShowUpRateOptimizer } from './showUpOptimization';
export { AdvancedSchedulingFeatures } from './advancedSchedulingFeatures';

// Admin Integration
export { AdminSection } from './completeAdminSection';
export { AdminUIFactory } from './adminUIComponents';
export { AdminDashboardManager } from './adminDashboard';

// Demo and Examples
export { DistinproSchedulingDemo, createSchedulingDemo, runSchedulingDemo } from './schedulingDemo';

// Types and Interfaces
export type {
  SchedulingSystem,
  BookingPage,
  Booking,
  QualificationResult,
  ShowUpRateOptimizer as ShowUpOptimizerType,
  AdminSchedulingTab as AdminSchedulingTabType
} from './schedulingSystem';

export type {
  SchedulingUI,
  BookingPageUI,
  QualificationUI,
  CalendarUI
} from './schedulingUI';

export type {
  PreBookingStrategy,
  PostBookingEngagement,
  AdvancedReminderSystem,
  PsychologicalTrigger
} from './showUpOptimization';

export type {
  CompetitorTrackingSystem,
  AdvancedAICapabilities,
  RevenueOptimizationSystem,
  HyperAutomationSystem
} from './advancedSchedulingFeatures';

// Version
export const VERSION = '1.0.0';

// Quick Start Function
export function initializeSchedulingSystem() {
  console.log('🚀 Initializing Distinpro Advanced Scheduling System v' + VERSION);
  
  const demo = new DistinproSchedulingDemo();
  const report = demo.generateDemoReport();
  
  console.log('✅ System initialized successfully!');
  console.log('📊 Demo Report:');
  console.log(report);
  
  return demo;
}

// Default export
export default {
  AdvancedSchedulingSystem,
  SchedulingUIFactory,
  AdminSchedulingTab,
  ShowUpRateOptimizer,
  AdvancedSchedulingFeatures,
  AdminSection,
  DistinproSchedulingDemo,
  initializeSchedulingSystem,
  VERSION
};

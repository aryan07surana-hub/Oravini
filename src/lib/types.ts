export type FixedEvent = {
  title: string;
  start: string;
  end: string;
};

export type Task = {
  title: string;
  hours: number;
  priority: "high" | "medium" | "low";
};

export type PlannerInput = {
  wakeTime: string;
  sleepHours: number;
  workHours: number;
  breaksHours: number;
  fixedEvents: FixedEvent[];
  tasks: Task[];
};

export type ParsedDayRequest = {
  input: PlannerInput;
  source: "ai" | "fallback";
};

export type ScheduleBlock = {
  title: string;
  start: string;
  end: string;
  type: "sleep" | "fixed" | "task" | "break" | "buffer";
  notes?: string;
};

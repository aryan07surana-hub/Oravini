import { FixedEvent, ParsedDayRequest, PlannerInput, Task } from "@/lib/types";

const defaultInput: PlannerInput = {
  wakeTime: "07:00",
  sleepHours: 8,
  workHours: 7,
  breaksHours: 1,
  fixedEvents: [],
  tasks: [],
};

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function parseHourValue(raw: string) {
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function normalizeTime(raw: string) {
  const clean = raw.trim().toLowerCase().replace(/\./g, "");
  const match = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);

  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const meridiem = match[3];

  if (minute > 59 || hour > 24 || hour < 0) {
    return null;
  }

  if (meridiem) {
    if (hour === 12) {
      hour = 0;
    }
    if (meridiem === "pm") {
      hour += 12;
    }
  } else if (hour === 24) {
    hour = 0;
  }

  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function cleanTitle(raw: string) {
  return titleCase(
    raw
      .replace(/^(i have|i need to|i need|i will|i want to|work on|do|finish)\s+/i, "")
      .replace(/\b(today|tomorrow)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function extractWakeTime(text: string) {
  const patterns = [
    /\b(?:wake(?:\s*up)?|get up)\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,
    /\bstart (?:my )?day\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return normalizeTime(match[1]);
    }
  }

  return undefined;
}

function extractSingleNumber(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  return match ? parseHourValue(match[1]) : undefined;
}

function extractSleepHours(text: string) {
  return extractSingleNumber(text, /\b(?:sleep(?: for)?|need)\s+(\d+(?:\.\d+)?)\s+hours?\s+of sleep/i);
}

function extractWorkHours(text: string) {
  return extractSingleNumber(text, /\b(?:work(?: for)?|focus(?: for)?|study(?: for)?)\s+(\d+(?:\.\d+)?)\s+hours?/i);
}

function extractBreakHours(text: string) {
  return extractSingleNumber(text, /\b(?:breaks?|rest)\s+(?:for\s+)?(\d+(?:\.\d+)?)\s+hours?/i);
}

function extractEvents(text: string) {
  const events: FixedEvent[] = [];
  const eventPattern =
    /\b(?:i have|there is|there's|got|have)\s+(.+?)\s+(?:from|at)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:to|-)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/gi;

  for (const match of text.matchAll(eventPattern)) {
    const start = normalizeTime(match[2]);
    const end = normalizeTime(match[3]);
    if (!start || !end) {
      continue;
    }

    events.push({
      title: cleanTitle(match[1]),
      start,
      end,
    });
  }

  return events;
}

function inferPriority(title: string): Task["priority"] {
  if (/\b(urgent|important|client|deadline|must)\b/i.test(title)) {
    return "high";
  }
  if (/\b(maybe|later|admin|email)\b/i.test(title)) {
    return "low";
  }
  return "medium";
}

function extractTasks(text: string) {
  const tasks: Task[] = [];
  const taskPattern =
    /\b(?:work on|do|finish|complete|study|spend time on|need to work on|need to do)\s+(.+?)\s+for\s+(\d+(?:\.\d+)?)\s+hours?/gi;

  for (const match of text.matchAll(taskPattern)) {
    const hours = parseHourValue(match[2]);
    if (!hours) {
      continue;
    }

    const title = cleanTitle(match[1]);
    if (!title) {
      continue;
    }

    tasks.push({
      title,
      hours,
      priority: inferPriority(title),
    });
  }

  return tasks;
}

export function parseDayRequestFallback(rawText: string): ParsedDayRequest {
  const text = normalizeText(rawText);

  return {
    source: "fallback",
    input: {
      wakeTime: extractWakeTime(text) ?? defaultInput.wakeTime,
      sleepHours: extractSleepHours(text) ?? defaultInput.sleepHours,
      workHours: extractWorkHours(text) ?? defaultInput.workHours,
      breaksHours: extractBreakHours(text) ?? defaultInput.breaksHours,
      fixedEvents: extractEvents(text),
      tasks: extractTasks(text),
    },
  };
}

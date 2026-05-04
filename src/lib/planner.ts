import { PlannerInput, ScheduleBlock, Task } from "@/lib/types";

const MINUTES_IN_DAY = 24 * 60;

function toMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function toClock(totalMinutes: number) {
  const normalized = ((totalMinutes % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  const hour = Math.floor(normalized / 60)
    .toString()
    .padStart(2, "0");
  const minute = (normalized % 60).toString().padStart(2, "0");
  return `${hour}:${minute}`;
}

function addBlock(blocks: ScheduleBlock[], start: number, end: number, title: string, type: ScheduleBlock["type"], notes?: string) {
  if (end <= start) {
    return;
  }

  blocks.push({
    title,
    start: toClock(start),
    end: toClock(end),
    type,
    notes,
  });
}

function sortTasks(tasks: Task[]) {
  const priorityWeight = { high: 0, medium: 1, low: 2 };
  return [...tasks].sort((a, b) => {
    if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
      return priorityWeight[a.priority] - priorityWeight[b.priority];
    }
    return b.hours - a.hours;
  });
}

export function generateFallbackPlan(input: PlannerInput) {
  const wakeMinutes = toMinutes(input.wakeTime);
  const sleepMinutes = Math.round(input.sleepHours * 60);
  const bedMinutes = wakeMinutes - sleepMinutes;
  const dayEnd = bedMinutes <= wakeMinutes ? bedMinutes + MINUTES_IN_DAY : bedMinutes;

  const fixedEvents = input.fixedEvents
    .map((event) => {
      let start = toMinutes(event.start);
      let end = toMinutes(event.end);
      if (start < wakeMinutes) {
        start += MINUTES_IN_DAY;
      }
      if (end <= start) {
        end += MINUTES_IN_DAY;
      }
      return { ...event, start, end };
    })
    .sort((a, b) => a.start - b.start);

  const taskPool = sortTasks(input.tasks).map((task) => ({
    ...task,
    remainingMinutes: Math.round(task.hours * 60),
  }));

  const blocks: ScheduleBlock[] = [];
  addBlock(blocks, bedMinutes, wakeMinutes, "Sleep", "sleep", `${input.sleepHours} hours planned`);

  let cursor = wakeMinutes;
  let workedMinutes = 0;
  let breakBudget = Math.round(input.breaksHours * 60);

  const scheduleGap = (gapStart: number, gapEnd: number) => {
    let localCursor = gapStart;

    while (localCursor < gapEnd) {
      const task = taskPool.find((item) => item.remainingMinutes > 0 && workedMinutes < input.workHours * 60);

      if (!task) {
        addBlock(blocks, localCursor, gapEnd, "Flex / personal time", "buffer", "Open time for errands, recovery, or spillover.");
        return;
      }

      const remainingWorkBudget = input.workHours * 60 - workedMinutes;
      const session = Math.min(task.remainingMinutes, remainingWorkBudget, gapEnd - localCursor, 120);

      if (session <= 0) {
        addBlock(blocks, localCursor, gapEnd, "Flex / personal time", "buffer");
        return;
      }

      addBlock(blocks, localCursor, localCursor + session, task.title, "task", `${task.priority} priority`);
      task.remainingMinutes -= session;
      workedMinutes += session;
      localCursor += session;

      const shouldTakeBreak =
        breakBudget > 0 &&
        localCursor < gapEnd &&
        session >= 60 &&
        gapEnd - localCursor >= 15;

      if (shouldTakeBreak) {
        const breakMinutes = Math.min(15, breakBudget, gapEnd - localCursor);
        addBlock(blocks, localCursor, localCursor + breakMinutes, "Recharge break", "break");
        breakBudget -= breakMinutes;
        localCursor += breakMinutes;
      }
    }
  };

  for (const event of fixedEvents) {
    if (event.start > cursor) {
      scheduleGap(cursor, Math.min(event.start, dayEnd));
    }
    addBlock(blocks, Math.max(event.start, wakeMinutes), Math.min(event.end, dayEnd), event.title, "fixed");
    cursor = Math.max(cursor, event.end);
  }

  if (cursor < dayEnd) {
    scheduleGap(cursor, dayEnd);
  }

  return blocks
    .filter((block) => {
      const start = toMinutes(block.start);
      const end = toMinutes(block.end);
      return start !== end;
    })
    .sort((a, b) => {
      const aStart = toMinutes(a.start);
      const bStart = toMinutes(b.start);
      return aStart - bStart;
    });
}

import OpenAI from "openai";
import { NextResponse } from "next/server";
import { generateFallbackPlan } from "@/lib/planner";
import { PlannerInput, ScheduleBlock } from "@/lib/types";

type PlannerResponse = {
  schedule: ScheduleBlock[];
  source: "ai" | "fallback";
};

function buildPrompt(input: PlannerInput) {
  return [
    "Create a realistic daily plan as JSON.",
    "Return only valid JSON with this shape:",
    '{ "schedule": [{ "title": "string", "start": "HH:MM", "end": "HH:MM", "type": "sleep|fixed|task|break|buffer", "notes": "optional string" }] }',
    "Rules:",
    `- Wake time: ${input.wakeTime}`,
    `- Sleep needed: ${input.sleepHours} hours`,
    `- Total focused work target: ${input.workHours} hours`,
    `- Desired break time: ${input.breaksHours} hours`,
    "- Respect fixed events exactly.",
    "- Split work into realistic sessions.",
    "- Add breaks and buffer where useful.",
    "- Keep all times in 24-hour HH:MM format.",
    `Fixed events: ${JSON.stringify(input.fixedEvents)}`,
    `Tasks: ${JSON.stringify(input.tasks)}`,
  ].join("\n");
}

export async function POST(request: Request) {
  const input = (await request.json()) as PlannerInput;
  const fallback = generateFallbackPlan(input);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json<PlannerResponse>({
      schedule: fallback,
      source: "fallback",
    });
  }

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.responses.create({
      model: "gpt-5.4-mini",
      input: buildPrompt(input),
      text: {
        format: {
          type: "json_schema",
          name: "day_schedule",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              schedule: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    start: { type: "string" },
                    end: { type: "string" },
                    type: {
                      type: "string",
                      enum: ["sleep", "fixed", "task", "break", "buffer"],
                    },
                    notes: { type: "string" },
                  },
                  required: ["title", "start", "end", "type"],
                },
              },
            },
            required: ["schedule"],
          },
        },
      },
    });

    const text = response.output_text;
    const parsed = JSON.parse(text) as { schedule: ScheduleBlock[] };

    return NextResponse.json<PlannerResponse>({
      schedule: parsed.schedule,
      source: "ai",
    });
  } catch {
    return NextResponse.json<PlannerResponse>({
      schedule: fallback,
      source: "fallback",
    });
  }
}

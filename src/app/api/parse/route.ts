import OpenAI from "openai";
import { NextResponse } from "next/server";
import { parseDayRequestFallback } from "@/lib/intake";
import { ParsedDayRequest, PlannerInput } from "@/lib/types";

function buildPrompt(transcript: string) {
  return [
    "Convert the user's spoken day description into planner JSON.",
    "Return only valid JSON with this shape:",
    '{ "input": { "wakeTime": "HH:MM", "sleepHours": 0, "workHours": 0, "breaksHours": 0, "fixedEvents": [{ "title": "string", "start": "HH:MM", "end": "HH:MM" }], "tasks": [{ "title": "string", "hours": 0, "priority": "high|medium|low" }] } }',
    "Rules:",
    "- Infer reasonable defaults when the user omits details.",
    "- Use 24-hour HH:MM time format.",
    "- Keep titles concise and human readable.",
    "- Fixed events are appointments with specific start/end times.",
    "- Tasks are flexible work items with hours and priority.",
    `Transcript: ${transcript}`,
  ].join("\n");
}

export async function POST(request: Request) {
  const body = (await request.json()) as { transcript: string };
  const fallback = parseDayRequestFallback(body.transcript ?? "");
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json<ParsedDayRequest>(fallback);
  }

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.responses.create({
      model: "gpt-5.4-mini",
      input: buildPrompt(body.transcript ?? ""),
      text: {
        format: {
          type: "json_schema",
          name: "planner_intake",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              input: {
                type: "object",
                additionalProperties: false,
                properties: {
                  wakeTime: { type: "string" },
                  sleepHours: { type: "number" },
                  workHours: { type: "number" },
                  breaksHours: { type: "number" },
                  fixedEvents: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        title: { type: "string" },
                        start: { type: "string" },
                        end: { type: "string" },
                      },
                      required: ["title", "start", "end"],
                    },
                  },
                  tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        title: { type: "string" },
                        hours: { type: "number" },
                        priority: {
                          type: "string",
                          enum: ["high", "medium", "low"],
                        },
                      },
                      required: ["title", "hours", "priority"],
                    },
                  },
                },
                required: ["wakeTime", "sleepHours", "workHours", "breaksHours", "fixedEvents", "tasks"],
              },
            },
            required: ["input"],
          },
        },
      },
    });

    const parsed = JSON.parse(response.output_text) as { input: PlannerInput };

    return NextResponse.json<ParsedDayRequest>({
      input: parsed.input,
      source: "ai",
    });
  } catch {
    return NextResponse.json<ParsedDayRequest>(fallback);
  }
}

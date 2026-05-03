module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/src/lib/intake.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseDayRequestFallback",
    ()=>parseDayRequestFallback
]);
const defaultInput = {
    wakeTime: "07:00",
    sleepHours: 8,
    workHours: 7,
    breaksHours: 1,
    fixedEvents: [],
    tasks: []
};
function normalizeText(text) {
    return text.replace(/\s+/g, " ").trim();
}
function parseHourValue(raw) {
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
}
function normalizeTime(raw) {
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
function titleCase(value) {
    return value.split(" ").filter(Boolean).map((word)=>word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}
function cleanTitle(raw) {
    return titleCase(raw.replace(/^(i have|i need to|i need|i will|i want to|work on|do|finish)\s+/i, "").replace(/\b(today|tomorrow)\b/gi, "").replace(/\s+/g, " ").trim());
}
function extractWakeTime(text) {
    const patterns = [
        /\b(?:wake(?:\s*up)?|get up)\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,
        /\bstart (?:my )?day\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i
    ];
    for (const pattern of patterns){
        const match = text.match(pattern);
        if (match) {
            return normalizeTime(match[1]);
        }
    }
    return undefined;
}
function extractSingleNumber(text, pattern) {
    const match = text.match(pattern);
    return match ? parseHourValue(match[1]) : undefined;
}
function extractSleepHours(text) {
    return extractSingleNumber(text, /\b(?:sleep(?: for)?|need)\s+(\d+(?:\.\d+)?)\s+hours?\s+of sleep/i);
}
function extractWorkHours(text) {
    return extractSingleNumber(text, /\b(?:work(?: for)?|focus(?: for)?|study(?: for)?)\s+(\d+(?:\.\d+)?)\s+hours?/i);
}
function extractBreakHours(text) {
    return extractSingleNumber(text, /\b(?:breaks?|rest)\s+(?:for\s+)?(\d+(?:\.\d+)?)\s+hours?/i);
}
function extractEvents(text) {
    const events = [];
    const eventPattern = /\b(?:i have|there is|there's|got|have)\s+(.+?)\s+(?:from|at)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:to|-)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/gi;
    for (const match of text.matchAll(eventPattern)){
        const start = normalizeTime(match[2]);
        const end = normalizeTime(match[3]);
        if (!start || !end) {
            continue;
        }
        events.push({
            title: cleanTitle(match[1]),
            start,
            end
        });
    }
    return events;
}
function inferPriority(title) {
    if (/\b(urgent|important|client|deadline|must)\b/i.test(title)) {
        return "high";
    }
    if (/\b(maybe|later|admin|email)\b/i.test(title)) {
        return "low";
    }
    return "medium";
}
function extractTasks(text) {
    const tasks = [];
    const taskPattern = /\b(?:work on|do|finish|complete|study|spend time on|need to work on|need to do)\s+(.+?)\s+for\s+(\d+(?:\.\d+)?)\s+hours?/gi;
    for (const match of text.matchAll(taskPattern)){
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
            priority: inferPriority(title)
        });
    }
    return tasks;
}
function parseDayRequestFallback(rawText) {
    const text = normalizeText(rawText);
    return {
        source: "fallback",
        input: {
            wakeTime: extractWakeTime(text) ?? defaultInput.wakeTime,
            sleepHours: extractSleepHours(text) ?? defaultInput.sleepHours,
            workHours: extractWorkHours(text) ?? defaultInput.workHours,
            breaksHours: extractBreakHours(text) ?? defaultInput.breaksHours,
            fixedEvents: extractEvents(text),
            tasks: extractTasks(text)
        }
    };
}
}),
"[project]/src/app/api/parse/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/openai/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__ = __turbopack_context__.i("[project]/node_modules/openai/client.mjs [app-route] (ecmascript) <export OpenAI as default>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$intake$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/intake.ts [app-route] (ecmascript)");
;
;
;
function buildPrompt(transcript) {
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
        `Transcript: ${transcript}`
    ].join("\n");
}
async function POST(request) {
    const body = await request.json();
    const fallback = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$intake$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDayRequestFallback"])(body.transcript ?? "");
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(fallback);
    }
    try {
        const openai = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__["default"]({
            apiKey
        });
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
                                    wakeTime: {
                                        type: "string"
                                    },
                                    sleepHours: {
                                        type: "number"
                                    },
                                    workHours: {
                                        type: "number"
                                    },
                                    breaksHours: {
                                        type: "number"
                                    },
                                    fixedEvents: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            additionalProperties: false,
                                            properties: {
                                                title: {
                                                    type: "string"
                                                },
                                                start: {
                                                    type: "string"
                                                },
                                                end: {
                                                    type: "string"
                                                }
                                            },
                                            required: [
                                                "title",
                                                "start",
                                                "end"
                                            ]
                                        }
                                    },
                                    tasks: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            additionalProperties: false,
                                            properties: {
                                                title: {
                                                    type: "string"
                                                },
                                                hours: {
                                                    type: "number"
                                                },
                                                priority: {
                                                    type: "string",
                                                    enum: [
                                                        "high",
                                                        "medium",
                                                        "low"
                                                    ]
                                                }
                                            },
                                            required: [
                                                "title",
                                                "hours",
                                                "priority"
                                            ]
                                        }
                                    }
                                },
                                required: [
                                    "wakeTime",
                                    "sleepHours",
                                    "workHours",
                                    "breaksHours",
                                    "fixedEvents",
                                    "tasks"
                                ]
                            }
                        },
                        required: [
                            "input"
                        ]
                    }
                }
            }
        });
        const parsed = JSON.parse(response.output_text);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            input: parsed.input,
            source: "ai"
        });
    } catch  {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(fallback);
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0nf-3bv._.js.map
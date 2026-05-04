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
"[project]/src/lib/planner.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "generateFallbackPlan",
    ()=>generateFallbackPlan
]);
const MINUTES_IN_DAY = 24 * 60;
function toMinutes(time) {
    const [hour, minute] = time.split(":").map(Number);
    return hour * 60 + minute;
}
function toClock(totalMinutes) {
    const normalized = (totalMinutes % MINUTES_IN_DAY + MINUTES_IN_DAY) % MINUTES_IN_DAY;
    const hour = Math.floor(normalized / 60).toString().padStart(2, "0");
    const minute = (normalized % 60).toString().padStart(2, "0");
    return `${hour}:${minute}`;
}
function addBlock(blocks, start, end, title, type, notes) {
    if (end <= start) {
        return;
    }
    blocks.push({
        title,
        start: toClock(start),
        end: toClock(end),
        type,
        notes
    });
}
function sortTasks(tasks) {
    const priorityWeight = {
        high: 0,
        medium: 1,
        low: 2
    };
    return [
        ...tasks
    ].sort((a, b)=>{
        if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
            return priorityWeight[a.priority] - priorityWeight[b.priority];
        }
        return b.hours - a.hours;
    });
}
function generateFallbackPlan(input) {
    const wakeMinutes = toMinutes(input.wakeTime);
    const sleepMinutes = Math.round(input.sleepHours * 60);
    const bedMinutes = wakeMinutes - sleepMinutes;
    const dayEnd = bedMinutes <= wakeMinutes ? bedMinutes + MINUTES_IN_DAY : bedMinutes;
    const fixedEvents = input.fixedEvents.map((event)=>{
        let start = toMinutes(event.start);
        let end = toMinutes(event.end);
        if (start < wakeMinutes) {
            start += MINUTES_IN_DAY;
        }
        if (end <= start) {
            end += MINUTES_IN_DAY;
        }
        return {
            ...event,
            start,
            end
        };
    }).sort((a, b)=>a.start - b.start);
    const taskPool = sortTasks(input.tasks).map((task)=>({
            ...task,
            remainingMinutes: Math.round(task.hours * 60)
        }));
    const blocks = [];
    addBlock(blocks, bedMinutes, wakeMinutes, "Sleep", "sleep", `${input.sleepHours} hours planned`);
    let cursor = wakeMinutes;
    let workedMinutes = 0;
    let breakBudget = Math.round(input.breaksHours * 60);
    const scheduleGap = (gapStart, gapEnd)=>{
        let localCursor = gapStart;
        while(localCursor < gapEnd){
            const task = taskPool.find((item)=>item.remainingMinutes > 0 && workedMinutes < input.workHours * 60);
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
            const shouldTakeBreak = breakBudget > 0 && localCursor < gapEnd && session >= 60 && gapEnd - localCursor >= 15;
            if (shouldTakeBreak) {
                const breakMinutes = Math.min(15, breakBudget, gapEnd - localCursor);
                addBlock(blocks, localCursor, localCursor + breakMinutes, "Recharge break", "break");
                breakBudget -= breakMinutes;
                localCursor += breakMinutes;
            }
        }
    };
    for (const event of fixedEvents){
        if (event.start > cursor) {
            scheduleGap(cursor, Math.min(event.start, dayEnd));
        }
        addBlock(blocks, Math.max(event.start, wakeMinutes), Math.min(event.end, dayEnd), event.title, "fixed");
        cursor = Math.max(cursor, event.end);
    }
    if (cursor < dayEnd) {
        scheduleGap(cursor, dayEnd);
    }
    return blocks.filter((block)=>{
        const start = toMinutes(block.start);
        const end = toMinutes(block.end);
        return start !== end;
    }).sort((a, b)=>{
        const aStart = toMinutes(a.start);
        const bStart = toMinutes(b.start);
        return aStart - bStart;
    });
}
}),
"[project]/src/app/api/plan/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/openai/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__ = __turbopack_context__.i("[project]/node_modules/openai/client.mjs [app-route] (ecmascript) <export OpenAI as default>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$planner$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/planner.ts [app-route] (ecmascript)");
;
;
;
function buildPrompt(input) {
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
        `Tasks: ${JSON.stringify(input.tasks)}`
    ].join("\n");
}
async function POST(request) {
    const input = await request.json();
    const fallback = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$planner$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["generateFallbackPlan"])(input);
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            schedule: fallback,
            source: "fallback"
        });
    }
    try {
        const openai = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__["default"]({
            apiKey
        });
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
                                        title: {
                                            type: "string"
                                        },
                                        start: {
                                            type: "string"
                                        },
                                        end: {
                                            type: "string"
                                        },
                                        type: {
                                            type: "string",
                                            enum: [
                                                "sleep",
                                                "fixed",
                                                "task",
                                                "break",
                                                "buffer"
                                            ]
                                        },
                                        notes: {
                                            type: "string"
                                        }
                                    },
                                    required: [
                                        "title",
                                        "start",
                                        "end",
                                        "type"
                                    ]
                                }
                            }
                        },
                        required: [
                            "schedule"
                        ]
                    }
                }
            }
        });
        const text = response.output_text;
        const parsed = JSON.parse(text);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            schedule: parsed.schedule,
            source: "ai"
        });
    } catch  {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            schedule: fallback,
            source: "fallback"
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0pw2faf._.js.map
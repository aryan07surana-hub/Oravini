/**
 * Lightweight pub/sub for CRM real-time events.
 * The WebSocket handler in routes.ts subscribes once on boot and fans out to
 * every connected admin socket.
 */

export type CrmEvent =
  | { kind: "contact.created" | "contact.updated" | "contact.deleted"; id: string }
  | { kind: "opportunity.created" | "opportunity.updated" | "opportunity.deleted"; id: string; pipelineId?: string; stageId?: string }
  | { kind: "task.created" | "task.updated" | "task.deleted"; id: string }
  | { kind: "activity.created"; id: string; contactId?: string | null; opportunityId?: string | null }
  | { kind: "stage.created" | "stage.updated" | "stage.deleted"; id: string; pipelineId?: string }
  | { kind: "pipeline.created" | "pipeline.updated" | "pipeline.deleted"; id: string }
  | { kind: "tag.created" | "tag.deleted"; id: string };

type Listener = (e: CrmEvent) => void;

const listeners = new Set<Listener>();

export function emitCrmEvent(e: CrmEvent) {
  for (const l of listeners) {
    try { l(e); } catch (err) { console.error("[crm-events] listener error:", err); }
  }
}

export function onCrmEvent(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

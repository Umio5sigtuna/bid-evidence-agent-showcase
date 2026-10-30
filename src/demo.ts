import scenario from "../demo/scenario.json";
export const { project, reference, tools, answer, question } = scenario;
export type Event = {
  sequence: number;
  run_id: string;
  project_id: string;
  kind:
    | "started"
    | "tool_started"
    | "tool_completed"
    | "delta"
    | "completed"
    | "cancelled";
  tool?: string;
  duration_ms?: number;
  text?: string;
};
export type Phase =
  "idle" | "submitting" | "running" | "completed" | "cancelled" | "failed";
export type View = {
  lastSequence: number;
  phase: Phase;
  text: string;
  events: Event[];
  error: string;
};
export const emptyView = (): View => ({
  lastSequence: 0,
  phase: "idle",
  text: "",
  events: [],
  error: "",
});
export function assertEvent(value: unknown, runId: string): Event {
  const v = value as Event;
  if (
    !v ||
    v.run_id !== runId ||
    v.project_id !== project.id ||
    !Number.isInteger(v.sequence) ||
    v.sequence < 1 ||
    v.sequence > 1000 ||
    ![
      "started",
      "tool_started",
      "tool_completed",
      "delta",
      "completed",
      "cancelled",
    ].includes(v.kind)
  )
    throw Error("执行记录身份不一致");
  if (
    v.kind === "delta" &&
    (typeof v.text !== "string" || v.text.length > 16000)
  )
    throw Error("文本事件不完整");
  if (
    (v.kind === "tool_started" || v.kind === "tool_completed") &&
    !tools.some((t) => t.id === v.tool)
  )
    throw Error("包含未登记工具");
  if (v.tool !== undefined && !tools.some((t) => t.id === v.tool))
    throw Error("包含未登记工具");
  if (
    v.duration_ms !== undefined &&
    (!Number.isFinite(v.duration_ms) || v.duration_ms < 0)
  )
    throw Error("耗时事件无效");
  return v;
}
export function reduceEvent(view: View, event: Event): View {
  if (
    event.sequence <= view.lastSequence ||
    ["completed", "cancelled", "failed"].includes(view.phase)
  )
    return view;
  if (event.sequence !== view.lastSequence + 1)
    throw Error("事件中断，请重新读取执行记录");
  return {
    ...view,
    lastSequence: event.sequence,
    events: [...view.events, event],
    phase:
      event.kind === "completed"
        ? "completed"
        : event.kind === "cancelled"
          ? "cancelled"
          : "running",
    text: view.text + (event.kind === "delta" ? event.text || "" : ""),
  };
}
export function toolStatus(view: View, id: string) {
  const records = view.events.filter((e) => e.tool === id);
  const last = records.at(-1);
  return last?.kind === "tool_completed"
    ? "completed"
    : last?.kind === "tool_started" && view.phase === "running"
      ? "running"
      : "pending";
}
function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted)
      return reject(new DOMException("Aborted", "AbortError"));
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}
export async function simulate(
  runId: string,
  signal: AbortSignal,
  receive: (event: Event) => void,
) {
  let sequence = 0;
  const emit = (data: Omit<Event, "sequence" | "run_id" | "project_id">) =>
    receive({
      ...data,
      sequence: ++sequence,
      run_id: runId,
      project_id: project.id,
    });
  emit({ kind: "started" });
  for (const tool of tools) {
    emit({ kind: "tool_started", tool: tool.id });
    const start = performance.now();
    await wait(140, signal);
    emit({
      kind: "tool_completed",
      tool: tool.id,
      duration_ms: Math.round(performance.now() - start),
    });
  }
  for (let i = 0; i < answer.length; i += 32) {
    await wait(18, signal);
    emit({ kind: "delta", text: answer.slice(i, i + 32) });
  }
  emit({ kind: "completed" });
}

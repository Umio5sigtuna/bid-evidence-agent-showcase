export const project = {
  id: "DEMO-001",
  name: "虚构市政道路工程",
  revision: "demo-v1",
};
export const reference = {
  id: "DEMO-REF-001",
  title: "虚构工作记录示例",
  page: 1,
  text: "示例工作记录应包含任务名称、负责人、完成状态和依据编号。",
};
export const tools = [
  {
    id: "read",
    name: "读取演示资料",
    detail: "载入内置虚构文本，不读取磁盘标书",
  },
  {
    id: "retrieve",
    name: "选择示例依据",
    detail: "返回预置引用，不运行真实知识检索",
  },
  {
    id: "summarize",
    name: "生成演示摘要",
    detail: "组合模板说明，不调用大语言模型",
  },
] as const;
export type Event = {
  sequence: number;
  run_id: string;
  project_id: string;
  kind: "started" | "tool_started" | "tool_completed" | "delta" | "completed";
  tool?: string;
  duration_ms?: number;
  text?: string;
};
export const answer =
  "### 让结果与依据对应\n\n每条检查记录可以关联资料编号、版本与页码，复核时沿原文核对。\n\n> " +
  reference.text +
  "\n\n示例来源：**DEMO-REF-001 · 示例页 1**。\n\n本页使用预置文本演示交互，未检索真实规范、未调用模型，也不输出工程质量结论。";
export function assertEvent(value: unknown, runId: string): Event {
  const v = value as Event;
  if (
    !v ||
    v.run_id !== runId ||
    v.project_id !== project.id ||
    !Number.isInteger(v.sequence) ||
    v.sequence < 1 ||
    ![
      "started",
      "tool_started",
      "tool_completed",
      "delta",
      "completed",
    ].includes(v.kind)
  )
    throw Error("执行记录身份不一致");
  if (
    v.text !== undefined &&
    (typeof v.text !== "string" || v.text.length > 16000)
  )
    throw Error("消息超出展示范围");
  if (v.tool !== undefined && !tools.some((t) => t.id === v.tool))
    throw Error("包含未登记工具");
  return v;
}
export type View = {
  lastSequence: number;
  phase: "idle" | "running" | "completed";
  activeTool: string | null;
  completedTools: string[];
  text: string;
  events: Event[];
};
export const emptyView = (): View => ({
  lastSequence: 0,
  phase: "idle",
  activeTool: null,
  completedTools: [],
  text: "",
  events: [],
});
export function reduceEvent(view: View, event: Event): View {
  if (event.sequence <= view.lastSequence || view.phase === "completed")
    return view;
  if (event.sequence !== view.lastSequence + 1)
    throw Error("事件中断，请重新读取执行记录");
  const next = {
    ...view,
    lastSequence: event.sequence,
    events: [...view.events, event],
  };
  if (event.kind === "started") next.phase = "running";
  if (event.kind === "tool_started") next.activeTool = event.tool || null;
  if (event.kind === "tool_completed") {
    next.activeTool = null;
    next.completedTools = [...new Set([...view.completedTools, event.tool!])];
  }
  if (event.kind === "delta") next.text += event.text || "";
  if (event.kind === "completed") {
    next.phase = "completed";
    next.activeTool = null;
  }
  return next;
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
    await wait(350, signal);
    emit({
      kind: "tool_completed",
      tool: tool.id,
      duration_ms: Math.round(performance.now() - start),
    });
  }
  for (let i = 0; i < answer.length; i += 18) {
    await wait(45, signal);
    emit({ kind: "delta", text: answer.slice(i, i + 18) });
  }
  emit({ kind: "completed" });
}

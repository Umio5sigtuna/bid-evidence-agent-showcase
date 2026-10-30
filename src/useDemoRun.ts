import { useEffect, useRef, useState } from "react";
import { emptyView, reduceEvent, simulate, question, type Event } from "./demo";
import { startBackend, cancelBackend } from "./api";
type Job = { controller: AbortController; runId: string; done: boolean };
export function useDemoRun(base: string | null) {
  const [view, setView] = useState(emptyView),
    job = useRef<Job | null>(null),
    intent = useRef<string | null>(null);
  const busy = view.phase === "submitting" || view.phase === "running";
  useEffect(
    () => () => {
      const current = job.current;
      if (current && !current.done) {
        current.controller.abort();
        if (base && current.runId) void cancelBackend(base, current.runId);
      }
    },
    [base],
  );
  async function start() {
    if (
      job.current &&
      !job.current.done &&
      !job.current.controller.signal.aborted
    )
      return;
    const current: Job = {
      controller: new AbortController(),
      runId: "",
      done: false,
    };
    job.current = current;
    setView({ ...emptyView(), phase: "submitting" });
    intent.current ||= "req-demo-" + crypto.randomUUID();
    const receive = (event: Event) => {
      if (job.current === current && !current.controller.signal.aborted)
        setView((prev) => reduceEvent(prev, event));
    };
    try {
      if (base)
        await startBackend(
          base,
          intent.current,
          question,
          current.controller.signal,
          receive,
          (id) => {
            current.runId = id;
          },
        );
      else
        await simulate(
          "browser-" + crypto.randomUUID(),
          current.controller.signal,
          receive,
        );
      if (job.current === current) intent.current = null;
    } catch (error) {
      if (job.current === current && !current.controller.signal.aborted)
        setView((prev) => ({
          ...prev,
          phase: "failed",
          error: error instanceof Error ? error.message : "演示未完成",
        }));
    } finally {
      current.done = true;
    }
  }
  async function stop() {
    const current = job.current;
    if (!current || current.done) return;
    current.controller.abort();
    setView((prev) => ({ ...prev, phase: "cancelled", error: "" }));
    intent.current = null;
    if (
      base &&
      current.runId &&
      !(await cancelBackend(base, current.runId)) &&
      job.current === current
    )
      setView((prev) => ({
        ...prev,
        error: "已停止接收；后端停止回执尚未确认。",
      }));
  }
  return { view, busy, start, stop };
}

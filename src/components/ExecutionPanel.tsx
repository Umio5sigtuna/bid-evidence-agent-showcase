import { lazy, Suspense, useState } from "react";
import { tools, toolStatus, type View } from "../demo";
const FlowDiagram = lazy(() => import("./FlowDiagram"));
export default function ExecutionPanel({ view }: { view: View }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="card execution-panel">
      <div className="section-heading">
        <h2>执行过程</h2>
        <button
          className="quiet"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? "收起流程图" : "展开流程图"}
        </button>
      </div>
      <ol className="timeline">
        {tools.map((tool, i) => {
          const state = toolStatus(view, tool.id),
            elapsed = view.events.find(
              (e) => e.kind === "tool_completed" && e.tool === tool.id,
            )?.duration_ms;
          return (
            <li className={state} key={tool.id}>
              <span className="step">
                {state === "completed" ? "✓" : i + 1}
              </span>
              <div>
                <strong>{tool.name}</strong>
                <small>{state === "running" ? "执行中" : tool.detail}</small>
              </div>
              <span>{elapsed === undefined ? "—" : elapsed + " ms"}</span>
            </li>
          );
        })}
      </ol>
      {open && (
        <Suspense fallback={<p role="status">载入流程图…</p>}>
          <FlowDiagram view={view} />
        </Suspense>
      )}
      <p className="subtle">
        {view.events.length} 条事件 · 耗时为本次演示测量值
      </p>
    </section>
  );
}

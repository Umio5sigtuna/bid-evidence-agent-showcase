import { StrictMode, Suspense, lazy, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ReactFlow,
  Background,
  Controls,
  Position,
  type Node,
  type Edge,
  type ReactFlowInstance,
} from "@xyflow/react";
const ReactMarkdown = lazy(() => import("react-markdown"));
import {
  project,
  reference,
  tools,
  emptyView,
  simulate,
  reduceEvent,
  type Event,
} from "./demo";
import { backendBase, startBackend } from "./api";
import "@xyflow/react/dist/style.css";
import "./style.css";

function App() {
  const [tab, setTab] = useState<"workspace" | "architecture">("workspace"),
    [question, setQuestion] = useState("如何追溯检查结果的依据？"),
    [view, setView] = useState(emptyView),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [flow, setFlow] = useState<ReactFlowInstance | null>(null);
  const abort = useRef<AbortController | null>(null),
    canvas = useRef<HTMLDivElement>(null),
    intent = useRef<string | null>(null);
  const [mobile, setMobile] = useState(window.innerWidth <= 620);
  useEffect(() => {
    const query = window.matchMedia("(max-width:620px)");
    const update = () => setMobile(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const base = backendBase(import.meta.env.VITE_DEMO_API_BASE);
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    if (!flow || !canvas.current) return;
    const fit = () => {
      if (canvas.current!.clientWidth)
        void flow.fitView({ padding: 0.25, maxZoom: 1 });
    };
    const observer = new ResizeObserver(fit);
    observer.observe(canvas.current);
    fit();
    return () => observer.disconnect();
  }, [flow, tab, mobile]);
  const nodes: Node[] = tools.map((tool, i) => ({
    id: tool.id,
    position: mobile ? { x: 15, y: i * 105 } : { x: 15 + i * 230, y: 20 },
    sourcePosition: mobile ? Position.Bottom : Position.Right,
    targetPosition: mobile ? Position.Top : Position.Left,
    data: {
      label: (
        <>
          <span className="node-number">0{i + 1}</span>
          <strong>{tool.name}</strong>
          <small>
            {view.completedTools.includes(tool.id)
              ? "完成"
              : view.activeTool === tool.id
                ? "执行中"
                : "等待执行"}
          </small>
        </>
      ),
    },
    className: view.completedTools.includes(tool.id)
      ? "done"
      : view.activeTool === tool.id
        ? "active"
        : "",
  }));
  const edges: Edge[] = tools
    .slice(1)
    .map((tool, i) => ({
      id: tools[i].id + "-" + tool.id,
      source: tools[i].id,
      target: tool.id,
      animated: view.activeTool === tool.id,
    }));
  async function run() {
    if (busy) return;
    setBusy(true);
    setError("");
    setView(emptyView());
    const controller = new AbortController();
    abort.current = controller;
    const requestId = intent.current || "req-demo-" + crypto.randomUUID();
    intent.current = requestId;
    const receive = (event: Event) =>
      setView((prev) => reduceEvent(prev, event));
    try {
      if (base)
        await startBackend(
          base,
          requestId,
          question,
          controller.signal,
          receive,
        );
      else
        await simulate(
          "browser-" + crypto.randomUUID(),
          controller.signal,
          receive,
        );
      intent.current = null;
    } catch (err) {
      if (!controller.signal.aborted)
        setError(err instanceof Error ? err.message : "演示未完成");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="app">
      <header className="topbar">
        <a href="#" className="brand">
          <span className="logo">B</span>BidEvidence
          <span className="muted">Agent</span>
        </a>
        <span className="demo-pill">
          <i />
          公开展示版 · 虚构数据
        </span>
        <a href="#about">项目说明 ↗</a>
      </header>
      <main>
        <section className="hero">
          <div>
            <div className="eyebrow">EVIDENCE FIRST · AGENT WORKSPACE</div>
            <h1>
              让每一次检查
              <br />
              都能回到<span>依据</span>
            </h1>
            <p>
              施工组织设计证据审查平台的独立展示工程。
              <br />
              查看资料、工具过程与执行记录，了解垂直领域 Agent 的交付方式。
            </p>
            <div className="hero-tags">
              <span>Python / FastAPI</span>
              <span>React / TypeScript</span>
              <span>SSE / 工作流</span>
            </div>
          </div>
          <aside className="hero-card">
            <span className="small-label">公开演示范围</span>
            <strong>流程可见，数据隔离</strong>
            <p>
              全部示例文本为人工编写。
              <br />
              无需密钥，不发起模型调用。
              <br />
              核心规则与真实资料保留在内部系统。
            </p>
            <div className="mode">
              <span /> {base ? "本机 FastAPI + SSE" : "浏览器离线模拟"}
            </div>
          </aside>
        </section>
        <nav className="tabs" aria-label="展示模块">
          <button
            aria-pressed={tab === "workspace"}
            onClick={() => setTab("workspace")}
          >
            交互演示
          </button>
          <button
            aria-pressed={tab === "architecture"}
            onClick={() => setTab("architecture")}
          >
            架构与边界
          </button>
          <span>DEMO-001 / demo-v1</span>
        </nav>
        {tab === "workspace" ? (
          <>
            <section className="workflow card">
              <div className="section-heading">
                <div>
                  <span className="small-label">01 / WORKFLOW</span>
                  <h2>有界工具执行过程</h2>
                </div>
                <span
                  className={
                    "status " + (view.phase === "completed" ? "success" : "")
                  }
                >
                  {busy
                    ? "执行中"
                    : view.phase === "completed"
                      ? "本次演示完成"
                      : "等待执行"}
                </span>
              </div>
              <div className="flow" ref={canvas}>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onInit={setFlow}
                  fitView
                  fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
                  nodesDraggable={false}
                  nodesConnectable={false}
                  elementsSelectable={false}
                  minZoom={0.2}
                  proOptions={{ hideAttribution: false }}
                >
                  <Background gap={20} color="#d8e3e1" />
                  <Controls showInteractive={false} />
                </ReactFlow>
              </div>
              <p className="workflow-caption">
                每个步骤只执行登记的演示动作。展示耗时为本次模拟 /
                本机调用的测量值，不是生产性能指标。
              </p>
            </section>
            <div className="workspace">
              <section className="chat card">
                <div className="section-heading">
                  <div>
                    <span className="small-label">02 / CONVERSATION</span>
                    <h2>从一个问题开始</h2>
                  </div>
                  <span className="subtle">{project.name}</span>
                </div>
                <div className="conversation" aria-live="polite">
                  {view.text ? (
                    <article className="answer">
                      <div className="answer-title">
                        <span className="avatar">B</span>
                        <strong>演示摘要</strong>
                        <small>{busy ? "流式展示中" : "预置模板输出"}</small>
                      </div>
                      <Suspense fallback={<p>{view.text}</p>}>
                        <ReactMarkdown
                          skipHtml
                          components={{
                            img: () => null,
                            a: (props) => (
                              <a
                                {...props}
                                rel="noopener noreferrer"
                                target="_blank"
                              />
                            ),
                          }}
                        >
                          {view.text}
                        </ReactMarkdown>
                      </Suspense>
                    </article>
                  ) : (
                    <div className="empty">
                      <span>↗</span>
                      <h3>将问题、过程与依据放在一起</h3>
                      <p>
                        点击执行，观察工具节点、流式文本和事件记录。
                        <br />
                        这里演示产品交互，不判断实际工程质量。
                      </p>
                    </div>
                  )}
                </div>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void run();
                  }}
                >
                  <label htmlFor="question">演示问题</label>
                  <textarea
                    id="question"
                    value={question}
                    onChange={(event) => {
                      setQuestion(event.target.value);
                      intent.current = null;
                    }}
                    maxLength={200}
                    disabled={busy}
                    rows={2}
                  />
                  <div className="composer-footer">
                    <span>固定场景，预置回答 · 无模型费用</span>
                    <button
                      className="primary"
                      disabled={busy || !question.trim()}
                    >
                      {busy
                        ? "正在执行…"
                        : view.phase === "completed"
                          ? "重新演示 ↗"
                          : "执行演示 ↗"}
                    </button>
                  </div>
                </form>
                {error && (
                  <p role="alert" className="error">
                    {error}
                  </p>
                )}
              </section>
              <aside className="side">
                <section className="card evidence">
                  <span className="small-label">03 / CITATION</span>
                  <h2>可定位的示例依据</h2>
                  <div className="reference-type">人工样例 / 非工程规范</div>
                  <h3>{reference.title}</h3>
                  <blockquote>{reference.text}</blockquote>
                  <dl>
                    <div>
                      <dt>资料编号</dt>
                      <dd>{reference.id}</dd>
                    </div>
                    <div>
                      <dt>版本</dt>
                      <dd>demo-v1</dd>
                    </div>
                    <div>
                      <dt>位置</dt>
                      <dd>示例页 1</dd>
                    </div>
                  </dl>
                  <a
                    href={import.meta.env.BASE_URL + "demo/reference.txt"}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    打开全部示例文本 ↗
                  </a>
                </section>
                <section className="card timeline">
                  <span className="small-label">04 / EXECUTION</span>
                  <h2>事件时间线</h2>
                  <ol>
                    {tools.map((tool) => (
                      <li
                        key={tool.id}
                        className={
                          view.completedTools.includes(tool.id)
                            ? "finished"
                            : ""
                        }
                      >
                        <span className="dot" />
                        <div>
                          <strong>{tool.name}</strong>
                          <small>{tool.detail}</small>
                        </div>
                        <span>
                          {view.events
                            .find(
                              (event) =>
                                event.kind === "tool_completed" &&
                                event.tool === tool.id,
                            )
                            ?.duration_ms?.toString()
                            .concat(" ms") || "—"}
                        </span>
                      </li>
                    ))}
                  </ol>
                  <p>
                    {view.lastSequence
                      ? `${view.lastSequence} 条有序事件`
                      : "执行后展示事件记录"}{" "}
                    · 不含提示词或密钥
                  </p>
                </section>
              </aside>
            </div>
          </>
        ) : (
          <section className="card architecture">
            <span className="small-label">SYSTEM DESIGN</span>
            <h2>业务证据与工程能力分别组织</h2>
            <p>
              完整版围绕资料解析、检索、核查、复核与修订回查组织。本仓库重新编写了可公开的最小演示，不连接原系统。
            </p>
            <div className="architecture-grid">
              {[
                [
                  "交互层",
                  "React · TypeScript · React Flow",
                  "对话、工具状态、引用卡片、响应式布局",
                ],
                [
                  "执行层",
                  "FastAPI · asyncio · SSE",
                  "可选本机接口、幂等请求、有序事件",
                ],
                [
                  "完整版内部能力",
                  "LangGraph · LlamaIndex · OpenTelemetry",
                  "框架选型与职责见架构文档，核心代码不在本仓库",
                ],
              ].map(([title, stack, detail]) => (
                <article key={title}>
                  <h3>{title}</h3>
                  <strong>{stack}</strong>
                  <p>{detail}</p>
                </article>
              ))}
            </div>
            <h3>本仓库不包含</h3>
            <p>
              真实标书和图纸、规范全文、客户信息、原模型请求或返回、评分权重、核心规则及适用逻辑、商业配置、数据库、密钥、内部审核记录。
            </p>
            <h3>可复现的展示能力</h3>
            <p>
              默认模式无需后端与密钥即可运行。启用可选后端后，使用真实 HTTP /
              SSE 传递预置事件，仍不调用模型或核心算法。
            </p>
          </section>
        )}
        <footer id="about">
          <div>
            <strong>BidEvidence Agent</strong>
            <p>面向投标文件编制与内部审核的证据工作流展示。</p>
          </div>
          <p>
            独立作品展示 · 全部资料为虚构样例
            <br />
            行业公开材料仅作背景参考，不代表官方合作。
          </p>
        </footer>
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

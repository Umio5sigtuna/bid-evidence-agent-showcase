import { StrictMode, Suspense, lazy, useState } from "react";
import { createRoot } from "react-dom/client";
import { ThemeToggle, initializeTheme } from "./ui/ThemeToggle";
import { backendBase } from "./api";
import { useDemoRun } from "./useDemoRun";
import ConversationPanel from "./components/ConversationPanel";
import EvidencePanel from "./components/EvidencePanel";
import ExecutionPanel from "./components/ExecutionPanel";
import "./ui/theme.css";
import "./style.css";
const ProjectOverview = lazy(() => import("./components/ProjectOverview"));
initializeTheme();
function App() {
  const [tab, setTab] = useState(
    location.hash === "#about" ? "about" : "workspace",
  );
  let base: string | null = null,
    configError = "";
  try {
    base = backendBase(import.meta.env.VITE_DEMO_API_BASE);
  } catch {
    configError = "本机后端地址无效，已使用浏览器演示。";
  }
  const { view, busy, start, stop } = useDemoRun(base);
  function select(value: string) {
    setTab(value);
    history.replaceState(null, "", value === "about" ? "#about" : "#workspace");
  }
  return (
    <>
      <header className="topbar">
        <a
          className="brand"
          href="#workspace"
          onClick={() => select("workspace")}
        >
          <span className="logo">B</span>
          <span>
            BidEvidence <small>证据工作台</small>
          </span>
        </a>
        <div className="top-actions">
          <span className="demo-pill">虚构数据 · 公开展示</span>
          <ThemeToggle />
        </div>
      </header>
      <main className="page">
        <div className="page-heading">
          <div>
            <h1>项目证据工作台</h1>
            <p>
              查看问题、依据与执行过程。
              {base ? "本机 FastAPI / SSE" : "浏览器演示"}，无需模型密钥。
            </p>
          </div>
          <span className="badge">
            {busy
              ? "执行中"
              : view.phase === "completed"
                ? "已完成"
                : "演示模式"}
          </span>
        </div>
        <nav className="tabs" aria-label="展示模块">
          <button
            aria-pressed={tab === "workspace"}
            onClick={() => select("workspace")}
          >
            演示工作台
          </button>
          <button
            aria-pressed={tab === "about"}
            onClick={() => select("about")}
          >
            项目说明
          </button>
          <span>DEMO-001 / demo-v1</span>
        </nav>
        {configError && (
          <p className="notice" role="status">
            {configError}
          </p>
        )}
        <div hidden={tab !== "workspace"} className="workspace-grid">
          <ConversationPanel
            view={view}
            busy={busy}
            start={() => void start()}
            stop={() => void stop()}
          />
          <aside className="side">
            <EvidencePanel />
            <ExecutionPanel view={view} />
          </aside>
        </div>
        {tab === "about" && (
          <Suspense fallback={<p role="status">载入项目说明…</p>}>
            <ProjectOverview />
          </Suspense>
        )}
        <footer>
          <span>独立展示工程 · 人工样例 · 无模型费用</span>
          <a
            href="https://github.com/Umio5sigtuna/bid-evidence-agent-showcase"
            target="_blank"
            rel="noopener noreferrer"
          >
            查看代码与架构 ↗
          </a>
        </footer>
      </main>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

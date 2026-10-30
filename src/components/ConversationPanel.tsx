import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { question, type View } from "../demo";
const Markdown = lazy(() => import("react-markdown"));
export default function ConversationPanel({
  view,
  busy,
  start,
  stop,
}: {
  view: View;
  busy: boolean;
  start: () => void;
  stop: () => void;
}) {
  const log = useRef<HTMLDivElement>(null),
    nearBottom = useRef(true);
  const [copyState, setCopyState] = useState("复制结果");
  useEffect(() => {
    if (nearBottom.current && log.current)
      log.current.scrollTop = log.current.scrollHeight;
  }, [view.text]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(view.text);
      setCopyState("已复制");
    } catch {
      setCopyState("复制失败，请选中文字复制");
    }
  }
  return (
    <section className="card conversation-panel">
      <div className="section-heading">
        <div>
          <h2>引用追溯演示</h2>
          <p>固定问题与人工样例，不调用模型。</p>
        </div>
        <span className="badge">演示模式</span>
      </div>
      <div
        className="messages"
        ref={log}
        aria-live="polite"
        onScroll={() => {
          const node = log.current;
          if (node)
            nearBottom.current =
              node.scrollHeight - node.scrollTop - node.clientHeight < 80;
        }}
      >
        <div className="question">
          <strong>示例问题</strong>
          <p>{question}</p>
        </div>
        {view.text ? (
          <article className="answer">
            <h3>演示摘要</h3>
            <Suspense fallback={<p>{view.text}</p>}>
              <Markdown
                skipHtml
                components={{
                  img: () => null,
                  a: (props) => (
                    <a {...props} target="_blank" rel="noopener noreferrer" />
                  ),
                }}
              >
                {view.text}
              </Markdown>
            </Suspense>
          </article>
        ) : (
          <div className="empty">
            <h3>一次执行，看清结果来自哪里</h3>
            <p>
              右侧同步显示引用位置与三个执行步骤。
              <br />
              点击下方按钮即可开始，无需输入或配置密钥。
            </p>
          </div>
        )}
      </div>
      {view.error && (
        <p className="error" role="alert">
          {view.error}
        </p>
      )}
      {view.phase === "cancelled" && (
        <p role="status" className="notice">
          演示已停止，当前片段不是完整结果。
        </p>
      )}
      <div className="actions">
        <span role="status">
          {busy
            ? "正在展示执行过程…"
            : view.phase === "completed"
              ? "演示完成 · 结果已保留在本页"
              : "全部资料为虚构样例"}
        </span>
        {view.text && (
          <button className="quiet" onClick={() => void copy()}>
            {copyState}
          </button>
        )}
        {busy ? (
          <button onClick={stop}>停止演示</button>
        ) : (
          <button
            className="primary"
            onClick={() => {
              nearBottom.current = true;
              setCopyState("复制结果");
              start();
            }}
          >
            {view.phase === "idle" ? "开始演示" : "重新演示"}
          </button>
        )}
      </div>
    </section>
  );
}

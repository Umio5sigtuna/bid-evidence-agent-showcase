import { reference, project } from "../demo";
export default function EvidencePanel() {
  return (
    <section className="card evidence-panel">
      <h2>原文依据</h2>
      <span className="subtle">人工样例 · 非工程规范</span>
      <h3>{reference.title}</h3>
      <blockquote>{reference.text}</blockquote>
      <dl>
        <div>
          <dt>来源</dt>
          <dd>{reference.id}</dd>
        </div>
        <div>
          <dt>版本 / 位置</dt>
          <dd>
            {project.revision} / 示例页 {reference.page}
          </dd>
        </div>
      </dl>
      <a
        href={import.meta.env.BASE_URL + "demo/reference.txt"}
        target="_blank"
        rel="noopener noreferrer"
      >
        打开完整示例 ↗
      </a>
    </section>
  );
}

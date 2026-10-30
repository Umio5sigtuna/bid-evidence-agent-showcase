export default function ProjectOverview() {
  return (
    <section className="card overview">
      <h2>项目背景与公开范围</h2>
      <p>
        面向投标文件编制与内部审核，将分散的项目资料、技术依据和核查结果组织成可追溯的证据工作流。
      </p>
      <div className="overview-grid">
        {[
          [
            "交互层",
            "React / TypeScript",
            "对话、引用、执行过程与响应式布局。",
          ],
          [
            "公开演示服务",
            "FastAPI / asyncio / SSE",
            "人工样例、幂等请求、有序事件与取消。",
          ],
          [
            "完整版内部能力",
            "LangGraph / LlamaIndex / OpenTelemetry",
            "核心业务规则与真实数据保持独立。",
          ],
        ].map(([title, stack, description]) => (
          <article key={title}>
            <h3>{title}</h3>
            <strong>{stack}</strong>
            <p>{description}</p>
          </article>
        ))}
      </div>
      <h3>展示内容</h3>
      <p>
        本页是独立演示，默认在浏览器中运行；可选本机后端使用真实 HTTP/SSE
        传递同一份预置资料。演示不检索真实规范、不运行大语言模型，不判断工程质量。
      </p>
      <h3>未公开内容</h3>
      <p>
        核心规则、评分参数、原标书、规范全文、知识库、客户信息、模型请求返回和密钥均不包含。行业公开材料仅用于背景研究，不代表官方合作。
      </p>
    </section>
  );
}

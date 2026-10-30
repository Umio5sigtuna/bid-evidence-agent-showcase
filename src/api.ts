import { assertEvent, type Event, project } from "./demo";
declare global {
  interface ImportMeta {
    readonly env: Record<string, string | undefined>;
  }
}
export function backendBase(raw: string | undefined): string | null {
  if (!raw) return null;
  const u = new URL(raw);
  if (
    u.protocol !== "http:" ||
    !["127.0.0.1", "localhost", "[::1]"].includes(u.hostname) ||
    u.username ||
    u.password ||
    u.search ||
    u.hash ||
    u.pathname !== "/"
  )
    throw Error("演示后端仅允许本机 HTTP 根地址");
  return u.origin;
}
export async function startBackend(
  base: string,
  requestId: string,
  question: string,
  signal: AbortSignal,
  receive: (event: Event) => void,
  onRun?: (id: string) => void,
): Promise<string> {
  const response = await fetch(base + "/api/demo/runs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      request_id: requestId,
      project_id: project.id,
      question,
    }),
    signal,
  });
  if (!response.ok) throw Error("演示任务创建失败：" + response.status);
  const run = await response.json();
  if (!/^demo-[a-f0-9]{24}$/.test(run.run_id) || run.project_id !== project.id)
    throw Error("演示任务身份不一致");
  onRun?.(run.run_id);
  await new Promise<void>((resolve, reject) => {
    const stream = new EventSource(
      base + "/api/demo/runs/" + run.run_id + "/events",
    );
    const stop = () => {
      stream.close();
      signal.removeEventListener("abort", abort);
    };
    const abort = () => {
      stop();
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) return abort();
    stream.addEventListener("demo", (event) => {
      try {
        const parsed = assertEvent(
          JSON.parse((event as MessageEvent).data),
          run.run_id,
        );
        receive(parsed);
        if (parsed.kind === "completed" || parsed.kind === "cancelled") {
          stop();
          resolve();
        }
      } catch (error) {
        stop();
        reject(error);
      }
    });
    stream.onerror = () => {
      stop();
      reject(Error("演示连接中断，可重新执行；不会调用模型"));
    };
  });
  return run.run_id;
}
export async function cancelBackend(
  base: string,
  runId: string,
): Promise<boolean> {
  try {
    const response = await fetch(base + "/api/demo/runs/" + runId + "/cancel", {
      method: "POST",
      keepalive: true,
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

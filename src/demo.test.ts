import { describe, it, expect } from "vitest";
import { assertEvent, emptyView, reduceEvent, type Event } from "./demo";
import { backendBase } from "./api";
const event = (sequence: number, kind: Event["kind"] = "started"): Event => ({
  sequence,
  run_id: "demo-test",
  project_id: "DEMO-001",
  kind,
});
describe("public demo event contracts", () => {
  it("rejects another project before displaying its content", () =>
    expect(() =>
      assertEvent({ ...event(1), project_id: "OTHER" }, "demo-test"),
    ).toThrow());
  it("rejects another run and unknown tools", () => {
    expect(() => assertEvent(event(1), "different")).toThrow();
    expect(() =>
      assertEvent({ ...event(1), tool: "shell" }, "demo-test"),
    ).toThrow();
  });
  it("deduplicates an event replay without duplicating text", () => {
    const start = reduceEvent(emptyView(), event(1));
    const piece = { ...event(2, "delta"), text: "sample" };
    const view = reduceEvent(start, piece);
    expect(reduceEvent(view, piece).text).toBe("sample");
  });
  it("does not regress a completed execution", () => {
    const done = reduceEvent(
      reduceEvent(emptyView(), event(1)),
      event(2, "completed"),
    );
    expect(reduceEvent(done, event(3)).phase).toBe("completed");
  });
  it("rejects gaps instead of claiming all steps were read", () =>
    expect(() => reduceEvent(emptyView(), event(2))).toThrow());
  it("rejects remote or credential-bearing backend URLs", () => {
    for (const url of [
      "https://example.com",
      "http://user:pass@127.0.0.1:8093",
      "http://127.0.0.1:8093/private",
      "http://127.0.0.1:8093/?key=x",
    ])
      expect(() => backendBase(url)).toThrow();
    expect(backendBase("http://127.0.0.1:8093")).toBe("http://127.0.0.1:8093");
    expect(backendBase(undefined)).toBeNull();
  });
});

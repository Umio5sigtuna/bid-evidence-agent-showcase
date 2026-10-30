import { useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Position,
  type Node,
  type Edge,
  type ReactFlowInstance,
} from "@xyflow/react";
import { tools, toolStatus, type View } from "../demo";
import "@xyflow/react/dist/style.css";
export default function FlowDiagram({ view }: { view: View }) {
  const [flow, setFlow] = useState<ReactFlowInstance | null>(null),
    ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!flow || !ref.current) return;
    const observer = new ResizeObserver(() => {
      if (ref.current?.clientWidth)
        void flow.fitView({ padding: 0.2, maxZoom: 1 });
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [flow]);
  const nodes: Node[] = tools.map((t, i) => ({
    id: t.id,
    position: { x: 15, y: i * 100 },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    data: { label: t.name },
    className: toolStatus(view, t.id),
  }));
  const edges: Edge[] = tools.slice(1).map((t, i) => ({
    id: tools[i].id + "-" + t.id,
    source: tools[i].id,
    target: t.id,
  }));
  return (
    <div ref={ref} className="flow" aria-label="演示工具流程图">
      <ReactFlow
        onInit={setFlow}
        nodes={nodes}
        edges={edges}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        minZoom={0.2}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

export type OrgEmp = {
  id: number;
  employeeId: string | null;
  name: string;
  supervisorId: number | null;
  supervisorIds?: number[];
  isOwner?: boolean;
  jobTitle?: string | null;
  photoUrl?: string | null;
};

const NODE_W = 210;
const NODE_H = 84;

function PersonNode({ data }: NodeProps<Node<{ emp: OrgEmp; isRTL: boolean }>>) {
  const { emp, isRTL } = data;
  const initial = (emp.name || "?").trim().charAt(0).toUpperCase();
  return (
    <div
      className={`bg-white rounded-xl shadow-sm px-3 py-2.5 flex items-center gap-2.5 border ${emp.isOwner ? "border-amber-300" : "border-slate-200"}`}
      style={{ width: NODE_W, minHeight: NODE_H }}
    >
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      {emp.photoUrl ? (
        <img src={emp.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-slate-100" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold flex-shrink-0">{initial}</div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-900 truncate">{emp.name}</div>
        <div className="text-[11px] text-slate-500 truncate">{emp.jobTitle || emp.employeeId}</div>
        {emp.isOwner && (
          <div className="mt-0.5 inline-flex px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[9px] font-bold">{isRTL ? "👑 مالك" : "👑 Owner"}</div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
}

const nodeTypes = { person: PersonNode };

function layoutNodes(employees: OrgEmp[], isRTL: boolean): Node[] {
  const childrenOf = new Map<number | null, OrgEmp[]>();
  for (const e of employees) {
    const arr = childrenOf.get(e.supervisorId) || [];
    arr.push(e);
    childrenOf.set(e.supervisorId, arr);
  }
  const subordinateCount = (id: number) => {
    let n = 0;
    for (const e of employees) {
      const all = new Set<number>([...(e.supervisorIds || []), ...(e.supervisorId != null ? [e.supervisorId] : [])]);
      if (all.has(id)) n++;
    }
    return n;
  };
  const positioned: Node[] = [];
  let cursorX = 40;
  const xStep = NODE_W + 60;
  const yStep = NODE_H + 70;
  const subtreeWidth = (emp: OrgEmp): number => {
    const kids = childrenOf.get(emp.id) || [];
    if (kids.length === 0) return 1;
    return kids.reduce((s, k) => s + subtreeWidth(k), 0);
  };
  const place = (emp: OrgEmp, x: number, depth: number) => {
    const w = subtreeWidth(emp);
    const myX = x + ((w - 1) * xStep) / 2;
    positioned.push({ id: String(emp.id), type: "person", position: { x: myX, y: depth * yStep + 40 }, data: { emp, isRTL } });
    let childX = x;
    for (const k of childrenOf.get(emp.id) || []) {
      const kw = subtreeWidth(k);
      place(k, childX, depth + 1);
      childX += kw * xStep;
    }
  };
  const roots = (childrenOf.get(null) || []).filter((r) => subordinateCount(r.id) > 0);
  for (const root of roots) {
    place(root, cursorX, 0);
    cursorX += subtreeWidth(root) * xStep + xStep / 2;
  }
  return positioned;
}

function buildEdges(employees: OrgEmp[]): Edge[] {
  const out: Edge[] = [];
  for (const e of employees) {
    const all = Array.from(new Set([...(e.supervisorIds || []), ...(e.supervisorId != null ? [e.supervisorId] : [])]));
    for (const supId of all) {
      out.push({ id: `e-${supId}-${e.id}`, source: String(supId), target: String(e.id), type: "smoothstep", style: { stroke: "#0c8ce8", strokeWidth: 2 } });
    }
  }
  return out;
}

function Inner({ employees, isRTL }: { employees: OrgEmp[]; isRTL: boolean }) {
  const nodes = useMemo(() => layoutNodes(employees, isRTL), [employees, isRTL]);
  const edges = useMemo(() => buildEdges(employees), [employees]);
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      proOptions={{ hideAttribution: true }}
      minZoom={0.2}
    >
      <Background color="#e2e8f0" gap={20} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}

export default function OrgChart({ employees, isRTL }: { employees: OrgEmp[]; isRTL: boolean }) {
  return (
    <ReactFlowProvider>
      <Inner employees={employees} isRTL={isRTL} />
    </ReactFlowProvider>
  );
}

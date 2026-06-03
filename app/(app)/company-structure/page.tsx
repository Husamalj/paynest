"use client";

import { useEffect, useMemo, useState } from "react";
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
import { AlertTriangle, GitBranch } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import api from "@/lib/api";

type Emp = {
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

function PersonNode({ data }: NodeProps<Node<{ emp: Emp; isRTL: boolean }>>) {
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

function layoutNodes(employees: Emp[], isRTL: boolean): Node[] {
  const childrenOf = new Map<number | null, Emp[]>();
  for (const e of employees) {
    const key = e.supervisorId;
    const arr = childrenOf.get(key) || [];
    arr.push(e);
    childrenOf.set(key, arr);
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

  const subtreeWidth = (emp: Emp): number => {
    const kids = childrenOf.get(emp.id) || [];
    if (kids.length === 0) return 1;
    return kids.reduce((sum, k) => sum + subtreeWidth(k), 0);
  };

  const place = (emp: Emp, x: number, depth: number) => {
    const w = subtreeWidth(emp);
    const myX = x + ((w - 1) * xStep) / 2;
    positioned.push({ id: String(emp.id), type: "person", position: { x: myX, y: depth * yStep + 40 }, data: { emp, isRTL } });
    const kids = childrenOf.get(emp.id) || [];
    let childX = x;
    for (const k of kids) {
      const kw = subtreeWidth(k);
      place(k, childX, depth + 1);
      childX += kw * xStep;
    }
  };

  const roots = childrenOf.get(null) || [];
  const trees = roots.filter((r) => subordinateCount(r.id) > 0);
  for (const root of trees) {
    place(root, cursorX, 0);
    cursorX += subtreeWidth(root) * xStep + xStep / 2;
  }
  return positioned;
}

function buildEdges(employees: Emp[]): Edge[] {
  const out: Edge[] = [];
  for (const e of employees) {
    const all = Array.from(new Set([...(e.supervisorIds || []), ...(e.supervisorId != null ? [e.supervisorId] : [])]));
    for (const supId of all) {
      out.push({ id: `e-${supId}-${e.id}`, source: String(supId), target: String(e.id), type: "smoothstep", style: { stroke: "#0c8ce8", strokeWidth: 2 } });
    }
  }
  return out;
}

function Chart() {
  const { isRTL } = useLanguage();
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get("/supervisors"), api.get("/employees").catch(() => ({ data: [] }))])
      .then(([sRes, eRes]) => {
        const meta = new Map((eRes.data || []).map((e: any) => [e.employee_id, e]));
        const list: Emp[] = ((sRes.data?.employees || []) as any[]).map((s) => ({
          id: s.id,
          employeeId: s.employeeId,
          name: s.name,
          supervisorId: s.supervisorId ?? null,
          supervisorIds: s.supervisorIds ?? [],
          isOwner: s.isOwner,
          jobTitle: (meta.get(s.employeeId) as any)?.job_title ?? null,
          photoUrl: (meta.get(s.employeeId) as any)?.photo_url ?? null,
        }));
        setEmployees(list);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const nodes = useMemo(() => layoutNodes(employees, isRTL), [employees, isRTL]);
  const edges = useMemo(() => buildEdges(employees), [employees]);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h2 className="page-title">{isRTL ? "هيكل الشركة" : "Company Structure"}</h2>
          <p className="page-subtitle">{isRTL ? "عرض للهيكل الإداري — التعديل من صفحة تعيين المشرفين" : "Read-only org chart — edit it from Supervisor Assignment"}</p>
        </div>
      </div>

      {error && <div className="alert alert-error"><AlertTriangle size={16} />{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-slate-500"><span className="spinner spinner-dark w-5 h-5" />{isRTL ? "جاري التحميل" : "Loading"}</div>
      ) : nodes.length === 0 ? (
        <div className="card text-center py-16 text-slate-400">
          <GitBranch size={36} className="mx-auto mb-3 text-slate-300" />
          {isRTL ? "لا يوجد هيكل بعد. ابدأ من صفحة تعيين المشرفين." : "No structure yet. Start from Supervisor Assignment."}
        </div>
      ) : (
        <div className="card p-0 overflow-hidden" style={{ height: "72vh" }}>
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
        </div>
      )}
    </div>
  );
}

export default function CompanyStructurePage() {
  return (
    <ReactFlowProvider>
      <Chart />
    </ReactFlowProvider>
  );
}

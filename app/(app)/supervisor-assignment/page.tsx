"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Network, Save, RotateCcw, Search, AlertTriangle, CheckCircle2, GripVertical, X,
} from "lucide-react";
import api from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import clsx from "clsx";

type Emp = {
  id: number;
  employeeId: string | null;
  name: string;
  email: string;
  phone: string;
  supervisorId: number | null;
  supervisorIds?: number[];
  isOwner?: boolean;
};

const NODE_W = 200;
const NODE_H = 84;

// Custom node — an employee card
function EmployeeNode({ data }: NodeProps<Node<{ emp: Emp; subordinateCount: number; onRemove?: (id: string) => void }>>) {
  const { emp, subordinateCount, onRemove } = data;
  const initial = (emp.name || "?").trim().charAt(0).toUpperCase();
  return (
    <div
      className="group bg-white border border-slate-200 rounded-xl shadow-sm px-3 py-2.5 flex items-center gap-2.5 hover:shadow-md transition-shadow relative"
      style={{ width: NODE_W, minHeight: NODE_H }}
    >
      {onRemove && (
        <button
          title="Return to list"
          onClick={(e) => { e.stopPropagation(); onRemove(String(emp.id)); }}
          className="absolute -top-2 -end-2 w-5 h-5 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center text-xs shadow opacity-0 group-hover:opacity-100 transition-opacity z-10"
        >
          ×
        </button>
      )}
      <Handle type="target" position={Position.Top} className="!bg-brand-500 !w-2.5 !h-2.5 !border-2 !border-white" />
      <div className="w-9 h-9 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold flex-shrink-0">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-900 truncate">{emp.name}</div>
        <div className="text-[11px] text-slate-500 truncate">{emp.employeeId || emp.email}</div>
        {emp.isOwner && (
          <div className="mt-0.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">
            👑 مالك / Owner
          </div>
        )}
        {subordinateCount > 0 && (
          <div className="mt-0.5 inline-flex px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
            {subordinateCount} report{subordinateCount === 1 ? "" : "s"}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-brand-500 !w-2.5 !h-2.5 !border-2 !border-white" />
    </div>
  );
}

const nodeTypes = { employee: EmployeeNode };

// Simple top-down tree layout: each root and its descendants get a column,
// each level a y-offset. Disconnected (single) employees stack on the right.
function layoutNodes(employees: Emp[]): Node[] {
  const childrenOf = new Map<number | null, Emp[]>();
  for (const e of employees) {
    const key = e.supervisorId;
    const arr = childrenOf.get(key) || [];
    arr.push(e);
    childrenOf.set(key, arr);
  }
  // Count direct reports including secondary supervisor relationships
  const subordinateCount = (id: number) => {
    let n = 0;
    for (const e of employees) {
      const all = new Set<number>([
        ...((e as any).supervisorIds || []),
        ...(e.supervisorId != null ? [e.supervisorId] : []),
      ]);
      if (all.has(id)) n++;
    }
    return n;
  };

  const positioned: Node[] = [];
  let cursorX = 40;
  const xStep = NODE_W + 60;
  const yStep = NODE_H + 60;

  // Build subtree widths so siblings don't overlap
  const subtreeWidth = (emp: Emp): number => {
    const kids = childrenOf.get(emp.id) || [];
    if (kids.length === 0) return 1;
    return kids.reduce((sum, k) => sum + subtreeWidth(k), 0);
  };

  const place = (emp: Emp, x: number, depth: number) => {
    const w = subtreeWidth(emp);
    const myX = x + ((w - 1) * xStep) / 2;
    positioned.push({
      id: String(emp.id),
      type: "employee",
      position: { x: myX, y: depth * yStep + 40 },
      data: { emp, subordinateCount: subordinateCount(emp.id) },
    });
    const kids = childrenOf.get(emp.id) || [];
    let childX = x;
    for (const k of kids) {
      const kw = subtreeWidth(k);
      place(k, childX, depth + 1);
      childX += kw * xStep;
    }
  };

  const roots = childrenOf.get(null) || [];
  // Only place employees that are part of a supervisor chain (have subordinates).
  // Orphans (no supervisor, no subordinates) stay in the left rail — not on canvas.
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
    // Combine legacy supervisorId with new supervisorIds array
    const all = Array.from(new Set([
      ...((e as any).supervisorIds || []),
      ...(e.supervisorId != null ? [e.supervisorId] : []),
    ]));
    for (const supId of all) {
      out.push({
        id: `e-${supId}-${e.id}`,
        source: String(supId),
        target: String(e.id),
        type: "smoothstep",
        animated: false,
        style: { stroke: "#0c8ce8", strokeWidth: 2 },
      });
    }
  }
  return out;
}

// Compute supervisorIds map from current edges (parent = source, child = target)
// Each target can have multiple sources (multiple supervisors).
function edgesToSupervisorMap(edges: Edge[]): Map<number, number[]> {
  const m = new Map<number, number[]>();
  for (const e of edges) {
    const t = Number(e.target);
    const s = Number(e.source);
    const list = m.get(t) || [];
    if (!list.includes(s)) list.push(s);
    m.set(t, list);
  }
  return m;
}

function wouldCreateCycle(edges: Edge[], source: string, target: string): boolean {
  // Check whether `source` is a descendant of `target` (would form a cycle if we link target→source... but we connect source→target)
  // We connect source→target, meaning source becomes supervisor of target.
  // Cycle if target is already an ancestor of source: walk from source upward and see if we hit target.
  const parent = new Map<string, string>();
  for (const e of edges) parent.set(e.target, e.source);
  let cur: string | undefined = source;
  const seen = new Set<string>();
  while (cur) {
    if (seen.has(cur)) return true;
    seen.add(cur);
    if (cur === target) return true;
    cur = parent.get(cur);
  }
  return false;
}

function CanvasInner({ employees, setEmployees, lang, t }: any) {
  const isRTL = lang === "ar";
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();

  // Remove a node from the canvas (returns the employee to the left rail)
  const removeFromCanvas = useCallback((nodeId: string) => {
    setNodes((ns) => ns.filter((n) => n.id !== nodeId));
    setEdges((es) => es.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setDirty(true);
  }, [setNodes, setEdges]);

  // Attach the remove handler to every node's data
  const withHandlers = useCallback(
    (ns: Node[]) => ns.map((n) => ({ ...n, data: { ...(n.data as any), onRemove: removeFromCanvas } })),
    [removeFromCanvas]
  );

  // Initial sync: when `employees` (server snapshot) changes, lay out the canvas
  useEffect(() => {
    setNodes(withHandlers(layoutNodes(employees)));
    setEdges(buildEdges(employees));
    setDirty(false);
    setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 50);
  }, [employees, setNodes, setEdges, fitView, withHandlers]);

  // Nodes currently on the canvas (by id)
  const onCanvasIds = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes]);

  // The "Unassigned" rail: employees not yet on the canvas
  const offCanvas = useMemo(
    () => employees.filter((e: Emp) => !onCanvasIds.has(String(e.id))),
    [employees, onCanvasIds]
  );
  const filteredOffCanvas = useMemo(
    () =>
      offCanvas.filter((e: Emp) =>
        (e.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.employeeId || "").toLowerCase().includes(search.toLowerCase())
      ),
    [offCanvas, search]
  );

  // Drag from rail → drop on canvas
  const onDragStartRail = (ev: React.DragEvent, emp: Emp) => {
    ev.dataTransfer.setData("application/paynest-emp", String(emp.id));
    ev.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = useCallback((ev: React.DragEvent) => {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "move";
  }, []);
  const onDrop = useCallback(
    (ev: React.DragEvent) => {
      ev.preventDefault();
      const rawId = ev.dataTransfer.getData("application/paynest-emp");
      if (!rawId) return;
      const empId = Number(rawId);
      const emp = employees.find((e: Emp) => e.id === empId);
      if (!emp) return;
      if (nodes.some((n) => n.id === String(empId))) return;
      const position = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      setNodes((nds) => [
        ...nds,
        {
          id: String(emp.id),
          type: "employee",
          position,
          data: { emp, subordinateCount: 0, onRemove: removeFromCanvas },
        },
      ]);
      setDirty(true);
    },
    [employees, nodes, screenToFlowPosition, setNodes, removeFromCanvas]
  );

  // Connect: source → target means source supervises target
  const onConnect = useCallback(
    (conn: Connection) => {
      if (!conn.source || !conn.target) return;
      if (conn.source === conn.target) {
        setError(t("supervisorCycleError") || "Self-supervision not allowed");
        return;
      }
      // Allow multiple supervisors per employee — but reject duplicate of same edge
      const edgeId = `e-${conn.source}-${conn.target}`;
      if (edges.some((e) => e.id === edgeId)) return;
      // Cycle check on the resulting edge set
      if (wouldCreateCycle(edges, conn.source, conn.target)) {
        setError(t("supervisorCycleError") || "That connection would create a cycle");
        return;
      }
      const newEdge: Edge = {
        id: edgeId,
        source: conn.source,
        target: conn.target,
        type: "smoothstep",
        style: { stroke: "#0c8ce8", strokeWidth: 2 },
      };
      setEdges(addEdge(newEdge, edges));
      setDirty(true);
      setError("");
    },
    [edges, setEdges, t]
  );

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      if (confirm(t("deleteConnection") + "?")) {
        setEdges((es) => es.filter((e) => e.id !== edge.id));
        setDirty(true);
      }
    },
    [setEdges, t]
  );

  const reset = () => {
    setNodes(withHandlers(layoutNodes(employees)));
    setEdges(buildEdges(employees));
    setDirty(false);
    setError("");
    setSuccess("");
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      // Build the multi-supervisor map from current edges
      const supMap = edgesToSupervisorMap(edges);
      const onCanvas = nodes.map((n) => Number(n.id));
      const assignments: Array<{ id: number; supervisorIds: number[] }> = onCanvas.map((id) => ({
        id,
        supervisorIds: supMap.get(id) ?? [],
      }));
      // Any employee removed from canvas should be cleared (had supervisors before)
      const onCanvasSet = new Set(onCanvas);
      for (const e of employees as Emp[]) {
        const hadSupervisors =
          (Array.isArray((e as any).supervisorIds) && (e as any).supervisorIds.length > 0) ||
          e.supervisorId != null;
        if (!onCanvasSet.has(e.id) && hadSupervisors) {
          assignments.push({ id: e.id, supervisorIds: [] });
        }
      }
      const res = await api.put("/supervisors", { assignments });
      if (res.data?.ok) {
        setSuccess(t("supervisorSaved"));
        setDirty(false);
        // Reload server snapshot
        const fresh = await api.get("/supervisors");
        setEmployees(fresh.data?.employees || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-180px)] min-h-[520px]">
      {/* Left rail */}
      <aside className="w-64 flex-shrink-0 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden">
        <div className="p-3 border-b border-slate-100">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
            {t("unassignedEmployees")}
          </div>
          <div className="relative">
            <Search size={14} className={clsx("absolute top-1/2 -translate-y-1/2 text-slate-400", isRTL ? "right-3" : "left-3")} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchEmployees")}
              className={clsx("w-full text-sm rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 py-2", isRTL ? "pr-9 pl-3" : "pl-9 pr-3")}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredOffCanvas.length === 0 && (
            <div className="text-center text-xs text-slate-400 py-8 px-3">
              {t("dragOntoCanvas")}
            </div>
          )}
          {filteredOffCanvas.map((emp: Emp) => (
            <div
              key={emp.id}
              draggable
              onDragStart={(ev) => onDragStartRail(ev, emp)}
              className="group flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-white hover:border-brand-300 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all"
            >
              <GripVertical size={14} className="text-slate-300 group-hover:text-slate-500 flex-shrink-0" />
              <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {(emp.name || "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-900 truncate">{emp.name}</div>
                <div className="text-[10px] text-slate-500 truncate">{emp.employeeId || emp.email}</div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Canvas */}
      <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Network size={16} className="text-brand-600" />
            <span className="font-semibold">{t("supervisorAssignment")}</span>
            {dirty && (
              <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold uppercase">
                {isRTL ? "غير محفوظ" : "Unsaved"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={reset}
              disabled={!dirty || saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw size={14} />
              {t("resetChanges")}
            </button>
            <button
              onClick={save}
              disabled={!dirty || saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {saving ? <span className="spinner" /> : <Save size={14} />}
              {t("saveChanges")}
            </button>
          </div>
        </div>

        {(error || success) && (
          <div className="px-4 py-2 border-b border-slate-100">
            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 flex items-center gap-2">
                <AlertTriangle size={14} />
                {error}
                <button onClick={() => setError("")} className="ml-auto"><X size={14} /></button>
              </div>
            )}
            {success && (
              <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 flex items-center gap-2">
                <CheckCircle2 size={14} />
                {success}
                <button onClick={() => setSuccess("")} className="ml-auto"><X size={14} /></button>
              </div>
            )}
          </div>
        )}

        <div
          ref={wrapperRef}
          onDrop={onDrop}
          onDragOver={onDragOver}
          className="flex-1 relative"
          dir="ltr" /* xyflow internals expect LTR positioning */
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={(changes) => {
              onEdgesChange(changes);
              if (changes.some((c) => c.type === "remove")) setDirty(true);
            }}
            onConnect={onConnect}
            onEdgeClick={onEdgeClick}
            onNodesDelete={(deleted) => {
              deleted.forEach((d) => removeFromCanvas(d.id));
            }}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{
              type: "smoothstep",
              style: { stroke: "#0c8ce8", strokeWidth: 2 },
            }}
          >
            <Background gap={20} color="#e2e8f0" />
            <Controls showInteractive={false} />
            <MiniMap nodeColor="#bae0fd" maskColor="rgba(241, 245, 249, 0.6)" pannable zoomable />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

export default function SupervisorAssignmentPage() {
  const { lang, t } = useLanguage();
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/supervisors");
        setEmployees(res.data?.employees || []);
      } catch (err: any) {
        setLoadError(err.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
        <span className="spinner spinner-dark" />
        {lang === "ar" ? "جاري التحميل..." : "Loading..."}
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="alert alert-error">
        <AlertTriangle size={16} />
        {loadError}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Network size={20} className="text-brand-600" />
          {t("supervisorAssignment")}
        </h2>
        <p className="text-sm text-slate-500 mt-1">{t("supervisorAssignmentSub")}</p>
      </div>
      <ReactFlowProvider>
        <CanvasInner
          employees={employees}
          setEmployees={setEmployees}
          lang={lang}
          t={t}
        />
      </ReactFlowProvider>
    </div>
  );
}

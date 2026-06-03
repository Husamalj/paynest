"use client";

import { useEffect, useMemo, useState } from "react";
import { GitBranch, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import api from "@/lib/api";

type Node = {
  id: number;
  employeeId: string | null;
  name: string;
  jobTitle?: string | null;
  photoUrl?: string | null;
  isOwner?: boolean;
  supervisorId: number | null;
  supervisorIds?: number[];
};

function PersonCard({ n, isRTL }: { n: Node; isRTL: boolean }) {
  const initial = (n.name || "?").trim().charAt(0).toUpperCase();
  return (
    <div className={`bg-white border rounded-xl shadow-sm px-3 py-2.5 flex items-center gap-2.5 min-w-[190px] ${n.isOwner ? "border-amber-300" : "border-slate-200"}`}>
      {n.photoUrl ? (
        <img src={n.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-slate-100" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold flex-shrink-0">{initial}</div>
      )}
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900 truncate flex items-center gap-1">
          {n.name}
          {n.isOwner && <span className="text-[9px] bg-amber-50 text-amber-700 px-1 rounded-full font-bold">{isRTL ? "مالك" : "Owner"}</span>}
        </div>
        <div className="text-[11px] text-slate-500 truncate">{n.jobTitle || n.employeeId}</div>
      </div>
    </div>
  );
}

function TreeNode({ node, childrenMap, isRTL }: { node: Node; childrenMap: Record<number, Node[]>; isRTL: boolean }) {
  const kids = childrenMap[node.id] || [];
  return (
    <div className="flex flex-col items-center">
      <PersonCard n={node} isRTL={isRTL} />
      {kids.length > 0 && (
        <>
          <div className="w-px h-5 bg-slate-300" />
          <div className="flex gap-6 pt-0 relative">
            {kids.map((k) => (
              <div key={k.id} className="relative flex flex-col items-center">
                <div className="absolute -top-5 w-px h-5 bg-slate-300" />
                <TreeNode node={k} childrenMap={childrenMap} isRTL={isRTL} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function CompanyStructurePage() {
  const { isRTL } = useLanguage();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/supervisors"),
      api.get("/employees").catch(() => ({ data: [] })),
    ])
      .then(([sRes, eRes]) => {
        const emps = (eRes.data || []) as any[];
        const meta = new Map(emps.map((e) => [e.employee_id, e]));
        const list = ((sRes.data?.employees || []) as any[]).map((s) => ({
          id: s.id,
          employeeId: s.employeeId,
          name: s.name,
          isOwner: s.isOwner,
          supervisorId: s.supervisorId ?? null,
          supervisorIds: s.supervisorIds ?? [],
          jobTitle: meta.get(s.employeeId)?.job_title ?? null,
          photoUrl: meta.get(s.employeeId)?.photo_url ?? null,
        })) as Node[];
        setNodes(list);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const { roots, childrenMap } = useMemo(() => {
    const ids = new Set(nodes.map((n) => n.id));
    const childrenMap: Record<number, Node[]> = {};
    const hasParent = new Set<number>();
    for (const n of nodes) {
      const parent = (n.supervisorIds && n.supervisorIds.find((x) => ids.has(x))) ?? (n.supervisorId && ids.has(n.supervisorId) ? n.supervisorId : null);
      if (parent != null) {
        (childrenMap[parent] = childrenMap[parent] || []).push(n);
        hasParent.add(n.id);
      }
    }
    // roots: owner first, then anyone without a parent
    const roots = nodes.filter((n) => !hasParent.has(n.id)).sort((a, b) => (b.isOwner ? 1 : 0) - (a.isOwner ? 1 : 0));
    return { roots, childrenMap };
  }, [nodes]);

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
      ) : roots.length === 0 ? (
        <div className="card text-center py-16 text-slate-400">
          <GitBranch size={36} className="mx-auto mb-3 text-slate-300" />
          {isRTL ? "لا يوجد هيكل بعد. ابدأ من صفحة تعيين المشرفين." : "No structure yet. Start from Supervisor Assignment."}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <div className="flex flex-col items-center gap-10 min-w-max p-6">
            {roots.map((r) => (
              <TreeNode key={r.id} node={r} childrenMap={childrenMap} isRTL={isRTL} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

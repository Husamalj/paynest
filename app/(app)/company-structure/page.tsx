"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, GitBranch } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import api from "@/lib/api";
import OrgChart, { type OrgEmp } from "@/components/OrgChart";

export default function CompanyStructurePage() {
  const { isRTL } = useLanguage();
  const [employees, setEmployees] = useState<OrgEmp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/company-structure")
      .then((r) => setEmployees(r.data || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const hasChart = employees.some((e) =>
    employees.some((o) => (o.supervisorIds || []).includes(e.id) || o.supervisorId === e.id)
  );

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
      ) : !hasChart ? (
        <div className="card text-center py-16 text-slate-400">
          <GitBranch size={36} className="mx-auto mb-3 text-slate-300" />
          {isRTL ? "لا يوجد هيكل بعد. ابدأ من صفحة تعيين المشرفين." : "No structure yet. Start from Supervisor Assignment."}
        </div>
      ) : (
        <div className="card p-0 overflow-hidden" style={{ height: "72vh" }}>
          <OrgChart employees={employees} isRTL={isRTL} />
        </div>
      )}
    </div>
  );
}

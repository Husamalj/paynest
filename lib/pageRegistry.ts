export const HIDDEN_PAGE_OPTIONS = [
  { key: "dashboard", label: "Dashboard", paths: ["/dashboard"] },
  { key: "upload", label: "Upload", paths: ["/upload"] },
  { key: "payroll", label: "Payroll", paths: ["/payroll"] },
  { key: "employeeManagement", label: "Employee Management", paths: ["/employees"] },
  { key: "remoteMenu", label: "Remote / Online Work", paths: ["/employees/remote"] },
  { key: "companyStructure", label: "Company Structure", paths: ["/company-structure"] },
  { key: "supervisorAssignment", label: "Supervisor Assignment", paths: ["/supervisor-assignment"] },
  { key: "evaluations", label: "Evaluations", paths: ["/evaluations"] },
  { key: "leaves", label: "Leaves", paths: ["/leaves"] },
  { key: "advances", label: "Advances", paths: ["/advances"] },
  { key: "customRequests", label: "Custom Requests", paths: ["/request-types"] },
  { key: "bonuses", label: "Bonuses", paths: ["/bonuses"] },
  { key: "tasks", label: "Tasks", paths: ["/tasks"] },
  { key: "messages", label: "Messages", paths: ["/messages"] },
  { key: "jobOffer", label: "Job Offer", paths: ["/job-offer"] },
  { key: "announcements", label: "Announcements", paths: ["/announcements"] },
  { key: "reports", label: "Reports", paths: ["/reports"] },
  { key: "auditLog", label: "Audit Log", paths: ["/audit-log"] },
  { key: "hrTeam", label: "HR Team", paths: ["/hr-team"] },
  { key: "settings", label: "Settings", paths: ["/settings"] },
] as const;

export type HiddenPageKey = typeof HIDDEN_PAGE_OPTIONS[number]["key"];

export const HIDDEN_PAGE_PATHS: Record<string, string[]> = Object.fromEntries(
  HIDDEN_PAGE_OPTIONS.map((page) => [page.key, [...page.paths]])
);

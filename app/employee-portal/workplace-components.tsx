"use client";

import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  CheckSquare,
  Clock3,
  FileText,
  HeartHandshake,
  Inbox,
  KeyRound,
  Languages,
  LogOut,
  MessageSquare,
  Palmtree,
  ReceiptText,
  Search,
  ShieldCheck,
  Sparkles,
  Users2,
  WalletCards,
  Wifi,
} from "lucide-react";
import clsx from "clsx";
import { formatCurrency, formatDate } from "./helpers";

type WorkplaceAction = {
  label: string;
  hint: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  onClick: () => void;
  tone?: "brand" | "emerald" | "amber" | "violet" | "slate";
  disabled?: boolean;
};

type EmployeeWorkplaceProps = {
  isRTL: boolean;
  lang: string;
  role: string | null;
  savedUser: any;
  employee: any;
  employeeId: string;
  myPayroll: any;
  myTasks: any[];
  myLeaves: any[];
  myBalance: any;
  announcements: any[];
  subLeaves: any[];
  onLeave: any[];
  advances: any[];
  myCustomReqs: any[];
  customTypes: any[];
  teamBySub: any[];
  checkin: any;
  onlineWorkEnabled: boolean;
  checkinBusy: boolean;
  onCheck: (action: "in" | "out") => void;
  onOpenLeave: () => void;
  onOpenPermission: () => void;
  onOpenAdvance: () => void;
  onOpenOnline: () => void;
  onOpenMessages: () => void;
  onOpenOrg: () => void;
  onOpenCustom: (requestType: any) => void;
  onOpenTask: (employee: any) => void;
  onOpenEvaluation: (employee: any) => void;
  onToggleLanguage: () => void;
  onOpenPassword: () => void;
  onSignOut: () => void;
};

function label(isRTL: boolean, ar: string, en: string) {
  return isRTL ? ar : en;
}

function firstName(name?: string) {
  return String(name || "").trim().split(/\s+/)[0] || "there";
}

function initials(name?: string) {
  const parts = String(name || "?").trim().split(/\s+/);
  return (parts[0]?.[0] || "?").toUpperCase();
}

function humanStatus(isRTL: boolean, status?: string) {
  const value = status || "pending";
  const map: Record<string, { ar: string; en: string; cls: string }> = {
    pending: {
      ar: "بانتظار المراجعة",
      en: "Waiting for review",
      cls: "bg-amber-50 text-amber-700 ring-amber-200",
    },
    approved: {
      ar: "تمت الموافقة",
      en: "Approved",
      cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },
    supervisor_approved: {
      ar: "وافق المشرف",
      en: "Supervisor approved",
      cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },
    rejected: {
      ar: "بحاجة لمراجعة",
      en: "Needs review",
      cls: "bg-rose-50 text-rose-700 ring-rose-200",
    },
    completed: {
      ar: "مكتملة",
      en: "Completed",
      cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },
    in_progress: {
      ar: "قيد التنفيذ",
      en: "In progress",
      cls: "bg-sky-50 text-sky-700 ring-sky-200",
    },
  };
  const item = map[value] || {
    ar: value,
    en: value,
    cls: "bg-slate-100 text-slate-600 ring-slate-200",
  };
  return {
    text: isRTL ? item.ar : item.en,
    cls: item.cls,
  };
}

function ShellButton({
  icon: Icon,
  label,
  active,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  active?: boolean;
}) {
  return (
    <a
      href="#workplace-details"
      className={clsx(
        "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-brand-100",
        active ? "bg-brand-600 text-white shadow-btn-primary-hover" : "text-slate-600 hover:bg-white hover:text-brand-700"
      )}
    >
      <Icon size={18} />
      <span>{label}</span>
    </a>
  );
}

function Surface({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={clsx("rounded-[22px] border border-slate-200/80 bg-white shadow-soft", className)}>
      {children}
    </section>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Icon size={20} />
        </div>
        <div>
          <h2 className="text-base font-black text-slate-950">{title}</h2>
          {subtitle && <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function QuickActionCard({ action }: { action: WorkplaceAction }) {
  const Icon = action.icon;
  const tones = {
    brand: "bg-brand-50 text-brand-700 ring-brand-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
  };
  return (
    <button
      type="button"
      disabled={action.disabled}
      onClick={action.onClick}
      className="group flex min-h-[116px] w-full items-start gap-4 rounded-[20px] border border-slate-200 bg-white p-4 text-start shadow-soft transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className={clsx("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1", tones[action.tone || "brand"])}>
        <Icon size={21} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-slate-950">{action.label}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">{action.hint}</span>
      </span>
      <ArrowRight size={16} className="mt-1 text-slate-300 transition group-hover:text-brand-600 rtl:rotate-180" />
    </button>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone = "brand",
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  tone?: "brand" | "emerald" | "amber" | "rose" | "sky";
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    sky: "bg-sky-50 text-sky-700",
  };
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-soft">
      <div className={clsx("mb-4 flex h-10 w-10 items-center justify-center rounded-2xl", tones[tone])}>
        <Icon size={19} />
      </div>
      <div className="text-xs font-bold text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-black text-slate-950">{value}</div>
    </div>
  );
}

function Avatar({ name, photoUrl }: { name?: string; photoUrl?: string }) {
  if (photoUrl) {
    return <img src={photoUrl} alt="" className="h-10 w-10 rounded-2xl object-cover ring-2 ring-brand-100" />;
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-sm font-black text-white">
      {initials(name)}
    </div>
  );
}

export default function EmployeeWorkplace(props: EmployeeWorkplaceProps) {
  const {
    isRTL,
    lang,
    savedUser,
    employee,
    employeeId,
    myPayroll,
    myTasks,
    myLeaves,
    myBalance,
    announcements,
    subLeaves,
    onLeave,
    advances,
    myCustomReqs,
    customTypes,
    teamBySub,
    checkin,
    onlineWorkEnabled,
    checkinBusy,
    onCheck,
    onOpenLeave,
    onOpenPermission,
    onOpenAdvance,
    onOpenOnline,
    onOpenMessages,
    onOpenOrg,
    onOpenCustom,
    onOpenTask,
    onOpenEvaluation,
    onToggleLanguage,
    onOpenPassword,
    onSignOut,
  } = props;

  const hasTeam = Array.isArray(employee?.subordinates) && employee.subordinates.length > 0;
  const displayName = employee?.name || savedUser?.name || label(isRTL, "زميلنا", "teammate");
  const activeTasks = myTasks.filter((task) => task.status !== "completed");
  const pendingLeaves = myLeaves.filter((leave) => leave.status === "pending");
  const pendingTeamLeaves = subLeaves.filter((leave) => (leave.supervisorStatus ?? leave.supervisor_status ?? "pending") === "pending");
  const missingAttendance = !checkin?.clock_in && onlineWorkEnabled;
  const photoUrl = employee?.photoUrl || employee?.photo_url;

  const primaryActions: WorkplaceAction[] = [
    {
      label: onlineWorkEnabled
        ? checkin?.clock_in && !checkin?.clock_out
          ? label(isRTL, "سجل خروجك", "Check out")
          : label(isRTL, "سجل حضورك", "Check in")
        : label(isRTL, "الحضور", "Attendance"),
      hint: onlineWorkEnabled
        ? checkin?.clock_in && !checkin?.clock_out
          ? label(isRTL, "أنهِ يومك عندما تخلص عملك.", "End your day when your work is done.")
          : label(isRTL, "ابدأ يومك من هنا عندما تعمل أونلاين.", "Start your online workday from here.")
        : label(isRTL, "تابع حضورك وساعاتك من السجلات.", "Review your attendance records."),
      icon: Clock3,
      onClick: () => {
        if (!onlineWorkEnabled) return;
        onCheck(checkin?.clock_in && !checkin?.clock_out ? "out" : "in");
      },
      tone: "brand",
      disabled: checkinBusy || !onlineWorkEnabled || (!!checkin?.clock_in && !!checkin?.clock_out),
    },
    {
      label: label(isRTL, "اطلب إجازة", "Request leave"),
      hint: pendingLeaves.length
        ? label(isRTL, "لديك طلب إجازة ينتظر المراجعة.", "You already have a leave request waiting for review.")
        : label(isRTL, "اختر النوع والتواريخ وسنرسلها للمراجعة.", "Choose dates and send them for review."),
      icon: Palmtree,
      onClick: onOpenLeave,
      tone: "emerald",
    },
    {
      label: label(isRTL, "راجع الراتب", "View payslip"),
      hint: myPayroll
        ? label(isRTL, "آخر كشف راتب جاهز للمراجعة والتنزيل.", "Your latest payslip is ready to review.")
        : label(isRTL, "سيظهر كشف الراتب هنا عند احتسابه.", "Your payslip will appear here once payroll is run."),
      icon: ReceiptText,
      onClick: () => document.getElementById("workplace-payroll")?.scrollIntoView({ behavior: "smooth", block: "start" }),
      tone: "violet",
    },
    {
      label: label(isRTL, "راسل المشرف أو HR", "Message supervisor or HR"),
      hint: label(isRTL, "افتح المحادثات المتعلقة بعملك وطلباتك.", "Open work and request-related conversations."),
      icon: MessageSquare,
      onClick: onOpenMessages,
      tone: "slate",
    },
  ];

  const requestActions: WorkplaceAction[] = [
    {
      label: label(isRTL, "إذن مغادرة", "Permission request"),
      hint: label(isRTL, "لطلب مغادرة قصيرة خلال اليوم.", "For a short absence during the workday."),
      icon: Clock3,
      onClick: onOpenPermission,
      tone: "amber",
    },
    {
      label: label(isRTL, "طلب سلفة", "Salary advance"),
      hint: label(isRTL, "يراجعها فريق الموارد البشرية قبل اعتمادها.", "Reviewed by HR before approval."),
      icon: WalletCards,
      onClick: onOpenAdvance,
      tone: "emerald",
    },
    {
      label: label(isRTL, "عمل أونلاين", "Online work"),
      hint: label(isRTL, "اطلب يوم عمل عن بعد عند الحاجة.", "Request a remote workday when needed."),
      icon: Wifi,
      onClick: onOpenOnline,
      tone: "brand",
      disabled: !onlineWorkEnabled,
    },
  ];

  const todoItems = [
    ...activeTasks.slice(0, 3).map((task) => ({
      key: `task-${task.id}`,
      icon: CheckSquare,
      title: task.task_name || task.taskName || label(isRTL, "مهمة", "Task"),
      detail: task.deadline
        ? `${label(isRTL, "موعدها", "Due")} ${formatDate(task.deadline)}`
        : label(isRTL, "مهمة تحتاج متابعة", "Task waiting for your update"),
      status: humanStatus(isRTL, task.status),
    })),
    ...pendingLeaves.slice(0, 2).map((leave) => ({
      key: `leave-${leave.id}`,
      icon: Palmtree,
      title: label(isRTL, "طلب إجازتك قيد المراجعة", "Your leave request is being reviewed"),
      detail: `${formatDate(leave.startDate || leave.start_date)} - ${formatDate(leave.endDate || leave.end_date)}`,
      status: humanStatus(isRTL, leave.status),
    })),
    ...advances.slice(0, 1).map((advance) => ({
      key: `advance-${advance.id}`,
      icon: WalletCards,
      title: label(isRTL, "طلب السلفة", "Salary advance request"),
      detail: formatCurrency(advance.amount),
      status: humanStatus(isRTL, advance.status),
    })),
  ];

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="employee-workplace min-h-screen bg-[#f6f9fc] text-slate-950">
      <div className="mx-auto grid max-w-[1500px] gap-5 px-3 py-3 sm:px-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:py-5">
        <aside className="hidden lg:block">
          <div className="sticky top-5 rounded-[26px] border border-slate-200 bg-white/90 p-4 shadow-elevated backdrop-blur">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <Avatar name={displayName} photoUrl={photoUrl} />
              <div className="min-w-0">
                <div className="truncate text-sm font-black text-slate-950">{displayName}</div>
                <div className="truncate text-xs font-semibold text-slate-500">{savedUser?.email || employee?.email || employeeId}</div>
              </div>
            </div>
            <nav className="mt-4 grid gap-1">
              <ShellButton icon={Sparkles} label={label(isRTL, "اليوم", "Today")} active />
              <ShellButton icon={Clock3} label={label(isRTL, "الحضور", "Attendance")} />
              <ShellButton icon={Palmtree} label={label(isRTL, "الإجازات", "Leave")} />
              <ShellButton icon={CheckSquare} label={label(isRTL, "مهامي", "My tasks")} />
              <ShellButton icon={ReceiptText} label={label(isRTL, "كشوف الرواتب", "Payslips")} />
              <ShellButton icon={Inbox} label={label(isRTL, "طلباتي", "Requests")} />
              {hasTeam && <ShellButton icon={Users2} label={label(isRTL, "فريقي", "My team")} />}
              {hasTeam && <ShellButton icon={ShieldCheck} label={label(isRTL, "الموافقات", "Approvals")} />}
            </nav>
            <div className="mt-5 grid gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={onToggleLanguage} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
                <Languages size={17} />
                {lang === "en" ? "العربية" : "English"}
              </button>
              <button type="button" onClick={onOpenPassword} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
                <KeyRound size={17} />
                {label(isRTL, "تغيير كلمة السر", "Change password")}
              </button>
              <button type="button" onClick={onSignOut} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50">
                <LogOut size={17} />
                {label(isRTL, "تسجيل خروج", "Sign out")}
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 space-y-5">
          <header className="rounded-[28px] border border-brand-100 bg-gradient-to-br from-white via-brand-50 to-cyan-50 p-5 shadow-elevated sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-3 py-1.5 text-xs font-black text-brand-700 shadow-soft">
                  <HeartHandshake size={14} />
                  {hasTeam ? label(isRTL, "مساحة عمل شخصية وقيادة فريق", "Personal work and team leadership") : label(isRTL, "مساحة عملك الشخصية", "Your personal workplace")}
                </div>
                <h1 className="max-w-4xl text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
                  {label(isRTL, `صباح الخير، ${firstName(displayName)}.`, `Good morning, ${firstName(displayName)}.`)}
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
                  {hasTeam
                    ? label(isRTL, "هذه نظرة واضحة على عملك الشخصي وما يحتاجه فريقك اليوم.", "Here is what needs your attention across your own work and your team today.")
                    : label(isRTL, "هذا ما يحتاج انتباهك اليوم، بدون ضجيج أو لوحات معقدة.", "Here is what needs your attention today, without noisy dashboards.")}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
                <Metric
                  icon={CheckSquare}
                  label={label(isRTL, "مهام نشطة", "Active tasks")}
                  value={String(activeTasks.length)}
                  tone={activeTasks.length ? "brand" : "emerald"}
                />
                <Metric
                  icon={Palmtree}
                  label={label(isRTL, "رصيد سنوي", "Annual balance")}
                  value={myBalance?.annual_remaining != null ? `${myBalance.annual_remaining}` : "-"}
                  tone="emerald"
                />
                <Metric
                  icon={WalletCards}
                  label={label(isRTL, "آخر صافي راتب", "Latest net pay")}
                  value={myPayroll ? formatCurrency(myPayroll.netSalary || myPayroll.net_salary) : "-"}
                  tone="sky"
                />
              </div>
            </div>
          </header>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
              <Surface>
                <SectionHeader
                  icon={Clock3}
                  title={label(isRTL, "اليوم", "Today")}
                  subtitle={label(isRTL, "نظرة بسيطة على حضورك وما يحدث الآن.", "A calm view of your attendance and what is happening now.")}
                  action={
                    onlineWorkEnabled ? (
                      <button
                        type="button"
                        disabled={checkinBusy || (!!checkin?.clock_in && !!checkin?.clock_out)}
                        onClick={() => onCheck(checkin?.clock_in && !checkin?.clock_out ? "out" : "in")}
                        className="rounded-2xl bg-brand-600 px-4 py-2 text-sm font-black text-white shadow-btn-primary-hover transition hover:bg-brand-700 disabled:opacity-50"
                      >
                        {checkin?.clock_in && !checkin?.clock_out ? label(isRTL, "تسجيل خروج", "Check out") : label(isRTL, "تسجيل دخول", "Check in")}
                      </button>
                    ) : null
                  }
                />
                <div className="grid gap-4 p-5 md:grid-cols-3">
                  <div className="rounded-[20px] bg-slate-50 p-4 ring-1 ring-slate-200">
                    <div className="text-xs font-bold text-slate-500">{label(isRTL, "حالة اليوم", "Today status")}</div>
                    <div className="mt-2 text-lg font-black text-slate-950">
                      {checkin?.clock_in
                        ? checkin?.clock_out
                          ? label(isRTL, "تم إنهاء اليوم", "Day completed")
                          : label(isRTL, "أنت مسجل دخول", "You are checked in")
                        : label(isRTL, "لم يبدأ بعد", "Not started yet")}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {missingAttendance
                        ? label(isRTL, "عندما تبدأ عملك أونلاين، سجل حضورك من هنا.", "When you start online work, check in from here.")
                        : label(isRTL, "سنحتفظ بسجل واضح لساعاتك.", "We keep your work hours clear and traceable.")}
                    </p>
                  </div>
                  <div className="rounded-[20px] bg-slate-50 p-4 ring-1 ring-slate-200">
                    <div className="text-xs font-bold text-slate-500">{label(isRTL, "الدخول", "Check in")}</div>
                    <div className="mt-2 text-2xl font-black text-slate-950">{checkin?.clock_in || "-"}</div>
                  </div>
                  <div className="rounded-[20px] bg-slate-50 p-4 ring-1 ring-slate-200">
                    <div className="text-xs font-bold text-slate-500">{label(isRTL, "الخروج", "Check out")}</div>
                    <div className="mt-2 text-2xl font-black text-slate-950">{checkin?.clock_out || "-"}</div>
                  </div>
                </div>
              </Surface>

              <Surface>
                <SectionHeader
                  icon={ZapLike}
                  title={label(isRTL, "إجراءات سريعة", "Quick actions")}
                  subtitle={label(isRTL, "الأشياء التي يحتاجها الموظف غالباً، قريبة وواضحة.", "The actions employees need most, close at hand.")}
                />
                <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
                  {primaryActions.map((action) => <QuickActionCard key={action.label} action={action} />)}
                </div>
              </Surface>

              {hasTeam && (
                <Surface className="border-brand-200">
                  <SectionHeader
                    icon={ShieldCheck}
                    title={label(isRTL, "تركيز المشرف", "Supervisor focus")}
                    subtitle={label(isRTL, "الأمور التي تحتاج قراراً أو متابعة من فريقك.", "Items that need your decision or follow-up.")}
                  />
                  <div className="grid gap-4 p-5 md:grid-cols-4">
                    <Metric icon={Palmtree} label={label(isRTL, "طلبات إجازة", "Leave approvals")} value={String(pendingTeamLeaves.length)} tone={pendingTeamLeaves.length ? "amber" : "emerald"} />
                    <Metric icon={CheckSquare} label={label(isRTL, "مهام فريق نشطة", "Team tasks")} value={String(teamBySub.reduce((sum, row) => sum + (row?.total || 0), 0))} tone="brand" />
                    <Metric icon={Users2} label={label(isRTL, "أفراد الفريق", "Team members")} value={String(employee.subordinates.length)} tone="sky" />
                    <Metric icon={Palmtree} label={label(isRTL, "في إجازة اليوم", "On leave today")} value={String(onLeave.length)} tone={onLeave.length ? "amber" : "emerald"} />
                  </div>
                </Surface>
              )}

              <div className="grid gap-5 xl:grid-cols-2">
                <Surface>
                  <SectionHeader
                    icon={CheckSquare}
                    title={label(isRTL, "أشياء تحتاج انتباهك", "Things to do")}
                    subtitle={todoItems.length ? label(isRTL, "مرتبة حسب ما يفيدك اليوم.", "Prioritized around what helps you today.") : label(isRTL, "لا يوجد شيء مستعجل الآن.", "Nothing urgent right now.")}
                  />
                  <div className="space-y-3 p-5">
                    {todoItems.length === 0 ? (
                      <div className="rounded-[20px] border border-emerald-100 bg-emerald-50 p-5 text-center">
                        <CheckCircle2 className="mx-auto text-emerald-600" size={28} />
                        <div className="mt-3 font-black text-emerald-900">{label(isRTL, "أنت منجز كل شيء.", "You are all caught up.")}</div>
                        <p className="mt-1 text-sm text-emerald-700">{label(isRTL, "أي مهام أو طلبات جديدة ستظهر هنا.", "New tasks or requests will appear here.")}</p>
                      </div>
                    ) : (
                      todoItems.map((item) => (
                        <div key={item.key} className="flex items-start gap-3 rounded-[18px] border border-slate-200 bg-slate-50/70 p-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-soft">
                            <item.icon size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-black text-slate-950">{item.title}</div>
                            <div className="mt-1 text-sm text-slate-500">{item.detail}</div>
                          </div>
                          <span className={clsx("rounded-full px-2.5 py-1 text-[11px] font-black ring-1", item.status.cls)}>
                            {item.status.text}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </Surface>

                <Surface id="workplace-payroll">
                  <SectionHeader
                    icon={ReceiptText}
                    title={label(isRTL, "الراتب بثقة", "Payroll with clarity")}
                    subtitle={label(isRTL, "المعلومات المالية تظهر بهدوء وباختصار.", "Private payroll information, explained simply.")}
                  />
                  <div className="space-y-3 p-5">
                    <div className="rounded-[20px] bg-slate-950 p-5 text-white">
                      <div className="text-xs font-bold text-slate-400">{label(isRTL, "صافي الراتب", "Net salary")}</div>
                      <div className="mt-2 text-3xl font-black">{myPayroll ? formatCurrency(myPayroll.netSalary || myPayroll.net_salary) : "-"}</div>
                      <p className="mt-3 text-sm leading-6 text-slate-300">
                        {myPayroll
                          ? label(isRTL, "كشف هذا الشهر جاهز في تفاصيل الرواتب أدناه.", "This month is ready in the payroll details below.")
                          : label(isRTL, "لم يتم احتساب راتب هذا الشهر بعد.", "This month has not been calculated yet.")}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-slate-200 p-4">
                        <div className="text-xs font-bold text-slate-500">{label(isRTL, "الأساسي", "Base")}</div>
                        <div className="mt-1 font-black text-slate-950">{formatCurrency(myPayroll?.baseSalary || myPayroll?.base_salary || employee.baseSalary || employee.base_salary)}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 p-4">
                        <div className="text-xs font-bold text-slate-500">{label(isRTL, "فرق الساعات", "Hour diff")}</div>
                        <div className="mt-1 font-black text-slate-950">{(parseFloat(myPayroll?.hourDiff || myPayroll?.hour_diff) || 0).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </Surface>
              </div>

              {hasTeam && (
                <Surface>
                  <SectionHeader
                    icon={Users2}
                    title={label(isRTL, "مساحة فريقي", "My team workspace")}
                    subtitle={label(isRTL, "إدارة الفريق بدون شعور بالمراقبة أو التعقيد.", "Team coordination without surveillance or clutter.")}
                  />
                  <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
                    {employee.subordinates.map((sub: any) => {
                      const eid = sub.employeeId || sub.employee_id;
                      const row = teamBySub.find((item) => item.eid === eid);
                      return (
                        <div key={eid} className="rounded-[20px] border border-slate-200 bg-slate-50/60 p-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={sub.name} photoUrl={sub.photoUrl || sub.photo_url} />
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-black text-slate-950">{sub.name}</div>
                              <div className="truncate text-xs font-semibold text-slate-500">{sub.email || eid}</div>
                            </div>
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-2xl bg-white p-3">
                              <div className="font-bold text-slate-500">{label(isRTL, "المهام", "Tasks")}</div>
                              <div className="mt-1 text-lg font-black text-slate-950">{row?.total || 0}</div>
                            </div>
                            <div className="rounded-2xl bg-white p-3">
                              <div className="font-bold text-slate-500">{label(isRTL, "منجز", "Done")}</div>
                              <div className="mt-1 text-lg font-black text-slate-950">{row?.doneCount || 0}</div>
                            </div>
                          </div>
                          <div className="mt-4 flex gap-2">
                            <button type="button" onClick={() => onOpenTask(sub)} className="flex-1 rounded-2xl bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:text-brand-700">
                              {label(isRTL, "مهمة", "Task")}
                            </button>
                            <button type="button" onClick={() => onOpenEvaluation(sub)} className="flex-1 rounded-2xl bg-brand-600 px-3 py-2 text-xs font-black text-white hover:bg-brand-700">
                              {label(isRTL, "تقييم", "Evaluate")}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Surface>
              )}
            </div>

            <aside className="space-y-5">
              <Surface>
                <SectionHeader
                  icon={Inbox}
                  title={label(isRTL, "مركز الطلبات", "Requests center")}
                  subtitle={label(isRTL, "كل ما تحتاج طلبه من HR في مكان واحد.", "Everything you request from HR in one place.")}
                />
                <div className="grid gap-3 p-5">
                  {[...requestActions, ...customTypes.slice(0, 4).map((ct) => ({
                    label: ct.name,
                    hint: label(isRTL, "طلب مخصص من شركتك.", "A custom request from your company."),
                    icon: Inbox,
                    onClick: () => onOpenCustom(ct),
                    tone: "violet" as const,
                  }))].map((action) => <QuickActionCard key={action.label} action={action} />)}
                </div>
              </Surface>

              <Surface>
                <SectionHeader
                  icon={Bell}
                  title={label(isRTL, "آخر التحديثات", "Latest updates")}
                  subtitle={label(isRTL, "إعلانات وطلبات وحالات مهمة.", "Announcements, requests, and important status changes.")}
                />
                <div className="space-y-3 p-5">
                  {announcements.slice(0, 3).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-brand-100 bg-brand-50/50 p-3">
                      <div className="font-black text-slate-950">{item.title}</div>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{item.message}</p>
                    </div>
                  ))}
                  {myCustomReqs.slice(0, 2).map((request) => {
                    const status = humanStatus(isRTL, request.status);
                    return (
                      <div key={request.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-slate-950">{request.typeName}</div>
                          <div className="text-xs text-slate-500">{label(isRTL, "طلبك قيد المتابعة", "Your request is being tracked")}</div>
                        </div>
                        <span className={clsx("rounded-full px-2.5 py-1 text-[11px] font-black ring-1", status.cls)}>
                          {status.text}
                        </span>
                      </div>
                    );
                  })}
                  {announcements.length === 0 && myCustomReqs.length === 0 && (
                    <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-5 text-center">
                      <CheckCircle2 className="mx-auto text-emerald-600" size={26} />
                      <div className="mt-2 font-black text-slate-950">{label(isRTL, "لا يوجد تحديثات الآن.", "No updates right now.")}</div>
                      <p className="mt-1 text-sm text-slate-500">{label(isRTL, "سنخبرك هنا عند وجود شيء مهم.", "Important updates will appear here.")}</p>
                    </div>
                  )}
                </div>
              </Surface>

              <Surface>
                <SectionHeader
                  icon={BriefcaseBusiness}
                  title={label(isRTL, "ملفي والعمل", "Profile and work")}
                  subtitle={label(isRTL, "روابط سريعة لما تحتاجه خلال يومك.", "Quick links for your workday.")}
                />
                <div className="grid gap-2 p-5">
                  <button type="button" onClick={onOpenMessages} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-start text-sm font-bold text-slate-700 hover:text-brand-700">
                    <MessageSquare size={18} className="text-brand-600" />
                    {label(isRTL, "المحادثات", "Messages")}
                  </button>
                  <button type="button" onClick={onOpenOrg} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-start text-sm font-bold text-slate-700 hover:text-brand-700">
                    <Users2 size={18} className="text-brand-600" />
                    {label(isRTL, "هيكل الشركة", "Company structure")}
                  </button>
                  <a href="#workplace-details" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-start text-sm font-bold text-slate-700 hover:text-brand-700">
                    <FileText size={18} className="text-brand-600" />
                    {label(isRTL, "السجلات والتفاصيل", "Records and details")}
                  </a>
                </div>
              </Surface>
            </aside>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white/70 p-4 shadow-soft">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-lg font-black text-slate-950">{label(isRTL, "السجلات التشغيلية", "Operational records")}</div>
                <p className="mt-1 text-sm text-slate-500">
                  {label(isRTL, "التفاصيل القديمة بقيت هنا لضمان أن كل العمليات والطلبات تعمل كما هي.", "Detailed records remain here so every workflow keeps working exactly as before.")}
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500">
                <Search size={14} />
                {label(isRTL, "تفاصيل وطلبات وسجلات", "Details, requests, records")}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function ZapLike(props: { size?: number; className?: string }) {
  return <Sparkles {...props} />;
}

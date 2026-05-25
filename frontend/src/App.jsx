import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import {
  Building2,
  AlertTriangle,
  LockKeyhole,
  CheckCircle2,
  Users,
  UserCircle,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Payroll from './pages/Payroll';
import Bonuses from './pages/Bonuses';
import Leaves from './pages/Leaves';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Employees from './pages/Employees';
import Tasks from './pages/Tasks';
import Announcements from './pages/Announcements';
import Remote from './pages/Remote';
import EmployeePortal from './pages/EmployeePortal';
import OwnerSetup from './pages/OwnerSetup';
import SuperAdmin from './pages/SuperAdmin';
import { useLanguage } from './hooks/useLanguage';
import api from './utils/api';

function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('paynest_logged_in');
  localStorage.removeItem('role');
  localStorage.removeItem('user');
  localStorage.removeItem('paynest_employee_id');
}

function getDefaultPath(role) {
  if (role === 'super_admin') return '/super-admin';
  if (role === 'employee') return '/employee-portal';
  if (role === 'hr') return '/hr';
  if (role === 'owner') return '/company-admin';
  return '/';
}

/* ─────────────────────────────────────────────
   LANDING PAGE  (two-portal card selection)
───────────────────────────────────────────── */
function LandingPage() {
  const navigate = useNavigate();

  return (
    <div dir="rtl" className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4 gap-10">
      <div className="text-center">
        <h1 className="text-4xl font-black text-white mb-2">
          Pay<span className="text-blue-500">Nest</span>
        </h1>
        <p className="text-slate-400 text-sm">نظام إدارة الرواتب والموارد البشرية</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">
        {/* HR Portal Card */}
        <button
          onClick={() => navigate('/hr-login')}
          className="flex-1 group bg-blue-600 hover:bg-blue-500 transition-all duration-200 rounded-3xl p-8 flex flex-col items-center gap-4 shadow-2xl cursor-pointer"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Users size={32} className="text-white" />
          </div>
          <div className="text-center">
            <div className="text-white text-xl font-bold">بوابة الموارد البشرية</div>
            <div className="text-blue-100 text-sm mt-1">HR &amp; إدارة الشركة</div>
          </div>
          <div className="flex items-center gap-2 text-blue-100 text-sm mt-2">
            <span>تسجيل الدخول</span>
            <ArrowRight size={16} className="rotate-180" />
          </div>
        </button>

        {/* Employee Portal Card */}
        <button
          onClick={() => navigate('/employee-login')}
          className="flex-1 group bg-slate-800 hover:bg-slate-700 transition-all duration-200 rounded-3xl p-8 flex flex-col items-center gap-4 shadow-2xl cursor-pointer border border-slate-700"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <UserCircle size={32} className="text-slate-300" />
          </div>
          <div className="text-center">
            <div className="text-white text-xl font-bold">بوابة الموظف</div>
            <div className="text-slate-400 text-sm mt-1">كشف الراتب والإجازات</div>
          </div>
          <div className="flex items-center gap-2 text-slate-400 text-sm mt-2">
            <span>تسجيل الدخول</span>
            <ArrowRight size={16} className="rotate-180" />
          </div>
        </button>
      </div>

      <button
        onClick={() => navigate('/signup')}
        className="text-slate-400 hover:text-blue-400 text-sm transition-colors"
      >
        ليس لديك حساب؟ <span className="underline">سجّل شركتك الآن</span>
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SHARED LOGIN FORM
───────────────────────────────────────────── */
function LoginForm({ portalType, onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isHR = portalType === 'hr';

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      const res = await api.post('/auth/login', { email, password });
      const { token, user } = res.data;

      // Role guard per portal
      if (isHR && user.role === 'employee') {
        setError('هذا الحساب مخصص لبوابة الموظف');
        return;
      }
      if (!isHR && user.role !== 'employee') {
        setError('هذا الحساب مخصص لبوابة الموارد البشرية');
        return;
      }

      localStorage.setItem('token', token);
      localStorage.setItem('paynest_logged_in', 'true');
      localStorage.setItem('role', user.role);
      localStorage.setItem('user', JSON.stringify(user));

      onLogin(user);

      if (user.must_change_password === true) {
        window.location.href = '/';
        return;
      }

      window.location.href = getDefaultPath(user.role);
    } catch (err) {
      setError(err.message || 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowRight size={16} />
          العودة للرئيسية
        </button>

        <form onSubmit={handleLogin} className="bg-white rounded-3xl shadow-2xl p-8">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isHR ? 'bg-blue-600' : 'bg-slate-700'}`}>
            {isHR ? <Users size={24} className="text-white" /> : <UserCircle size={24} className="text-white" />}
          </div>

          <h1 className="text-2xl font-black text-center text-slate-900 mb-1">
            {isHR ? 'بوابة الموارد البشرية' : 'بوابة الموظف'}
          </h1>
          <p className="text-center text-slate-500 text-sm mb-6">
            Pay<span className={isHR ? 'text-blue-600' : 'text-slate-700'}>Nest</span>
          </p>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="البريد الإلكتروني"
            required
            className="w-full mb-4 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="relative mb-4">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة السر"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && <div className="text-red-600 text-sm mb-4 text-center">{error}</div>}

          <button
            disabled={loading}
            className={`w-full py-3 rounded-xl text-white font-bold disabled:opacity-60 mb-4 ${isHR ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-700 hover:bg-slate-800'} transition-colors`}
          >
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-slate-400 text-xs">أو</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <button
            type="button"
            onClick={() => alert('تسجيل الدخول بـ Google قريباً')}
            className="w-full py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-center gap-3 text-slate-700 font-medium text-sm"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            المتابعة بـ Google
          </button>

          {isHR && (
            <p className="text-center text-slate-500 text-sm mt-6">
              ليس لديك حساب؟{' '}
              <button type="button" onClick={() => navigate('/signup')} className="text-blue-600 hover:underline font-medium">
                سجّل شركتك
              </button>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SIGN-UP PAGE  (register new company)
───────────────────────────────────────────── */
function SignupPage({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    companyName: '',
    slug: '',
    ownerName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => {
    const val = e.target.value;
    setForm((prev) => {
      const next = { ...prev, [field]: val };
      // auto-generate slug from company name
      if (field === 'companyName') {
        next.slug = val
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
      }
      return next;
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('كلمتا السر غير متطابقتين');
      return;
    }
    if (form.password.length < 6) {
      setError('كلمة السر يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/auth/register-company', {
        companyName: form.companyName,
        slug: form.slug,
        ownerName: form.ownerName,
        email: form.email,
        password: form.password,
      });

      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('paynest_logged_in', 'true');
      localStorage.setItem('role', user.role);
      localStorage.setItem('user', JSON.stringify(user));

      onLogin(user);
      window.location.href = getDefaultPath(user.role);
    } catch (err) {
      setError(err.message || 'فشل التسجيل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowRight size={16} />
          العودة
        </button>

        <form onSubmit={submit} className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
            <Building2 size={24} className="text-white" />
          </div>

          <h1 className="text-2xl font-black text-center text-slate-900 mb-1">تسجيل شركة جديدة</h1>
          <p className="text-center text-slate-500 text-sm mb-6">Pay<span className="text-blue-600">Nest</span></p>

          <label className="block text-xs font-semibold text-slate-500 mb-1 mr-1">اسم الشركة</label>
          <input
            type="text"
            value={form.companyName}
            onChange={set('companyName')}
            placeholder="مثال: شركة النجوم"
            required
            className="w-full mb-4 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <label className="block text-xs font-semibold text-slate-500 mb-1 mr-1">المعرّف (Slug)</label>
          <input
            type="text"
            value={form.slug}
            onChange={set('slug')}
            placeholder="my-company"
            required
            className="w-full mb-4 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            dir="ltr"
          />

          <label className="block text-xs font-semibold text-slate-500 mb-1 mr-1">اسم المالك</label>
          <input
            type="text"
            value={form.ownerName}
            onChange={set('ownerName')}
            placeholder="الاسم الكامل"
            required
            className="w-full mb-4 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <label className="block text-xs font-semibold text-slate-500 mb-1 mr-1">البريد الإلكتروني</label>
          <input
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder="email@company.com"
            required
            className="w-full mb-4 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            dir="ltr"
          />

          <label className="block text-xs font-semibold text-slate-500 mb-1 mr-1">كلمة السر</label>
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            placeholder="6 أحرف على الأقل"
            required
            className="w-full mb-4 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <label className="block text-xs font-semibold text-slate-500 mb-1 mr-1">تأكيد كلمة السر</label>
          <input
            type="password"
            value={form.confirmPassword}
            onChange={set('confirmPassword')}
            placeholder="أعد كتابة كلمة السر"
            required
            className="w-full mb-6 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {error && <div className="text-red-600 text-sm mb-4 text-center">{error}</div>}

          <button
            disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-60 transition-colors"
          >
            {loading ? 'جاري التسجيل...' : 'إنشاء الحساب'}
          </button>

          <p className="text-center text-slate-500 text-sm mt-4">
            لديك حساب؟{' '}
            <button type="button" onClick={() => navigate('/hr-login')} className="text-blue-600 hover:underline font-medium">
              سجّل دخولك
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FORCE CHANGE PASSWORD
───────────────────────────────────────────── */
function ForceChangePassword({ onDone }) {
  const [currentPassword, setCurrentPassword] = useState('123456');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword || newPassword.length < 6) {
      setError('كلمة السر الجديدة لازم تكون 6 أحرف أو أكثر');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('كلمة السر الجديدة غير متطابقة');
      return;
    }

    try {
      setSaving(true);
      await api.put('/auth/change-password', { currentPassword, newPassword });

      const user = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...user, must_change_password: false }));

      onDone();
    } catch (err) {
      setError(err.message || 'فشل تغيير كلمة السر');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-4">
          <LockKeyhole size={25} />
        </div>

        <h1 className="text-2xl font-black text-center text-slate-900 mb-2">تغيير كلمة السر</h1>
        <p className="text-center text-slate-500 text-sm mb-6">
          لازم تغيّر كلمة السر المؤقتة قبل استخدام النظام
        </p>

        <input
          type="password"
          className="w-full mb-4 px-4 py-3 rounded-xl border border-slate-200"
          placeholder="كلمة السر الحالية"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <input
          type="password"
          className="w-full mb-4 px-4 py-3 rounded-xl border border-slate-200"
          placeholder="كلمة السر الجديدة"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <input
          type="password"
          className="w-full mb-4 px-4 py-3 rounded-xl border border-slate-200"
          placeholder="تأكيد كلمة السر الجديدة"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        {error && <div className="text-red-600 text-sm text-center mb-4">{error}</div>}

        <button
          disabled={saving}
          className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving ? 'جاري الحفظ...' : <><CheckCircle2 size={18} /> حفظ كلمة السر</>}
        </button>
      </form>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PROTECTED ROUTE
───────────────────────────────────────────── */
function ProtectedRoute({ allowedRoles, children }) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) return <Navigate to="/" replace />;
  if (!role) { clearAuth(); return <Navigate to="/" replace />; }
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to={getDefaultPath(role)} replace />;

  return children;
}

/* ─────────────────────────────────────────────
   AUTH ROUTES  (unauthenticated)
───────────────────────────────────────────── */
function AuthRoutes({ onLogin }) {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/hr-login" element={<LoginForm portalType="hr" onLogin={onLogin} />} />
      <Route path="/employee-login" element={<LoginForm portalType="employee" onLogin={onLogin} />} />
      <Route path="/signup" element={<SignupPage onLogin={onLogin} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/* ─────────────────────────────────────────────
   APP ROOT
───────────────────────────────────────────── */
export default function App() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionValid, setSessionValid] = useState(!!localStorage.getItem('token'));
  const [error, setError] = useState('');

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const meRes = await api.get('/auth/me');
        const user = meRes.data.user;

        localStorage.setItem('role', user.role);
        localStorage.setItem('user', JSON.stringify(user));

        if (user.role !== 'super_admin') {
          const settingsRes = await api.get('/settings');
          setSettings(settingsRes.data);

          const dbLang = settingsRes.data?.language;
          const stored = localStorage.getItem('paynest_lang');
          if (!stored) localStorage.setItem('paynest_lang', dbLang || 'ar');
        }

        setSessionValid(true);
      } catch (err) {
        clearAuth();
        setSessionValid(false);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-elevated">
          <Building2 size={26} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="text-lg font-bold text-slate-900">PayNest</div>
        <span className="spinner spinner-dark w-5 h-5" />
        <p className="text-sm text-slate-500">{t('loadingData')}</p>
        {error && (
          <div className="alert alert-error max-w-md text-center">
            <AlertTriangle size={16} className="flex-shrink-0" />
            {error}
          </div>
        )}
      </div>
    );
  }

  if (!sessionValid) {
    return (
      <BrowserRouter>
        <AuthRoutes onLogin={() => setSessionValid(true)} />
      </BrowserRouter>
    );
  }

  const role = localStorage.getItem('role');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (user?.must_change_password === true) {
    return (
      <ForceChangePassword
        onDone={() => {
          const updatedUser = JSON.parse(localStorage.getItem('user') || '{}');
          window.location.href = getDefaultPath(updatedUser.role);
        }}
      />
    );
  }

  const needsSetup = role === 'owner' && !settings?.system_mode;

  const handleSettingsSaved = (newSettings) => setSettings(newSettings);

  if (needsSetup) {
    return (
      <BrowserRouter>
        <ProtectedRoute allowedRoles={['owner']}>
          <OwnerSetup settings={settings} onSettingsSaved={handleSettingsSaved} />
        </ProtectedRoute>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/super-admin" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdmin /></ProtectedRoute>} />
        <Route path="/owner-setup" element={<ProtectedRoute allowedRoles={['owner']}><OwnerSetup settings={settings} onSettingsSaved={handleSettingsSaved} /></ProtectedRoute>} />
        <Route path="/company-admin" element={<ProtectedRoute allowedRoles={['owner']}><OwnerSetup settings={settings} onSettingsSaved={handleSettingsSaved} /></ProtectedRoute>} />
        <Route path="/hr" element={<ProtectedRoute allowedRoles={['hr', 'owner']}><Layout settings={settings}><Employees /></Layout></ProtectedRoute>} />
        <Route path="/employee-portal" element={<ProtectedRoute allowedRoles={['employee']}><EmployeePortal /></ProtectedRoute>} />
        <Route
          path="/*"
          element={
            <ProtectedRoute allowedRoles={['owner', 'hr']}>
              <Layout settings={settings}>
                <Routes>
                  <Route path="/" element={<Dashboard settings={settings} />} />
                  <Route path="/upload" element={<Upload settings={settings} />} />
                  <Route path="/payroll" element={<Payroll settings={settings} />} />
                  <Route path="/bonuses" element={<Bonuses />} />
                  <Route path="/leaves" element={<Leaves />} />
                  <Route path="/reports" element={<Reports settings={settings} />} />
                  <Route path="/employees" element={<Employees />} />
                  <Route path="/tasks" element={<Tasks />} />
                  <Route path="/announcements" element={<Announcements />} />
                  <Route path="/employees/remote" element={<Remote />} />
                  <Route path="/settings" element={<ProtectedRoute allowedRoles={['owner']}><Settings settings={settings} onSettingsSaved={handleSettingsSaved} /></ProtectedRoute>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

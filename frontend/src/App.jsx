import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import {
  Building2,
  AlertTriangle,
  LockKeyhole,
  CheckCircle2,
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
  localStorage.removeItem('payzen_logged_in');
  localStorage.removeItem('role');
  localStorage.removeItem('user');
  localStorage.removeItem('payzen_employee_id');
}

function getDefaultPath(role) {
  if (role === 'super_admin') return '/super-admin';
  if (role === 'employee') return '/employee-portal';
  if (role === 'hr') return '/hr';
  if (role === 'owner') return '/company-admin';
  return '/';
}

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      setLoadingLogin(true);
      setError('');

      const res = await api.post('/auth/login', { email, password });
      const { token, user } = res.data;

      localStorage.setItem('token', token);
      localStorage.setItem('payzen_logged_in', 'true');
      localStorage.setItem('role', user.role);
      localStorage.setItem('user', JSON.stringify(user));

      onLogin(user);

      if (user.must_change_password === true) {
        window.location.href = '/';
        return;
      }

      window.location.href = getDefaultPath(user.role);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoadingLogin(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <form onSubmit={handleLogin} className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
        <h1 className="text-3xl font-black text-center mb-2">
          Pay<span className="text-blue-600">Zen</span>
        </h1>

        <p className="text-center text-slate-500 mb-8">تسجيل الدخول</p>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="البريد الإلكتروني"
          className="w-full mb-4 px-4 py-3 rounded-xl border border-slate-200"
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="كلمة السر"
          className="w-full mb-4 px-4 py-3 rounded-xl border border-slate-200"
        />

        {error && <div className="text-red-600 text-sm mb-4 text-center">{error}</div>}

        <button
          disabled={loadingLogin}
          className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-60"
        >
          {loadingLogin ? 'جاري الدخول...' : 'دخول'}
        </button>
      </form>
    </div>
  );
}

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

      await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      const user = JSON.parse(localStorage.getItem('user') || '{}');

      localStorage.setItem(
        'user',
        JSON.stringify({
          ...user,
          must_change_password: false,
        })
      );

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

        <h1 className="text-2xl font-black text-center text-slate-900 mb-2">
          تغيير كلمة السر
        </h1>

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

        {error && (
          <div className="text-red-600 text-sm text-center mb-4">
            {error}
          </div>
        )}

        <button
          disabled={saving}
          className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving ? (
            'جاري الحفظ...'
          ) : (
            <>
              <CheckCircle2 size={18} />
              حفظ كلمة السر
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function ProtectedRoute({ allowedRoles, children }) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (!role) {
    clearAuth();
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={getDefaultPath(role)} replace />;
  }

  return children;
}

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
          const stored = localStorage.getItem('payzen_lang');

          if (!stored) {
            localStorage.setItem('payzen_lang', dbLang || 'ar');
          }
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

  const handleSettingsSaved = (newSettings) => {
    setSettings(newSettings);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-elevated">
          <Building2 size={26} className="text-white" strokeWidth={2.5} />
        </div>

        <div className="text-lg font-bold text-slate-900">PayZen</div>
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
    return <LoginPage onLogin={() => setSessionValid(true)} />;
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
        <Route
          path="/super-admin"
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <SuperAdmin />
            </ProtectedRoute>
          }
        />

        <Route
          path="/owner-setup"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <OwnerSetup settings={settings} onSettingsSaved={handleSettingsSaved} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/company-admin"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <OwnerSetup settings={settings} onSettingsSaved={handleSettingsSaved} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/hr"
          element={
            <ProtectedRoute allowedRoles={['hr', 'owner']}>
              <Layout settings={settings}>
                <Employees />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/employee-portal"
          element={
            <ProtectedRoute allowedRoles={['employee']}>
              <EmployeePortal />
            </ProtectedRoute>
          }
        />

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
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute allowedRoles={['owner']}>
                        <Settings settings={settings} onSettingsSaved={handleSettingsSaved} />
                      </ProtectedRoute>
                    }
                  />
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
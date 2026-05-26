import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Plus,
  AlertTriangle,
  CheckCircle2,
  X,
  Shield,
  Edit2,
  Trash2,
  Calendar,
} from 'lucide-react';
import clsx from 'clsx';
import { useLanguage } from '../hooks/useLanguage';
import api from '../utils/api';

function formatCurrency(val) {
  const n = parseFloat(val) || 0;
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const religionOptions = [
  { value: 'muslim', ar: 'مسلم', en: 'Muslim' },
  { value: 'christian', ar: 'مسيحي', en: 'Christian' },
  { value: 'buddhist', ar: 'بوذي', en: 'Buddhist' },
];

export default function Employees() {
  const { t, lang } = useLanguage();

  const [employees, setEmployees] = useState([]);
  const [balances, setBalances] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hrUsers, setHrUsers] = useState([]);
  const [assigningSupervisor, setAssigningSupervisor] = useState(false);
  const role = localStorage.getItem('role');

  const [form, setForm] = useState({
    employee_id: '',
    name: '',
    email: '',
    base_salary: '',
    social_security: false,
    religion: '',
  });

  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    base_salary: '',
    social_security: false,
    religion: '',
  });

  const religionLabel = (value) => {
    const item = religionOptions.find((r) => r.value === value);
    if (!item) return lang === 'ar' ? 'غير محدد' : 'Not selected';
    return item[lang] || item.en;
  };

  const religionTitle = lang === 'ar' ? 'الديانة' : 'Religion';
  const selectReligionText = lang === 'ar' ? 'اختر الديانة' : 'Select religion';
  const emailTitle = lang === 'ar' ? 'البريد الإلكتروني' : 'Email';

  const text = {
    edit: lang === 'ar' ? 'تعديل' : 'Edit',
    delete: lang === 'ar' ? 'حذف' : 'Delete',
    editEmployee: lang === 'ar' ? 'تعديل الموظف' : 'Edit Employee',
    deleteTitle: lang === 'ar' ? 'تأكيد الحذف' : 'Delete Employee',
    deleteMessage:
      lang === 'ar'
        ? 'هل أنت متأكد من حذف هذا الموظف؟ هذا الإجراء لا يمكن التراجع عنه.'
        : 'Are you sure you want to delete this employee? This action cannot be undone.',
    no: lang === 'ar' ? 'لا' : 'Cancel',
    yesDelete: lang === 'ar' ? 'نعم، حذف' : 'Yes, Delete',
    updated: lang === 'ar' ? 'تم تعديل بيانات الموظف' : 'Employee updated successfully',
    deleted: lang === 'ar' ? 'تم حذف الموظف' : 'Employee deleted successfully',
    annualRemaining: lang === 'ar' ? 'الإجازات السنوية المتبقية' : 'Annual leave remaining',
    sickRemaining: lang === 'ar' ? 'الإجازات المرضية المتبقية' : 'Sick leave remaining',
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    setError('');

    try {
      const requests = [api.get('/employees'), api.get('/leaves/balances')];
      if (role === 'owner') requests.push(api.get('/auth/users', { params: { role: 'hr' } }));
      const results = await Promise.all(requests);
      const [empRes, balRes] = results;
      if (role === 'owner' && results[2]) setHrUsers(results[2].data || []);

      const list = empRes.data || [];

      setEmployees(list);
      setBalances(balRes.data || []);

      if (!selectedId && list.length) {
        setSelectedId(list[0].employee_id);
      }

      if (selectedId && !list.some((emp) => emp.employee_id === selectedId)) {
        setSelectedId(list[0]?.employee_id || '');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;

    return employees.filter((emp) => {
      const id = String(emp.employee_id || '').toLowerCase();
      const name = String(emp.name || '').toLowerCase();
      const email = String(emp.email || '').toLowerCase();

      return id.includes(q) || name.includes(q) || email.includes(q);
    });
  }, [employees, search]);

  const selectedEmployee = employees.find((emp) => emp.employee_id === selectedId) || null;
  const selectedBalance = balances.find((b) => b.employee_id === selectedId) || null;

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const payload = {
      employee_id: String(form.employee_id || '').trim(),
      name: String(form.name || '').trim(),
      email: String(form.email || '').trim(),
      base_salary: parseFloat(form.base_salary || 0),
      social_security: !!form.social_security,
      religion: form.religion || '',
    };

    if (!payload.employee_id || !payload.name || !payload.email || !payload.base_salary) {
      setError(t('fillRequired'));
      return;
    }

    try {
      await api.post('/employees', payload);

      setSuccess(
        lang === 'ar'
          ? 'تمت إضافة الموظف وإنشاء حساب دخول له بكلمة السر 123456'
          : 'Employee added and login account created with password 123456'
      );

      setShowAdd(false);

      setForm({
        employee_id: '',
        name: '',
        email: '',
        base_salary: '',
        social_security: false,
        religion: '',
      });

      await loadEmployees();
      setSelectedId(payload.employee_id);
    } catch (err) {
      setError(err.message);
    }
  };

  const openEditModal = () => {
    if (!selectedEmployee) return;

    setEditForm({
      name: selectedEmployee.name || '',
      email: selectedEmployee.email || '',
      base_salary: selectedEmployee.base_salary || '',
      social_security: !!selectedEmployee.social_security,
      religion: selectedEmployee.religion || '',
    });

    setShowEdit(true);
  };

  const handleEditEmployee = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    setSavingEdit(true);
    setError('');
    setSuccess('');

    const payload = {
      name: String(editForm.name || '').trim(),
      email: String(editForm.email || '').trim(),
      base_salary: parseFloat(editForm.base_salary || 0),
      social_security: !!editForm.social_security,
      religion: editForm.religion || '',
    };

    if (!payload.name || !payload.email || !payload.base_salary) {
      setError(t('fillRequired'));
      setSavingEdit(false);
      return;
    }

    try {
      const res = await api.put(`/employees/${selectedEmployee.employee_id}`, payload);

      setEmployees((prev) =>
        prev.map((emp) => (emp.employee_id === selectedEmployee.employee_id ? res.data : emp))
      );

      setSuccess(text.updated);
      setShowEdit(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) return;

    setDeleting(true);
    setError('');
    setSuccess('');

    try {
      await api.delete(`/employees/${selectedEmployee.employee_id}`);

      const nextEmployees = employees.filter(
        (emp) => emp.employee_id !== selectedEmployee.employee_id
      );

      setEmployees(nextEmployees);
      setSelectedId(nextEmployees[0]?.employee_id || '');
      setShowDeleteConfirm(false);
      setSuccess(text.deleted);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-slate-500">
        <span className="spinner spinner-dark w-5 h-5" />
        {t('loadingData')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h2 className="page-title">{t('employees')}</h2>
          <p className="page-subtitle">{t('employeeManagement') || 'Manage employees'}</p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> {t('addEmployee')}
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="ml-auto opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <CheckCircle2 size={16} className="flex-shrink-0" />
          <span className="flex-1">{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <div className="card-header">
            <div className="card-title">
              <Users size={16} className="text-brand-600" /> {t('employeeList')}
            </div>

            <input
              className="form-input w-60"
              placeholder={t('searchEmployee')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="table-wrapper">
            {filteredEmployees.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-400">{t('noEmployees')}</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th />
                    <th>{t('employeeId')}</th>
                    <th>{t('name')}</th>
                    <th>{emailTitle}</th>
                    <th className="text-right">{t('baseSalary')}</th>
                    <th className="text-right">{religionTitle}</th>
                    <th className="text-right">{t('socialSecurity')}</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredEmployees.map((emp) => (
                    <tr
                      key={emp.employee_id}
                      className={clsx(
                        'group cursor-pointer',
                        emp.employee_id === selectedId && 'bg-brand-50'
                      )}
                      onClick={() => setSelectedId(emp.employee_id)}
                    >
                      <td className="pl-3" />
                      <td className="font-mono text-xs text-slate-500">{emp.employee_id}</td>
                      <td className="font-medium">{emp.name}</td>
                      <td className="text-sm text-slate-600">{emp.email || '-'}</td>
                      <td className="text-right font-mono">{formatCurrency(emp.base_salary)}</td>
                      <td className="text-right text-sm">{religionLabel(emp.religion)}</td>
                      <td className="text-right">
                        {emp.social_security ? (
                          <span className="badge badge-purple">
                            <Shield size={11} /> {t('enabled')}
                          </span>
                        ) : (
                          <span className="badge badge-gray">{t('disabled')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card compact">
          <div className="card-header">
            <div className="card-title">{t('employeeDetails')}</div>

            {selectedEmployee && (
              <div className="flex items-center gap-2">
                <button className="btn btn-sm btn-secondary" onClick={openEditModal}>
                  <Edit2 size={13} />
                  {text.edit}
                </button>

                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 size={13} />
                  {text.delete}
                </button>
              </div>
            )}
          </div>

          {!selectedEmployee ? (
            <div className="text-sm text-slate-400">{t('selectEmployee')}</div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="text-xs text-slate-500 mb-1">{t('name')}</div>
                <div className="text-lg font-semibold text-slate-900">
                  {selectedEmployee.name}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-slate-500 mb-1">{t('employeeId')}</div>
                  <div className="font-mono text-sm">{selectedEmployee.employee_id}</div>
                </div>

                <div>
                  <div className="text-xs text-slate-500 mb-1">{emailTitle}</div>
                  <div className="text-sm">{selectedEmployee.email || '-'}</div>
                </div>

                <div>
                  <div className="text-xs text-slate-500 mb-1">{t('baseSalary')}</div>
                  <div className="font-mono text-sm">
                    {formatCurrency(selectedEmployee.base_salary)}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500 mb-1">{religionTitle}</div>
                  <div className="text-sm font-medium">
                    {religionLabel(selectedEmployee.religion)}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500 mb-1">{t('socialSecurity')}</div>
                  <div>
                    {selectedEmployee.social_security ? (
                      <span className="badge badge-purple">
                        <Shield size={11} /> {t('enabled')}
                      </span>
                    ) : (
                      <span className="badge badge-gray">{t('disabled')}</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500 mb-1">
                    {text.annualRemaining}
                  </div>
                  <span
                    className={clsx(
                      'badge',
                      Number(selectedBalance?.annual_remaining ?? 14) > 5
                        ? 'badge-green'
                        : Number(selectedBalance?.annual_remaining ?? 14) > 0
                          ? 'badge-yellow'
                          : 'badge-red'
                    )}
                  >
                    <Calendar size={11} />
                    {selectedBalance?.annual_remaining ?? 14}
                  </span>
                </div>

                <div>
                  <div className="text-xs text-slate-500 mb-1">
                    {text.sickRemaining}
                  </div>
                  <span
                    className={clsx(
                      'badge',
                      Number(selectedBalance?.sick_remaining ?? 14) > 5
                        ? 'badge-green'
                        : Number(selectedBalance?.sick_remaining ?? 14) > 0
                          ? 'badge-yellow'
                          : 'badge-red'
                    )}
                  >
                    <Calendar size={11} />
                    {selectedBalance?.sick_remaining ?? 14}
                  </span>
                </div>
              </div>

              {/* Supervisor assignment — owner only */}
              {role === 'owner' && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="text-xs text-slate-500 mb-1">{t('supervisor')}</div>
                  <div className="flex items-center gap-2">
                    <select
                      className="form-input flex-1 text-sm"
                      value={selectedEmployee.supervisor_user_id || ''}
                      disabled={assigningSupervisor}
                      onChange={async (e) => {
                        const val = e.target.value ? parseInt(e.target.value, 10) : null;
                        setAssigningSupervisor(true);
                        try {
                          const res = await api.put(
                            `/evaluations/assign-supervisor/${selectedEmployee.employee_id}`,
                            { supervisor_user_id: val }
                          );
                          setEmployees((prev) =>
                            prev.map((emp) =>
                              emp.employee_id === selectedEmployee.employee_id ? res.data : emp
                            )
                          );
                          setSuccess(t('supervisorAssigned'));
                          setTimeout(() => setSuccess(''), 3000);
                        } catch (err) {
                          setError(err.message);
                        } finally {
                          setAssigningSupervisor(false);
                        }
                      }}
                    >
                      <option value="">{t('noSupervisor')}</option>
                      {hrUsers.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                    {assigningSupervisor && (
                      <span className="text-xs text-slate-400">
                        {lang === 'ar' ? 'جاري...' : '...'}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAdd(false);
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{t('newEmployee')}</h3>
              <button className="modal-close" onClick={() => setShowAdd(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div>
                <label className="form-label">{t('employeeId')} *</label>
                <input
                  className="form-input"
                  value={form.employee_id}
                  onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}
                  placeholder="EMP-001"
                />
              </div>

              <div>
                <label className="form-label">{t('name')} *</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder={t('name')}
                />
              </div>

              <div>
                <label className="form-label">{emailTitle} *</label>
                <input
                  type="email"
                  className="form-input"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="employee@company.com"
                />

                <div className="text-xs text-slate-500 mt-1">
                  {lang === 'ar'
                    ? 'سيتم إنشاء حساب دخول تلقائيًا بكلمة السر 123456'
                    : 'A login account will be created automatically with password 123456'}
                </div>
              </div>

              <div>
                <label className="form-label">{t('baseSalary')} *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  value={form.base_salary}
                  onChange={(e) => setForm((f) => ({ ...f, base_salary: e.target.value }))}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="form-label">{religionTitle}</label>
                <select
                  className="form-input"
                  value={form.religion}
                  onChange={(e) => setForm((f) => ({ ...f, religion: e.target.value }))}
                >
                  <option value="">{selectReligionText}</option>
                  {religionOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item[lang] || item.en}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-700">{t('socialSecurity')}</div>
                  <div className="text-xs text-slate-500">{t('ssToggle')}</div>
                </div>

                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={form.social_security}
                    onChange={(e) => setForm((f) => ({ ...f, social_security: e.target.checked }))}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>
                  {t('cancel')}
                </button>

                <button type="submit" className="btn btn-primary">
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEdit && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEdit(false);
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{text.editEmployee}</h3>
              <button className="modal-close" onClick={() => setShowEdit(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditEmployee} className="space-y-4">
              <div>
                <label className="form-label">{t('employeeId')}</label>
                <input
                  className="form-input bg-slate-50"
                  value={selectedEmployee?.employee_id || ''}
                  disabled
                />
              </div>

              <div>
                <label className="form-label">{t('name')} *</label>
                <input
                  className="form-input"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="form-label">{emailTitle} *</label>
                <input
                  type="email"
                  className="form-input"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>

              <div>
                <label className="form-label">{t('baseSalary')} *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  value={editForm.base_salary}
                  onChange={(e) => setEditForm((f) => ({ ...f, base_salary: e.target.value }))}
                />
              </div>

              <div>
                <label className="form-label">{religionTitle}</label>
                <select
                  className="form-input"
                  value={editForm.religion}
                  onChange={(e) => setEditForm((f) => ({ ...f, religion: e.target.value }))}
                >
                  <option value="">{selectReligionText}</option>
                  {religionOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item[lang] || item.en}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-700">{t('socialSecurity')}</div>
                  <div className="text-xs text-slate-500">{t('ssToggle')}</div>
                </div>

                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={editForm.social_security}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, social_security: e.target.checked }))
                    }
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEdit(false)}>
                  {t('cancel')}
                </button>

                <button type="submit" className="btn btn-primary" disabled={savingEdit}>
                  {savingEdit ? <span className="spinner" /> : null}
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                <Trash2 size={20} />
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">{text.deleteTitle}</h3>
                <p className="text-sm text-slate-500 mt-2 leading-6">
                  {text.deleteMessage}
                </p>

                <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm">
                  <div className="font-semibold text-slate-900">{selectedEmployee.name}</div>
                  <div className="text-slate-500 font-mono text-xs mt-1">
                    {selectedEmployee.employee_id}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                {text.no}
              </button>

              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteEmployee}
                disabled={deleting}
              >
                {deleting ? <span className="spinner" /> : <Trash2 size={15} />}
                {text.yesDelete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
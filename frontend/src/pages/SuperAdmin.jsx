import React, { useEffect, useState } from 'react';
import {
    Building2,
    Plus,
    X,
    CheckCircle2,
    AlertTriangle,
    Trash2,
    LogOut,
    Power,
} from 'lucide-react';
import api from '../utils/api';

export default function SuperAdmin() {
    const [companies, setCompanies] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [deletingId, setDeletingId] = useState(null);
    const [togglingId, setTogglingId] = useState(null);

    const [form, setForm] = useState({
        companyName: '',
        slug: '',
        ownerName: '',
        email: '',
        password: '123456',
    });

    const signOut = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('paynest_logged_in');
        localStorage.removeItem('role');
        localStorage.removeItem('user');
        localStorage.removeItem('paynest_employee_id');
        window.location.href = '/';
    };

    const loadCompanies = async () => {
        try {
            setError('');
            const res = await api.get('/companies');
            setCompanies(res.data || []);
        } catch (err) {
            setError(err.message);
        }
    };

    useEffect(() => {
        loadCompanies();
    }, []);

    const handleAddCompany = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            await api.post('/auth/register-company', form);

            setSuccess('Company and owner created successfully');
            setShowAdd(false);
            setForm({
                companyName: '',
                slug: '',
                ownerName: '',
                email: '',
                password: '123456',
            });

            await loadCompanies();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleToggleStatus = async (company) => {
        try {
            setTogglingId(company.id);
            setError('');
            setSuccess('');

            const res = await api.patch(`/companies/${company.id}/toggle-status`);

            setCompanies((prev) =>
                prev.map((item) => (item.id === company.id ? res.data : item))
            );

            setSuccess(
                res.data.is_active === false
                    ? 'Company subscription suspended successfully'
                    : 'Company subscription activated successfully'
            );
        } catch (err) {
            setError(err.message);
        } finally {
            setTogglingId(null);
        }
    };

    const handleDeleteCompany = async (company) => {
        if (company.id === 1) {
            setError('Cannot delete default company');
            return;
        }

        const ok = window.confirm(
            `Delete "${company.name}"? This will delete its users, employees, payroll, leaves, tasks and settings.`
        );

        if (!ok) return;

        try {
            setDeletingId(company.id);
            setError('');
            setSuccess('');

            await api.delete(`/companies/${company.id}`);

            setSuccess('Company deleted successfully');
            await loadCompanies();
        } catch (err) {
            setError(err.message);
        } finally {
            setDeletingId(null);
        }
    };

    const autoSlug = (value) => {
        const slug = value
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        setForm((f) => ({
            ...f,
            companyName: value,
            slug,
        }));
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6 gap-3">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900">
                            Super Admin
                        </h1>

                        <p className="text-slate-500 mt-1">
                            Companies Management
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowAdd(true)}
                        >
                            <Plus size={16} />
                            Add Company
                        </button>

                        <button className="btn btn-danger" onClick={signOut}>
                            <LogOut size={16} />
                            Sign out
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="alert alert-error mb-4">
                        <AlertTriangle size={16} />
                        {error}
                    </div>
                )}

                {success && (
                    <div className="alert alert-success mb-4">
                        <CheckCircle2 size={16} />
                        {success}
                    </div>
                )}

                <div className="card p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Building2 className="text-brand-600" size={20} />
                        <h2 className="font-bold text-lg">
                            Companies
                        </h2>
                    </div>

                    {companies.length === 0 ? (
                        <div className="text-slate-500">
                            No companies yet
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Company</th>
                                        <th>Owner Email</th>
                                        <th>Slug</th>
                                        <th>Status</th>
                                        <th>Created</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {companies.map((company) => {
                                        const isActive = company.is_active !== false;

                                        return (
                                            <tr key={company.id}>
                                                <td className="font-mono text-xs">{company.id}</td>
                                                <td className="font-semibold">{company.name}</td>
                                                <td className="text-sm text-slate-600">
                                                    {company.owner_email || '-'}
                                                </td>
                                                <td>{company.slug}</td>
                                                <td>
                                                    {isActive ? (
                                                        <span className="badge badge-green">
                                                            Active
                                                        </span>
                                                    ) : (
                                                        <span className="badge badge-red">
                                                            Suspended
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    {company.created_at
                                                        ? new Date(company.created_at).toLocaleDateString()
                                                        : '-'}
                                                </td>
                                                <td className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            className={`btn btn-sm ${isActive ? 'btn-secondary' : 'btn-primary'
                                                                }`}
                                                            disabled={togglingId === company.id}
                                                            onClick={() => handleToggleStatus(company)}
                                                            title={
                                                                isActive
                                                                    ? 'Suspend subscription'
                                                                    : 'Activate subscription'
                                                            }
                                                        >
                                                            <Power size={14} />
                                                            {togglingId === company.id
                                                                ? 'Saving...'
                                                                : isActive
                                                                    ? 'Suspend'
                                                                    : 'Activate'}
                                                        </button>

                                                        <button
                                                            className="btn btn-sm btn-danger"
                                                            disabled={company.id === 1 || deletingId === company.id}
                                                            onClick={() => handleDeleteCompany(company)}
                                                            title={
                                                                company.id === 1
                                                                    ? 'Default company cannot be deleted'
                                                                    : 'Delete company'
                                                            }
                                                        >
                                                            <Trash2 size={14} />
                                                            {deletingId === company.id ? 'Deleting...' : 'Delete'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
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
                                <h3 className="modal-title">Add Company</h3>
                                <button
                                    className="modal-close"
                                    onClick={() => setShowAdd(false)}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleAddCompany} className="space-y-4">
                                <div>
                                    <label className="form-label">Company Name *</label>
                                    <input
                                        className="form-input"
                                        value={form.companyName}
                                        onChange={(e) => autoSlug(e.target.value)}
                                        placeholder="Alpha Tech"
                                    />
                                </div>

                                <div>
                                    <label className="form-label">Slug *</label>
                                    <input
                                        className="form-input"
                                        value={form.slug}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, slug: e.target.value }))
                                        }
                                        placeholder="alpha-tech"
                                    />
                                </div>

                                <div>
                                    <label className="form-label">Owner Name *</label>
                                    <input
                                        className="form-input"
                                        value={form.ownerName}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, ownerName: e.target.value }))
                                        }
                                        placeholder="Company Owner"
                                    />
                                </div>

                                <div>
                                    <label className="form-label">Owner Email *</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={form.email}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, email: e.target.value }))
                                        }
                                        placeholder="owner@company.com"
                                    />
                                </div>

                                <div>
                                    <label className="form-label">Temporary Password *</label>
                                    <input
                                        className="form-input"
                                        value={form.password}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, password: e.target.value }))
                                        }
                                    />
                                </div>

                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setShowAdd(false)}
                                    >
                                        Cancel
                                    </button>

                                    <button type="submit" className="btn btn-primary">
                                        Create Company
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
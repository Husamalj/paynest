import React, { useEffect, useState } from 'react';
import {
  Bell,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  Pencil,
} from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import api from '../utils/api';

export default function Announcements() {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', published: false });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/announcements?all=true');
      setItems(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/announcements', form);
      setSuccess(t('add') + ' ' + t('announcements'));
      setShowAdd(false);
      setForm({ title: '', message: '', published: false });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('deleteConfirm'))) return;
    try {
      await api.delete(`/announcements/${id}`);
      setSuccess(t('delete') + ' ' + t('announcements'));
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const togglePublish = async (ann) => {
    try {
      await api.put(`/announcements/${ann.id}`, { published: !ann.published });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h2 className="page-title">{t('announcements')}</h2>
          <p className="page-subtitle">Create and publish announcements for employees</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> {t('add')}
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertTriangle size={16} /> {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          <CheckCircle2 size={16} /> {success}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400">{t('loadingData')}</div>
      ) : items.length === 0 ? (
        <div className="card text-center py-12">No announcements yet</div>
      ) : (
        <div className="space-y-3">
          {items.map((ann) => (
            <div key={ann.id} className="card flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-900">{ann.title}</div>
                <div className="text-xs text-slate-600 mt-1">{ann.message}</div>
                <div className="text-xs text-slate-400 mt-2">{new Date(ann.created_at).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn btn-sm" onClick={() => togglePublish(ann)}>
                  {ann.published ? 'Unpublish' : 'Publish'}
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(ann.id)}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{t('add')} {t('announcements')}</h3>
              <button className="modal-close" onClick={() => setShowAdd(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="form-label">Title</label>
                <input className="form-input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Message</label>
                <textarea className="form-input" rows={4} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.published} onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))} />
                  <span>Publish now</span>
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>{t('cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

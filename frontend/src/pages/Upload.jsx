import React, { useState, useRef, useEffect } from 'react';
import {
  Upload as UploadIcon,
  Clock,
  Wallet,
  FileSpreadsheet,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  Eye,
  Users,
} from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import api from '../utils/api';
import axios from 'axios';
import clsx from 'clsx';

function FileDropZone({ label, icon: Icon, accent, onFiles, accept, uploading }) {
  const { t } = useLanguage();
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(files);
  };

  return (
    <div
      className={clsx('upload-zone', dragOver && 'drag-over', uploading && 'opacity-60 cursor-not-allowed')}
      onDragOver={(e) => {
        e.preventDefault();
        if (!uploading) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={uploading ? undefined : handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
    >
      <div className={clsx('mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-3', accent)}>
        <Icon size={26} strokeWidth={2} />
      </div>
      <p className="font-semibold text-slate-900 mb-1">{label}</p>
      <p className="text-[13px] text-slate-500 mb-1">{t('dragDrop')}</p>
      <p className="text-[11px] text-slate-400">{t('supportedFormats')}</p>
      <input
        ref={inputRef}
        type="file"
        multiple={accept === 'attendance'}
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files);
          if (files.length) onFiles(files);
          e.target.value = '';
        }}
      />
    </div>
  );
}

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString();
}

export default function Upload({ settings }) {
  const { t } = useLanguage();
  const [attendanceFiles, setAttendanceFiles] = useState([]);
  const [salaryFiles, setSalaryFiles] = useState([]);
  const [uploading, setUploading] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [preview, setPreview] = useState([]);
  const [previewType, setPreviewType] = useState('');
  const [lastUpload, setLastUpload] = useState(null);

  useEffect(() => {
    loadUploadedFiles();
  }, []);

  const loadUploadedFiles = async () => {
    try {
      const res = await api.get('/upload');
      const files = res.data || [];
      setUploadedFiles(files);
      return files;
    } catch (err) {
      console.error('Could not load uploaded files:', err.message);
      return [];
    }
  };

  const maybeAutoCalculate = async (prevFiles, nextFiles) => {
    const hadAttendance = prevFiles.some((f) => f.file_type === 'attendance');
    const hadSalary = prevFiles.some((f) => f.file_type === 'salary');
    const hasAttendance = nextFiles.some((f) => f.file_type === 'attendance');
    const hasSalary = nextFiles.some((f) => f.file_type === 'salary');

    if (hadAttendance && hadSalary) return;
    if (!hasAttendance || !hasSalary) return;

    try {
      await api.post('/payroll/calculate', {});
      setSuccess((prev) => (prev ? `${prev} - ${t('calculationDone')}` : t('calculationDone')));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpload = async (files, type) => {
    setUploading(type);
    setError('');
    setSuccess('');
    setPreview([]);
    setLastUpload(null);

    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));

    try {
      const res = await axios.post(`/api/upload?type=${type}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });

      const filesResult = res.data.files || [];
      const totalEmployees = filesResult.reduce((s, f) => s + (f.employee_count || 0), 0);

      setLastUpload({
        type,
        fileCount: filesResult.length,
        totalEmployees,
      });

      if (type === 'salary') {
        setSuccess(`✓ ${totalEmployees} ${t('employeeCount')} (${filesResult.length} ${t('filesFound')})`);
      } else {
        setSuccess(`✓ ${filesResult.length} ${t('filesFound')}, ${totalEmployees} ${t('employeeCount')}`);
      }

      if (filesResult[0]?.preview?.length) {
        setPreview(filesResult[0].preview);
        setPreviewType(type);
      }

      setAttendanceFiles([]);
      setSalaryFiles([]);
      const nextFiles = await loadUploadedFiles();
      await maybeAutoCalculate(uploadedFiles, nextFiles);
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setError(msg);
    } finally {
      setUploading('');
    }
  };

  const handleDelete = async (file) => {
    if (!window.confirm(t('deleteConfirm'))) return;
    try {
      await api.delete(`/upload/${file.id}`);
      setUploadedFiles((prev) => prev.filter((f) => f.id !== file.id));
      setSuccess(t('deleteSuccess'));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h2 className="page-title">{t('upload')}</h2>
          <p className="page-subtitle">{t('uploadFirst')}</p>
        </div>
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

      {/* Last upload summary */}
      {lastUpload && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="card">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              {t('filesFound')}
            </div>
            <div className="text-2xl font-bold text-slate-900">{lastUpload.fileCount}</div>
          </div>
          <div className="card">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Users size={11} />
              {t('employees')}
            </div>
            <div className="text-2xl font-bold text-emerald-600">
              {lastUpload.totalEmployees}
            </div>
          </div>
        </div>
      )}

      {/* Upload cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Attendance Upload */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Clock size={16} className="text-brand-600" />
              {t('upload_attendance')}
            </div>
          </div>
          <FileDropZone
            label={t('uploadAttendance')}
            icon={Clock}
            accent="bg-brand-50 text-brand-600"
            accept="attendance"
            uploading={uploading === 'attendance'}
            onFiles={(files) => setAttendanceFiles(files)}
          />
          {attendanceFiles.length > 0 && (
            <div className="mt-3 space-y-2">
              {attendanceFiles.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg text-sm"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <FileSpreadsheet size={14} className="text-brand-600 flex-shrink-0" />
                    <span className="truncate">{f.name}</span>
                  </span>
                  <span className="text-slate-500 text-xs flex-shrink-0">
                    {(f.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              ))}
              <button
                className="btn btn-primary w-full mt-2"
                disabled={uploading !== ''}
                onClick={() => handleUpload(attendanceFiles, 'attendance')}
              >
                {uploading === 'attendance' ? (
                  <>
                    <span className="spinner" /> {t('uploading')}
                  </>
                ) : (
                  <>
                    <UploadIcon size={15} />
                    {t('uploadBtn')} ({attendanceFiles.length})
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Salary Upload */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Wallet size={16} className="text-emerald-600" />
              {t('upload_salary')}
            </div>
          </div>
          <FileDropZone
            label={t('uploadSalary')}
            icon={Wallet}
            accent="bg-emerald-50 text-emerald-600"
            accept="salary"
            uploading={uploading === 'salary'}
            onFiles={(files) => setSalaryFiles(files)}
          />
          {salaryFiles.length > 0 && (
            <div className="mt-3 space-y-2">
              {salaryFiles.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg text-sm"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <FileSpreadsheet size={14} className="text-emerald-600 flex-shrink-0" />
                    <span className="truncate">{f.name}</span>
                  </span>
                  <span className="text-slate-500 text-xs flex-shrink-0">
                    {(f.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              ))}
              <button
                className="btn btn-success w-full mt-2"
                disabled={uploading !== ''}
                onClick={() => handleUpload(salaryFiles, 'salary')}
              >
                {uploading === 'salary' ? (
                  <>
                    <span className="spinner" /> {t('uploading')}
                  </>
                ) : (
                  <>
                    <UploadIcon size={15} />
                    {t('uploadBtn')} ({salaryFiles.length})
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Data Preview */}
      {preview.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Eye size={16} className="text-brand-600" />
              {t('previewData')} ({previewType})
            </div>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {previewType === 'attendance' ? (
                    <>
                      <th>{t('employeeId')}</th>
                      <th>{t('date')}</th>
                      <th>{t('clockIn')}</th>
                      <th>{t('clockOut')}</th>
                      <th className="text-right">{t('hoursWorked')}</th>
                    </>
                  ) : (
                    <>
                      <th>{t('employeeId')}</th>
                      <th>{t('name')}</th>
                      <th className="text-right">{t('baseSalary')}</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, idx) => (
                  <tr key={idx}>
                    {previewType === 'attendance' ? (
                      <>
                        <td className="font-mono text-xs text-slate-500">{row.employee_id}</td>
                        <td>{row.work_date}</td>
                        <td className="font-mono text-xs">{row.clock_in || '-'}</td>
                        <td className="font-mono text-xs">{row.clock_out || '-'}</td>
                        <td className="text-right font-mono">
                          {parseFloat(row.hours_worked || 0).toFixed(2)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="font-mono text-xs text-slate-500">{row.employee_id}</td>
                        <td className="font-medium">{row.name}</td>
                        <td className="text-right font-mono">
                          {parseFloat(row.base_salary || 0).toLocaleString()}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Uploaded Files History */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <FileSpreadsheet size={16} className="text-brand-600" />
            {t('uploadedFiles')}
          </div>
          <span className="text-xs text-slate-500">{uploadedFiles.length} {t('file')}</span>
        </div>
        {uploadedFiles.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-400">{t('noData')}</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>{t('name')}</th>
                  <th>{t('type')}</th>
                  <th className="text-right">{t('employees')}</th>
                  <th>{t('uploadedAt')}</th>
                  <th className="text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {uploadedFiles.map((file) => (
                  <tr key={file.id}>
                    <td className="font-medium flex items-center gap-2">
                      <FileSpreadsheet size={14} className="text-slate-400" />
                      <span className="truncate max-w-[260px]">{file.original_name}</span>
                    </td>
                    <td>
                      <span
                        className={clsx(
                          'badge',
                          file.file_type === 'attendance' ? 'badge-blue' : 'badge-green'
                        )}
                      >
                        {file.file_type === 'attendance' ? (
                          <Clock size={11} />
                        ) : (
                          <Wallet size={11} />
                        )}
                        {file.file_type}
                      </span>
                    </td>
                    <td className="text-right font-mono">{file.employee_count || 0}</td>
                    <td className="text-xs text-slate-500">{formatDate(file.created_at)}</td>
                    <td className="text-right">
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(file)}
                        title={t('deleteFile')}
                      >
                        <Trash2 size={13} />
                        {t('delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

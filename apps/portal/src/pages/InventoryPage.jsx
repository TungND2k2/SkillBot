import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box, Search, AlertTriangle, Plus, Pencil, Trash2, X,
  ExternalLink, Layers, CheckCircle2, ChevronDown, ChevronUp
} from 'lucide-react';
import { listDocs, createDoc, updateDoc, deleteDoc } from '../api/payload';
import useAuth from '../hooks/useAuth';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import Modal, { FormField } from '../components/Modal';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'ok', label: 'Đủ tồn kho' },
  { value: 'low', label: 'Sắp hết' },
  { value: 'critical', label: 'Cảnh báo thiếu' },
  { value: 'empty', label: 'Hết hàng' },
];

function DetailPanel({ item, onClose, onEdit, onDelete, canEdit }) {
  const fabric = typeof item.fabric === 'object' ? item.fabric : null;
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—');
  const pct = item.minLevel > 0 ? Math.round((item.quantityM / item.minLevel) * 100) : 100;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden bg-[#0d1422] border-t border-b border-erp-border"
    >
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-erp-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Layers size={15} className="text-erp-primary-light" />
            <h4 className="text-xs font-bold text-erp-text uppercase tracking-wider">
              Chi tiết Tồn kho & Định mức tối thiểu
            </h4>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                <button
                  onClick={() => onEdit(item)}
                  className="btn btn-secondary text-xs px-2.5 py-1"
                  title="Chỉnh sửa"
                >
                  <Pencil size={13} />
                  <span>Sửa</span>
                </button>
                <button
                  onClick={() => onDelete(item)}
                  className="btn btn-secondary text-xs px-2.5 py-1 text-red-400 border-red-500/20"
                  title="Xóa bản ghi"
                >
                  <Trash2 size={13} />
                  <span>Xóa</span>
                </button>
              </>
            )}
            <a
              href={`http://localhost:3001/admin/collections/inventory/${item.id}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary text-xs px-2.5 py-1"
            >
              <ExternalLink size={13} />
              <span>CMS</span>
            </a>
            <button
              onClick={onClose}
              className="p-1 rounded text-erp-text-muted hover:text-white hover:bg-white/5"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Mã danh mục vải
            </p>
            <p className="font-mono font-bold text-erp-primary-light text-sm">
              {fabric?.code || '—'}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Tên quy cách vải
            </p>
            <p className="font-medium text-erp-text text-sm">{fabric?.name || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Tồn kho hiện hữu
            </p>
            <p className="text-base font-extrabold text-white tabular-nums">
              {item.quantityM?.toLocaleString() || 0} <span className="text-xs text-erp-text-dim">mét</span>
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Tỷ lệ an toàn (vs Tối thiểu)
            </p>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-24 h-2 rounded-full bg-erp-surface border border-erp-border overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
              <span
                className={`text-xs font-bold tabular-nums ${
                  pct >= 100 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400'
                }`}
              >
                {pct}%
              </span>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Mức tồn tối thiểu (Min)
            </p>
            <p className="font-medium text-erp-text">{item.minLevel} mét</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Lần nhập kho gần nhất
            </p>
            <p className="font-medium text-erp-text">{fmtDate(item.lastReceivedAt)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Trạng thái kiểm kê
            </p>
            <StatusBadge status={item.status} size="xs" />
          </div>
          {item.notes && (
            <div className="col-span-2 sm:col-span-4 pt-2 border-t border-erp-border/40">
              <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
                Ghi chú thủ kho
              </p>
              <p className="text-xs text-erp-text-muted whitespace-pre-wrap">{item.notes}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function InventoryPage() {
  const { role } = useAuth();
  const canEdit = ['admin', 'manager', 'planner', 'storage'].includes(role);
  const [items, setItems] = useState([]);
  const [fabrics, setFabrics] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ fabric: '', quantityM: '', minLevel: '50', notes: '' });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [res, fabRes] = await Promise.all([
        listDocs('inventory', { limit: 200, depth: 1, sort: 'fabric' }),
        listDocs('fabrics', { limit: 200, depth: 0, sort: 'code' }),
      ]);
      setItems(res?.docs || []);
      setFabrics(fabRes?.docs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const alertCount = items.filter((i) => ['low', 'critical', 'empty'].includes(i.status)).length;
  const filtered = items.filter((i) => {
    if (statusFilter && i.status !== statusFilter) return false;
    const fn = typeof i.fabric === 'object' ? `${i.fabric?.name || ''} ${i.fabric?.code || ''}` : '';
    if (search && !fn.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ fabric: '', quantityM: '', minLevel: '50', notes: '' });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      fabric: typeof item.fabric === 'object' ? item.fabric?.id : item.fabric,
      quantityM: item.quantityM || '',
      minLevel: item.minLevel || '50',
      notes: item.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...form,
        quantityM: +form.quantityM,
        minLevel: +form.minLevel,
      };
      if (editingId) await updateDoc('inventory', editingId, data);
      else await createDoc('inventory', data);
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert('Lỗi lưu tồn kho: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc('inventory', deleteTarget.id);
      setDeleteTarget(null);
      setExpandedId(null);
      fetchData();
    } catch (err) {
      alert('Lỗi xóa: ' + err.message);
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-erp-border">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Sổ Cái Tồn Kho Nguyên Phụ Liệu</span>
          </h1>
          <p className="text-xs text-erp-text-muted mt-1">
            Theo dõi lượng tồn kho, mức an toàn và cảnh báo nhập hàng NPL
          </p>
        </div>
        <div className="flex items-center gap-2">
          {alertCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
              <AlertTriangle size={14} />
              <span>{alertCount} mặt hàng cần nhập thêm</span>
            </div>
          )}
          {canEdit && (
            <button onClick={openCreate} className="btn btn-primary text-xs">
              <Plus size={14} />
              <span>Thêm dòng tồn kho</span>
            </button>
          )}
        </div>
      </div>

      <div className="erp-card p-3.5 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-dim" />
          <input
            className="erp-input pl-9"
            placeholder="Tìm theo mã hoặc tên vải trong kho..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="erp-input w-full sm:w-52"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="erp-card p-12 text-center text-erp-text-muted text-sm flex flex-col items-center justify-center gap-3">
          <span className="w-7 h-7 border-2 border-erp-border border-t-erp-primary-light rounded-full animate-spin" />
          <span>Đang tải số liệu tồn kho...</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Box}
          title="Không tìm thấy mục tồn kho"
          description="Chưa có dữ liệu tồn kho nào khớp với điều kiện lọc."
          actionLabel={canEdit ? 'Tạo mới' : undefined}
          onAction={openCreate}
        />
      ) : (
        <div className="erp-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Mã vải</th>
                  <th>Tên quy cách vải</th>
                  <th className="text-right">Tồn hiện tại (m)</th>
                  <th className="text-right">Mức tối thiểu (m)</th>
                  <th>Mức an toàn kho</th>
                  <th className="text-center">Trạng thái</th>
                  <th className="text-center">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const fabric = typeof item.fabric === 'object' ? item.fabric : null;
                  const pct = item.minLevel > 0 ? Math.round((item.quantityM / item.minLevel) * 100) : 100;
                  const isExpanded = expandedId === item.id;

                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className={`cursor-pointer hover:bg-erp-primary/5 ${isExpanded ? 'bg-erp-primary/[0.03]' : ''}`}
                      >
                        <td className="font-mono text-erp-primary-light font-bold text-xs">
                          {fabric?.code || '—'}
                        </td>
                        <td className="text-xs font-medium text-white">{fabric?.name || '—'}</td>
                        <td className="text-xs text-right font-extrabold text-white tabular-nums">
                          {item.quantityM?.toLocaleString() || 0}
                        </td>
                        <td className="text-xs text-right text-erp-text-muted tabular-nums">
                          {item.minLevel?.toLocaleString() || 0}
                        </td>
                        <td>
                          <div className="flex items-center gap-2 max-w-[160px]">
                            <div className="flex-1 h-1.5 rounded-full bg-erp-surface border border-erp-border overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            <span
                              className={`text-[11px] font-bold tabular-nums ${
                                pct >= 100 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400'
                              }`}
                            >
                              {pct}%
                            </span>
                          </div>
                        </td>
                        <td className="text-center">
                          <StatusBadge status={item.status} size="xs" />
                        </td>
                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : item.id)}
                            className="p-1 rounded text-erp-text-muted hover:text-white hover:bg-white/10"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                      </tr>
                      <AnimatePresence>
                        {isExpanded && (
                          <tr>
                            <td colSpan={7} className="!p-0">
                              <DetailPanel
                                item={item}
                                onClose={() => setExpandedId(null)}
                                onEdit={openEdit}
                                onDelete={setDeleteTarget}
                                canEdit={canEdit}
                              />
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Cập Nhật Tồn Kho NPL' : 'Tạo Dòng Tồn Kho NPL Mới'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <FormField label="Mã quy cách vải" required>
            <select
              className="erp-input"
              required
              value={form.fabric}
              onChange={(e) => setForm((p) => ({ ...p, fabric: e.target.value }))}
            >
              <option value="">-- Chọn mã vải --</option>
              {fabrics.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.code} — {f.name}
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Số lượng tồn (mét)" required>
              <input
                className="erp-input"
                type="number"
                step="0.1"
                required
                value={form.quantityM}
                onChange={(e) => setForm((p) => ({ ...p, quantityM: e.target.value }))}
              />
            </FormField>
            <FormField label="Mức tối thiểu (mét)" required>
              <input
                className="erp-input"
                type="number"
                step="0.1"
                required
                value={form.minLevel}
                onChange={(e) => setForm((p) => ({ ...p, minLevel: e.target.value }))}
              />
            </FormField>
          </div>

          <FormField label="Ghi chú xuất nhập tồn">
            <textarea
              className="erp-input"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="VD: Nhập thêm từ NCC Hà Nội lô ngày 15/08..."
            />
          </FormField>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-erp-border">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="btn btn-secondary text-xs"
            >
              Hủy
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary text-xs">
              {saving ? 'Đang lưu...' : editingId ? 'Cập nhật số liệu' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Xác nhận xóa bản ghi tồn kho">
        <p className="text-xs text-erp-text-muted mb-4">
          Bạn có chắc chắn muốn xóa bản ghi tồn kho cho mã vải{' '}
          <strong className="text-white font-mono">{deleteTarget?.fabric?.code}</strong>? Hành động này sẽ được ghi log vào hệ thống.
        </p>
        <div className="flex justify-end gap-2.5">
          <button onClick={() => setDeleteTarget(null)} className="btn btn-secondary text-xs">
            Hủy
          </button>
          <button onClick={handleDelete} className="btn btn-danger text-xs">
            Xác nhận xóa
          </button>
        </div>
      </Modal>
    </div>
  );
}

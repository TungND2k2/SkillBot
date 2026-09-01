import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck, Search, Plus, Pencil, Trash2, X,
  ExternalLink, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Shield
} from 'lucide-react';
import { listDocs, createDoc, updateDoc, deleteDoc } from '../api/payload';
import useAuth from '../hooks/useAuth';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import Modal, { FormField } from '../components/Modal';

const STAGES = {
  fabric: '🧵 Kiểm tra vải đầu vào',
  embroidery: '🎨 Kiểm tra in / thêu',
  sewing: '✂️ Kiểm tra may lắp ráp',
  final: '📦 Kiểm tra KCS hoàn thiện',
};

const DEFECT_LABELS = {
  stain: 'Vết ố / Bẩn',
  seam: 'Lỗi đường may / Bung chỉ',
  size: 'Lệch thông số / Sai size',
  embroidery_defect: 'Lỗi nét thêu / Lệch vị trí',
  other: 'Khuyết tật khác',
};

function DetailPanel({ item, onClose, onEdit, onDelete, canEdit }) {
  const ord = typeof item.order === 'object' ? item.order : null;
  const inspector = typeof item.inspector === 'object' ? item.inspector : null;
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—');
  const rate = item.passRate ?? (item.checkedQuantity > 0 ? Math.round((item.passedQuantity / item.checkedQuantity) * 100) : 0);

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
            <Shield size={15} className="text-erp-primary-light" />
            <h4 className="text-xs font-bold text-erp-text uppercase tracking-wider">
              Biên Bản Nghiệm Thu & Kiểm Định Chất Lượng KCS
            </h4>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                <button
                  onClick={() => onEdit(item)}
                  className="btn btn-secondary text-xs px-2.5 py-1"
                >
                  <Pencil size={13} />
                  <span>Sửa</span>
                </button>
                <button
                  onClick={() => onDelete(item)}
                  className="btn btn-secondary text-xs px-2.5 py-1 text-red-400 border-red-500/20"
                >
                  <Trash2 size={13} />
                  <span>Xóa</span>
                </button>
              </>
            )}
            <a
              href={`http://localhost:3001/admin/collections/qc-logs/${item.id}`}
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
              Mã đơn hàng
            </p>
            <p className="font-mono font-bold text-erp-primary-light text-sm">
              {ord?.orderCode || '—'}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Công đoạn kiểm tra
            </p>
            <p className="font-medium text-erp-text text-sm">{STAGES[item.stage] || item.stage}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              KCS phụ trách kiểm
            </p>
            <p className="font-medium text-erp-text">{inspector?.name || inspector?.email || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Ngày kiểm tra
            </p>
            <p className="font-medium text-erp-text">{fmtDate(item.createdAt)}</p>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Tổng số lượng kiểm
            </p>
            <p className="text-base font-extrabold text-white tabular-nums">
              {item.checkedQuantity?.toLocaleString() || 0} <span className="text-xs text-erp-text-dim">sp</span>
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Số lượng Đạt (Passed)
            </p>
            <p className="text-base font-extrabold text-emerald-400 tabular-nums">
              {item.passedQuantity?.toLocaleString() || 0} <span className="text-xs text-erp-text-dim">sp</span>
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Số lượng Lỗi (Defect)
            </p>
            <p className="text-base font-extrabold text-red-400 tabular-nums">
              {item.defectQuantity?.toLocaleString() || 0} <span className="text-xs text-erp-text-dim">sp</span>
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Tỷ lệ đạt chuẩn
            </p>
            <p
              className={`text-base font-extrabold tabular-nums ${
                rate >= 95 ? 'text-emerald-400' : rate >= 85 ? 'text-amber-400' : 'text-red-400'
              }`}
            >
              {rate}%
            </p>
          </div>

          {item.defects && item.defects.length > 0 && (
            <div className="col-span-2 sm:col-span-4 pt-2 border-t border-erp-border/40">
              <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-2">
                Phân loại khuyết tật ghi nhận:
              </p>
              <div className="flex flex-wrap gap-2">
                {item.defects.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium"
                  >
                    <span>{DEFECT_LABELS[d.defectType] || d.defectType}</span>
                    <strong className="font-mono">({d.quantity} sp)</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {item.notes && (
            <div className="col-span-2 sm:col-span-4 pt-2 border-t border-erp-border/40">
              <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
                Ghi chú khắc phục
              </p>
              <p className="text-xs text-erp-text-muted whitespace-pre-wrap">{item.notes}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function QcLogsPage() {
  const { role } = useAuth();
  const canEdit = ['admin', 'manager', 'qc', 'planner'].includes(role);
  const [logs, setLogs] = useState([]);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    order: '',
    stage: 'fabric',
    checkedQuantity: '',
    passedQuantity: '',
    defectQuantity: '0',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [res, ordRes] = await Promise.all([
        listDocs('qc-logs', { limit: 200, depth: 2, sort: '-createdAt' }),
        listDocs('orders', { limit: 200, depth: 0, sort: '-orderDate' }),
      ]);
      setLogs(res?.docs || []);
      setOrders(ordRes?.docs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = logs.filter((l) => {
    if (stageFilter && l.stage !== stageFilter) return false;
    if (search) {
      const oc = typeof l.order === 'object' ? l.order?.orderCode : '';
      if (!oc?.toLowerCase().includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({
      order: '',
      stage: 'fabric',
      checkedQuantity: '',
      passedQuantity: '',
      defectQuantity: '0',
      notes: '',
    });
    setShowModal(true);
  };

  const openEdit = (l) => {
    setEditingId(l.id);
    setForm({
      order: typeof l.order === 'object' ? l.order?.id : l.order,
      stage: l.stage || 'fabric',
      checkedQuantity: l.checkedQuantity || '',
      passedQuantity: l.passedQuantity || '',
      defectQuantity: l.defectQuantity || '0',
      notes: l.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const chk = +form.checkedQuantity;
      const pass = +form.passedQuantity;
      const def = +form.defectQuantity;
      const rate = chk > 0 ? Math.round((pass / chk) * 100) : 0;
      const data = {
        ...form,
        checkedQuantity: chk,
        passedQuantity: pass,
        defectQuantity: def,
        passRate: rate,
      };
      if (editingId) await updateDoc('qc-logs', editingId, data);
      else await createDoc('qc-logs', data);
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert('Lỗi lưu nhật ký QC: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc('qc-logs', deleteTarget.id);
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
            <span>Nhật Ký Kiểm Định Chất Lượng (QC / KCS)</span>
          </h1>
          <p className="text-xs text-erp-text-muted mt-1">
            Ghi nhận kiểm tra đầu vào, may thêu bán thành phẩm và nghiệm thu xuất xưởng
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button onClick={openCreate} className="btn btn-primary text-xs">
              <Plus size={14} />
              <span>Ghi nhận biên bản QC</span>
            </button>
          )}
        </div>
      </div>

      <div className="erp-card p-3.5 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-dim" />
          <input
            className="erp-input pl-9"
            placeholder="Tìm theo mã đơn hàng đã kiểm tra..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="erp-input w-full sm:w-56"
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
        >
          <option value="">Tất cả công đoạn kiểm tra</option>
          {Object.entries(STAGES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="erp-card p-12 text-center text-erp-text-muted text-sm flex flex-col items-center justify-center gap-3">
          <span className="w-7 h-7 border-2 border-erp-border border-t-erp-primary-light rounded-full animate-spin" />
          <span>Đang tải nhật ký QC...</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Không tìm thấy nhật ký QC"
          description="Chưa có biên bản nghiệm thu chất lượng nào phù hợp."
          actionLabel={canEdit ? 'Tạo biên bản' : undefined}
          onAction={openCreate}
        />
      ) : (
        <div className="erp-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Mã đơn hàng</th>
                  <th>Công đoạn KCS</th>
                  <th className="text-right">Số lượng kiểm</th>
                  <th className="text-right">Đạt chuẩn</th>
                  <th className="text-right">Lỗi</th>
                  <th>Tỷ lệ đạt (Pass Rate)</th>
                  <th>Người kiểm</th>
                  <th className="text-center">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => {
                  const ord = typeof l.order === 'object' ? l.order : null;
                  const inspector = typeof l.inspector === 'object' ? l.inspector : null;
                  const rate =
                    l.passRate ??
                    (l.checkedQuantity > 0 ? Math.round((l.passedQuantity / l.checkedQuantity) * 100) : 0);
                  const isExpanded = expandedId === l.id;

                  return (
                    <React.Fragment key={l.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : l.id)}
                        className={`cursor-pointer hover:bg-erp-primary/5 ${isExpanded ? 'bg-erp-primary/[0.03]' : ''}`}
                      >
                        <td className="font-mono text-erp-primary-light font-bold text-xs">
                          {ord?.orderCode || '—'}
                        </td>
                        <td className="text-xs font-medium text-white">
                          {STAGES[l.stage] || l.stage}
                        </td>
                        <td className="text-xs text-right font-mono tabular-nums text-white">
                          {l.checkedQuantity?.toLocaleString() || 0}
                        </td>
                        <td className="text-xs text-right font-mono tabular-nums text-emerald-400 font-bold">
                          {l.passedQuantity?.toLocaleString() || 0}
                        </td>
                        <td className="text-xs text-right font-mono tabular-nums text-red-400 font-bold">
                          {l.defectQuantity?.toLocaleString() || 0}
                        </td>
                        <td>
                          <div className="flex items-center gap-2 max-w-[140px]">
                            <div className="flex-1 h-1.5 rounded-full bg-erp-surface border border-erp-border overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  rate >= 95 ? 'bg-emerald-500' : rate >= 85 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(100, rate)}%` }}
                              />
                            </div>
                            <span
                              className={`text-[11px] font-bold tabular-nums ${
                                rate >= 95 ? 'text-emerald-400' : rate >= 85 ? 'text-amber-400' : 'text-red-400'
                              }`}
                            >
                              {rate}%
                            </span>
                          </div>
                        </td>
                        <td className="text-xs text-erp-text-muted">
                          {inspector?.name || inspector?.email || '—'}
                        </td>
                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : l.id)}
                            className="p-1 rounded text-erp-text-muted hover:text-white hover:bg-white/10"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                      </tr>
                      <AnimatePresence>
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className="!p-0">
                              <DetailPanel
                                item={l}
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
        title={editingId ? 'Cập Nhật Nhật Ký QC' : 'Lập Biên Bản Kiểm Tra QC Mới'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <FormField label="Mã đơn hàng kiểm định" required>
            <select
              className="erp-input"
              required
              value={form.order}
              onChange={(e) => setForm((p) => ({ ...p, order: e.target.value }))}
            >
              <option value="">-- Chọn đơn hàng --</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderCode || o.id?.slice(-6)}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Công đoạn kiểm tra" required>
            <select
              className="erp-input"
              value={form.stage}
              onChange={(e) => setForm((p) => ({ ...p, stage: e.target.value }))}
            >
              {Object.entries(STAGES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-3 gap-3">
            <FormField label="Tổng số lượng kiểm" required>
              <input
                className="erp-input"
                type="number"
                required
                value={form.checkedQuantity}
                onChange={(e) => setForm((p) => ({ ...p, checkedQuantity: e.target.value }))}
              />
            </FormField>
            <FormField label="Số lượng Đạt" required>
              <input
                className="erp-input"
                type="number"
                required
                value={form.passedQuantity}
                onChange={(e) => setForm((p) => ({ ...p, passedQuantity: e.target.value }))}
              />
            </FormField>
            <FormField label="Số lượng Lỗi">
              <input
                className="erp-input"
                type="number"
                value={form.defectQuantity}
                onChange={(e) => setForm((p) => ({ ...p, defectQuantity: e.target.value }))}
              />
            </FormField>
          </div>

          <FormField label="Ghi chú khuyết tật & biện pháp xử lý">
            <textarea
              className="erp-input"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="VD: Phát hiện 2 áo bị bẩn dầu máy, đã yêu cầu giặt tẩy xử lý lại..."
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
              {saving ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Tạo biên bản'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Xác nhận xóa biên bản QC">
        <p className="text-xs text-erp-text-muted mb-4">
          Bạn có chắc chắn muốn xóa biên bản kiểm tra chất lượng này?
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

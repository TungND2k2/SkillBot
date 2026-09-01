import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ruler, Search, Plus, Check, X as XIcon, Pencil, Trash2,
  ExternalLink, ChevronDown, ChevronUp,
  Calculator
} from 'lucide-react';
import { listDocs, createDoc, updateDoc, deleteDoc } from '../api/payload';
import useAuth from '../hooks/useAuth';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import Modal, { FormField } from '../components/Modal';

function DetailPanel({ item, onClose, onEdit, onDelete, onApprove, canEdit, canApprove }) {
  const ord = typeof item.order === 'object' ? item.order : null;
  const fab = typeof item.fabric === 'object' ? item.fabric : null;

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
            <Calculator size={15} className="text-erp-primary-light" />
            <h4 className="text-xs font-bold text-erp-text uppercase tracking-wider">
              Bảng Bóc Tách Định Mức & Hao Phí Kỹ Thuật (BOM)
            </h4>
          </div>
          <div className="flex items-center gap-2">
            {canApprove && item.status === 'pending' && (
              <>
                <button
                  onClick={() => onApprove(item.id, true)}
                  className="btn btn-success text-xs px-2.5 py-1"
                >
                  <Check size={13} />
                  <span>Duyệt BOM</span>
                </button>
                <button
                  onClick={() => onApprove(item.id, false)}
                  className="btn btn-danger text-xs px-2.5 py-1"
                >
                  <XIcon size={13} />
                  <span>Từ chối</span>
                </button>
              </>
            )}
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
              href={`http://localhost:3001/admin/collections/allowances/${item.id}`}
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
              <XIcon size={15} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Mã đơn hàng áp dụng
            </p>
            <p className="font-mono font-bold text-erp-primary-light text-sm">
              {ord?.orderCode || '—'}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Loại vải sử dụng
            </p>
            <p className="font-medium text-erp-text text-sm">
              {fab?.code} — {fab?.name || '—'}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Định mức kỹ thuật gốc
            </p>
            <p className="font-mono font-semibold text-erp-text text-sm">
              {item.technicalQty} mét/sp
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Tỷ lệ hao phí tính toán
            </p>
            <p className="font-mono font-semibold text-amber-400 text-sm">
              +{item.wastagePercent}%
            </p>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Định mức phê duyệt (Approval)
            </p>
            <p className="font-mono text-base font-extrabold text-erp-primary-light">
              {item.approvedQty?.toFixed(4) || '—'} <span className="text-xs text-erp-text-dim">m/sp</span>
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Tổng lượng vải cần cấp
            </p>
            <p className="text-base font-extrabold text-white tabular-nums">
              {item.totalNeeded?.toLocaleString() || '—'} <span className="text-xs text-erp-text-dim">mét</span>
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Trạng thái phê duyệt
            </p>
            <StatusBadge status={item.status} size="xs" />
          </div>
          {item.notes && (
            <div className="col-span-2 sm:col-span-4 pt-2 border-t border-erp-border/40">
              <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
                Ghi chú kỹ thuật
              </p>
              <p className="text-xs text-erp-text-muted whitespace-pre-wrap">{item.notes}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function AllowancesPage() {
  const { role, isManager, isAdmin } = useAuth();
  const canCreate = ['admin', 'manager', 'planner'].includes(role);
  const canApprove = isAdmin || isManager;
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ order: '', fabric: '', technicalQty: '', wastagePercent: '8', notes: '' });
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState([]);
  const [fabrics, setFabrics] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [res, ordRes, fabRes] = await Promise.all([
        listDocs('allowances', { limit: 200, depth: 1, sort: '-createdAt' }),
        listDocs('orders', { limit: 200, depth: 0, sort: '-orderDate' }),
        listDocs('fabrics', { limit: 200, depth: 0, sort: 'code' }),
      ]);
      setItems(res?.docs || []);
      setOrders(ordRes?.docs || []);
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

  const filtered = items.filter((i) => {
    if (statusFilter && i.status !== statusFilter) return false;
    if (search) {
      const oc = typeof i.order === 'object' ? i.order?.orderCode : '';
      const fn = typeof i.fabric === 'object' ? i.fabric?.name : '';
      if (!oc?.toLowerCase().includes(search.toLowerCase()) && !fn?.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
    }
    return true;
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ order: '', fabric: '', technicalQty: '', wastagePercent: '8', notes: '' });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      order: typeof item.order === 'object' ? item.order?.id : item.order,
      fabric: typeof item.fabric === 'object' ? item.fabric?.id : item.fabric,
      technicalQty: item.technicalQty || '',
      wastagePercent: item.wastagePercent || '8',
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
        technicalQty: +form.technicalQty,
        wastagePercent: +form.wastagePercent,
      };
      if (editingId) await updateDoc('allowances', editingId, data);
      else await createDoc('allowances', data);
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert('Lỗi lưu định mức: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id, isApproved) => {
    try {
      await updateDoc('allowances', id, { status: isApproved ? 'approved' : 'rejected' });
      fetchData();
    } catch (err) {
      alert('Lỗi duyệt: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc('allowances', deleteTarget.id);
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
            <span>Quản Lý Định Mức Kỹ Thuật (BOM)</span>
          </h1>
          <p className="text-xs text-erp-text-muted mt-1">
            Bóc tách định mức vải, hệ số hao phí cắt may và phê duyệt lệnh sản xuất
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canCreate && (
            <button onClick={openCreate} className="btn btn-primary text-xs">
              <Plus size={14} />
              <span>Tạo định mức BOM mới</span>
            </button>
          )}
        </div>
      </div>

      <div className="erp-card p-3.5 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-dim" />
          <input
            className="erp-input pl-9"
            placeholder="Tìm theo mã đơn hàng hoặc tên vải..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="erp-input w-full sm:w-52"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="draft">Bản nháp</option>
          <option value="pending">⏳ Chờ duyệt</option>
          <option value="approved">✅ Đã duyệt</option>
          <option value="rejected">❌ Từ chối</option>
        </select>
      </div>

      {loading ? (
        <div className="erp-card p-12 text-center text-erp-text-muted text-sm flex flex-col items-center justify-center gap-3">
          <span className="w-7 h-7 border-2 border-erp-border border-t-erp-primary-light rounded-full animate-spin" />
          <span>Đang tải bảng định mức BOM...</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Ruler}
          title="Không tìm thấy bảng định mức"
          description="Chưa có bản ghi định mức nào khớp với bộ lọc."
          actionLabel={canCreate ? 'Tạo định mức' : undefined}
          onAction={openCreate}
        />
      ) : (
        <div className="erp-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Mã đơn hàng</th>
                  <th>Chủng loại vải</th>
                  <th className="text-right">ĐM kỹ thuật</th>
                  <th className="text-right">Hao phí</th>
                  <th className="text-right">ĐM phê duyệt</th>
                  <th className="text-right">Tổng nhu cầu (m)</th>
                  <th className="text-center">Trạng thái</th>
                  <th className="text-center">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const ord = typeof item.order === 'object' ? item.order : null;
                  const fab = typeof item.fabric === 'object' ? item.fabric : null;
                  const isExpanded = expandedId === item.id;

                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className={`cursor-pointer hover:bg-erp-primary/5 ${isExpanded ? 'bg-erp-primary/[0.03]' : ''}`}
                      >
                        <td className="font-mono text-erp-primary-light font-bold text-xs">
                          {ord?.orderCode || '—'}
                        </td>
                        <td className="text-xs font-medium text-white">
                          {fab?.code} — {fab?.name || '—'}
                        </td>
                        <td className="text-xs text-right font-mono text-erp-text tabular-nums">
                          {item.technicalQty} m
                        </td>
                        <td className="text-xs text-right font-mono text-amber-400 tabular-nums">
                          +{item.wastagePercent}%
                        </td>
                        <td className="text-xs text-right font-mono font-bold text-erp-primary-light tabular-nums">
                          {item.approvedQty?.toFixed(4) || '—'} m
                        </td>
                        <td className="text-xs text-right font-bold text-white tabular-nums">
                          {item.totalNeeded?.toLocaleString() || '—'}
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
                            <td colSpan={8} className="!p-0">
                              <DetailPanel
                                item={item}
                                onClose={() => setExpandedId(null)}
                                onEdit={openEdit}
                                onDelete={setDeleteTarget}
                                onApprove={handleApprove}
                                canEdit={canCreate}
                                canApprove={canApprove}
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
        title={editingId ? 'Cập Nhật Định Mức BOM' : 'Lập Bảng Định Mức BOM Mới'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <FormField label="Mã đơn hàng áp dụng" required>
            <select
              className="erp-input"
              required
              value={form.order}
              onChange={(e) => setForm((p) => ({ ...p, order: e.target.value }))}
            >
              <option value="">-- Chọn đơn hàng --</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderCode || o.id?.slice(-6)} ({o.country})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Chủng loại vải" required>
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
            <FormField label="Định mức kỹ thuật (m/sp)" required>
              <input
                className="erp-input"
                type="number"
                step="0.0001"
                required
                value={form.technicalQty}
                onChange={(e) => setForm((p) => ({ ...p, technicalQty: e.target.value }))}
                placeholder="VD: 1.45"
              />
            </FormField>
            <FormField label="Tỷ lệ hao phí (%)" required>
              <input
                className="erp-input"
                type="number"
                step="0.1"
                required
                value={form.wastagePercent}
                onChange={(e) => setForm((p) => ({ ...p, wastagePercent: e.target.value }))}
                placeholder="VD: 8"
              />
            </FormField>
          </div>

          <FormField label="Ghi chú kỹ thuật & sơ đồ giác mẫu">
            <textarea
              className="erp-input"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="VD: Định mức tính cho size M-XL khổ vải 150cm..."
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
              {saving ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Tạo bản ghi'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Xác nhận xóa định mức BOM">
        <p className="text-xs text-erp-text-muted mb-4">
          Bạn có chắc chắn muốn xóa bản ghi định mức BOM này?
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

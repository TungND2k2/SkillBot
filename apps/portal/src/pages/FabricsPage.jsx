import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scissors, Search, Plus, Pencil, Trash2, X,
  ExternalLink, ChevronDown, ChevronUp, Layers, Tag
} from 'lucide-react';
import { listDocs, createDoc, updateDoc, deleteDoc } from '../api/payload';
import useAuth from '../hooks/useAuth';
import EmptyState from '../components/EmptyState';
import Modal, { FormField } from '../components/Modal';

const MATERIAL_LABELS = {
  cotton: 'Cotton 100%',
  linen: 'Linen tự nhiên',
  'linen-blend': 'Linen pha (Blend)',
  taffeta: 'Taffeta cao cấp',
  polyester: 'Polyester tổng hợp',
  other: 'Chất liệu khác',
};

const EMPTY_FORM = {
  code: '',
  name: '',
  color: '',
  material: 'cotton',
  widthCm: '',
  pricePerMeter: '',
  notes: '',
};

function DetailPanel({ item, onClose, onEdit, onDelete, canEdit }) {
  const supplier = typeof item.preferredSupplier === 'object' ? item.preferredSupplier : null;

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
            <Tag size={15} className="text-erp-primary-light" />
            <h4 className="text-xs font-bold text-erp-text uppercase tracking-wider">
              Hồ Sơ Quy Cách Kỹ Thuật Mã Vải
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
              href={`http://localhost:3001/admin/collections/fabrics/${item.id}`}
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
              Mã định danh vải
            </p>
            <p className="font-mono font-bold text-erp-primary-light text-sm">{item.code}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Tên thương mại
            </p>
            <p className="font-medium text-erp-text text-sm">{item.name}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Tone màu / Mã màu
            </p>
            <p className="font-medium text-erp-text">{item.color || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Chất liệu cấu thành
            </p>
            <p className="font-medium text-erp-text">{MATERIAL_LABELS[item.material] || '—'}</p>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Khổ rộng vải
            </p>
            <p className="font-medium text-white">{item.widthCm ? `${item.widthCm} cm` : '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Đơn giá tham chiếu
            </p>
            <p className="font-mono font-bold text-emerald-400">
              {item.pricePerMeter ? `${item.pricePerMeter.toLocaleString()} đ/m` : '—'}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Nhà cung cấp ưu tiên
            </p>
            <p className="font-medium text-erp-text">{supplier?.name || 'Chưa gán NCC ưu tiên'}</p>
          </div>

          {item.notes && (
            <div className="col-span-2 sm:col-span-4 pt-2 border-t border-erp-border/40">
              <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
                Ghi chú kỹ thuật & tính chất co giãn
              </p>
              <p className="text-xs text-erp-text-muted whitespace-pre-wrap">{item.notes}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function FabricsPage() {
  const { role } = useAuth();
  const canEdit = ['admin', 'manager', 'planner'].includes(role);
  const [fabrics, setFabrics] = useState([]);
  const [search, setSearch] = useState('');
  const [matFilter, setMatFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await listDocs('fabrics', { limit: 200, depth: 1, sort: 'code' });
      setFabrics(res?.docs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = fabrics.filter((f) => {
    if (matFilter && f.material !== matFilter) return false;
    if (
      search &&
      !f.code?.toLowerCase().includes(search.toLowerCase()) &&
      !f.name?.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  };

  const openEdit = (f) => {
    setEditingId(f.id);
    setForm({
      code: f.code || '',
      name: f.name || '',
      color: f.color || '',
      material: f.material || 'cotton',
      widthCm: f.widthCm || '',
      pricePerMeter: f.pricePerMeter || '',
      notes: f.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...form,
        widthCm: +form.widthCm || undefined,
        pricePerMeter: +form.pricePerMeter || undefined,
      };
      if (editingId) await updateDoc('fabrics', editingId, data);
      else await createDoc('fabrics', data);
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert('Lỗi lưu mã vải: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc('fabrics', deleteTarget.id);
      setDeleteTarget(null);
      setExpandedId(null);
      fetchData();
    } catch (err) {
      alert('Lỗi xóa: ' + err.message);
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-5">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-erp-border">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Danh Mục Mã Vải Sản Xuất</span>
          </h1>
          <p className="text-xs text-erp-text-muted mt-1">
            Tổng hợp quy cách chất liệu, khổ vải, bảng giá và nhà cung ứng
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button onClick={openCreate} className="btn btn-primary text-xs">
              <Plus size={14} />
              <span>Thêm mã vải mới</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="erp-card p-3.5 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-dim" />
          <input
            className="erp-input pl-9"
            placeholder="Tìm theo mã định danh hoặc tên thương mại vải..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="erp-input w-full sm:w-52"
          value={matFilter}
          onChange={(e) => setMatFilter(e.target.value)}
        >
          <option value="">Tất cả chất liệu</option>
          {Object.entries(MATERIAL_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="erp-card p-12 text-center text-erp-text-muted text-sm flex flex-col items-center justify-center gap-3">
          <span className="w-7 h-7 border-2 border-erp-border border-t-erp-primary-light rounded-full animate-spin" />
          <span>Đang tải danh mục vải...</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Scissors}
          title="Không tìm thấy mã vải"
          description="Chưa có dữ liệu mã vải nào khớp với điều kiện lọc."
          actionLabel={canEdit ? 'Thêm mã vải' : undefined}
          onAction={openCreate}
        />
      ) : (
        <div className="erp-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Mã vải</th>
                  <th>Tên vải</th>
                  <th>Màu sắc</th>
                  <th>Chất liệu</th>
                  <th className="text-right">Khổ (cm)</th>
                  <th className="text-right">Giá tham chiếu</th>
                  <th>Nhà cung cấp</th>
                  <th className="text-center">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => {
                  const isExpanded = expandedId === f.id;
                  return (
                    <React.Fragment key={f.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : f.id)}
                        className={`cursor-pointer hover:bg-erp-primary/5 ${isExpanded ? 'bg-erp-primary/[0.03]' : ''}`}
                      >
                        <td className="font-mono text-erp-primary-light font-bold text-xs">
                          {f.code}
                        </td>
                        <td className="text-xs font-medium text-white">{f.name}</td>
                        <td className="text-xs text-erp-text-muted">{f.color || '—'}</td>
                        <td className="text-xs text-erp-text-muted">
                          {MATERIAL_LABELS[f.material] || f.material || '—'}
                        </td>
                        <td className="text-xs text-right tabular-nums text-erp-text">
                          {f.widthCm ? `${f.widthCm} cm` : '—'}
                        </td>
                        <td className="text-xs text-right font-mono font-semibold text-emerald-400 tabular-nums">
                          {f.pricePerMeter ? `${f.pricePerMeter.toLocaleString()} đ` : '—'}
                        </td>
                        <td className="text-xs text-erp-text-muted">
                          {typeof f.preferredSupplier === 'object' ? f.preferredSupplier?.name : '—'}
                        </td>
                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : f.id)}
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
                                item={f}
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

      {/* Create / Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Cập Nhật Mã Vải' : 'Thêm Mã Vải Sản Xuất Mới'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Mã định danh vải" required>
              <input
                className="erp-input font-mono uppercase"
                required
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                placeholder="VD: VL-CTN-01"
              />
            </FormField>
            <FormField label="Tên thương mại vải" required>
              <input
                className="erp-input"
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="VD: Cotton Compact 2C"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Màu sắc / Mã màu" required>
              <input
                className="erp-input"
                required
                value={form.color}
                onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
                placeholder="VD: Trắng tiêu chuẩn / #01"
              />
            </FormField>
            <FormField label="Chất liệu cấu thành" required>
              <select
                className="erp-input"
                value={form.material}
                onChange={(e) => setForm((p) => ({ ...p, material: e.target.value }))}
              >
                {Object.entries(MATERIAL_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Khổ vải (cm)">
              <input
                className="erp-input"
                type="number"
                value={form.widthCm}
                onChange={(e) => setForm((p) => ({ ...p, widthCm: e.target.value }))}
                placeholder="VD: 160"
              />
            </FormField>
            <FormField label="Giá tham chiếu (đ/m)">
              <input
                className="erp-input"
                type="number"
                value={form.pricePerMeter}
                onChange={(e) => setForm((p) => ({ ...p, pricePerMeter: e.target.value }))}
                placeholder="VD: 45000"
              />
            </FormField>
          </div>

          <FormField label="Ghi chú kỹ thuật">
            <textarea
              className="erp-input"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="VD: Độ co giãn 4%, phù hợp in chuyển nhiệt..."
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
              {saving ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Tạo mã vải'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Xác nhận xóa mã vải">
        <p className="text-xs text-erp-text-muted mb-4">
          Bạn có chắc muốn xóa mã vải{' '}
          <strong className="text-white font-mono">{deleteTarget?.code}</strong>? Hành động này không thể hoàn tác.
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


import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Search, Plus, Pencil, Trash2, X,
  ExternalLink, ChevronDown, ChevronUp, Star, Phone,
  Mail, MapPin, Tag, ShieldCheck
} from 'lucide-react';
import { listDocs, createDoc, updateDoc, deleteDoc } from '../api/payload';
import useAuth from '../hooks/useAuth';
import EmptyState from '../components/EmptyState';
import Modal, { FormField } from '../components/Modal';

const CATEGORY_LABELS = {
  fabric: '🧵 Cung ứng vải dệt / nhuộm',
  embroidery: '🎨 Xưởng thêu vi tính',
  sewing: '✂️ Xưởng may gia công',
  accessory: '🔘 Phụ liệu may mặc',
  printing: '🖨 Xưởng in hoa văn / Decal',
  logistics: '🚚 Đơn vị vận tải / Logistics',
  other: 'Khác',
};

const EMPTY_FORM = {
  name: '',
  code: '',
  category: 'fabric',
  rating: 5,
  phone: '',
  email: '',
  address: '',
  notes: '',
};

function DetailPanel({ item, onClose, onEdit, onDelete, canEdit }) {
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
            <ShieldCheck size={15} className="text-erp-primary-light" />
            <h4 className="text-xs font-bold text-erp-text uppercase tracking-wider">
              Hồ Sơ Năng Lực & Đánh Giá Nhà Cung Ứng
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
              href={`http://localhost:3001/admin/collections/suppliers/${item.id}`}
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
              Mã nhà cung cấp
            </p>
            <p className="font-mono font-bold text-erp-primary-light text-sm">{item.code || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Tên doanh nghiệp / Xưởng
            </p>
            <p className="font-bold text-white text-sm">{item.name}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Lĩnh vực gia công / Cung ứng
            </p>
            <p className="font-medium text-erp-text">{CATEGORY_LABELS[item.category] || item.category}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Đánh giá chất lượng
            </p>
            <div className="flex items-center gap-1 text-amber-400 font-bold">
              <Star size={14} className="fill-amber-400" />
              <span>{item.rating || 5} / 5 sao</span>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Số điện thoại liên hệ
            </p>
            <p className="font-mono font-medium text-erp-text">{item.phone || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Email giao dịch
            </p>
            <p className="font-medium text-erp-text">{item.email || '—'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Địa chỉ nhà xưởng / Kho bãi
            </p>
            <p className="font-medium text-erp-text">{item.address || '—'}</p>
          </div>

          {item.notes && (
            <div className="col-span-2 sm:col-span-4 pt-2 border-t border-erp-border/40">
              <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
                Ghi chú điều khoản thanh toán & công suất
              </p>
              <p className="text-xs text-erp-text-muted whitespace-pre-wrap">{item.notes}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function SuppliersPage() {
  const { role } = useAuth();
  const canEdit = ['admin', 'manager', 'planner'].includes(role);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
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
      const res = await listDocs('suppliers', { limit: 200, depth: 0, sort: 'name' });
      setSuppliers(res?.docs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = suppliers.filter((s) => {
    if (catFilter && s.category !== catFilter) return false;
    if (search) {
      const n = s.name || '';
      const c = s.code || '';
      const p = s.phone || '';
      if (
        !n.toLowerCase().includes(search.toLowerCase()) &&
        !c.toLowerCase().includes(search.toLowerCase()) &&
        !p.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
    }
    return true;
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  };

  const openEdit = (s) => {
    setEditingId(s.id);
    setForm({
      name: s.name || '',
      code: s.code || '',
      category: s.category || 'fabric',
      rating: s.rating ?? 5,
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || '',
      notes: s.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { ...form, rating: +form.rating };
      if (editingId) await updateDoc('suppliers', editingId, data);
      else await createDoc('suppliers', data);
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert('Lỗi lưu nhà cung cấp: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc('suppliers', deleteTarget.id);
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
            <span>Danh Bạ Nhà Cung Cấp & Xưởng Phụ Trợ</span>
          </h1>
          <p className="text-xs text-erp-text-muted mt-1">
            Tổng hợp đối tác cung ứng vải, phụ liệu, in thêu vi tính và may gia công
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button onClick={openCreate} className="btn btn-primary text-xs">
              <Plus size={14} />
              <span>Thêm nhà cung cấp</span>
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
            placeholder="Tìm theo mã NCC, tên doanh nghiệp hoặc số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="erp-input w-full sm:w-64"
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
        >
          <option value="">Tất cả phân loại cung ứng</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
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
          <span>Đang tải danh bạ nhà cung cấp...</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Không tìm thấy nhà cung cấp"
          description="Chưa có nhà cung cấp nào phù hợp với điều kiện tìm kiếm."
          actionLabel={canEdit ? 'Thêm nhà cung cấp' : undefined}
          onAction={openCreate}
        />
      ) : (
        <div className="erp-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Mã NCC</th>
                  <th>Tên nhà cung cấp / Xưởng</th>
                  <th>Phân loại</th>
                  <th>Đánh giá</th>
                  <th>Số điện thoại</th>
                  <th>Địa chỉ xưởng</th>
                  <th className="text-center">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const isExpanded = expandedId === s.id;
                  return (
                    <React.Fragment key={s.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : s.id)}
                        className={`cursor-pointer hover:bg-erp-primary/5 ${isExpanded ? 'bg-erp-primary/[0.03]' : ''}`}
                      >
                        <td className="font-mono text-erp-primary-light font-bold text-xs">
                          {s.code || '—'}
                        </td>
                        <td className="text-xs font-bold text-white">{s.name}</td>
                        <td className="text-xs text-erp-text">
                          {CATEGORY_LABELS[s.category] || s.category}
                        </td>
                        <td>
                          <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                            <Star size={13} className="fill-amber-400" />
                            <span>{s.rating || 5}</span>
                          </div>
                        </td>
                        <td className="font-mono text-xs text-erp-text tabular-nums">{s.phone || '—'}</td>
                        <td className="text-xs text-erp-text-muted max-w-xs truncate">{s.address || '—'}</td>
                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : s.id)}
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
                                item={s}
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

      {/* Modal create / edit */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Cập Nhật Nhà Cung Cấp' : 'Thêm Nhà Cung Cấp Mới'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Mã nhà cung cấp" required>
              <input
                className="erp-input font-mono uppercase"
                required
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                placeholder="VD: NCC-VAI-01"
              />
            </FormField>
            <FormField label="Tên doanh nghiệp / Xưởng" required>
              <input
                className="erp-input"
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="VD: Xưởng Dệt Nhuộm Nam Định"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Lĩnh vực phân loại" required>
              <select
                className="erp-input"
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Đánh giá chất lượng (Sao)">
              <select
                className="erp-input"
                value={form.rating}
                onChange={(e) => setForm((p) => ({ ...p, rating: +e.target.value }))}
              >
                <option value={5}>⭐⭐⭐⭐⭐ (5 sao - Xuất sắc)</option>
                <option value={4}>⭐⭐⭐⭐ (4 sao - Tốt)</option>
                <option value={3}>⭐⭐⭐ (3 sao - Trung bình)</option>
                <option value={2}>⭐⭐ (2 sao - Cần kiểm tra)</option>
                <option value={1}>⭐ (1 sao - Kém)</option>
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Số điện thoại liên hệ">
              <input
                className="erp-input font-mono"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="VD: +84 24 3888 9999"
              />
            </FormField>
            <FormField label="Email giao dịch">
              <input
                className="erp-input"
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="VD: sales@namdinhtextile.vn"
              />
            </FormField>
          </div>

          <FormField label="Địa chỉ nhà xưởng">
            <input
              className="erp-input"
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              placeholder="VD: KCN Hòa Xá, TP. Nam Định"
            />
          </FormField>

          <FormField label="Ghi chú năng lực & điều khoản">
            <textarea
              className="erp-input"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="VD: Công nợ 30 ngày, sản lượng tối đa 20.000m/tháng..."
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
              {saving ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Xác nhận xóa nhà cung cấp">
        <p className="text-xs text-erp-text-muted mb-4">
          Bạn có chắc chắn muốn xóa nhà cung cấp <strong className="text-white">{deleteTarget?.name}</strong>?
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

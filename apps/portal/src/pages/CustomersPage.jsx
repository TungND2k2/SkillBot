import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, Plus, Pencil, Trash2, X,
  ExternalLink, ChevronDown, ChevronUp, UserCheck
} from 'lucide-react';
import { listDocs, createDoc, updateDoc, deleteDoc } from '../api/payload';
import useAuth from '../hooks/useAuth';
import EmptyState from '../components/EmptyState';
import Modal, { FormField } from '../components/Modal';

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  social: '',
  country: 'Việt Nam',
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
            <UserCheck size={15} className="text-erp-primary-light" />
            <h4 className="text-xs font-bold text-erp-text uppercase tracking-wider">
              Hồ Sơ Chi Tiết Khách Hàng & Đối Tác
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
              href={`http://localhost:3001/admin/collections/customers/${item.id}`}
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
              Tên khách hàng / Doanh nghiệp
            </p>
            <p className="font-bold text-white text-sm">{item.name}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Số điện thoại
            </p>
            <p className="font-mono font-medium text-erp-text text-sm">{item.phone || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Email liên hệ
            </p>
            <p className="font-medium text-erp-text">{item.email || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Kênh MXH / Chat
            </p>
            <p className="font-medium text-erp-primary-light">{item.social || '—'}</p>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Quốc gia / Thị trường
            </p>
            <p className="font-medium text-erp-text">{item.country || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Mã khách hàng
            </p>
            <p className="font-mono text-erp-text-muted">KH-{item.id?.slice(-6).toUpperCase()}</p>
          </div>
          <div className="col-span-2">
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Ghi chú thói quen đặt hàng
            </p>
            <p className="text-xs text-erp-text-muted whitespace-pre-wrap">{item.notes || '—'}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function CustomersPage() {
  const { role } = useAuth();
  const canEdit = ['admin', 'manager', 'sales'].includes(role);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
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
      const res = await listDocs('customers', { limit: 200, depth: 0, sort: 'name' });
      setCustomers(res?.docs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = customers.filter((c) => {
    if (search) {
      const n = c.name || '';
      const p = c.phone || '';
      const e = c.email || '';
      if (
        !n.toLowerCase().includes(search.toLowerCase()) &&
        !p.toLowerCase().includes(search.toLowerCase()) &&
        !e.toLowerCase().includes(search.toLowerCase())
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

  const openEdit = (c) => {
    setEditingId(c.id);
    setForm({
      name: c.name || '',
      phone: c.phone || '',
      email: c.email || '',
      social: c.social || '',
      country: c.country || 'Việt Nam',
      notes: c.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) await updateDoc('customers', editingId, form);
      else await createDoc('customers', form);
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert('Lỗi lưu khách hàng: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc('customers', deleteTarget.id);
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
            <span>Danh Bạ Khách Hàng (CRM)</span>
          </h1>
          <p className="text-xs text-erp-text-muted mt-1">
            Quản lý thông tin đầu mối, lịch sử liên hệ và quốc gia của khách hàng
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button onClick={openCreate} className="btn btn-primary text-xs">
              <Plus size={14} />
              <span>Thêm khách hàng</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="erp-card p-3.5 flex items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-dim" />
          <input
            className="erp-input pl-9"
            placeholder="Tìm theo tên khách hàng, số điện thoại hoặc email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="erp-card p-12 text-center text-erp-text-muted text-sm flex flex-col items-center justify-center gap-3">
          <span className="w-7 h-7 border-2 border-erp-border border-t-erp-primary-light rounded-full animate-spin" />
          <span>Đang tải danh bạ khách hàng...</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Không tìm thấy khách hàng"
          description="Chưa có khách hàng nào phù hợp với từ khóa tìm kiếm."
          actionLabel={canEdit ? 'Thêm khách hàng' : undefined}
          onAction={openCreate}
        />
      ) : (
        <div className="erp-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Tên khách hàng</th>
                  <th>Số điện thoại</th>
                  <th>Email</th>
                  <th>MXH / Kênh chat</th>
                  <th>Quốc gia</th>
                  <th className="text-center">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const isExpanded = expandedId === c.id;
                  return (
                    <React.Fragment key={c.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : c.id)}
                        className={`cursor-pointer hover:bg-erp-primary/5 ${isExpanded ? 'bg-erp-primary/[0.03]' : ''}`}
                      >
                        <td className="text-xs font-bold text-white">{c.name}</td>
                        <td className="font-mono text-xs text-erp-text tabular-nums">{c.phone || '—'}</td>
                        <td className="text-xs text-erp-text-muted">{c.email || '—'}</td>
                        <td className="text-xs text-erp-primary-light">{c.social || '—'}</td>
                        <td className="text-xs text-erp-text-muted">{c.country || '—'}</td>
                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : c.id)}
                            className="p-1 rounded text-erp-text-muted hover:text-white hover:bg-white/10"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                      </tr>
                      <AnimatePresence>
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="!p-0">
                              <DetailPanel
                                item={c}
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
        title={editingId ? 'Cập Nhật Hồ Sơ Khách Hàng' : 'Thêm Khách Hàng Mới'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <FormField label="Tên khách hàng / Thương hiệu" required>
            <input
              className="erp-input"
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="VD: Acme Apparel Ltd."
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Số điện thoại">
              <input
                className="erp-input font-mono"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="VD: +84 987 654 321"
              />
            </FormField>
            <FormField label="Email">
              <input
                className="erp-input"
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="VD: contact@acme.com"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Kênh MXH / Telegram / WhatsApp">
              <input
                className="erp-input"
                value={form.social}
                onChange={(e) => setForm((p) => ({ ...p, social: e.target.value }))}
                placeholder="VD: @acme_buyer"
              />
            </FormField>
            <FormField label="Quốc gia / Thị trường">
              <input
                className="erp-input"
                value={form.country}
                onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                placeholder="VD: Hoa Kỳ / EU / Việt Nam"
              />
            </FormField>
          </div>

          <FormField label="Ghi chú đối tác">
            <textarea
              className="erp-input"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="VD: Khách hàng thân thiết, thường đặt lô 1000 - 5000 áo thun..."
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
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Xác nhận xóa khách hàng">
        <p className="text-xs text-erp-text-muted mb-4">
          Bạn có chắc muốn xóa khách hàng <strong className="text-white">{deleteTarget?.name}</strong>? Hành động này không thể hoàn tác.
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

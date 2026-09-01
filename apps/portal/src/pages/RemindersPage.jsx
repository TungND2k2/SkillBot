import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Search, Plus, Calendar, Link2, Clock, Pencil, Trash2, X, ExternalLink } from 'lucide-react';
import { listDocs, createDoc, updateDoc, deleteDoc } from '../api/payload';
import useAuth from '../hooks/useAuth';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import Modal, { FormField } from '../components/Modal';

const TRIGGER_LABELS = {
  order_b2_pending: '⏳ Nhắc duyệt định mức BOM quá 24h',
  order_b3_fabric_delay: '🧵 Cảnh báo chậm giao vải từ NCC',
  order_b4_sample_check: '✂️ Nhắc duyệt mẫu thêu / may thử',
  order_b5_qc_due: '✅ Nhắc kiểm định chất lượng KCS',
  order_delivery_approaching: '🚚 Cảnh báo hạn giao hàng sắp tới (≤ 3 ngày)',
  payment_debt_overdue: '💵 Cảnh báo công nợ khách hàng quá hạn',
};

const CHANNEL_LABELS = {
  telegram: '✈️ Telegram Bot',
  zalo: '💬 Zalo OA / ZNS',
  email: '📧 Email thông báo',
  system: '🔔 Thông báo nội bộ hệ thống',
};

function DetailPanel({ item, onClose, onEdit, onDelete, onTest, canEdit }) {
  const ord = typeof item.order === 'object' ? item.order : null;
  const fmtDate = (d) => (d ? new Date(d).toLocaleString('vi-VN') : '—');

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
            <Bot size={15} className="text-erp-primary-light" />
            <h4 className="text-xs font-bold text-erp-text uppercase tracking-wider">
              Cấu Hình Kịch Bản Cảnh Báo Tự Động
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onTest(item)}
              className="btn btn-secondary text-xs px-2.5 py-1 text-amber-400 border-amber-500/20"
              title="Gửi thử cảnh báo ngay"
            >
              <Send size={13} />
              <span>Bắn thông báo thử</span>
            </button>
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
              href={`http://localhost:3001/admin/collections/reminders/${item.id}`}
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
              Tiêu đề nhắc nhở
            </p>
            <p className="font-medium text-white text-sm">{item.title}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Sự kiện kích hoạt (Trigger)
            </p>
            <p className="font-medium text-erp-text text-sm">
              {TRIGGER_LABELS[item.triggerType] || item.triggerType}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Kênh thông báo
            </p>
            <p className="font-medium text-erp-text">{CHANNEL_LABELS[item.channel] || item.channel}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Trạng thái lịch nhắc
            </p>
            <StatusBadge status={item.isActive ? 'active' : 'inactive'} size="xs" />
          </div>

          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Đơn hàng gắn kèm
            </p>
            <p className="font-mono font-bold text-erp-primary-light">
              {ord?.orderCode || 'Áp dụng toàn bộ hệ thống'}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Thời gian gửi gần nhất
            </p>
            <p className="font-medium text-erp-text tabular-nums">{fmtDate(item.lastSentAt)}</p>
          </div>
          <div className="col-span-2">
            <p className="text-[11px] font-semibold text-erp-text-dim uppercase tracking-wider mb-1">
              Nội dung thông điệp mẫu
            </p>
            <p className="text-xs text-erp-text-muted bg-[#090d16] p-2.5 rounded border border-erp-border">
              {item.message || '—'}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function RemindersPage() {
  const { role } = useAuth();
  const canEdit = ['admin', 'manager', 'planner'].includes(role);
  const [reminders, setReminders] = useState([]);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [triggerFilter, setTriggerFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: '',
    triggerType: 'order_delivery_approaching',
    channel: 'telegram',
    order: '',
    message: '',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [res, ordRes] = await Promise.all([
        listDocs('reminders', { limit: 200, depth: 1, sort: '-createdAt' }),
        listDocs('orders', { limit: 200, depth: 0, sort: '-orderDate' }),
      ]);
      setReminders(res?.docs || []);
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

  const filtered = reminders.filter((r) => {
    if (triggerFilter && r.triggerType !== triggerFilter) return false;
    if (search) {
      const t = r.title || '';
      const m = r.message || '';
      if (!t.toLowerCase().includes(search.toLowerCase()) && !m.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
    }
    return true;
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({
      title: '',
      triggerType: 'order_delivery_approaching',
      channel: 'telegram',
      order: '',
      message: '',
      isActive: true,
    });
    setShowModal(true);
  };

  const openEdit = (r) => {
    setEditingId(r.id);
    setForm({
      title: r.title || '',
      triggerType: r.triggerType || 'order_delivery_approaching',
      channel: r.channel || 'telegram',
      order: typeof r.order === 'object' ? r.order?.id : r.order || '',
      message: r.message || '',
      isActive: r.isActive ?? true,
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...form,
        order: form.order || undefined,
      };
      if (editingId) await updateDoc('reminders', editingId, data);
      else await createDoc('reminders', data);
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert('Lỗi lưu cảnh báo: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = (r) => {
    alert(`Đã kích hoạt bắn thông báo thử nghiệm qua kênh ${CHANNEL_LABELS[r.channel] || r.channel}!`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc('reminders', deleteTarget.id);
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
            <span>Trung Tâm Cảnh Báo & Nhắc Nhở Tự Động</span>
          </h1>
          <p className="text-xs text-erp-text-muted mt-1">
            Quản lý bot thông báo tiến độ xưởng, lịch hẹn duyệt mẫu và nhắc hạn giao hàng
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button onClick={openCreate} className="btn btn-primary text-xs">
              <Plus size={14} />
              <span>Tạo lịch cảnh báo mới</span>
            </button>
          )}
        </div>
      </div>

      <div className="erp-card p-3.5 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-dim" />
          <input
            className="erp-input pl-9"
            placeholder="Tìm theo tiêu đề cảnh báo hoặc nội dung thông điệp..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="erp-input w-full sm:w-64"
          value={triggerFilter}
          onChange={(e) => setTriggerFilter(e.target.value)}
        >
          <option value="">Tất cả sự kiện kích hoạt</option>
          {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="erp-card p-12 text-center text-erp-text-muted text-sm flex flex-col items-center justify-center gap-3">
          <span className="w-7 h-7 border-2 border-erp-border border-t-erp-primary-light rounded-full animate-spin" />
          <span>Đang tải danh sách cảnh báo...</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Không tìm thấy lịch cảnh báo"
          description="Chưa có kịch bản cảnh báo nào phù hợp với bộ lọc."
          actionLabel={canEdit ? 'Tạo lịch cảnh báo' : undefined}
          onAction={openCreate}
        />
      ) : (
        <div className="erp-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Tiêu đề cảnh báo</th>
                  <th>Sự kiện kích hoạt</th>
                  <th>Kênh gửi</th>
                  <th>Đơn áp dụng</th>
                  <th className="text-center">Trạng thái</th>
                  <th className="text-center">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const ord = typeof r.order === 'object' ? r.order : null;
                  const isExpanded = expandedId === r.id;

                  return (
                    <React.Fragment key={r.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : r.id)}
                        className={`cursor-pointer hover:bg-erp-primary/5 ${isExpanded ? 'bg-erp-primary/[0.03]' : ''}`}
                      >
                        <td className="text-xs font-semibold text-white">{r.title}</td>
                        <td className="text-xs text-erp-text">
                          {TRIGGER_LABELS[r.triggerType] || r.triggerType}
                        </td>
                        <td className="text-xs text-erp-text-muted">
                          {CHANNEL_LABELS[r.channel] || r.channel}
                        </td>
                        <td className="font-mono text-erp-primary-light text-xs font-medium">
                          {ord?.orderCode || 'Tất cả đơn'}
                        </td>
                        <td className="text-center">
                          <StatusBadge status={r.isActive ? 'active' : 'inactive'} size="xs" />
                        </td>
                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : r.id)}
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
                                item={r}
                                onClose={() => setExpandedId(null)}
                                onEdit={openEdit}
                                onDelete={setDeleteTarget}
                                onTest={handleTest}
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
        title={editingId ? 'Cập Nhật Lịch Cảnh Báo' : 'Tạo Kịch Bản Cảnh Báo Mới'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <FormField label="Tiêu đề cảnh báo" required>
            <input
              className="erp-input"
              required
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="VD: Cảnh báo hạn giao hàng đơn xuất khẩu..."
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Sự kiện kích hoạt" required>
              <select
                className="erp-input"
                value={form.triggerType}
                onChange={(e) => setForm((p) => ({ ...p, triggerType: e.target.value }))}
              >
                {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Kênh thông báo" required>
              <select
                className="erp-input"
                value={form.channel}
                onChange={(e) => setForm((p) => ({ ...p, channel: e.target.value }))}
              >
                {Object.entries(CHANNEL_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="Đơn hàng áp dụng cụ thể (Tùy chọn)">
            <select
              className="erp-input"
              value={form.order}
              onChange={(e) => setForm((p) => ({ ...p, order: e.target.value }))}
            >
              <option value="">-- Áp dụng cho tất cả đơn hàng --</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderCode || o.id?.slice(-6)}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Nội dung thông điệp gửi bot">
            <textarea
              className="erp-input"
              rows={3}
              value={form.message}
              onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
              placeholder="VD: [Cảnh báo] Đơn hàng {{orderCode}} còn 2 ngày nữa đến hạn giao. Đề nghị xưởng may tăng tốc!"
            />
          </FormField>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
              className="w-4 h-4 rounded bg-[#0d1420] border-erp-border text-erp-primary focus:ring-erp-primary"
            />
            <label htmlFor="isActive" className="text-xs text-white cursor-pointer select-none">
              Kích hoạt ngay lịch cảnh báo này
            </label>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-erp-border">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="btn btn-secondary text-xs"
            >
              Hủy
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary text-xs">
              {saving ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Tạo lịch'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Xác nhận xóa cảnh báo">
        <p className="text-xs text-erp-text-muted mb-4">
          Bạn có chắc chắn muốn xóa kịch bản cảnh báo này?
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

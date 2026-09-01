import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare, Search, Save, CheckCircle, Clock,
  Calendar, Check, AlertCircle, Sparkles, UserCheck
} from 'lucide-react';
import { listDocs, updateDoc } from '../api/payload';
import useAuth from '../hooks/useAuth';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—');

export default function FeedbackPage() {
  const { role } = useAuth();
  const canEdit = ['admin', 'manager', 'sales', 'planner'].includes(role);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [feedbackFilter, setFeedbackFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [savedId, setSavedId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await listDocs('orders', {
        limit: 200,
        depth: 1,
        sort: '-orderDate',
      });
      setOrders(res?.docs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = orders.filter((o) => {
    if (feedbackFilter === 'has_feedback' && !o.customerFeedback) return false;
    if (feedbackFilter === 'no_feedback' && o.customerFeedback) return false;
    if (feedbackFilter === 'delivered' && !o.actualDeliveryDate) return false;
    if (search) {
      const oc = o.orderCode || '';
      const cName = typeof o.customer === 'object' ? o.customer?.name || '' : '';
      if (!oc.toLowerCase().includes(search.toLowerCase()) && !cName.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
    }
    return true;
  });

  const startEdit = (o) => {
    if (!canEdit) return;
    setEditingId(o.id);
    setEditForm({
      actualDeliveryDate: o.actualDeliveryDate ? o.actualDeliveryDate.slice(0, 10) : '',
      customerFeedback: o.customerFeedback || '',
    });
  };

  const handleSave = async (id) => {
    setSavingId(id);
    try {
      await updateDoc('orders', id, {
        actualDeliveryDate: editForm.actualDeliveryDate || null,
        customerFeedback: editForm.customerFeedback,
      });
      setSavedId(id);
      setEditingId(null);
      setTimeout(() => setSavedId(null), 2500);
      fetchData();
    } catch (err) {
      alert('Lỗi cập nhật: ' + err.message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-5">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-erp-border">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Theo Dõi Giao Hàng & Ý Kiến Khách Hàng (Feedback)</span>
          </h1>
          <p className="text-xs text-erp-text-muted mt-1">
            Ghi nhận ngày giao hàng thực tế, đánh giá chất lượng sản phẩm và phản hồi sau bàn giao
          </p>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="erp-card p-3.5 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-dim" />
          <input
            className="erp-input pl-9"
            placeholder="Tìm theo mã đơn hoặc tên khách hàng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="erp-input w-full sm:w-60"
          value={feedbackFilter}
          onChange={(e) => setFeedbackFilter(e.target.value)}
        >
          <option value="">Tất cả đơn hàng</option>
          <option value="has_feedback">✨ Đã có phản hồi</option>
          <option value="no_feedback">⏳ Chưa có phản hồi</option>
          <option value="delivered">🚚 Đã hoàn tất giao hàng</option>
        </select>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="erp-card p-12 text-center text-erp-text-muted text-sm flex flex-col items-center justify-center gap-3">
          <span className="w-7 h-7 border-2 border-erp-border border-t-erp-primary-light rounded-full animate-spin" />
          <span>Đang tải dữ liệu phản hồi...</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Không tìm thấy đơn hàng"
          description="Chưa có bản ghi nào khớp với điều kiện lọc phản hồi."
        />
      ) : (
        <div className="erp-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Mã DA</th>
                  <th>Mã Sales</th>
                  <th>Ngày đặt</th>
                  <th>Hạn giao</th>
                  <th>
                    <div className="flex items-center gap-1.5">
                      <span>Ngày thực tế giao</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-erp-primary-light" title="Sales điền" />
                    </div>
                  </th>
                  <th>
                    <div className="flex items-center gap-1.5">
                      <span>Feedback ý kiến khách</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-erp-primary-light" title="Sales điền" />
                    </div>
                  </th>
                  <th className="text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const isEditing = editingId === o.id;
                  const isSaving = savingId === o.id;
                  const isSaved = savedId === o.id;

                  return (
                    <tr key={o.id} className={isEditing ? 'bg-erp-primary/[0.04]' : ''}>
                      <td className="font-mono text-erp-primary-light font-bold text-xs">
                        {o.orderCode || `#${o.id?.slice(-6)}`}
                      </td>
                      <td className="text-xs font-mono text-erp-text-muted">{o.brandCode || '—'}</td>
                      <td className="text-xs text-erp-text-muted">{o.salespersonCode || '—'}</td>
                      <td className="text-xs text-erp-text-muted tabular-nums">{fmtDate(o.orderDate)}</td>
                      <td className="text-xs text-erp-text-muted tabular-nums">{fmtDate(o.expectedDeliveryDate)}</td>
                      <td className="text-xs">
                        {isEditing ? (
                          <input
                            type="date"
                            className="erp-input text-xs py-1 px-2 w-36"
                            value={editForm.actualDeliveryDate}
                            onChange={(e) =>
                              setEditForm((p) => ({ ...p, actualDeliveryDate: e.target.value }))
                            }
                          />
                        ) : o.actualDeliveryDate ? (
                          <span className="font-semibold text-emerald-400 tabular-nums">
                            {fmtDate(o.actualDeliveryDate)}
                          </span>
                        ) : (
                          <span className="text-erp-text-dim italic">Chưa giao</span>
                        )}
                      </td>
                      <td className="text-xs max-w-sm">
                        {isEditing ? (
                          <input
                            type="text"
                            className="erp-input text-xs py-1 px-2 w-full"
                            placeholder="Nhập feedback của khách..."
                            value={editForm.customerFeedback}
                            onChange={(e) =>
                              setEditForm((p) => ({ ...p, customerFeedback: e.target.value }))
                            }
                          />
                        ) : o.customerFeedback ? (
                          <span className="text-erp-text font-medium">{o.customerFeedback}</span>
                        ) : (
                          <span className="text-erp-text-dim italic">Chưa có feedback</span>
                        )}
                      </td>
                      <td className="text-center">
                        {isSaved ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                            <Check size={14} /> Đã lưu
                          </span>
                        ) : isEditing ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleSave(o.id)}
                              disabled={isSaving}
                              className="btn btn-primary text-xs px-2.5 py-1"
                            >
                              <Save size={13} />
                              <span>{isSaving ? 'Lưu...' : 'Lưu'}</span>
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="btn btn-secondary text-xs px-2 py-1"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : canEdit ? (
                          <button
                            onClick={() => startEdit(o)}
                            className="btn btn-secondary text-xs px-2.5 py-1"
                          >
                            Sửa
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


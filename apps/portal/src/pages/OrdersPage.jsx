import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, Filter, Download, ChevronLeft, ChevronRight,
  ExternalLink, FileText, X, Eye, ArrowUpDown, Calendar,
  Clock, AlertTriangle, ShieldAlert, AlertCircle,
} from 'lucide-react';
import { listDocs } from '../api/payload';
import useAuth from '../hooks/useAuth';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import * as XLSX from 'xlsx';

const STATUS_TABS = [
  { key: '', label: 'Tất cả đơn' },
  { key: 'b1,b2,b3,b4,b5,b6', label: '⚡ Đang may (B1-B6)' },
  { key: 'b1', label: 'B1 Nhận đơn' },
  { key: 'b2', label: 'B2 Định mức' },
  { key: 'b3', label: 'B3 Mua NPL' },
  { key: 'b4', label: 'B4 Gửi NCC' },
  { key: 'b5', label: 'B5 Thêu & May' },
  { key: 'b6', label: 'B6 QC & Giao' },
  { key: 'done', label: 'Hoàn thành' },
  { key: 'cancelled', label: 'Đã hủy' },
];

const ALERT_TABS = [
  { key: 'all', label: 'Tất cả cảnh báo' },
  { key: 'approaching', label: '🟡 Sắp đến hạn (≤ 7d)' },
  { key: 'overdue', label: '🔴 Đơn muộn (1-14d)' },
  { key: 'critical_overdue', label: '🔴 Trễ nghiêm trọng (> 14d)' },
  { key: 'stalled', label: '🟠 Cần xử lý (Kẹt bước)' },
];

const STAGE_MAX_DAYS = { b1: 2, b2: 4, b3: 7, b4: 1, b5: 35, b6: 3 };

function getOrderAlert(o) {
  if (!o.status || o.status === 'done' || o.status === 'cancelled') {
    return { level: 'normal', label: 'Bình thường', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
  }
  const now = new Date();

  // 1. Kẹt bước
  const maxDays = STAGE_MAX_DAYS[o.status] || 7;
  const startIso = o.stageStartedAt || o.updatedAt || o.createdAt;
  if (startIso) {
    const daysInStage = (now.getTime() - new Date(startIso).getTime()) / 86_400_000;
    if (daysInStage > maxDays + 7) {
      return {
        level: 'stalled',
        label: '🟠 Cần xử lý',
        color: 'text-orange-400',
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/30',
      };
    }
  }

  // 2. TAT
  if (o.expectedDeliveryDate) {
    const diffDays = Math.ceil((new Date(o.expectedDeliveryDate).getTime() - now.getTime()) / 86_400_000);
    if (diffDays < -14) {
      return {
        level: 'critical_overdue',
        label: '🔴 Trễ nặng',
        color: 'text-red-500',
        bg: 'bg-red-500/20',
        border: 'border-red-500/50',
      };
    }
    if (diffDays < 0) {
      return {
        level: 'overdue',
        label: '🔴 Đơn muộn',
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
      };
    }
    if (diffDays <= 7) {
      return {
        level: 'approaching',
        label: '🟡 Sắp hạn',
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
      };
    }
  }

  return { level: 'normal', label: 'Bình thường', color: 'text-blue-400', bg: 'bg-blue-500/10' };
}

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—');
const fmtMoney = (n) => (n != null ? `$${n.toLocaleString()}` : '—');

export default function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('');
  const [alertFilter, setAlertFilter] = useState('all');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const where = {};

      if (activeTab) {
        if (activeTab.includes(',')) {
          where.status = { in: activeTab.split(',') };
        } else {
          where.status = { equals: activeTab };
        }
      }

      if (search) where.orderCode = { contains: search };

      const result = await listDocs('orders', { where, page, limit: 50, sort: '-orderDate', depth: 1 });
      const docs = result.docs || [];

      // Filter by alert level if active
      const filtered = docs.filter((o) => {
        if (alertFilter === 'all') return true;
        const alert = getOrderAlert(o);
        return alert.level === alertFilter;
      });

      setOrders(filtered);
      setTotal(result.totalDocs || 0);
      setTotalPages(result.totalPages || 1);
    } catch (err) {
      console.error('Orders fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, activeTab, alertFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Sổ Cái Đơn Hàng Sản Xuất</h1>
          <p className="text-xs text-erp-text-muted mt-0.5">
            Quản lý và giám sát luồng sản xuất B1 → B6 theo định mức TAT
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted" size={14} />
            <input
              type="text"
              placeholder="Tìm mã đơn hàng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="erp-input pl-8 py-1.5 text-xs w-48 sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* Stage Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setActiveTab(t.key);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-md font-semibold whitespace-nowrap transition-colors ${
              activeTab === t.key
                ? 'bg-erp-primary text-white'
                : 'bg-erp-card text-erp-text-muted hover:text-white border border-erp-border'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 4 Alert Level Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto text-xs py-1">
        <span className="text-[11px] font-bold text-erp-text-muted uppercase">Lọc cảnh báo:</span>
        {ALERT_TABS.map((a) => (
          <button
            key={a.key}
            onClick={() => setAlertFilter(a.key)}
            className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
              alertFilter === a.key
                ? 'bg-blue-600/30 text-blue-300 border border-blue-500'
                : 'bg-erp-card text-erp-text-muted hover:text-white border border-erp-border'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Data Table */}
      <div className="erp-card overflow-hidden">
        {loading ? (
          <div className="py-24 text-center text-erp-text-muted text-xs">
            Đang tải dữ liệu đơn hàng...
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Không tìm thấy đơn hàng"
            description="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Mã DA</th>
                  <th>Khách hàng</th>
                  <th>SL</th>
                  <th>Tổng tiền</th>
                  <th>Đã cọc</th>
                  <th>Còn nợ</th>
                  <th>Hạn trả (TAT)</th>
                  <th>Bước</th>
                  <th>Cảnh báo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const alert = getOrderAlert(o);
                  return (
                    <tr
                      key={o.id}
                      onClick={() => navigate(`/orders/${o.id}`)}
                      className="cursor-pointer hover:bg-erp-primary/5"
                    >
                      <td className="font-mono text-erp-primary-light font-bold text-xs">
                        {o.orderCode || `#${o.id?.slice(-6)}`}
                      </td>
                      <td className="text-xs font-semibold text-white">
                        {o.brandCode || '—'}
                      </td>
                      <td className="text-xs font-medium text-erp-text truncate max-w-[140px]">
                        {typeof o.customer === 'object' ? o.customer?.name : '—'}
                      </td>
                      <td className="text-xs tabular-nums text-white">
                        {o.totalQuantity?.toLocaleString() || 0}
                      </td>
                      <td className="text-xs font-bold font-mono text-erp-primary-light tabular-nums">
                        {fmtMoney(o.totalAmount)}
                      </td>
                      <td className="text-xs font-mono text-emerald-400 tabular-nums">
                        {fmtMoney(o.deposit)}
                      </td>
                      <td className="text-xs font-mono font-bold text-amber-400 tabular-nums">
                        {fmtMoney(o.owedAmount)}
                      </td>
                      <td className="text-xs font-mono text-erp-text-muted">
                        {fmtDate(o.expectedDeliveryDate)}
                      </td>
                      <td>
                        <StatusBadge status={o.status} />
                      </td>
                      <td>
                        {alert.level !== 'normal' && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold ${alert.bg} ${alert.color} border border-current/20`}>
                            {alert.label}
                          </span>
                        )}
                      </td>
                      <td className="text-right">
                        <span className="text-xs text-erp-primary-light font-semibold">
                          Chi tiết ↗
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

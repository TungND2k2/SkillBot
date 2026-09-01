import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, Filter, Download, ChevronLeft, ChevronRight,
  ExternalLink, FileText, X, Eye, ArrowUpDown, Calendar,
} from 'lucide-react';
import { listDocs } from '../api/payload';
import useAuth from '../hooks/useAuth';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import * as XLSX from 'xlsx';

const STATUS_TABS = [
  { key: '', label: 'Tất cả đơn' },
  { key: 'b1,b2,b3,b4,b5,b6', label: '⚡ Đang thực hiện' },
  { key: 'b1', label: 'B1 Nhận đơn' },
  { key: 'b2', label: 'B2 Định mức' },
  { key: 'b3', label: 'B3 Mua NPL' },
  { key: 'b4', label: 'B4 Sản xuất' },
  { key: 'b5', label: 'B5 QC' },
  { key: 'b6', label: 'B6 Giao hàng' },
  { key: 'done', label: 'Hoàn thành' },
  { key: 'cancelled', label: 'Đã hủy' },
];

const QUANTITY_FILTERS = [
  { label: 'Tất cả SL', min: null, max: null },
  { label: '< 100 sp', min: null, max: 99 },
  { label: '100 – 300 sp', min: 100, max: 300 },
  { label: '300 – 500 sp', min: 300, max: 500 },
  { label: '500 – 1.000 sp', min: 500, max: 1000 },
  { label: '> 1.000 sp', min: 1001, max: null },
];

const VALUE_FILTERS = [
  { label: 'Tất cả giá trị', min: null, max: null },
  { label: '< $1,000', min: null, max: 999 },
  { label: '$1,000 – $5,000', min: 1000, max: 5000 },
  { label: '> $5,000', min: 5001, max: null },
];

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—');
const fmtMoney = (n) => (n != null ? `$${n.toLocaleString()}` : '—');

export default function OrdersPage() {
  const navigate = useNavigate();
  const { role, isSales, isInput, isAdmin, isManager } = useAuth();
  const canViewFinance = ['admin', 'manager', 'accountant'].includes(role);
  const canViewDA = ['admin', 'manager', 'qc'].includes(role);

  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [qtyFilter, setQtyFilter] = useState(0);
  const [valueFilter, setValueFilter] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

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

      if (countryFilter) where.country = { contains: countryFilter };

      const qf = QUANTITY_FILTERS[qtyFilter];
      if (qf.min != null) where.totalQuantity = { ...(where.totalQuantity || {}), greater_than_equal: qf.min };
      if (qf.max != null) where.totalQuantity = { ...(where.totalQuantity || {}), less_than_equal: qf.max };

      const vf = VALUE_FILTERS[valueFilter];
      if (vf.min != null) where.totalAmount = { ...(where.totalAmount || {}), greater_than_equal: vf.min };
      if (vf.max != null) where.totalAmount = { ...(where.totalAmount || {}), less_than_equal: vf.max };

      if (search) where.orderCode = { contains: search };

      const result = await listDocs('orders', { where, page, limit: 20, sort: '-orderDate', depth: 1 });
      setOrders(result.docs || []);
      setTotal(result.totalDocs || 0);
      setTotalPages(result.totalPages || 1);
    } catch (err) {
      console.error('Orders fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, activeTab, countryFilter, qtyFilter, valueFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const exportExcel = () => {
    const data = orders.map((o) => ({
      'Ngày đặt': fmtDate(o.orderDate),
      'Mã đơn': o.orderCode,
      ...(canViewDA ? { 'Mã DA': o.brandCode } : {}),
      'Mã Sales': o.salespersonCode,
      'Quốc gia': o.country,
      ...(canViewDA ? { 'Số lượng': o.totalQuantity } : {}),
      ...(canViewFinance ? { 'Tổng ($)': o.totalAmount, 'Cọc ($)': o.deposit, 'Nợ ($)': o.owedAmount } : {}),
      'Trạng thái': o.status,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sổ đơn hàng');
    XLSX.writeFile(wb, `don-hang-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const clearFilters = () => {
    setSearch('');
    setActiveTab('');
    setCountryFilter('');
    setQtyFilter(0);
    setValueFilter(0);
    setPage(1);
  };

  const hasFilters = search || activeTab || countryFilter || qtyFilter > 0 || valueFilter > 0;

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-5">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-erp-border">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Sổ Quản Lý Đơn Hàng Sản Xuất</span>
          </h1>
          <p className="text-xs text-erp-text-muted mt-1">
            Tổng số {total} đơn hàng ghi nhận trong hệ thống
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportExcel} className="btn btn-success text-xs">
            <Download size={14} />
            <span>Xuất file Excel</span>
          </button>
        </div>
      </div>

      {/* Status Segmented Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 border-b border-erp-border">
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-erp-primary text-white shadow-erp-sm'
                  : 'text-erp-text-muted hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search & Filter bar */}
      <div className="erp-card p-3.5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-dim" />
            <input
              className="erp-input pl-9"
              placeholder="Tìm kiếm nhanh theo mã đơn hàng..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn text-xs ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Filter size={13} />
            <span>Bộ lọc nâng cao</span>
          </button>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="btn btn-secondary text-red-400 hover:text-red-300 text-xs border-red-500/20"
            >
              <X size={13} />
              <span>Xóa lọc</span>
            </button>
          )}
        </div>

        {/* Extended filter drawer */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-erp-border"
          >
            <div>
              <label className="text-[11px] font-semibold text-erp-text-muted uppercase mb-1 block">
                Quốc gia đến
              </label>
              <input
                className="erp-input"
                placeholder="VD: USA, Japan, VN..."
                value={countryFilter}
                onChange={(e) => {
                  setCountryFilter(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-erp-text-muted uppercase mb-1 block">
                Khoảng số lượng (sp)
              </label>
              <select
                className="erp-input"
                value={qtyFilter}
                onChange={(e) => {
                  setQtyFilter(+e.target.value);
                  setPage(1);
                }}
              >
                {QUANTITY_FILTERS.map((q, i) => (
                  <option key={i} value={i}>
                    {q.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-erp-text-muted uppercase mb-1 block">
                Giá trị đơn hàng ($)
              </label>
              <select
                className="erp-input"
                value={valueFilter}
                onChange={(e) => {
                  setValueFilter(+e.target.value);
                  setPage(1);
                }}
              >
                {VALUE_FILTERS.map((v, i) => (
                  <option key={i} value={i}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          </motion.div>
        )}
      </div>

      {/* Main Data Table */}
      {loading ? (
        <div className="erp-card p-12 text-center text-erp-text-muted text-sm flex flex-col items-center justify-center gap-3">
          <span className="w-7 h-7 border-2 border-erp-border border-t-erp-primary-light rounded-full animate-spin" />
          <span>Đang tải danh sách đơn hàng...</span>
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Không tìm thấy đơn hàng"
          description="Không có đơn hàng nào phù hợp với điều kiện tìm kiếm và bộ lọc hiện tại."
          actionLabel="Xóa toàn bộ bộ lọc"
          onAction={clearFilters}
        />
      ) : (
        <div className="erp-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Ngày đặt</th>
                  {canViewDA && <th>Mã DA</th>}
                  <th>Mã Sales</th>
                  <th>Quốc gia</th>
                  {canViewDA && <th className="text-right">Số lượng</th>}
                  {canViewFinance && (
                    <>
                      <th className="text-right">Tổng ($)</th>
                      <th className="text-right">Cọc ($)</th>
                      <th className="text-right">Còn nợ ($)</th>
                    </>
                  )}
                  <th className="text-center">Trạng thái</th>
                  <th className="text-center">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => navigate(`/orders/${o.id}`)}
                    className="cursor-pointer hover:bg-erp-primary/5"
                  >
                    <td className="font-mono text-erp-primary-light font-bold text-xs">
                      {o.orderCode || `#${o.id?.slice(-6)}`}
                    </td>
                    <td className="text-xs text-erp-text-muted tabular-nums">
                      {fmtDate(o.orderDate)}
                    </td>
                    {canViewDA && (
                      <td className="text-xs font-mono text-erp-text">
                        {o.brandCode || '—'}
                      </td>
                    )}
                    <td className="text-xs text-erp-text font-medium">
                      {o.salespersonCode || '—'}
                    </td>
                    <td className="text-xs text-erp-text-muted">
                      {o.country || '—'}
                    </td>
                    {canViewDA && (
                      <td className="text-xs text-right font-semibold tabular-nums text-white">
                        {o.totalQuantity?.toLocaleString() || 0}
                      </td>
                    )}
                    {canViewFinance && (
                      <>
                        <td className="text-xs text-right font-semibold tabular-nums text-white">
                          {fmtMoney(o.totalAmount)}
                        </td>
                        <td className="text-xs text-right text-erp-text-muted tabular-nums">
                          {fmtMoney(o.deposit)}
                        </td>
                        <td
                          className={`text-xs text-right font-bold tabular-nums ${
                            (o.owedAmount || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'
                          }`}
                        >
                          {fmtMoney(o.owedAmount)}
                        </td>
                      </>
                    )}
                    <td className="text-center">
                      <StatusBadge status={o.status} size="xs" />
                    </td>
                    <td className="text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => navigate(`/orders/${o.id}`)}
                          className="btn btn-secondary text-[11px] px-2 py-1"
                        >
                          Chi tiết
                        </button>
                        <a
                          href={`http://localhost:3001/admin/collections/orders/${o.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded text-erp-text-muted hover:text-white hover:bg-white/5"
                          title="CMS"
                        >
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-erp-border bg-[#0d1420]">
              <p className="text-xs text-erp-text-muted">
                Trang <strong className="text-white">{page}</strong> / {totalPages} · Tổng{' '}
                <strong className="text-white">{total}</strong> đơn hàng
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="btn btn-secondary text-xs px-2.5 py-1 disabled:opacity-30"
                >
                  <ChevronLeft size={14} /> Trước
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="btn btn-secondary text-xs px-2.5 py-1 disabled:opacity-30"
                >
                  Sau <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


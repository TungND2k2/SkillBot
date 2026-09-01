import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, DollarSign, Clock, Camera,
  Building2, Layers, Check, ExternalLink, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { getDoc } from '../api/payload';
import useAuth from '../hooks/useAuth';
import StatusBadge from '../components/StatusBadge';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—');
const fmtMoney = (n) => (n != null ? `$${n.toLocaleString()}` : '—');

const TABS = [
  { id: 0, label: 'Thông tin chung & Tài chính', icon: FileText },
  { id: 1, label: 'Tiến độ sản xuất (6 bước)', icon: Layers },
  { id: 2, label: 'Nhà cung cấp & Xưởng', icon: Building2 },
];

const STAGES = [
  { step: 1, key: 'b1', name: 'B1: Nhận đơn & Đề bài (1–2 ngày)', desc: 'Kiểm tra tệp thiết kế, hóa đơn, cọc & ảnh xác nhận khách hàng' },
  { step: 2, key: 'b2', name: 'B2: Tính định mức BOM (1–4 ngày)', desc: 'Bóc tách định mức vải, phụ liệu, Google Sheet định mức' },
  { step: 3, key: 'b3', name: 'B3: Mua NPL & Duyệt vải (3–7 ngày)', desc: 'Mua nguyên phụ liệu và kiểm duyệt mẫu vải về xưởng' },
  { step: 4, key: 'b4', name: 'B4: Gửi NCC / Xưởng phụ (1 ngày)', desc: 'Bàn giao bán thành phẩm cho nhà cung cấp thêu gia công' },
  { step: 5, key: 'b5', name: 'B5: Thêu & May hoàn thiện (24–35 ngày)', desc: 'Thêu chi tiết (14–21 ngày) và May ráp hoàn thiện (10–14 ngày)' },
  { step: 6, key: 'b6', name: 'B6: QC & Đóng gói (1–3 ngày)', desc: 'Đo thông số, kiểm tra KCS, đóng gói và xuất hàng cho khách' },
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
        label: '🟠 Cần xử lý (Kẹt bước)',
        desc: `Kẹt ở bước ${o.status.toUpperCase()} quá ${Math.floor(daysInStage - maxDays)} ngày so với SLA`,
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
        label: '🔴 Trễ nghiêm trọng',
        desc: `Đã quá hạn giao hàng ${Math.abs(diffDays)} ngày (khẩn cấp!)`,
        color: 'text-red-500',
        bg: 'bg-red-500/20',
        border: 'border-red-500/50',
      };
    }
    if (diffDays < 0) {
      return {
        level: 'overdue',
        label: '🔴 Đơn muộn',
        desc: `Đã quá hạn giao hàng ${Math.abs(diffDays)} ngày`,
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
      };
    }
    if (diffDays <= 7) {
      return {
        level: 'approaching',
        label: '🟡 Sắp đến hạn',
        desc: `Còn ${diffDays} ngày đến hạn giao hàng`,
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
      };
    }
  }

  return { level: 'normal', label: 'Trong tiến độ', color: 'text-blue-400', bg: 'bg-blue-500/10' };
}

function InfoCard({ title, children, icon: Icon }) {
  return (
    <div className="erp-card p-5 space-y-3">
      <div className="flex items-center gap-2 pb-2.5 border-b border-erp-border">
        {Icon && <Icon size={15} className="text-erp-primary-light" />}
        <h3 className="text-xs font-bold text-erp-text uppercase tracking-wider">{title}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DataRow({ label, value, highlight, mono }) {
  return (
    <div className="flex items-center justify-between py-1 text-xs">
      <span className="text-erp-text-muted">{label}</span>
      <span
        className={`font-semibold ${mono ? 'font-mono' : ''} ${
          highlight ? 'text-erp-primary-light' : 'text-white'
        }`}
      >
        {value || '—'}
      </span>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isManager, isAdmin } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const doc = await getDoc('orders', id, 2);
        if (!cancel) setOrder(doc);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <span className="inline-block w-8 h-8 border-2 border-erp-border border-t-erp-primary-light rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-12 text-center text-erp-text-muted space-y-4">
        <p className="text-sm">Không tìm thấy thông tin đơn hàng yêu cầu.</p>
        <button onClick={() => navigate('/orders')} className="btn btn-secondary text-xs">
          <ArrowLeft size={14} /> Quay lại danh sách
        </button>
      </div>
    );
  }

  const o = order;
  const customer = typeof o.customer === 'object' ? o.customer : null;
  const STATUS_ORDER = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'done'];
  const currentIdx = STATUS_ORDER.indexOf(o.status);
  const alert = getOrderAlert(o);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-erp-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/orders')}
            className="p-2 rounded-lg bg-erp-card border border-erp-border text-erp-text-muted hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-extrabold text-white font-mono">
                {o.orderCode || `#${o.id?.slice(-6)}`}
              </h1>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-erp-primary/15 text-erp-primary-light border border-erp-primary/30 font-mono">
                {o.brandCode || 'PE'}
              </span>
              <StatusBadge status={o.status} />
            </div>
            <p className="text-xs text-erp-text-muted mt-0.5">
              Ngày tạo đơn: {fmtDate(o.orderDate || o.createdAt)} · Hạn giao (TAT):{' '}
              <strong className="text-white">{fmtDate(o.expectedDeliveryDate)}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(isAdmin || isManager) && (
            <span className="px-3 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs font-bold flex items-center gap-1.5">
              <ShieldCheck size={14} /> Quản lý có quyền duyệt bước
            </span>
          )}
        </div>
      </div>

      {/* Alert Banner if any */}
      {alert.level !== 'normal' && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 ${alert.bg} ${alert.border}`}>
          <AlertTriangle className={alert.color} size={20} />
          <div>
            <h4 className={`text-xs font-bold uppercase ${alert.color}`}>{alert.label}</h4>
            <p className="text-xs text-white mt-0.5">{alert.desc}</p>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card blue p-4">
          <p className="text-[11px] font-bold text-erp-text-muted uppercase tracking-wider mb-1">
            Tổng Giá Trị Đơn
          </p>
          <p className="text-xl font-extrabold text-white font-mono tabular-nums">
            {fmtMoney(o.totalAmount)}
          </p>
          <p className="text-[11px] text-erp-text-muted mt-2">
            Số lượng: <strong className="text-white">{o.totalQuantity?.toLocaleString() || 0} SP</strong>
          </p>
        </div>

        <div className="stat-card green p-4">
          <p className="text-[11px] font-bold text-erp-text-muted uppercase tracking-wider mb-1">
            Đã Đặt Cọc
          </p>
          <p className="text-xl font-extrabold text-emerald-400 font-mono tabular-nums">
            {fmtMoney(o.deposit)}
          </p>
          <p className="text-[11px] text-erp-text-muted mt-2">
            {o.accountantConfirmed ? '✓ Kế toán đã xác nhận' : '⏳ Chờ kế toán xác nhận'}
          </p>
        </div>

        <div className="stat-card yellow p-4">
          <p className="text-[11px] font-bold text-erp-text-muted uppercase tracking-wider mb-1">
            Công Nợ Còn Lại
          </p>
          <p className="text-xl font-extrabold text-amber-400 font-mono tabular-nums">
            {fmtMoney(o.owedAmount)}
          </p>
          <p className="text-[11px] text-erp-text-muted mt-2">Cần thu trước khi giao hàng</p>
        </div>

        <div className="stat-card purple p-4">
          <p className="text-[11px] font-bold text-erp-text-muted uppercase tracking-wider mb-1">
            Hạn Giao Hàng (TAT)
          </p>
          <p className="text-xl font-extrabold text-white font-mono tabular-nums">
            {fmtDate(o.expectedDeliveryDate)}
          </p>
          <p className="text-[11px] text-erp-text-muted mt-2">
            Thực tế giao: {fmtDate(o.actualDeliveryDate) || 'Chưa xuất xưởng'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-erp-border gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                tab === t.id
                  ? 'border-erp-primary text-erp-primary-light bg-erp-primary/10'
                  : 'border-transparent text-erp-text-muted hover:text-white'
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab 0: Thông tin chung & Tài chính */}
      {tab === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InfoCard title="Thông tin khách hàng" icon={Building2}>
            <DataRow label="Tên khách / Brand" value={customer?.name} />
            <DataRow label="Số điện thoại" value={customer?.phone} mono />
            <DataRow label="Email liên hệ" value={customer?.email} />
            <DataRow label="Quốc gia" value={o.country} />
            <DataRow label="Mã Sales phụ trách" value={o.salespersonCode} />
          </InfoCard>

          <InfoCard title="Thông số sản xuất & Hồ sơ" icon={FileText}>
            <DataRow label="Mã dự án (DA)" value={o.brandCode} highlight />
            <DataRow label="Tổng số lượng sản xuất" value={`${o.totalQuantity?.toLocaleString() || 0} SP`} mono />
            <DataRow label="Hạn giao hàng dự kiến" value={fmtDate(o.expectedDeliveryDate)} />
            <DataRow label="Quy định chuyển bước" value="Cần File/Ảnh hoặc Quản lý duyệt" />
            {o.notes && (
              <div className="pt-2 border-t border-erp-border">
                <span className="text-xs text-erp-text-muted block mb-1">Ghi chú đơn hàng:</span>
                <p className="text-xs text-white bg-erp-bg p-2.5 rounded border border-erp-border whitespace-pre-wrap">
                  {o.notes}
                </p>
              </div>
            )}
          </InfoCard>
        </div>
      )}

      {/* Tab 1: Tiến độ 6 bước */}
      {tab === 1 && (
        <div className="erp-card p-6 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-erp-border">
            <h3 className="text-xs font-bold text-erp-text uppercase tracking-wider">
              Tiến Trình 6 Bước Sản Xuất Chuẩn (Chuyển Tuần Tự)
            </h3>
            <span className="text-xs text-erp-text-muted">
              Định mức TAT: <strong>35–45 ngày</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {STAGES.map((s, idx) => {
              const isPassed = currentIdx > idx || o.status === 'done';
              const isCurrent = currentIdx === idx && o.status !== 'done';
              return (
                <div
                  key={s.key}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-erp-primary/10 border-erp-primary shadow-lg'
                      : isPassed
                      ? 'bg-emerald-500/5 border-emerald-500/30'
                      : 'bg-erp-card border-erp-border opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isPassed
                          ? 'bg-emerald-500 text-white'
                          : isCurrent
                          ? 'bg-erp-primary text-white animate-pulse'
                          : 'bg-erp-border text-erp-text-muted'
                      }`}
                    >
                      {isPassed ? '✓' : s.step}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{s.name}</h4>
                      <p className="text-[11px] text-erp-text-muted mt-0.5">{s.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-full font-semibold text-[11px] ${
                        isPassed
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : isCurrent
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-erp-border/40 text-erp-text-muted'
                      }`}
                    >
                      {isPassed ? 'Đã hoàn thành' : isCurrent ? '⚡ Đang thực hiện' : 'Chờ bước trước'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Nhà cung cấp & Xưởng */}
      {tab === 2 && (
        <div className="erp-card p-6 space-y-4">
          <h3 className="text-xs font-bold text-erp-text uppercase tracking-wider pb-3 border-b border-erp-border">
            Danh Sách Nhà Cung Cấp & Xưởng May Phụ Trợ
          </h3>
          {o.suppliers && o.suppliers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {o.suppliers.map((item, i) => (
                <div key={i} className="p-4 rounded-lg bg-erp-bg border border-erp-border space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-erp-primary-light">
                      {item.role ? item.role : `NCC #${i + 1}`}
                    </span>
                  </div>
                  <p className="text-xs text-white font-medium">
                    {typeof item.supplier === 'object' ? item.supplier?.name : '—'}
                  </p>
                  {item.notes && (
                    <p className="text-[11px] text-erp-text-muted">{item.notes}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-erp-text-muted py-6 text-center">
              Chưa có thông tin phân công nhà cung cấp cho đơn này.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, DollarSign, Clock, Camera,
  Building2, Layers, Check, ExternalLink
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

const SUPPLIER_ROLES = {
  fabric_main: '🧵 Vải chính',
  fabric_secondary: '🧶 Vải phụ',
  accessory: '🔘 Phụ liệu / Cúc / Khóa',
  embroidery: '🎨 Xưởng thêu vi tính',
  sewing: '✂️ Xưởng may gia công',
  fabric_printing: '🖨 Xưởng in vải',
  logistics: '🚚 Đơn vị vận chuyển',
};

const STAGES = [
  { step: 1, key: 'b1', name: 'B1: Nhận đơn & Đề bài', desc: 'Kiểm tra tệp thiết kế, lập hợp đồng & thông số kỹ thuật' },
  { step: 2, key: 'b2', name: 'B2: Tính định mức BOM', desc: 'Bóc tách định mức vải, phụ liệu và tỷ lệ hao phí' },
  { step: 3, key: 'b3', name: 'B3: Mua nguyên phụ liệu', desc: 'Nhập vải, phụ liệu từ nhà cung cấp về xưởng' },
  { step: 4, key: 'b4', name: 'B4: Sản xuất may & thêu', desc: 'Tiến hành in thêu bán thành phẩm và ráp hoàn thiện' },
  { step: 5, key: 'b5', name: 'B5: Kiểm tra chất lượng QC', desc: 'Đo thông số, kiểm tra đường chỉ, duyệt biên bản QC' },
  { step: 6, key: 'b6', name: 'B6: Đóng gói & Xuất hàng', desc: 'Bàn giao đơn vị logistics, gửi tracking cho khách' },
];

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

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-erp-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/orders')}
            className="p-2 rounded-lg bg-erp-card border border-erp-border text-erp-text-muted hover:text-white hover:bg-erp-surface transition-colors"
            title="Quay lại"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-white font-mono tracking-tight">
                {o.orderCode || `#${o.id?.slice(-6)}`}
              </h1>
              <StatusBadge status={o.status} />
            </div>
            <p className="text-xs text-erp-text-muted mt-0.5">
              Khách hàng: <strong className="text-white">{customer?.name || '—'}</strong> · Quốc gia: {o.country || '—'} · Ngày tạo: {fmtDate(o.orderDate)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`http://localhost:3001/admin/collections/orders/${o.id}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary text-xs"
          >
            <ExternalLink size={13} />
            <span>Mở trên CMS</span>
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-erp-border pb-px">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-semibold border-b-2 transition-all ${
                isActive
                  ? 'border-erp-primary-light text-white bg-erp-card'
                  : 'border-transparent text-erp-text-muted hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-erp-primary-light' : ''} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 0: Overview & Finance */}
      {tab === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <InfoCard title="Thông tin Đơn hàng & Khách hàng" icon={FileText}>
            <DataRow label="Mã đơn hàng" value={o.orderCode} mono highlight />
            <DataRow label="Mã DA / Thương hiệu" value={o.brandCode} mono />
            <DataRow label="Phụ trách Sales" value={o.salespersonCode} />
            <DataRow label="Tên khách hàng" value={customer?.name} />
            <DataRow label="Số điện thoại" value={customer?.phone} />
            <DataRow label="Email / MXH" value={customer?.email || customer?.social} />
            <DataRow label="Quốc gia đến" value={o.country} />
          </InfoCard>

          <InfoCard title="Kế hoạch & Thời hạn" icon={Clock}>
            <DataRow label="Ngày tiếp nhận đơn" value={fmtDate(o.orderDate)} />
            <DataRow label="Hạn giao dự kiến" value={fmtDate(o.expectedDeliveryDate)} highlight />
            <DataRow label="Ngày xuất thực tế" value={fmtDate(o.actualDeliveryDate)} />
            <DataRow label="Tổng số lượng sản xuất" value={`${o.totalQuantity?.toLocaleString() || 0} sản phẩm`} highlight />
            <DataRow label="Trạng thái hiện tại" value={o.status?.toUpperCase()} />
          </InfoCard>

          <InfoCard title="Tài chính & Thanh toán" icon={DollarSign}>
            <DataRow label="Tổng giá trị đơn hàng" value={fmtMoney(o.totalAmount)} highlight />
            <DataRow label="Tiền đặt cọc" value={fmtMoney(o.deposit)} />
            <DataRow
              label="Số tiền còn nợ"
              value={fmtMoney(o.owedAmount)}
              highlight={(o.owedAmount || 0) > 0}
            />
            {o.invoiceNumber && <DataRow label="Số hóa đơn VAT" value={o.invoiceNumber} mono />}
          </InfoCard>

          {/* Notes & Feedback */}
          {(o.notes || o.customerFeedback) && (
            <div className="md:col-span-2 lg:col-span-3 erp-card p-5 space-y-3">
              <h3 className="text-xs font-bold text-erp-text uppercase tracking-wider pb-2 border-b border-erp-border">
                Ghi chú & Phản hồi khách hàng
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {o.notes && (
                  <div>
                    <p className="text-[11px] font-semibold text-erp-text-muted mb-1">Ghi chú sản xuất:</p>
                    <p className="text-erp-text bg-[#0d1420] p-3 rounded border border-erp-border whitespace-pre-wrap">
                      {o.notes}
                    </p>
                  </div>
                )}
                {o.customerFeedback && (
                  <div>
                    <p className="text-[11px] font-semibold text-erp-text-muted mb-1">Feedback sau giao hàng:</p>
                    <p className="text-emerald-400 bg-emerald-500/5 p-3 rounded border border-emerald-500/20 whitespace-pre-wrap">
                      {o.customerFeedback}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 1: 6-Step Production Workflow */}
      {tab === 1 && (
        <div className="space-y-4">
          <div className="erp-card p-5">
            <h3 className="text-xs font-bold text-erp-text uppercase tracking-wider mb-4 pb-2 border-b border-erp-border">
              Quy trình Kiểm soát Tiến độ 6 Bước
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {STAGES.map((s, idx) => {
                const isPassed = currentIdx > idx || o.status === 'done';
                const isCurrent = currentIdx === idx && o.status !== 'done' && o.status !== 'cancelled';
                return (
                  <div
                    key={s.key}
                    className={`erp-card p-4 flex flex-col justify-between border ${
                      isPassed
                        ? 'border-emerald-500/30 bg-emerald-500/[0.02]'
                        : isCurrent
                        ? 'border-erp-primary-light ring-1 ring-erp-primary-light/40 bg-erp-primary/[0.04]'
                        : 'border-erp-border opacity-70'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            isPassed
                              ? 'bg-emerald-500 text-white'
                              : isCurrent
                              ? 'bg-erp-primary text-white animate-pulse'
                              : 'bg-erp-surface text-erp-text-dim border border-erp-border'
                          }`}
                        >
                          {isPassed ? <Check size={13} /> : s.step}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            isPassed
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : isCurrent
                              ? 'bg-erp-primary/20 text-erp-primary-light'
                              : 'bg-white/5 text-erp-text-dim'
                          }`}
                        >
                          {isPassed ? 'Đã hoàn thành' : isCurrent ? 'Đang thực hiện' : 'Chưa đến'}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white mb-1">{s.name}</h4>
                      <p className="text-[11px] text-erp-text-muted">{s.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Suppliers & Subcontractors */}
      {tab === 2 && (
        <div className="erp-card p-5 space-y-4">
          <h3 className="text-xs font-bold text-erp-text uppercase tracking-wider pb-2 border-b border-erp-border">
            Danh sách Nhà cung cấp & Đơn vị Gia công Phụ trách
          </h3>
          {o.suppliers && o.suppliers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {o.suppliers.map((s, i) => {
                const supp = typeof s.supplier === 'object' ? s.supplier : null;
                return (
                  <div key={i} className="erp-card p-4 space-y-2 border border-erp-border bg-[#0d1420]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{supp?.name || 'NCC chưa xác định'}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-erp-primary/10 text-erp-primary-light font-semibold border border-erp-primary/20">
                        {SUPPLIER_ROLES[s.role] || s.role}
                      </span>
                    </div>
                    <p className="text-xs text-erp-text-muted">Mã NCC: {supp?.code || '—'}</p>
                    {supp?.phone && <p className="text-xs text-erp-text-muted">SĐT: {supp.phone}</p>}
                    {s.notes && (
                      <p className="text-[11px] text-erp-text-dim pt-1 border-t border-erp-border/60">
                        {s.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-erp-text-muted py-6 text-center">
              Chưa có thông tin phân bổ nhà cung cấp cho đơn hàng này.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Package, Clock, AlertTriangle, TrendingDown,
  DollarSign, CreditCard, RefreshCw, BarChart3,
  TrendingUp, ArrowUpRight, CheckCircle2, Factory,
  AlertCircle, ShieldAlert,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { listDocs, countDocs } from '../api/payload';
import useAuth from '../hooks/useAuth';
import EmptyState from '../components/EmptyState';
import { Link } from 'react-router-dom';

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—');
const fmtMoney = (n) => (n != null ? `$${n.toLocaleString()}` : '$0');

const CHART_COLORS = ['#3b82f6', '#06b6d4', '#f59e0b', '#8b5cf6', '#a855f7', '#10b981', '#ef4444', '#64748b'];

const STAGE_MAX_DAYS = {
  b1: 2,
  b2: 4,
  b3: 7,
  b4: 1,
  b5: 35,
  b6: 3,
};

function getOrderAlert(o) {
  if (!o.status || o.status === 'done' || o.status === 'cancelled') {
    return { level: 'normal', label: 'Bình thường', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
  }
  const now = new Date();

  // 1. Kẹt bước > 7 ngày SLA
  const maxDays = STAGE_MAX_DAYS[o.status] || 7;
  const startIso = o.stageStartedAt || o.updatedAt || o.createdAt;
  if (startIso) {
    const daysInStage = (now.getTime() - new Date(startIso).getTime()) / 86_400_000;
    if (daysInStage > maxDays + 7) {
      return {
        level: 'stalled',
        label: '🟠 Cần xử lý',
        desc: `Kẹt bước ${o.status.toUpperCase()} quá ${Math.floor(daysInStage - maxDays)} ngày`,
        color: 'text-orange-400',
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/30',
      };
    }
  }

  // 2. Hạn giao TAT
  if (o.expectedDeliveryDate) {
    const diffDays = Math.ceil((new Date(o.expectedDeliveryDate).getTime() - now.getTime()) / 86_400_000);
    if (diffDays < -14) {
      return {
        level: 'critical_overdue',
        label: '🔴 Trễ nghiêm trọng',
        desc: `Quá hạn ${Math.abs(diffDays)} ngày`,
        color: 'text-red-500',
        bg: 'bg-red-500/20',
        border: 'border-red-500/50',
      };
    }
    if (diffDays < 0) {
      return {
        level: 'overdue',
        label: '🔴 Đơn muộn',
        desc: `Quá hạn ${Math.abs(diffDays)} ngày`,
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
      };
    }
    if (diffDays <= 7) {
      return {
        level: 'approaching',
        label: '🟡 Sắp đến hạn',
        desc: `Còn ${diffDays} ngày`,
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
      };
    }
  }

  return { level: 'normal', label: 'Tiến độ tốt', color: 'text-blue-400', bg: 'bg-blue-500/10' };
}

function StatCard({ icon: Icon, label, value, sub, color = 'blue', delay = 0, trend }) {
  const colorMap = {
    blue: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    green: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    yellow: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    red: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    orange: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
    purple: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    cyan: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.2, ease: 'easeOut' }}
      className={`stat-card ${color} p-4 flex flex-col justify-between`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-erp-text-muted uppercase tracking-wider mb-1">
            {label}
          </p>
          <p className="text-2xl font-extrabold text-white tracking-tight tabular-nums">
            {value ?? '—'}
          </p>
        </div>
        <div className={`p-2 rounded-lg shrink-0 border ${scheme.bg} ${scheme.text} ${scheme.border}`}>
          <Icon size={18} />
        </div>
      </div>
      {sub && (
        <div className="mt-3 pt-2.5 border-t border-erp-border/60 flex items-center justify-between text-[11px]">
          <span className="text-erp-text-muted truncate">{sub}</span>
          {trend && (
            <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
              <TrendingUp size={11} /> {trend}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function DashboardPage() {
  const { canViewRevenue, canViewAllDebt, isSales, user } = useAuth();
  const [stats, setStats] = useState({});
  const [urgentOrders, setUrgentOrders] = useState([]);
  const [debts, setDebts] = useState([]);
  const [revenueChart, setRevenueChart] = useState([]);
  const [statusChart, setStatusChart] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const allOrders = await listDocs('orders', { limit: 500, depth: 1, sort: '-orderDate' });
        if (cancel) return;

        const allDocs = allOrders?.docs || [];

        let activeCount = 0;
        let approaching = 0;
        let overdue = 0;
        let critical = 0;
        let stalled = 0;
        const urgentList = [];

        for (const o of allDocs) {
          if (['b1', 'b2', 'b3', 'b4', 'b5', 'b6'].includes(o.status)) {
            activeCount += 1;
          }
          const alert = getOrderAlert(o);
          if (alert.level !== 'normal') {
            urgentList.push({ ...o, alert });
            if (alert.level === 'approaching') approaching += 1;
            else if (alert.level === 'overdue') overdue += 1;
            else if (alert.level === 'critical_overdue') critical += 1;
            else if (alert.level === 'stalled') stalled += 1;
          }
        }

        // Revenue this month
        const monthOrders = allDocs.filter((o) => {
          const d = o.orderDate || o.createdAt;
          return d && d >= monthStart();
        });
        const revenue = monthOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);

        // Debts
        let debtOrders = allDocs.filter((o) => (o.owedAmount || 0) > 0);
        if (isSales && !canViewAllDebt) {
          debtOrders = debtOrders.filter((o) => {
            const spId = typeof o.salesperson === 'object' ? o.salesperson?.id : o.salesperson;
            return spId === user?.id;
          });
        }
        const totalDebt = debtOrders.reduce((s, o) => s + (o.owedAmount || 0), 0);

        // Status Chart Data
        const statusMap = { b1: 0, b2: 0, b3: 0, b4: 0, b5: 0, b6: 0, done: 0 };
        for (const o of allDocs) {
          if (statusMap[o.status] !== undefined) statusMap[o.status] += 1;
        }
        const chartData = [
          { name: 'B1 Nhận đơn', value: statusMap.b1 },
          { name: 'B2 Định mức', value: statusMap.b2 },
          { name: 'B3 Mua NPL', value: statusMap.b3 },
          { name: 'B4 Gửi NCC', value: statusMap.b4 },
          { name: 'B5 Thêu & May', value: statusMap.b5 },
          { name: 'B6 QC Đóng gói', value: statusMap.b6 },
          { name: 'Hoàn thành', value: statusMap.done },
        ].filter((d) => d.value > 0);

        setStats({
          activeCount,
          approaching,
          overdue,
          critical,
          stalled,
          revenue,
          totalDebt,
          totalDocs: allDocs.length,
        });
        setUrgentOrders(urgentList.slice(0, 10));
        setDebts(debtOrders.slice(0, 10));
        setStatusChart(chartData);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [isSales, canViewAllDebt, user]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* 4 Alert Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Clock}
          label="🟡 Sắp Đến Hạn"
          value={stats.approaching ?? 0}
          sub="Còn ≤ 7 ngày đến ngày trả"
          color="yellow"
          delay={0}
        />
        <StatCard
          icon={AlertTriangle}
          label="🔴 Đơn Muộn"
          value={stats.overdue ?? 0}
          sub="Quá hạn giao 1–14 ngày"
          color="red"
          delay={0.05}
        />
        <StatCard
          icon={ShieldAlert}
          label="🔴 Trễ Nghiêm Trọng"
          value={stats.critical ?? 0}
          sub="Quá hạn giao > 14 ngày"
          color="red"
          delay={0.1}
        />
        <StatCard
          icon={AlertCircle}
          label="🟠 Cần Xử Lý"
          value={stats.stalled ?? 0}
          sub="Kẹt > 7 ngày SLA bước"
          color="orange"
          delay={0.15}
        />
      </div>

      {/* Production & Revenue Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Package}
          label="Đang Trong Luồng (B1-B6)"
          value={stats.activeCount ?? 0}
          sub={`Trên tổng số ${stats.totalDocs || 0} đơn`}
          color="blue"
        />
        <StatCard
          icon={DollarSign}
          label="Doanh Thu Tháng Này"
          value={canViewRevenue ? fmtMoney(stats.revenue) : '***'}
          sub="Đơn hàng phát sinh trong tháng"
          color="green"
        />
        <StatCard
          icon={CreditCard}
          label="Công Nợ Chưa Thu"
          value={fmtMoney(stats.totalDebt)}
          sub="Số tiền cọc/thanh toán tồn đọng"
          color="purple"
        />
      </div>

      {/* Urgent Action List & Status Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent Orders List */}
        <div className="lg:col-span-2 erp-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-erp-border">
            <div className="flex items-center gap-2">
              <span className="text-base">🚨</span>
              <h3 className="text-xs font-bold text-erp-text uppercase tracking-wider">
                Đơn Hàng Cần Xử Lý Khẩn Cấp ({urgentOrders.length})
              </h3>
            </div>
            <Link to="/orders" className="text-xs font-semibold text-erp-primary-light hover:underline">
              Xem tất cả ↗
            </Link>
          </div>

          {urgentOrders.length === 0 ? (
            <div className="py-12 text-center text-erp-text-muted text-xs">
              🎉 Tuyệt vời! Không có đơn hàng nào bị trễ hạn hoặc kẹt công đoạn.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Khách hàng</th>
                    <th>Bước</th>
                    <th>Hạn trả (TAT)</th>
                    <th>Cảnh báo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {urgentOrders.map((o) => (
                    <tr key={o.id}>
                      <td className="font-mono text-erp-primary-light font-bold text-xs">
                        {o.orderCode || `#${o.id?.slice(-6)}`}
                      </td>
                      <td className="text-xs font-medium text-erp-text">
                        {typeof o.customer === 'object' ? o.customer?.name : '—'}
                      </td>
                      <td className="text-xs font-semibold text-white uppercase">
                        {o.status}
                      </td>
                      <td className="text-xs font-mono text-erp-text-muted">
                        {fmtDate(o.expectedDeliveryDate)}
                      </td>
                      <td>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold ${o.alert.bg} ${o.alert.color} border border-current/20`}>
                          {o.alert.label}
                        </span>
                      </td>
                      <td className="text-right">
                        <Link
                          to={`/orders/${o.id}`}
                          className="btn btn-secondary !py-1 !px-2 text-[11px]"
                        >
                          Xử lý ↗
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pipeline Distribution Chart */}
        <div className="erp-card p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-erp-border">
            <Factory size={15} className="text-erp-primary-light" />
            <h3 className="text-xs font-bold text-erp-text uppercase tracking-wider">
              Phân Bổ Công Đoạn Sản Xuất
            </h3>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusChart}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusChart.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0];
                    return (
                      <div className="erp-card !p-2 bg-[#0d1420] text-xs shadow-xl">
                        <span className="font-semibold text-white">{data.name}: </span>
                        <strong className="text-erp-primary-light font-mono">{data.value} đơn</strong>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-erp-border text-xs">
            {statusChart.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-erp-text-muted">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  {d.name}
                </span>
                <span className="font-mono text-white font-semibold">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

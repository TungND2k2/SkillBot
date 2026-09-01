import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Package, Clock, AlertTriangle, TrendingDown,
  DollarSign, CreditCard, RefreshCw, BarChart3,
  TrendingUp, ArrowUpRight, CheckCircle2, Factory,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { listDocs, countDocs } from '../api/payload';
import useAuth from '../hooks/useAuth';
import EmptyState from '../components/EmptyState';

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—');
const fmtMoney = (n) => (n != null ? `$${n.toLocaleString()}` : '$0');

const CHART_COLORS = ['#3b82f6', '#06b6d4', '#f59e0b', '#8b5cf6', '#a855f7', '#10b981', '#ef4444', '#64748b'];
const STATUS_NAMES = {
  b1: 'B1 Nhận đơn',
  b2: 'B2 Định mức',
  b3: 'B3 Mua NPL',
  b4: 'B4 Sản xuất',
  b5: 'B5 Kiểm tra QC',
  b6: 'B6 Giao hàng',
  done: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

function StatCard({ icon: Icon, label, value, sub, color = 'blue', delay = 0, trend }) {
  const colorMap = {
    blue: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    green: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    yellow: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    red: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
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

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="erp-card !p-3 border-erp-border bg-[#0d1420] text-xs shadow-xl">
      <p className="text-erp-text-muted mb-1.5 font-medium">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 font-semibold">
          <span className="flex items-center gap-1.5" style={{ color: p.color }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}:
          </span>
          <span className="text-white font-mono tabular-nums">
            {typeof p.value === 'number' && p.name?.includes('$') ? fmtMoney(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

function DebtTable({ debts, loading }) {
  if (loading) {
    return <div className="text-center py-8 text-erp-text-muted text-sm">Đang tải sổ cái công nợ...</div>;
  }
  if (!debts.length) {
    return (
      <EmptyState
        icon={CreditCard}
        title="Không có công nợ tồn"
        description="Tất cả các đơn hàng đã được đối soát thanh toán đầy đủ."
      />
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Mã đơn hàng</th>
            <th>Khách hàng</th>
            <th>Tổng giá trị</th>
            <th>Đã đặt cọc</th>
            <th>Còn nợ</th>
            <th>Hạn giao</th>
          </tr>
        </thead>
        <tbody>
          {debts.map((o) => (
            <tr key={o.id}>
              <td className="font-mono text-erp-primary-light font-bold text-xs">
                {o.orderCode || `#${o.id?.slice(-6)}`}
              </td>
              <td className="text-xs font-medium text-erp-text">
                {typeof o.customer === 'object' ? o.customer?.name : '—'}
              </td>
              <td className="text-xs font-semibold tabular-nums text-white">
                {fmtMoney(o.totalAmount)}
              </td>
              <td className="text-xs text-erp-text-muted tabular-nums">
                {fmtMoney(o.deposit)}
              </td>
              <td className="text-xs font-bold text-amber-400 tabular-nums">
                {fmtMoney(o.owedAmount)}
              </td>
              <td className="text-xs text-erp-text-muted tabular-nums">
                {fmtDate(o.expectedDeliveryDate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DashboardPage() {
  const { canViewRevenue, canViewAllDebt, isSales, user } = useAuth();
  const [stats, setStats] = useState({});
  const [debts, setDebts] = useState([]);
  const [revenueChart, setRevenueChart] = useState([]);
  const [statusChart, setStatusChart] = useState([]);
  const [orderTrend, setOrderTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const activeStatuses = 'b1,b2,b3,b4,b5,b6';
        const [activeOrders, nearDeadline, overdueOrders, allOrders] = await Promise.all([
          countDocs('orders', { status: { in: activeStatuses } }),
          countDocs('orders', {
            and: [
              { status: { in: activeStatuses } },
              { expectedDeliveryDate: { less_than_equal: plusDays(7) } },
              { expectedDeliveryDate: { greater_than_equal: today() } },
            ],
          }),
          countDocs('orders', {
            and: [
              { status: { in: activeStatuses } },
              { expectedDeliveryDate: { less_than: today() } },
            ],
          }),
          listDocs('orders', { limit: 500, depth: 1, sort: '-orderDate' }),
        ]);
        if (cancel) return;

        const allDocs = allOrders?.docs || [];

        // QC error rate
        const qcData = await listDocs('qc-logs', {
          limit: 200,
          depth: 0,
          sort: '-createdAt',
          where: { createdAt: { greater_than_equal: monthStart() } },
        });
        const qcLogs = qcData?.docs || [];
        const totalInspected = qcLogs.reduce((s, l) => s + (l.inspectedQty || 0), 0);
        const totalDefects = qcLogs.reduce((s, l) => s + (l.defectCount || 0), 0);
        const errorRate =
          totalInspected > 0 ? ((totalDefects / totalInspected) * 100).toFixed(1) : '0.0';

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

        // --- CHARTS ---
        const now = new Date();
        const revByMonth = {};
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const label = `T${d.getMonth() + 1}/${d.getFullYear().toString().slice(-2)}`;
          revByMonth[key] = { month: label, revenue: 0, orders: 0 };
        }
        for (const o of allDocs) {
          const d = o.orderDate || o.createdAt;
          if (!d) continue;
          const key = d.slice(0, 7);
          if (revByMonth[key]) {
            revByMonth[key].revenue += o.totalAmount || 0;
            revByMonth[key].orders += 1;
          }
        }

        const statusCount = {};
        for (const o of allDocs) {
          const s = o.status || 'unknown';
          statusCount[s] = (statusCount[s] || 0) + 1;
        }

        setStats({
          active: activeOrders ?? 0,
          nearDeadline: nearDeadline ?? 0,
          overdue: overdueOrders ?? 0,
          errorRate: `${errorRate}%`,
          revenue,
          totalDebt: debtOrders.reduce((s, o) => s + (o.owedAmount || 0), 0),
          debtCount: debtOrders.length,
        });
        setDebts(debtOrders.slice(0, 10));
        setRevenueChart(Object.values(revByMonth));
        setStatusChart(
          Object.entries(statusCount).map(([k, v]) => ({
            name: STATUS_NAMES[k] || k,
            value: v,
          }))
        );
        setOrderTrend(Object.values(revByMonth));
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [canViewAllDebt, isSales, user?.id]);

  const thisMonth = new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-erp-border">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Bàn Làm Việc Điều Hành Sản Xuất</span>
          </h1>
          <p className="text-xs text-erp-text-muted mt-1">
            Tổng quan số liệu tiến độ, doanh số & chỉ số chất lượng · {thisMonth}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="btn btn-secondary text-xs"
          >
            <RefreshCw size={13} />
            <span>Đồng bộ số liệu</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          icon={Package}
          label="Đơn Đang Chạy"
          value={loading ? '...' : stats.active}
          sub="Tiến độ B1 - B6"
          color="blue"
          delay={0}
        />
        <StatCard
          icon={Clock}
          label="Sắp Tới Hạn"
          value={loading ? '...' : stats.nearDeadline}
          sub="Thời hạn ≤ 7 ngày"
          color="yellow"
          delay={0.03}
        />
        <StatCard
          icon={AlertTriangle}
          label="Đơn Quá Hạn"
          value={loading ? '...' : stats.overdue}
          sub="Cần xử lý gấp"
          color="red"
          delay={0.06}
        />
        <StatCard
          icon={TrendingDown}
          label="Tỷ Lệ Lỗi QC"
          value={loading ? '...' : stats.errorRate}
          sub="Tháng hiện tại"
          color="purple"
          delay={0.09}
        />
        {canViewRevenue && (
          <StatCard
            icon={DollarSign}
            label="Doanh Thu Tháng"
            value={loading ? '...' : fmtMoney(stats.revenue)}
            sub={thisMonth}
            color="green"
            delay={0.12}
          />
        )}
        {(canViewRevenue || isSales) && (
          <StatCard
            icon={CreditCard}
            label="Tổng Công Nợ"
            value={loading ? '...' : fmtMoney(stats.totalDebt)}
            sub={`${stats.debtCount || 0} đơn chưa thanh toán`}
            color="yellow"
            delay={0.15}
          />
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Revenue 6 months bar chart */}
        {canViewRevenue && (
          <div className="erp-card p-5 lg:col-span-2 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-erp-text uppercase tracking-wider flex items-center gap-2">
                <BarChart3 size={15} className="text-erp-primary-light" />
                <span>Doanh thu sản xuất 6 tháng gần nhất</span>
              </h3>
              <span className="text-[11px] text-erp-text-dim">Đơn vị: USD ($)</span>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChart} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2d42" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={{ stroke: '#1f2d42' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={{ stroke: '#1f2d42' }}
                    tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="revenue"
                    name="Doanh thu $"
                    fill="#2563eb"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Status Distribution Pie Chart */}
        <div className="erp-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-erp-text uppercase tracking-wider">
              Phân bổ giai đoạn đơn
            </h3>
            <span className="text-[11px] text-erp-text-dim">Tổng số đơn</span>
          </div>
          <div className="h-52 flex items-center justify-center">
            {statusChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChart}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusChart.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-erp-text-dim">Chưa có dữ liệu</p>
            )}
          </div>
          {statusChart.length > 0 && (
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 mt-2 pt-3 border-t border-erp-border">
              {statusChart.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] text-erp-text-muted">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  <span className="truncate">{s.name}:</span>
                  <span className="font-bold text-erp-text ml-auto tabular-nums">{s.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Orders Trend + Debt Ledger */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* Trend Line chart */}
        <div className="xl:col-span-2 erp-card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-erp-text uppercase tracking-wider flex items-center gap-2">
              <TrendingUp size={15} className="text-emerald-400" />
              <span>Sản lượng đơn hàng mới</span>
            </h3>
            <span className="text-[11px] text-erp-text-dim">Số lượng đơn / tháng</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={orderTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2d42" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: '#1f2d42' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: '#1f2d42' }}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="orders"
                  name="Số đơn"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Debt and Accounts Receivable Table */}
        {(canViewRevenue || isSales) && (
          <div className="xl:col-span-3 erp-card p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-erp-text uppercase tracking-wider flex items-center gap-2">
                <CreditCard size={15} className="text-amber-400" />
                <span>Sổ theo dõi công nợ cần thu</span>
              </h3>
              <span className="text-[11px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {debts.length} đơn có nợ
              </span>
            </div>
            <DebtTable debts={debts} loading={loading} />
          </div>
        )}
      </div>
    </div>
  );
}


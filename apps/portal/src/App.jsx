import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FileText, Users, Building2, MessageSquare,
  LogOut, Scissors, Box, Ruler, ClipboardCheck, Bell,
  ChevronLeft, ChevronRight, Factory, ShieldCheck,
  Search, CheckCircle2, User as UserIcon
} from 'lucide-react';
import useAuth from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import CustomersPage from './pages/CustomersPage';
import SuppliersPage from './pages/SuppliersPage';
import FeedbackPage from './pages/FeedbackPage';
import FabricsPage from './pages/FabricsPage';
import InventoryPage from './pages/InventoryPage';
import AllowancesPage from './pages/AllowancesPage';
import QcLogsPage from './pages/QcLogsPage';
import RemindersPage from './pages/RemindersPage';

const ROLE_LABELS = {
  admin: { name: 'Admin', icon: '👑', color: 'red' },
  manager: { name: 'Quản lý', icon: '📋', color: 'blue' },
  salesperson: { name: 'Sales', icon: '💼', color: 'yellow' },
  input: { name: 'Nhập liệu', icon: '⌨️', color: 'cyan' },
  qc: { name: 'Kiểm thử QC', icon: '✅', color: 'green' },
  accountant: { name: 'Kế toán', icon: '💰', color: 'purple' },
  planner: { name: 'Điều phối KHSX', icon: '🔧', color: 'blue' },
  storage: { name: 'Thủ kho', icon: '📦', color: 'yellow' },
};

const ROUTE_NAMES = {
  '/': { section: 'Tổng quan', title: 'Bàn làm việc Dashboard' },
  '/orders': { section: 'Vận hành', title: 'Quản lý Đơn hàng' },
  '/customers': { section: 'Vận hành', title: 'Danh bạ Khách hàng' },
  '/suppliers': { section: 'Vận hành', title: 'Danh bạ Nhà cung cấp' },
  '/fabrics': { section: 'Sản xuất', title: 'Danh mục Mã vải' },
  '/inventory': { section: 'Sản xuất', title: 'Quản lý Tồn kho' },
  '/allowances': { section: 'Sản xuất', title: 'Định mức & Hao phí (BOM)' },
  '/qc-logs': { section: 'Chất lượng', title: 'Nhật ký Kiểm tra QC' },
  '/feedback': { section: 'Chất lượng', title: 'Phản hồi & Xuất hàng' },
  '/reminders': { section: 'Hệ thống', title: 'Lịch nhắc việc tự động' },
};

function Logo({ collapsed }) {
  return (
    <div className={`px-4 py-4 border-b border-erp-border flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-erp-primary flex items-center justify-center text-white font-black text-sm shadow-erp-sm shrink-0">
          <Factory size={18} />
        </div>
        {!collapsed && (
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-tight text-white">SKILLBOT</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-erp-primary/20 text-erp-primary-light font-bold rounded border border-erp-primary/30">
                ERP
              </span>
            </div>
            <p className="text-[10px] text-erp-text-dim uppercase tracking-wider font-semibold">
              Hệ thống Sản xuất
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SidebarItem({ to, icon: Icon, label, end, collapsed }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `sidebar-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0 py-2.5' : ''}`
      }
      title={collapsed ? label : undefined}
    >
      <Icon size={16} className="shrink-0" />
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
    </NavLink>
  );
}

function Sidebar({ user, onLogout, collapsed, setCollapsed }) {
  const role = user?.role ?? '';
  const canViewCustomers = ['admin', 'manager'].includes(role);
  const canViewSuppliers = ['admin', 'manager', 'input', 'qc'].includes(role);

  const groups = [
    {
      label: 'Tổng quan',
      items: [{ to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true }],
    },
    {
      label: 'Vận hành',
      items: [
        { to: '/orders', icon: FileText, label: 'Đơn hàng' },
        ...(canViewCustomers ? [{ to: '/customers', icon: Users, label: 'Khách hàng' }] : []),
        ...(canViewSuppliers ? [{ to: '/suppliers', icon: Building2, label: 'Nhà cung cấp' }] : []),
      ],
    },
    {
      label: 'Sản xuất',
      items: [
        { to: '/fabrics', icon: Scissors, label: 'Mã vải' },
        { to: '/inventory', icon: Box, label: 'Tồn kho NPL' },
        { to: '/allowances', icon: Ruler, label: 'Định mức kỹ thuật' },
      ],
    },
    {
      label: 'Chất lượng',
      items: [
        { to: '/qc-logs', icon: ClipboardCheck, label: 'Nhật ký QC' },
        { to: '/feedback', icon: MessageSquare, label: 'Feedback khách' },
      ],
    },
    {
      label: 'Hệ thống',
      items: [{ to: '/reminders', icon: Bell, label: 'Lịch nhắc việc' }],
    },
  ];

  const roleInfo = ROLE_LABELS[role] || { name: role, icon: '👤', color: 'gray' };

  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-60'
      } bg-erp-sidebar border-r border-erp-border flex flex-col shrink-0 h-screen transition-all duration-200 z-30 select-none`}
    >
      <Logo collapsed={collapsed} />

      {/* Navigation Groups */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto no-scrollbar">
        {groups.map(({ label, items }) => (
          <div key={label}>
            {!collapsed ? (
              <h3 className="px-2 mb-1.5 text-[10px] font-bold text-erp-text-dim uppercase tracking-wider">
                {label}
              </h3>
            ) : (
              <div className="h-px bg-erp-border my-2 mx-1" />
            )}
            <div className="space-y-1">
              {items.map((item) => (
                <SidebarItem key={item.to} collapsed={collapsed} {...item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Toggle collapse & User Profile footer */}
      <div className="p-3 border-t border-erp-border bg-[#0a0f1a] space-y-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-1.5 rounded-md text-erp-text-dim hover:text-white hover:bg-white/5 transition-colors text-xs"
          title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
        >
          {collapsed ? <ChevronRight size={16} /> : (
            <div className="flex items-center justify-between w-full px-2">
              <span className="text-[11px] font-medium text-erp-text-muted">Thu gọn menu</span>
              <ChevronLeft size={15} />
            </div>
          )}
        </button>

        <div className={`flex items-center gap-2.5 p-1.5 rounded-lg bg-erp-surface border border-erp-border ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-7 h-7 rounded bg-erp-primary/20 border border-erp-primary/30 flex items-center justify-center text-erp-primary-light text-xs font-bold shrink-0">
            {(user?.displayName || user?.email || '?')[0]?.toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-erp-text truncate leading-tight">
                {user?.displayName || user?.email}
              </p>
              <p className="text-[10px] text-erp-text-muted flex items-center gap-1 mt-0.5">
                <span>{roleInfo.icon}</span>
                <span>{roleInfo.name}</span>
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={onLogout}
              className="p-1 rounded text-erp-text-dim hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Đăng xuất"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

function TopHeader({ user, onLogout }) {
  const location = useLocation();
  const currentRoute = ROUTE_NAMES[location.pathname] || {
    section: 'Vận hành',
    title: location.pathname.startsWith('/orders/') ? 'Chi tiết đơn hàng' : 'Trang làm việc',
  };

  return (
    <header className="h-14 border-b border-erp-border bg-erp-surface flex items-center justify-between px-6 shrink-0 z-20">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-erp-text-dim font-medium">{currentRoute.section}</span>
        <span className="text-erp-text-dim">/</span>
        <span className="text-erp-text font-semibold">{currentRoute.title}</span>
      </div>

      {/* Center/Right Status Indicators & User Profile */}
      <div className="flex items-center gap-4">
        {/* System Status badge */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Hệ thống ERP Sẵn sàng</span>
        </div>

        {/* Factory Info */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-erp-text-muted bg-erp-card px-2.5 py-1 rounded border border-erp-border">
          <Factory size={13} className="text-erp-primary-light" />
          <span>Xưởng May & Thêu SkillBot</span>
        </div>

        {/* Quick User Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-colors"
          >
            <LogOut size={13} />
            <span>Thoát</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function PageWrapper({ children }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="flex-1 overflow-y-auto bg-erp-bg"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

function Layout() {
  const { user, logout, canViewCustomers, canViewSuppliers } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-erp-bg font-sans antialiased">
      <Sidebar
        user={user}
        onLogout={logout}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopHeader user={user} onLogout={logout} />
        <PageWrapper>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route
              path="/customers"
              element={canViewCustomers ? <CustomersPage /> : <Navigate to="/" replace />}
            />
            <Route
              path="/suppliers"
              element={canViewSuppliers ? <SuppliersPage /> : <Navigate to="/" replace />}
            />
            <Route path="/fabrics" element={<FabricsPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/allowances" element={<AllowancesPage />} />
            <Route path="/qc-logs" element={<QcLogsPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/reminders" element={<RemindersPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </PageWrapper>
      </main>
    </div>
  );
}

export default function App() {
  const { isLoggedIn } = useAuth();
  return (
    <BrowserRouter>
      {isLoggedIn ? <Layout /> : <LoginPage />}
    </BrowserRouter>
  );
}


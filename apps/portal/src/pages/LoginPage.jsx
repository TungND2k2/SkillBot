import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock, AlertCircle, Factory, ShieldCheck } from 'lucide-react';
import { login } from '../api/payload';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      window.location.reload();
    } catch (err) {
      setError(err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-erp-bg px-4 select-none relative overflow-hidden font-sans">
      {/* Background subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#3b82f6 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-md z-10"
      >
        <div className="erp-card bg-erp-surface border-erp-border p-8 shadow-2xl">
          {/* Header Brand */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-erp-primary flex items-center justify-center text-white font-black text-xl shadow-erp-md mb-3 border border-erp-primary-light/40">
              <Factory size={26} />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-erp-text">SKILLBOT</h1>
              <span className="text-xs px-2 py-0.5 bg-erp-primary/20 text-erp-primary-light font-bold rounded border border-erp-primary/30">
                ERP v2.0
              </span>
            </div>
            <p className="text-xs text-erp-text-muted mt-1">
              Hệ Thống Quản Lý Sản Xuất & Điều Phối Đơn Hàng
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-erp-text-muted uppercase tracking-wider mb-1.5 block">
                Tài khoản Email / Mã nhân sự
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-erp-text-dim" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="erp-input pl-10"
                  placeholder="admin@skillbot.local"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-erp-text-muted uppercase tracking-wider mb-1.5 block">
                Mật khẩu hệ thống
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-erp-text-dim" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="erp-input pl-10"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-medium"
              >
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center text-sm py-2.5 mt-2"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={16} />
                  <span>Đăng nhập hệ thống</span>
                </>
              )}
            </button>
          </form>

          {/* ERP notice footer */}
          <div className="mt-6 pt-5 border-t border-erp-border/60 flex items-center justify-between text-[11px] text-erp-text-dim">
            <span className="flex items-center gap-1">
              <ShieldCheck size={13} className="text-emerald-400" /> Cổng kết nối bảo mật nội bộ
            </span>
            <span>SkillBot Enterprise</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


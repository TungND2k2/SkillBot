import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, wide, subtitle }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      const onKey = (e) => e.key === 'Escape' && onClose?.();
      window.addEventListener('keydown', onKey);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', onKey);
      };
    }
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/75 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`relative erp-card bg-[#111827] border-erp-border p-0 ${
              wide ? 'w-full max-w-2xl' : 'w-full max-w-lg'
            } max-h-[90vh] flex flex-col shadow-2xl z-10 overflow-hidden`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-erp-border bg-[#0d131f]">
              <div>
                <h2 className="text-sm font-bold text-erp-text tracking-wide">{title}</h2>
                {subtitle && <p className="text-[11px] text-erp-text-muted mt-0.5">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-md text-erp-text-muted hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function FormField({ label, children, hint, required }) {
  return (
    <div className="mb-4">
      <label className="text-[11px] font-semibold text-erp-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1">
        <span>{label}</span>
        {required && <span className="text-red-400 font-bold">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-erp-text-dim mt-1">{hint}</p>}
    </div>
  );
}


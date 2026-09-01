import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-erp-border rounded-xl bg-erp-card/50 my-4"
    >
      <div className="w-14 h-14 rounded-xl bg-erp-surface border border-erp-border flex items-center justify-center mb-4 text-erp-text-muted shadow-erp-sm">
        {Icon && <Icon size={24} className="text-erp-text-dim" />}
      </div>
      <h3 className="text-sm font-semibold text-erp-text mb-1">{title || 'Không có dữ liệu'}</h3>
      {description && (
        <p className="text-xs text-erp-text-muted mb-5 text-center max-w-sm">{description}</p>
      )}
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn btn-primary text-xs">
          <Plus size={14} /> {actionLabel}
        </button>
      )}
    </motion.div>
  );
}


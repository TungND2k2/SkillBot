import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

export default function Select({ value, onChange, options, placeholder = 'Chọn giá trị...', className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find((o) => (typeof o === 'object' ? o.value : o) === value);
  const displayLabel = selected ? (typeof selected === 'object' ? selected.label : selected) : placeholder;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`erp-input w-full flex items-center justify-between gap-2 text-left cursor-pointer transition-all ${
          open ? 'border-erp-primary-light ring-2 ring-erp-primary-glow' : ''
        }`}
      >
        <span className={`truncate text-xs ${value ? 'text-erp-text font-medium' : 'text-erp-text-dim'}`}>
          {displayLabel}
        </span>
        <ChevronDown
          size={14}
          className={`text-erp-text-muted shrink-0 transition-transform duration-150 ${open ? 'rotate-180 text-erp-primary-light' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.99 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 max-h-60 overflow-y-auto rounded-lg border border-erp-border bg-[#0f172a] shadow-xl"
          >
            {options.map((opt, i) => {
              const optValue = typeof opt === 'object' ? opt.value : opt;
              const optLabel = typeof opt === 'object' ? opt.label : opt;
              const isSelected = optValue === value;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onChange(optValue);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors border-b border-erp-border/30 last:border-b-0 ${
                    isSelected
                      ? 'bg-erp-primary-glow text-erp-primary-light font-semibold'
                      : 'text-erp-text-muted hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  <span className="flex-1 truncate">{optLabel}</span>
                  {isSelected && <Check size={13} className="text-erp-primary-light shrink-0" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


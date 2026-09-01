import React from 'react';
import clsx from 'clsx';

const BADGE_MAP = {
  // Order production stages (B1 -> B6, done, cancelled)
  b1: { label: 'B1 Nhận đơn', color: 'blue', dot: '#3b82f6' },
  b2: { label: 'B2 Định mức', color: 'cyan', dot: '#06b6d4' },
  b3: { label: 'B3 Mua NPL', color: 'yellow', dot: '#f59e0b' },
  b4: { label: 'B4 Sản xuất', color: 'purple', dot: '#8b5cf6' },
  b5: { label: 'B5 Kiểm tra QC', color: 'purple', dot: '#a855f7' },
  b6: { label: 'B6 Giao hàng', color: 'green', dot: '#10b981' },
  done: { label: 'Hoàn thành', color: 'green', dot: '#10b981' },
  cancelled: { label: 'Đã hủy', color: 'red', dot: '#ef4444' },

  // Inventory statuses
  ok: { label: 'Đủ tồn kho', color: 'green', dot: '#10b981' },
  low: { label: 'Sắp hết hàng', color: 'yellow', dot: '#f59e0b' },
  critical: { label: 'Cảnh báo tồn', color: 'red', dot: '#ef4444' },
  empty: { label: 'Hết hàng', color: 'red', dot: '#dc2626' },

  // Allowance BOM statuses
  draft: { label: 'Bản nháp', color: 'gray', dot: '#94a3b8' },
  pending: { label: 'Chờ duyệt', color: 'yellow', dot: '#f59e0b' },
  approved: { label: 'Đã phê duyệt', color: 'green', dot: '#10b981' },
  rejected: { label: 'Từ chối', color: 'red', dot: '#ef4444' },

  // QC inspection conclusions
  pass: { label: 'Đạt chuẩn (Pass)', color: 'green', dot: '#10b981' },
  fail: { label: 'Không đạt (Trả NCC)', color: 'red', dot: '#ef4444' },

  // Reminders
  scheduled: { label: 'Đã lên lịch', color: 'blue', dot: '#3b82f6' },
  sent: { label: 'Đã gửi nhắc', color: 'green', dot: '#10b981' },

  // General statuses
  active: { label: 'Đang hoạt động', color: 'green', dot: '#10b981' },
  inactive: { label: 'Tạm ngừng', color: 'red', dot: '#ef4444' },
};

export default function StatusBadge({ status, label: customLabel, color: customColor, size = 'sm', showDot = true }) {
  const mapped = BADGE_MAP[status] || {};
  const label = customLabel || mapped.label || status || '—';
  const color = customColor || mapped.color || 'gray';
  const dotColor = mapped.dot || '#94a3b8';

  return (
    <span
      className={clsx(
        'badge font-medium',
        color,
        size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-[11px] px-2.5 py-1'
      )}
    >
      {showDot && (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: dotColor }}
        />
      )}
      <span>{label}</span>
    </span>
  );
}

export function StarRating({ value = 0, max = 5 }) {
  return (
    <span className="stars text-xs tabular-nums">
      {Array.from({ length: max }, (_, i) => (i < value ? '★' : '☆')).join('')}
    </span>
  );
}


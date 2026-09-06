'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useField, useDocumentInfo } from '@payloadcms/ui';

interface MediaLinkImporterProps {
  path?: string;
  readOnly?: boolean;
}

export default function MediaLinkImporter({ path = 'externalUrl', readOnly }: MediaLinkImporterProps) {
  const { value, setValue } = useField<string>({ path });
  const altField = useField<string>({ path: 'alt' });
  const kindField = useField<string>({ path: 'kind' });
  const fileField = useField<any>({ path: 'file' });
  const docInfo = useDocumentInfo();

  const [inputUrl, setInputUrl] = useState<string>(value || '');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync external value
  useEffect(() => {
    if (value && value !== inputUrl) {
      setInputUrl(value);
    }
  }, [value]);

  // Phân tích domain & service
  const detectService = (url: string) => {
    const lower = url.toLowerCase();
    if (lower.includes('docs.google.com/spreadsheets')) {
      return {
        type: 'google_sheet',
        label: 'Google Sheets (Bảng tính)',
        icon: '📊',
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.12)',
        borderColor: 'rgba(16, 185, 129, 0.3)',
        suggestedKind: 'invoice',
      };
    }
    if (lower.includes('drive.google.com')) {
      return {
        type: 'google_drive',
        label: 'Google Drive (Thư mục / Tệp)',
        icon: '📁',
        color: '#38bdf8',
        bg: 'rgba(56, 189, 248, 0.12)',
        borderColor: 'rgba(56, 189, 248, 0.3)',
        suggestedKind: 'brief',
      };
    }
    if (lower.includes('figma.com') || lower.includes('canva.com')) {
      return {
        type: 'design',
        label: 'Thiết kế Online (Figma / Canva)',
        icon: '🎨',
        color: '#ec4899',
        bg: 'rgba(236, 72, 153, 0.12)',
        borderColor: 'rgba(236, 72, 153, 0.3)',
        suggestedKind: 'design',
      };
    }
    return {
      type: 'web',
      label: 'Liên kết ngoài (Web URL)',
      icon: '🔗',
      color: '#a855f7',
      bg: 'rgba(168, 85, 247, 0.12)',
      borderColor: 'rgba(168, 85, 247, 0.3)',
      suggestedKind: 'partner_doc',
    };
  };

  // Sinh companion SVG file cho Payload file field
  const generateCompanionFile = (url: string, serviceInfo: ReturnType<typeof detectService>) => {
    const cleanUrl = url.trim();
    const title = altField.value || serviceInfo.label;
    const safeTitle = title.replace(/[<>&"]/g, '');
    const safeUrl = cleanUrl.replace(/[<>&"]/g, '');
    const displayUrl = safeUrl.length > 70 ? `${safeUrl.slice(0, 70)}...` : safeUrl;

    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#030712"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)" rx="16"/>
  <rect x="2" y="2" width="796" height="446" fill="none" stroke="${serviceInfo.color}" stroke-opacity="0.35" stroke-width="2" rx="14"/>
  <circle cx="80" cy="80" r="36" fill="${serviceInfo.color}" fill-opacity="0.2"/>
  <text x="80" y="92" font-size="34" text-anchor="middle" fill="#ffffff">${serviceInfo.icon}</text>
  <text x="135" y="75" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="22" font-weight="bold" fill="#ffffff">${safeTitle}</text>
  <text x="135" y="100" font-family="-apple-system, monospace" font-size="14" fill="${serviceInfo.color}">${serviceInfo.label}</text>
  <rect x="50" y="140" width="700" height="60" rx="8" fill="#0b0f19" stroke="rgba(255,255,255,0.08)"/>
  <text x="70" y="176" font-family="monospace" font-size="13" fill="#38bdf8">${displayUrl}</text>
  <rect x="50" y="230" width="220" height="46" rx="8" fill="#2563eb"/>
  <text x="160" y="259" font-family="-apple-system, sans-serif" font-size="15" font-weight="bold" text-anchor="middle" fill="#ffffff">↗ MỞ LIÊN KẾT GỐC</text>
  <text x="50" y="410" font-family="-apple-system, sans-serif" font-size="12" fill="#64748b">SkillBot ERP • Hệ thống quản lý may thêu xuất khẩu</text>
</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const slug = serviceInfo.type.replace(/_/g, '-');
    const filename = `${slug}-${Date.now()}.svg`;
    return new File([blob], filename, { type: 'image/svg+xml', lastModified: Date.now() });
  };

  const handleApplyUrl = useCallback((rawUrl?: string) => {
    const targetUrl = (rawUrl ?? inputUrl).trim();
    if (!targetUrl) return;

    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      alert('Vui lòng nhập đường dẫn hợp lệ bắt đầu bằng https:// hoặc http://');
      return;
    }

    setLoading(true);
    try {
      const service = detectService(targetUrl);

      // Cập nhật trường externalUrl
      setValue(targetUrl);

      // Tự động gợi ý alt nếu trống
      if (!altField.value) {
        if (service.type === 'google_sheet') {
          altField.setValue('Google Sheets - Bảng tính');
        } else if (service.type === 'google_drive') {
          altField.setValue('Google Drive - Tài liệu');
        } else {
          altField.setValue(`Tài liệu - ${new URL(targetUrl).hostname}`);
        }
      }

      // Tự động gợi ý kind nếu trống
      if (!kindField.value && service.suggestedKind) {
        kindField.setValue(service.suggestedKind);
      }

      // Tạo companion file gắn vào Payload upload field
      const companionFile = generateCompanionFile(targetUrl, service);
      if (fileField.setValue) {
        fileField.setValue(companionFile);
      }

      setSuccessMsg(`Đã nhận diện ${service.label}! File đính kèm đã sẵn sàng. Bạn có thể nhấn 'Lưu'.`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (e) {
      console.error('Lỗi khi nạp link:', e);
    } finally {
      setLoading(false);
    }
  }, [inputUrl, setValue, altField, kindField, fileField]);

  // Hook lắng nghe sự kiện change trên native remote URL box
  useEffect(() => {
    const handleNativeInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target && target.classList.contains('file-field__remote-file')) {
        const val = target.value.trim();
        if (val.startsWith('http://') || val.startsWith('https://')) {
          setInputUrl(val);
          handleApplyUrl(val);
        }
      }
    };

    document.addEventListener('change', handleNativeInput, true);
    return () => {
      document.removeEventListener('change', handleNativeInput, true);
    };
  }, [handleApplyUrl]);

  const currentService = value ? detectService(value) : null;

  return (
    <div
      style={{
        background: 'linear-gradient(145deg, #090e1d 0%, #050811 100%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        padding: '18px 20px',
        marginBottom: 24,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🔗</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.01em' }}>
            Dán liên kết trực tuyến (Google Sheets, Drive, Figma, v.v.)
          </span>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: 6,
            background: 'rgba(56, 189, 248, 0.12)',
            color: '#38bdf8',
            border: '1px solid rgba(56, 189, 248, 0.25)',
          }}
        >
          Hỗ trợ Không Cần File Thô
        </span>
      </div>

      <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 12px 0', lineHeight: 1.5 }}>
        Nếu tài liệu là một link online (Google Sheet, Google Drive, Excel Web, Figma...), hãy dán link vào đây. Hệ thống sẽ tự động tạo file đại diện để bạn lưu tức thì mà không gặp lỗi!
      </p>

      {/* Input Bar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <input
          type="text"
          value={inputUrl}
          disabled={readOnly}
          onChange={(e) => setInputUrl(e.target.value)}
          placeholder="https://docs.google.com/spreadsheets/d/... hoặc https://drive.google.com/..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleApplyUrl();
            }
          }}
          style={{
            flex: 1,
            background: '#0b0f19',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 8,
            color: '#f8fafc',
            padding: '10px 14px',
            fontSize: 13,
            outline: 'none',
            transition: 'border-color 0.15s ease',
          }}
        />

        <button
          type="button"
          disabled={readOnly || loading || !inputUrl.trim()}
          onClick={() => handleApplyUrl()}
          style={{
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: '#ffffff',
            border: '1px solid #3b82f6',
            borderRadius: 8,
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 700,
            cursor: loading || !inputUrl.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !inputUrl.trim() ? 0.6 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 10px rgba(37, 99, 235, 0.35)',
          }}
        >
          {loading ? 'Đang nạp...' : '✨ Nạp Link Này'}
        </button>
      </div>

      {/* Quick Type Chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {[
          { label: '📊 Google Sheets', url: 'https://docs.google.com/spreadsheets/' },
          { label: '📁 Google Drive', url: 'https://drive.google.com/drive/' },
          { label: '🎨 Figma / Canva', url: 'https://www.figma.com/' },
        ].map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              if (!inputUrl) setInputUrl(item.url);
            }}
            style={{
              background: '#080d1a',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#94a3b8',
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 11,
              cursor: 'pointer',
              transition: 'all 0.12s ease',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Notification Toast inline */}
      {successMsg && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: 8,
            padding: '10px 14px',
            color: '#34d399',
            fontSize: 12.5,
            fontWeight: 600,
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>✅</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Active Link Preview Card */}
      {value && currentService && (
        <div
          style={{
            background: currentService.bg,
            border: `1px solid ${currentService.borderColor}`,
            borderRadius: 10,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
            <span style={{ fontSize: 22 }}>{currentService.icon}</span>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: currentService.color }}>
                {currentService.label}
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: '#e2e8f0',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 420,
                  fontFamily: 'monospace',
                }}
              >
                {value}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(value);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              style={{
                background: '#0b0f19',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: copied ? '#34d399' : '#cbd5e1',
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {copied ? '✓ Đã sao chép' : '📋 Copy Link'}
            </button>

            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: currentService.color,
                color: '#ffffff',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                boxShadow: `0 2px 8px ${currentService.color}40`,
              }}
            >
              <span>↗ Mở Link Gốc</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

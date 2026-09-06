'use client';

/**
 * Block xem trước PDF & Tài liệu trực tuyến (Google Sheets, Drive, v.v.)
 * trong Edit view của collection Media.
 */

import React, { useState } from 'react';
import { useDocumentInfo } from '@payloadcms/ui';

interface MediaDoc {
  mimeType?: string;
  url?: string;
  filename?: string;
  externalUrl?: string;
  alt?: string;
}

export default function MediaPdfPreview() {
  const info = useDocumentInfo();
  const doc = (info?.savedDocumentData ?? {}) as MediaDoc;
  const [copied, setCopied] = useState(false);

  // 1. Nếu có externalUrl (Google Sheets, Drive, Web...)
  if (doc.externalUrl) {
    const isGoogleSheet = doc.externalUrl.includes('docs.google.com/spreadsheets');
    const isGoogleDrive = doc.externalUrl.includes('drive.google.com');

    // Chuyển link Google Sheets sang dạng preview nhúng nếu có thể
    let embedUrl = doc.externalUrl;
    if (isGoogleSheet && doc.externalUrl.includes('/edit')) {
      embedUrl = doc.externalUrl.replace(/\/edit.*$/, '/preview');
    } else if (isGoogleDrive && doc.externalUrl.includes('/view')) {
      embedUrl = doc.externalUrl.replace(/\/view.*$/, '/preview');
    }

    return (
      <div
        style={{
          marginTop: 24,
          marginBottom: 24,
          background: 'linear-gradient(145deg, #090e1d 0%, #050811 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>{isGoogleSheet ? '📊' : isGoogleDrive ? '📁' : '🔗'}</span>
            <div>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#ffffff' }}>
                {isGoogleSheet ? 'Bảng tính Google Sheets' : isGoogleDrive ? 'Tài liệu Google Drive' : 'Liên kết tài liệu trực tuyến'}
              </h4>
              <p style={{ margin: '3px 0 0 0', fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>
                {doc.externalUrl.length > 80 ? `${doc.externalUrl.slice(0, 80)}...` : doc.externalUrl}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(doc.externalUrl ?? '');
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              style={{
                background: '#0b0f19',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: copied ? '#34d399' : '#cbd5e1',
                padding: '7px 12px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {copied ? '✓ Đã sao chép' : '📋 Copy Link'}
            </button>

            <a
              href={doc.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                border: '1px solid #3b82f6',
                padding: '7px 16px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 10px rgba(37, 99, 235, 0.4)',
              }}
            >
              <span>↗ Mở Link Trong Tab Mới</span>
            </a>
          </div>
        </div>

        {/* Embedded Iframe Preview nếu là Google Sheet / Drive */}
        {(isGoogleSheet || isGoogleDrive) && (
          <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <iframe
              title={`Preview ${doc.alt || 'Online Document'}`}
              src={embedUrl}
              style={{
                width: '100%',
                height: 580,
                border: 'none',
                background: '#ffffff',
              }}
            />
          </div>
        )}
      </div>
    );
  }

  // 2. Nếu là PDF nhị phân
  if (doc.mimeType === 'application/pdf' && doc.url) {
    return (
      <div style={{ marginTop: 24, marginBottom: 24 }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#f8fafc' }}>📄 Xem trước PDF</h4>
        <iframe
          title={`Preview ${doc.filename ?? 'PDF'}`}
          src={doc.url}
          style={{
            width: '100%',
            height: 720,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 8,
          }}
        />
        <p style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
          Cuộn/zoom bằng trình xem PDF của trình duyệt. Nếu trắng, mở file ở tab mới qua link tải.
        </p>
      </div>
    );
  }

  return null;
}

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: isGoogleSheet ? 'rgba(16, 185, 129, 0.15)' : isGoogleDrive ? 'rgba(56, 189, 248, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                color: isGoogleSheet ? '#10b981' : isGoogleDrive ? '#38bdf8' : '#a855f7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              {isGoogleSheet ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ) : isGoogleDrive ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              )}
            </div>
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
              {copied ? 'Đã sao chép' : 'Sao chép liên kết'}
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
              <span>Mở Tab Mới</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
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
        <h4 style={{ margin: '0 0 8px 0', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Xem trước PDF
        </h4>
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

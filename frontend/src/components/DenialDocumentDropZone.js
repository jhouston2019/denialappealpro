import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { mapExtractedToForm } from '../utils/mapExtractedToForm';
import { useAppeal } from '../context/AppealContext';

function fileMatchesAccept(file, acceptAttr) {
  if (!acceptAttr?.trim() || !file?.name) return true;
  const lower = file.name.toLowerCase();
  const parts = acceptAttr.split(',').map((p) => p.trim().toLowerCase());
  return parts.some((p) => {
    if (p.startsWith('.')) return lower.endsWith(p);
    if (p === 'application/pdf') return lower.endsWith('.pdf');
    if (p.startsWith('image/')) return lower.match(/\.(png|jpe?g|gif|webp)$/);
    return false;
  });
}

function isPdfFile(file) {
  if (!file) return false;
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

function formatFileSize(bytes) {
  if (bytes == null || Number.isNaN(bytes)) return '';
  const n = Number(bytes);
  if (n === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(n) / Math.log(k)));
  const val = n / k ** i;
  const dec = i > 0 ? 1 : 0;
  return `${parseFloat(val.toFixed(dec))} ${sizes[i]}`;
}

/**
 * Drop zone + file input for denial letter / EOB uploads.
 * Highlights while a file is dragged over the zone.
 *
 * When `extractAfterDrop` is true and the file is a PDF, uploads to
 * `/api/parse/denial-letter`, maps fields into global appeal context, and
 * optionally navigates or calls `onExtractSuccess`. Non-PDF files fall back to `onFile` only.
 */
export default function DenialDocumentDropZone({
  accept,
  onFile,
  disabled = false,
  inputId = 'denial-document-file',
  children,
  style: outerStyle,
  extractAfterDrop = false,
  onExtractSuccess,
  onExtractError,
  onParseResult,
  navigateAfterExtract,
  onUploadingChange,
  /** When set, plain-text clipboard paste is routed here (e.g. switch to paste mode). */
  onPasteText,
  /** When set, show file-received confirmation (green border, ✓, name, size, remove). */
  confirmedFile = null,
  onRemoveFile,
  /** Pulsing border while parent runs extraction */
  extracting = false,
}) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pasteDetected, setPasteDetected] = useState(false);
  const depth = useRef(0);
  const pasteFeedbackTimerRef = useRef(null);
  const handleChosenFileRef = useRef(() => {});
  const navigate = useNavigate();
  const { setAppealData, setUploadedFile } = useAppeal();

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  const resetDepth = useCallback(() => {
    depth.current = 0;
    setDragOver(false);
  }, []);

  const runExtractPipeline = async (file) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/api/parse/denial-letter', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const payload = response.data;
      onParseResult?.(payload);

      if (payload?.success) {
        const mapped = mapExtractedToForm(payload);
        if (!mapped.payer_name || !mapped.claim_number) {
          console.warn('Extraction incomplete:', mapped);
        }
        setAppealData(mapped);
        setUploadedFile(file);
        onFile?.(file);
        onExtractSuccess?.(payload);
        if (navigateAfterExtract) {
          navigate(navigateAfterExtract);
        }
      } else {
        throw new Error(payload?.message || payload?.error || 'Extraction failed');
      }
    } catch (err) {
      console.error('Denial extract error:', err);
      onExtractError?.(err);
      setUploadedFile(file);
      onFile?.(file);
    } finally {
      setUploading(false);
    }
  };

  const handleChosenFile = (file) => {
    if (!file) return;

    if (extractAfterDrop && isPdfFile(file)) {
      void runExtractPipeline(file);
      return;
    }

    setUploadedFile(file);
    onFile?.(file);
  };

  handleChosenFileRef.current = handleChosenFile;

  const flashPasteDetected = useCallback(() => {
    setPasteDetected(true);
    if (pasteFeedbackTimerRef.current) clearTimeout(pasteFeedbackTimerRef.current);
    pasteFeedbackTimerRef.current = setTimeout(() => {
      setPasteDetected(false);
      pasteFeedbackTimerRef.current = null;
    }, 2000);
  }, []);

  useEffect(() => () => {
    if (pasteFeedbackTimerRef.current) clearTimeout(pasteFeedbackTimerRef.current);
  }, []);

  const busy = disabled || uploading || extracting;

  useEffect(() => {
    if (busy) return undefined;

    const onPaste = (e) => {
      const el = document.activeElement;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) {
        return;
      }

      const cd = e.clipboardData;
      if (!cd) return;

      if (cd.files && cd.files.length > 0) {
        const file = cd.files[0];
        if (fileMatchesAccept(file, accept)) {
          e.preventDefault();
          flashPasteDetected();
          handleChosenFileRef.current(file);
        }
        return;
      }

      for (let i = 0; i < cd.items.length; i += 1) {
        const item = cd.items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file && fileMatchesAccept(file, accept)) {
            e.preventDefault();
            flashPasteDetected();
            handleChosenFileRef.current(file);
            return;
          }
        }
      }

      let stringItem = null;
      for (let i = 0; i < cd.items.length; i += 1) {
        const item = cd.items[i];
        if (item.kind === 'string' && item.type === 'text/plain') {
          stringItem = item;
          break;
        }
      }
      if (!stringItem) {
        for (let i = 0; i < cd.items.length; i += 1) {
          const item = cd.items[i];
          if (item.kind === 'string') {
            stringItem = item;
            break;
          }
        }
      }
      if (stringItem) {
        e.preventDefault();
        stringItem.getAsString((text) => {
          if (!text?.trim()) return;
          flashPasteDetected();
          if (onPasteText) {
            onPasteText(text);
          } else {
            console.warn('Paste detected but no handler attached');
          }
        });
      }
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [busy, accept, onPasteText, flashPasteDetected]);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || uploading || extracting) return;
    depth.current += 1;
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    depth.current -= 1;
    if (depth.current <= 0) {
      depth.current = 0;
      setDragOver(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    resetDepth();
    if (disabled || uploading || extracting) return;
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!fileMatchesAccept(file, accept)) return;
    handleChosenFile(file);
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleChosenFile(file);
  };

  const confirmed = confirmedFile && confirmedFile.name;
  const baseBorder = confirmed
    ? '2px solid #22c55e'
    : `2px dashed ${dragOver ? '#22c55e' : '#cbd5e1'}`;

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        border: baseBorder,
        borderRadius: 12,
        padding: 20,
        background: confirmed || dragOver ? '#f0fdf4' : '#ffffff',
        transition: 'border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease',
        boxSizing: 'border-box',
        animation: extracting ? 'dapZonePulse 1.2s ease-in-out infinite' : undefined,
        ...outerStyle,
      }}
    >
      <style>{`
        @keyframes dapZonePulse {
          0%, 100% { box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.25); }
          50% { box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.45); }
        }
      `}</style>
      <input
        id={inputId}
        type="file"
        accept={accept}
        disabled={busy}
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />
      {confirmed ? (
        <div
          style={{
            textAlign: 'center',
            padding: '8px 4px',
          }}
        >
          <div
            style={{
              fontSize: 28,
              lineHeight: 1,
              color: '#22c55e',
              marginBottom: 10,
            }}
            aria-hidden="true"
          >
            ✓
          </div>
          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 15, wordBreak: 'break-word' }}>
            {confirmedFile.name} · {formatFileSize(confirmedFile.size)}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemoveFile?.();
            }}
            style={{
              marginTop: 14,
              background: 'none',
              border: 'none',
              cursor: busy ? 'not-allowed' : 'pointer',
              color: '#64748b',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'underline',
              padding: '8px 12px',
            }}
          >
            × Remove
          </button>
          <p style={{ margin: '12px 0 0', fontSize: 12, color: '#94a3b8' }}>
            Drop another file or use Remove to start over
          </p>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          style={{
            display: 'block',
            cursor: busy ? 'not-allowed' : 'pointer',
            opacity: busy ? 0.65 : 1,
            margin: 0,
          }}
        >
          {children}
        </label>
      )}
      {pasteDetected && (
        <div
          style={{
            marginTop: '10px',
            color: 'green',
            fontWeight: '500',
            textAlign: 'center',
          }}
        >
          ✓ Pasted and extracted
        </div>
      )}
    </div>
  );
}

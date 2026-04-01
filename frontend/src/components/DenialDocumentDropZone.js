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
}) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const depth = useRef(0);
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

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || uploading) return;
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
    if (disabled || uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!fileMatchesAccept(file, accept)) return;
    handleChosenFile(file);
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleChosenFile(file);
  };

  const busy = disabled || uploading;

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${dragOver ? '#2563eb' : '#cbd5e1'}`,
        borderRadius: 12,
        padding: 20,
        background: dragOver ? '#eff6ff' : '#f8fafc',
        transition: 'border-color 0.15s ease, background 0.15s ease',
        boxSizing: 'border-box',
        ...outerStyle,
      }}
    >
      <input
        id={inputId}
        type="file"
        accept={accept}
        disabled={busy}
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />
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
    </div>
  );
}

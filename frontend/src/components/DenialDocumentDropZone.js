import React, { useRef, useState, useCallback } from 'react';

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

/**
 * Drop zone + file input for denial letter / EOB uploads.
 * Highlights while a file is dragged over the zone.
 */
export default function DenialDocumentDropZone({
  accept,
  onFile,
  disabled = false,
  inputId = 'denial-document-file',
  children,
  style: outerStyle,
}) {
  const [dragOver, setDragOver] = useState(false);
  const depth = useRef(0);

  const resetDepth = useCallback(() => {
    depth.current = 0;
    setDragOver(false);
  }, []);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
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
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!fileMatchesAccept(file, accept)) return;
    onFile(file);
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  };

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
        disabled={disabled}
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />
      <label
        htmlFor={inputId}
        style={{
          display: 'block',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.65 : 1,
          margin: 0,
        }}
      >
        {children}
      </label>
    </div>
  );
}

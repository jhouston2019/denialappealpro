// @ts-nocheck
'use client';

import React, { useState } from 'react';

/**
 * Tag-style multi-input for codes (CARC, RARC, CPT, ICD).
 */
function normalizeCodeKey(s) {
  return String(s || '')
    .trim()
    .toUpperCase()
    .replace(/\s/g, '');
}

export default function CodeMultiInput({
  label,
  required,
  values,
  onChange,
  placeholder = 'Type code, press Enter',
  id,
  lowConfidence,
  highlightCodes,
}) {
  const [draft, setDraft] = useState('');
  const vals = Array.isArray(values) ? values : [];

  const add = (raw) => {
    const t = raw.trim();
    if (!t) return;
    if (vals.includes(t)) {
      setDraft('');
      return;
    }
    onChange([...vals, t]);
    setDraft('');
  };

  const borderDefault = '1.5px solid #cbd5e1';
  const warnSet = new Set((highlightCodes || []).map(normalizeCodeKey));
  const hasTagWarn = vals.some((v) => warnSet.has(normalizeCodeKey(v))) && warnSet.size > 0;

  const verifyTitle = lowConfidence ? 'Please verify this field' : undefined;
  const confirmedExtracted = vals.length > 0 && !lowConfidence && !vals.some((v) => warnSet.has(normalizeCodeKey(v)));

  const containerBorder =
    lowConfidence || hasTagWarn ? '2px solid #f97316' : confirmedExtracted ? '2px solid #22c55e' : borderDefault;

  return (
    <div style={{ marginBottom: 14 }}>
      <label
        htmlFor={id}
        style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', display: 'block', marginBottom: 6 }}
      >
        {label}
        {required ? ' *' : ''}
      </label>
      <div
        className="dap-flow-code-input"
        title={verifyTitle}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          alignItems: 'center',
          padding: '12px 14px',
          border: containerBorder,
          borderRadius: 8,
          background: lowConfidence ? '#fff7ed' : '#fff',
          minHeight: 48,
          boxSizing: 'border-box',
        }}
      >
        {vals.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(vals.filter((x) => x !== v))}
            style={{
              border: warnSet.has(normalizeCodeKey(v)) ? '2px solid #f97316' : '1.5px solid #cbd5e1',
              background: warnSet.has(normalizeCodeKey(v)) ? '#fffbeb' : '#f1f5f9',
              borderRadius: 6,
              padding: '4px 8px',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            {v} ×
          </button>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add(draft.replace(/,/g, ''));
            }
          }}
          placeholder={placeholder}
          style={{ flex: '1 1 120px', border: 'none', outline: 'none', fontSize: 16, minWidth: 100, minHeight: 24 }}
        />
      </div>
    </div>
  );
}

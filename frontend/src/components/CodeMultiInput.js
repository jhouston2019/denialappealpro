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

  const border = '1px solid #e2e8f0';
  const warnSet = new Set((highlightCodes || []).map(normalizeCodeKey));

  const verifyTitle = lowConfidence ? 'Please verify this field' : undefined;
  const confirmedExtracted = vals.length > 0 && !lowConfidence && !vals.some((v) => warnSet.has(normalizeCodeKey(v)));

  return (
    <div style={{ marginBottom: 14 }}>
      <label htmlFor={id} style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', display: 'block', marginBottom: 6 }}>
        {label}
        {required ? ' *' : ''}
      </label>
      <div
        title={verifyTitle}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          alignItems: 'center',
          padding: '8px 10px',
          border:
            lowConfidence || (vals.some((v) => warnSet.has(normalizeCodeKey(v))) && warnSet.size > 0)
              ? '2px solid #fb923c'
              : border,
          borderLeft: confirmedExtracted ? '3px solid #bbf7d0' : undefined,
          borderRadius: 8,
          background: lowConfidence ? '#fff7ed' : '#fff',
          minHeight: 44,
        }}
      >
        {vals.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(vals.filter((x) => x !== v))}
            style={{
              border: warnSet.has(normalizeCodeKey(v)) ? '2px solid #f59e0b' : '1px solid #cbd5e1',
              background: warnSet.has(normalizeCodeKey(v)) ? '#fffbeb' : '#f1f5f9',
              borderRadius: 6,
              padding: '4px 8px',
              fontSize: 13,
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
          style={{ flex: '1 1 120px', border: 'none', outline: 'none', fontSize: 15, minWidth: 100 }}
        />
      </div>
    </div>
  );
}

import React from 'react';

const navy = '#0f172a';
const borderDashed = '#e2e8f0';

export function needsPreGenerationModal(intel) {
  if (!intel || !intel.coding) return false;
  if (intel.coding.valid === false) return true;
  if (intel.risk?.riskLevel === 'High') return true;
  return false;
}

function riskPalette(level) {
  if (level === 'High') {
    return {
      title: '#b91c1c',
      border: '#fecaca',
      bg: '#fef2f2',
      text: '#7f1d1d',
      bar: '#dc2626',
    };
  }
  if (level === 'Medium') {
    return {
      title: '#a16207',
      border: '#fde68a',
      bg: '#fffbeb',
      text: '#713f12',
      bar: '#ca8a04',
    };
  }
  return {
    title: '#15803d',
    border: '#bbf7d0',
    bg: '#f0fdf4',
    text: '#14532d',
    bar: '#22c55e',
  };
}

/**
 * Three panels: coding validation, modifier recommendations, denial risk.
 * @param {(modifier: string) => void} [onApplyModifier] - append single modifier (e.g. "-25") to form
 */
export default function CodingIntelligencePanel({ analysis, loading, onApplyModifier }) {
  if (loading) {
    return (
      <div
        style={{
          marginTop: 12,
          marginBottom: 12,
          padding: 12,
          borderRadius: 8,
          border: `1px dashed ${borderDashed}`,
          fontSize: 13,
          color: '#64748b',
        }}
      >
        Checking coding, modifiers, and denial risk…
      </div>
    );
  }

  if (!analysis) return null;

  const coding = analysis.coding || {};
  const mods = analysis.modifiers || {};
  const risk = analysis.risk || {};
  const rp = riskPalette(risk.riskLevel);

  const hasCodingIssues = !coding.valid || (coding.issues && coding.issues.length > 0);
  const modList = mods.recommendedModifiers || [];
  const reasoningLines = Array.isArray(mods.reasoning) ? mods.reasoning : mods.reasoning ? [mods.reasoning] : [];

  return (
    <div style={{ marginTop: 12, marginBottom: 16, display: 'grid', gap: 12 }}>
      {/* 1) Coding validation */}
      <div
        style={{
          borderRadius: 8,
          padding: 12,
          border: `1px solid ${hasCodingIssues ? '#fecaca' : '#bbf7d0'}`,
          background: hasCodingIssues ? '#fff7ed' : '#f0fdf4',
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 13, color: navy, marginBottom: 8 }}>
          {hasCodingIssues ? '⚠ Coding Issues Detected' : 'Coding validation'}
        </div>
        {!hasCodingIssues ? (
          <p style={{ margin: 0, fontSize: 13, color: '#14532d' }}>No blocking issues from rule checks. Review payer policies for your claim.</p>
        ) : (
          <>
            <ul style={{ margin: '0 0 8px', paddingLeft: 18, fontSize: 13, color: '#7f1d1d' }}>
              {(coding.issues || []).map((t, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  {t}
                </li>
              ))}
            </ul>
            {(coding.suggestions || []).length > 0 && (
              <div style={{ fontSize: 12, color: '#475569' }}>
                <strong style={{ color: navy }}>Suggestions:</strong>
                <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                  {coding.suggestions.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {/* 2) Modifiers */}
      <div
        style={{
          borderRadius: 8,
          padding: 12,
          border: '1px solid #93c5fd',
          background: '#eff6ff',
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 13, color: navy, marginBottom: 8 }}>💡 Modifier Recommendation</div>
        {modList.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>No automatic modifier suggestions for this combination.</p>
        ) : (
          <>
            <ul style={{ margin: '0 0 8px', paddingLeft: 0, listStyle: 'none' }}>
              {modList.map((m, i) => (
                <li
                  key={`${m}-${i}`}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1e40af' }}>{m}</span>
                  {onApplyModifier && (
                    <button
                      type="button"
                      onClick={() => onApplyModifier(m)}
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid #93c5fd',
                        background: '#fff',
                        cursor: 'pointer',
                        color: navy,
                      }}
                    >
                      Add to form
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {reasoningLines.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#334155', lineHeight: 1.45 }}>
                {reasoningLines.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {/* 3) Denial risk */}
      {risk.riskLevel && (
        <div
          style={{
            borderRadius: 8,
            padding: 12,
            border: `1px solid ${rp.border}`,
            background: rp.bg,
            borderLeftWidth: 4,
            borderLeftColor: rp.bar,
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 13, color: rp.title, marginBottom: 8 }}>
            ⚠ Denial Risk: {risk.riskLevel}
            {risk.riskScore != null && (
              <span style={{ fontWeight: 600, marginLeft: 8, opacity: 0.85 }}>(score {risk.riskScore})</span>
            )}
          </div>
          <ul style={{ margin: '0 0 8px', paddingLeft: 18, fontSize: 13, color: rp.text }}>
            {(risk.risks || []).map((t, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                {t}
              </li>
            ))}
          </ul>
          {(risk.recommendations || []).length > 0 && (
            <div style={{ fontSize: 12, color: '#334155' }}>
              <strong>Recommended fixes:</strong>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                {risk.recommendations.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import React from 'react';

const navy = '#0f172a';
const green = '#22c55e';
const border = '#e2e8f0';

/**
 * Horizontal stepper: completed = checkmark, active = filled navy + number, inactive = outline.
 * @param {{ key: string, label: string }[]} steps
 * @param {number} activeIndex 0-based
 * @param {(index: number) => void} [onStepClick] only invoked for index < activeIndex (go back)
 */
export default function IntakeStepper({ steps, activeIndex, onStepClick, sticky = true }) {
  return (
    <div
      role="navigation"
      aria-label="Intake progress"
      style={{
        ...(sticky
          ? {
              position: 'sticky',
              top: 60,
              zIndex: 50,
            }
          : {}),
        marginBottom: 20,
        marginLeft: -20,
        marginRight: -20,
        padding: '14px 20px 16px',
        background: '#f8fafc',
        borderBottom: `1px solid ${border}`,
        boxShadow: sticky ? '0 4px 12px rgba(15, 23, 42, 0.06)' : undefined,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 8,
          maxWidth: 900,
          margin: '0 auto',
          flexWrap: 'wrap',
        }}
      >
        {steps.map((s, i) => {
          const isComplete = i < activeIndex;
          const isActive = i === activeIndex;
          const clickable = isComplete && typeof onStepClick === 'function';

          const circleInner = isComplete ? (
            <span style={{ fontSize: 14, color: '#fff', lineHeight: 1 }} aria-hidden="true">
              ✓
            </span>
          ) : isActive ? (
            <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{i + 1}</span>
          ) : (
            <span style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8' }}>{i + 1}</span>
          );

          return (
            <button
              key={s.key}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick(i)}
              style={{
                flex: '1 1 120px',
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'none',
                border: 'none',
                padding: '4px 2px',
                cursor: clickable ? 'pointer' : 'default',
                textAlign: 'left',
                opacity: isActive || isComplete ? 1 : 0.85,
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isComplete || isActive ? navy : 'transparent',
                  border: isComplete || isActive ? `2px solid ${navy}` : `2px solid ${border}`,
                  boxSizing: 'border-box',
                  ...(isComplete ? { background: green, borderColor: green } : {}),
                }}
              >
                {circleInner}
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? navy : isComplete ? '#15803d' : '#64748b',
                  lineHeight: 1.3,
                }}
              >
                {s.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

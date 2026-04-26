"use client";

import React from "react";

function ComparisonTable() {
  // Add responsive styles
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  const comparisonData = [
    {
      capability: 'Denial Classification',
      manual: 'Read manually, varies by staff',
      denialAppealPro: 'Systematically categorized by denial type and code'
    },
    {
      capability: 'Appeal Strategy',
      manual: 'Inconsistent or guesswork',
      denialAppealPro: 'Denial-specific appeal logic applied every time'
    },
    {
      capability: 'CPT / ICD-10 Alignment',
      manual: 'Often incomplete or missed',
      denialAppealPro: 'Aligned with coding and documentation standards'
    },
    {
      capability: 'Supporting Documentation',
      manual: 'Attached inconsistently',
      denialAppealPro: 'Clearly defined based on denial requirements'
    },
    {
      capability: 'Appeal Language',
      manual: 'Generic or reused templates',
      denialAppealPro: 'Structured, payer-aware, and defensible'
    },
    {
      capability: 'Turnaround Time',
      manual: 'Days to weeks per appeal',
      denialAppealPro: 'Minutes per appeal'
    },
    {
      capability: 'Volume Handling',
      manual: 'Limited by staff capacity',
      denialAppealPro: 'Scales across large denial volumes'
    },
    {
      capability: 'Consistency',
      manual: 'Varies by experience level',
      denialAppealPro: 'Standardized across all appeals'
    },
    {
      capability: 'Compliance Risk',
      manual: 'Higher due to manual errors',
      denialAppealPro: 'Structured process reduces variability'
    },
    {
      capability: 'Revenue Recovery Potential',
      manual: 'Partial and inconsistent',
      denialAppealPro: 'Maximized through systematic appeals'
    }
  ];

  return (
    <div style={{
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '2px',
      padding: '56px 48px',
      marginBottom: '48px'
    }}>
      <h2 style={{
        fontSize: '32px',
        fontWeight: 700,
        textAlign: 'center',
        margin: '0 0 16px 0',
        letterSpacing: '-0.5px',
        color: '#0f172a'
      }}>
        Why Medical Billing Teams Use Denial Appeal Pro
      </h2>
      
      <p style={{
        textAlign: 'center',
        color: '#64748b',
        fontSize: '15px',
        marginBottom: '48px',
        fontWeight: 400
      }}>
        Because denial recovery requires structured, repeatable appeal logic — not inconsistent manual workflows.
      </p>

      {/* Comparison Table */}
      <div style={{
        overflowX: 'auto',
        marginBottom: '32px'
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'separate',
          borderSpacing: 0,
          border: '1px solid #e2e8f0',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <thead>
            <tr style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
            }}>
              <th style={{
                padding: '20px 24px',
                textAlign: 'left',
                borderBottom: '2px solid #e2e8f0',
                borderRight: '1px solid #e2e8f0',
                fontSize: '14px',
                fontWeight: 700,
                color: '#0f172a',
                letterSpacing: '0.3px',
                width: '35%'
              }}>
                What Drives Successful Appeals
              </th>
              <th style={{
                padding: '20px 24px',
                textAlign: 'center',
                borderBottom: '2px solid #e2e8f0',
                borderRight: '1px solid #e2e8f0',
                fontSize: '14px',
                fontWeight: 700,
                color: '#64748b',
                letterSpacing: '0.3px',
                width: '32.5%'
              }}>
                Manual / Generic Process
              </th>
              <th style={{
                padding: '20px 24px',
                textAlign: 'center',
                borderBottom: '2px solid #e2e8f0',
                fontSize: '14px',
                fontWeight: 700,
                color: '#1e40af',
                letterSpacing: '0.3px',
                width: '32.5%',
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
              }}>
                Denial Appeal Pro
              </th>
            </tr>
          </thead>
          <tbody>
            {comparisonData.map((row, index) => (
              <tr key={index} style={{
                background: index % 2 === 0 ? 'white' : '#f8fafc'
              }}>
                <td style={{
                  padding: '18px 24px',
                  borderBottom: index < comparisonData.length - 1 ? '1px solid #e2e8f0' : 'none',
                  borderRight: '1px solid #e2e8f0',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#0f172a',
                  lineHeight: '1.5'
                }}>
                  {row.capability}
                </td>
                <td style={{
                  padding: '18px 24px',
                  borderBottom: index < comparisonData.length - 1 ? '1px solid #e2e8f0' : 'none',
                  borderRight: '1px solid #e2e8f0',
                  textAlign: 'left',
                  fontSize: '14px',
                  color: '#64748b',
                  fontWeight: 400,
                  lineHeight: '1.6'
                }}>
                  {row.manual}
                </td>
                <td style={{
                  padding: '18px 24px',
                  borderBottom: index < comparisonData.length - 1 ? '1px solid #e2e8f0' : 'none',
                  textAlign: 'left',
                  fontSize: '14px',
                  color: '#1e40af',
                  fontWeight: 600,
                  lineHeight: '1.6',
                  background: index % 2 === 0 ? '#f0fdf4' : '#ecfdf5'
                }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'flex-start',
                    gap: '8px'
                  }}>
                    <span style={{ color: '#059669', fontSize: '16px', flexShrink: 0, marginTop: '2px' }}>✓</span>
                    <span>{row.denialAppealPro}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* POST-TABLE STATEMENT */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '2px',
        padding: '32px 40px',
        marginTop: '40px',
        textAlign: 'center'
      }}>
        <p style={{
          fontSize: '16px',
          color: '#475569',
          lineHeight: '1.8',
          marginBottom: '20px',
          fontWeight: 500
        }}>
          Most denied claims are never fully appealed — not because they can't be overturned,
          but because the process is inconsistent, time-intensive, and difficult to scale.
        </p>
        <p style={{
          fontSize: '16px',
          color: '#0f172a',
          lineHeight: '1.8',
          margin: 0,
          fontWeight: 600
        }}>
          Denial Appeal Pro applies structured appeal logic across every case —
          turning revenue recovery into a repeatable system.
        </p>
      </div>

      {/* MICRO PROOF BLOCK */}
      <div style={{
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '2px',
        padding: '40px',
        marginTop: '40px'
      }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 700,
          color: '#1e40af',
          letterSpacing: '1px',
          textTransform: 'uppercase',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          Example
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '24px'
        }}>
          {/* Denied Claim */}
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '2px',
            padding: '20px 24px'
          }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#991b1b',
              marginBottom: '8px',
              letterSpacing: '0.5px'
            }}>
              Denied Claim: $4,200
            </div>
            <div style={{
              fontSize: '14px',
              color: '#991b1b',
              fontWeight: 500
            }}>
              Reason: CO-50 – Not medically necessary
            </div>
          </div>

          {/* Two-column comparison */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '24px'
          }}>
            {/* Manual Appeal */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '2px',
              padding: '20px 24px'
            }}>
              <div style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#64748b',
                marginBottom: '12px',
                letterSpacing: '0.5px'
              }}>
                Manual Appeal
              </div>
              <div style={{
                fontSize: '14px',
                color: '#475569',
                lineHeight: '1.6',
                fontWeight: 400
              }}>
                Generic reconsideration request with limited documentation
              </div>
            </div>

            {/* Denial Appeal Pro */}
            <div style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '2px',
              padding: '20px 24px'
            }}>
              <div style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#1e40af',
                marginBottom: '12px',
                letterSpacing: '0.5px'
              }}>
                Denial Appeal Pro
              </div>
              <div style={{
                fontSize: '14px',
                color: '#1e40af',
                lineHeight: '1.6',
                fontWeight: 500
              }}>
                Structured appeal with coding alignment, documentation requirements, and medical necessity positioning
              </div>
            </div>
          </div>

          {/* Result */}
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '2px',
            padding: '20px 24px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#166534',
              marginBottom: '8px',
              letterSpacing: '0.5px'
            }}>
              Result
            </div>
            <div style={{
              fontSize: '14px',
              color: '#166534',
              fontWeight: 600
            }}>
              Stronger appeal position and higher likelihood of reversal
            </div>
          </div>
        </div>
      </div>


      {/* REVENUE IMPACT SECTION */}
      <div style={{
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '2px',
        padding: '48px 40px',
        marginTop: '48px'
      }}>
        <h3 style={{
          fontSize: '28px',
          fontWeight: 700,
          color: '#0f172a',
          marginBottom: '12px',
          textAlign: 'center',
          letterSpacing: '-0.5px'
        }}>
          What This Means for Your Revenue
        </h3>

        <p style={{
          textAlign: 'center',
          color: '#64748b',
          fontSize: '16px',
          marginBottom: '40px',
          fontWeight: 400,
          maxWidth: '700px',
          margin: '0 auto 40px'
        }}>
          Denials are not just administrative — they represent recoverable revenue.
        </p>

        {/* Core Example Block */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '2px',
          padding: '32px 40px',
          marginBottom: '32px'
        }}>
          <div style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#0f172a',
            marginBottom: '24px'
          }}>
            If your team processes 100 denied claims per month:
          </div>

          <div style={{
            display: 'grid',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <span style={{
                fontSize: '15px',
                color: '#475569',
                fontWeight: 500
              }}>
                Average denied claim value:
              </span>
              <span style={{
                fontSize: '18px',
                color: '#0f172a',
                fontWeight: 700
              }}>
                $2,500
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 0'
            }}>
              <span style={{
                fontSize: '15px',
                color: '#475569',
                fontWeight: 500
              }}>
                Total denied revenue:
              </span>
              <span style={{
                fontSize: '22px',
                color: '#1e40af',
                fontWeight: 700
              }}>
                $250,000
              </span>
            </div>
          </div>

          <p style={{
            fontSize: '15px',
            color: '#475569',
            lineHeight: '1.7',
            margin: 0,
            fontWeight: 400
          }}>
            Most teams recover only a portion of this due to time constraints, inconsistent appeal quality, and limited staff capacity.
          </p>
        </div>

        {/* Value Proposition */}
        <div style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '2px',
          padding: '24px 32px',
          marginBottom: '32px'
        }}>
          <p style={{
            fontSize: '15px',
            color: '#1e40af',
            lineHeight: '1.7',
            margin: 0,
            fontWeight: 500,
            textAlign: 'center'
          }}>
            Denial Appeal Pro applies structured appeal logic across every claim — allowing you to pursue more denials with consistency and speed.
          </p>
        </div>

        {/* Supporting Statement */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          <p style={{
            fontSize: '15px',
            color: '#475569',
            lineHeight: '1.7',
            marginBottom: '12px',
            fontWeight: 500
          }}>
            Small improvements in appeal effectiveness can translate into significant revenue recovery at scale.
          </p>
          <p style={{
            fontSize: '15px',
            color: '#0f172a',
            lineHeight: '1.7',
            margin: 0,
            fontWeight: 600,
            fontStyle: 'italic'
          }}>
            The difference is not effort — it is applying the right appeal strategy every time.
          </p>
        </div>

        {/* Visual Breakdown */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: '1px',
          background: '#e2e8f0',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{
            background: 'white',
            padding: '28px 24px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#64748b',
              marginBottom: '12px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}>
              Denied Revenue
            </div>
            <div style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#dc2626',
              marginBottom: '8px',
              letterSpacing: '-0.5px'
            }}>
              $250,000
            </div>
            <div style={{
              fontSize: '13px',
              color: '#64748b',
              fontWeight: 500
            }}>
              at risk
            </div>
          </div>

          <div style={{
            background: 'white',
            padding: '28px 24px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#64748b',
              marginBottom: '12px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}>
              Manual Recovery
            </div>
            <div style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#475569',
              marginBottom: '8px',
              lineHeight: '1.5'
            }}>
              Inconsistent and limited by staff
            </div>
            <div style={{
              fontSize: '13px',
              color: '#64748b',
              fontWeight: 500
            }}>
              capacity constraints
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            padding: '28px 24px',
            textAlign: 'center',
            border: '1px solid #93c5fd'
          }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#1e40af',
              marginBottom: '12px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}>
              With Denial Appeal Pro
            </div>
            <div style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#1e40af',
              marginBottom: '8px',
              lineHeight: '1.5'
            }}>
              Structured, scalable recovery process
            </div>
            <div style={{
              fontSize: '13px',
              color: '#1e40af',
              fontWeight: 500
            }}>
              consistent quality
            </div>
          </div>
        </div>

        {/* OBJECTION HANDLING - WILL THIS IMPROVE RESULTS? */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '2px',
          padding: '24px 32px',
          marginTop: '32px',
          textAlign: 'center'
        }}>
          <p style={{
            fontSize: '15px',
            color: '#475569',
            lineHeight: '1.7',
            marginBottom: '8px',
            fontWeight: 500
          }}>
            Denials are not random — they follow patterns.
          </p>
          <p style={{
            fontSize: '15px',
            color: '#0f172a',
            lineHeight: '1.7',
            margin: 0,
            fontWeight: 600
          }}>
            Applying structured appeal logic consistently across every case increases the likelihood of recovery over time.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ComparisonTable;

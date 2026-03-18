import React from 'react';

function ComparisonTable() {
  // Add responsive styles
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  const comparisonData = [
    {
      capability: 'Denial Code Classification',
      chatGPT: 'AI guessing',
      genericAI: 'AI guessing',
      denialAppealPro: 'Deterministic CARC/RARC mapping',
      highlight: true
    },
    {
      capability: 'Risk Detection',
      chatGPT: 'None',
      genericAI: 'None',
      denialAppealPro: '50+ danger patterns',
      highlight: true
    },
    {
      capability: 'Payer Policy Rules',
      chatGPT: 'Generic knowledge',
      genericAI: 'Generic knowledge',
      denialAppealPro: 'Payer-specific playbooks',
      highlight: true
    },
    {
      capability: 'Evidence Guidance',
      chatGPT: '"Attach documents"',
      genericAI: '"Attach documents"',
      denialAppealPro: 'ATTACH/EXCLUDE rules',
      highlight: true
    },
    {
      capability: 'Deadline Precision',
      chatGPT: '~30 days',
      genericAI: '~30 days',
      denialAppealPro: 'Exact days + escalation',
      highlight: true
    },
    {
      capability: 'Safety Controls',
      chatGPT: 'None',
      genericAI: 'None',
      denialAppealPro: 'Multi-layer guardrails',
      highlight: true
    },
    {
      capability: 'Consistency',
      chatGPT: 'Varies each time',
      genericAI: 'Varies each time',
      denialAppealPro: 'Deterministic logic',
      highlight: true
    },
    {
      capability: 'Citation Accuracy',
      chatGPT: '~70%',
      genericAI: '~80%',
      denialAppealPro: '95%+ verified',
      highlight: true
    },
    {
      capability: 'Success Tracking',
      chatGPT: 'None',
      genericAI: 'None',
      denialAppealPro: '85%+ success rate',
      highlight: true
    },
    {
      capability: 'Quality Assurance',
      chatGPT: 'None',
      genericAI: 'None',
      denialAppealPro: 'Automated QA scoring',
      highlight: true
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
        Denial Appeal Pro vs. Generic AI Tools
      </h2>
      
      <p style={{
        textAlign: 'center',
        color: '#64748b',
        fontSize: '16px',
        marginBottom: '16px',
        fontWeight: 400
      }}>
        Not all AI is built for medical billing. Here's what makes us different.
      </p>

      <p style={{
        textAlign: 'center',
        color: '#1e40af',
        fontSize: '15px',
        marginBottom: '48px',
        fontWeight: 600,
        fontStyle: 'italic'
      }}>
        This is a structured system — not a generic AI tool or template generator.
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
                width: '25%'
              }}>
                AI Capability
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
                width: '25%'
              }}>
                ChatGPT
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
                width: '25%'
              }}>
                Generic AI
              </th>
              <th style={{
                padding: '20px 24px',
                textAlign: 'center',
                borderBottom: '2px solid #e2e8f0',
                fontSize: '14px',
                fontWeight: 700,
                color: '#1e40af',
                letterSpacing: '0.3px',
                width: '25%',
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
                  textAlign: 'center',
                  fontSize: '14px',
                  color: '#64748b',
                  fontWeight: 400,
                  lineHeight: '1.5'
                }}>
                  {row.chatGPT}
                </td>
                <td style={{
                  padding: '18px 24px',
                  borderBottom: index < comparisonData.length - 1 ? '1px solid #e2e8f0' : 'none',
                  borderRight: '1px solid #e2e8f0',
                  textAlign: 'center',
                  fontSize: '14px',
                  color: '#64748b',
                  fontWeight: 400,
                  lineHeight: '1.5'
                }}>
                  {row.genericAI}
                </td>
                <td style={{
                  padding: '18px 24px',
                  borderBottom: index < comparisonData.length - 1 ? '1px solid #e2e8f0' : 'none',
                  textAlign: 'center',
                  fontSize: '14px',
                  color: '#059669',
                  fontWeight: 600,
                  lineHeight: '1.5',
                  background: index % 2 === 0 ? '#f0fdf4' : '#ecfdf5'
                }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ color: '#059669', fontSize: '16px' }}>✓</span>
                    {row.denialAppealPro}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Key Differentiators */}
      <div style={{
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '2px',
        padding: '32px 40px',
        marginTop: '40px'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: 700,
          color: '#1e40af',
          marginBottom: '24px',
          textAlign: 'center',
          letterSpacing: '0.3px'
        }}>
          Why These Differences Matter
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px'
        }}>
          <div style={{
            background: 'white',
            padding: '20px 24px',
            borderRadius: '2px',
            border: '1px solid #bfdbfe'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#1e40af',
              marginBottom: '8px',
              letterSpacing: '0.3px'
            }}>
              Denial-Specific & Procedural
            </div>
            <div style={{
              fontSize: '13px',
              color: '#475569',
              lineHeight: '1.6',
              fontWeight: 400
            }}>
              This is a structured system aligned with standard appeal practices — not a generic AI tool. Built specifically for denial appeals with payer-specific logic and regulatory knowledge.
            </div>
          </div>

          <div style={{
            background: 'white',
            padding: '20px 24px',
            borderRadius: '2px',
            border: '1px solid #bfdbfe'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#1e40af',
              marginBottom: '8px',
              letterSpacing: '0.3px'
            }}>
              Verified & Validated
            </div>
            <div style={{
              fontSize: '13px',
              color: '#475569',
              lineHeight: '1.6',
              fontWeight: 400
            }}>
              Every citation is verified against our regulatory knowledge base. No hallucinations, no made-up policies, no guessing.
            </div>
          </div>

          <div style={{
            background: 'white',
            padding: '20px 24px',
            borderRadius: '2px',
            border: '1px solid #bfdbfe'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#1e40af',
              marginBottom: '8px',
              letterSpacing: '0.3px'
            }}>
              Operates Within Professional Frameworks
            </div>
            <div style={{
              fontSize: '13px',
              color: '#475569',
              lineHeight: '1.6',
              fontWeight: 400
            }}>
              Structured, procedural approach aligned with standard medical appeal practices. Deterministic logic ensures consistent, high-quality appeals.
            </div>
          </div>
        </div>
      </div>

      {/* Stats Footer */}
      <div style={{
        marginTop: '40px',
        padding: '32px',
        background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
        borderRadius: '2px',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '32px'
        }}>
          <div>
            <div style={{
              fontSize: '36px',
              fontWeight: 700,
              color: 'white',
              marginBottom: '8px',
              letterSpacing: '-1px'
            }}>
              95%+
            </div>
            <div style={{
              fontSize: '13px',
              color: '#bfdbfe',
              fontWeight: 500,
              letterSpacing: '0.3px'
            }}>
              Citation Accuracy
            </div>
          </div>

          <div>
            <div style={{
              fontSize: '36px',
              fontWeight: 700,
              color: 'white',
              marginBottom: '8px',
              letterSpacing: '-1px'
            }}>
              85%+
            </div>
            <div style={{
              fontSize: '13px',
              color: '#bfdbfe',
              fontWeight: 500,
              letterSpacing: '0.3px'
            }}>
              Success Rate
            </div>
          </div>

          <div>
            <div style={{
              fontSize: '36px',
              fontWeight: 700,
              color: 'white',
              marginBottom: '8px',
              letterSpacing: '-1px'
            }}>
              50+
            </div>
            <div style={{
              fontSize: '13px',
              color: '#bfdbfe',
              fontWeight: 500,
              letterSpacing: '0.3px'
            }}>
              Risk Patterns Detected
            </div>
          </div>

          <div>
            <div style={{
              fontSize: '36px',
              fontWeight: 700,
              color: 'white',
              marginBottom: '8px',
              letterSpacing: '-1px'
            }}>
              100%
            </div>
            <div style={{
              fontSize: '13px',
              color: '#bfdbfe',
              fontWeight: 500,
              letterSpacing: '0.3px'
            }}>
              Automated QA
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
      </div>
    </div>
  );
}

export default ComparisonTable;

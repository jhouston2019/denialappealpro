import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ComparisonTable from './components/ComparisonTable';
// Build: 2026-02-11-v2

function LandingPro() {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState(null);

  const scrollToSample = () => {
    document.getElementById('sample-letter')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f0f4f8',
      fontFamily: '"Inter", sans-serif'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @media (max-width: 768px) {
          .grid-2 { grid-template-columns: 1fr !important; }
          .grid-4 { grid-template-columns: 1fr 1fr !important; }
          .letter-body { padding: 24px !important; }
          .before-after-grid { grid-template-columns: 1fr !important; }
          .decision-grid { grid-template-columns: 1fr !important; }
        }
        
        .icon-badge {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          font-weight: 700;
          font-size: 16px;
        }
      `}</style>

      {/* 1. HERO */}
      <section style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
        padding: '80px 24px 100px',
        color: 'white'
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h1 style={{
            fontSize: '48px',
            fontWeight: 900,
            margin: '0 0 16px 0',
            letterSpacing: '-1.5px',
            lineHeight: '1.2',
            textAlign: 'center'
          }}>
            Why Medical Billing & Revenue Cycle Teams<br/>Use Denial Appeal Pro
          </h1>
          
          <p style={{
            fontSize: '20px',
            color: '#93c5fd',
            marginBottom: '24px',
            fontWeight: 600,
            lineHeight: '1.6',
            textAlign: 'center',
            maxWidth: '900px',
            margin: '0 auto 24px'
          }}>
            Because it's the industry-standard denial reversal engine —<br/>
            built to convert rejected claims into reimbursed outcomes.
          </p>

          <div style={{
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: '4px',
            padding: '32px 40px',
            maxWidth: '900px',
            margin: '0 auto 48px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#60a5fa',
              marginBottom: '16px',
              letterSpacing: '2px',
              textTransform: 'uppercase'
            }}>
              Verified AI Technology
            </div>
            <div style={{
              fontSize: '18px',
              fontWeight: 600,
              color: 'white',
              lineHeight: '1.8',
              letterSpacing: '-0.2px'
            }}>
              95%+ Citation Accuracy • 85%+ Success Rate<br/>
              Automated Quality Assurance • Proven ROI Tracking
            </div>
            <div style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,0.6)',
              marginTop: '16px',
              fontWeight: 500
            }}>
              Every regulatory citation verified against our knowledge base
            </div>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '2px',
            padding: '40px 48px',
            marginBottom: '48px',
            maxWidth: '900px',
            margin: '0 auto 48px'
          }}>
            <p style={{
              fontSize: '18px',
              fontWeight: 500,
              marginBottom: '24px',
              color: 'rgba(255,255,255,0.8)',
              lineHeight: '1.6'
            }}>
              Their claim was denied as<br/>
              <span style={{ fontSize: '24px', color: '#e0e7ff', fontWeight: 700, letterSpacing: '-0.5px' }}>"Not Medically Necessary."</span>
            </p>
            
            <p style={{
              fontSize: '16px',
              color: 'rgba(255,255,255,0.75)',
              lineHeight: '1.8',
              marginBottom: '0',
              fontWeight: 400
            }}>
              <strong style={{ color: 'white', fontSize: '18px', fontWeight: 600 }}>Denial Appeal Pro</strong><br/>
              analyzes the denial reason, payer criteria, and clinical documentation —<br/>
              identifying exactly what failed and generating a<br/>
              <strong style={{ color: '#93c5fd', fontWeight: 600 }}>submission-ready appeal aligned to payer requirements.</strong>
            </p>
          </div>

          {/* Acquisition: 3 free claims */}
          <div style={{
            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            borderRadius: '6px',
            padding: '24px 32px',
            margin: '0 auto 40px',
            maxWidth: '900px',
            textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.25)',
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px', color: 'white' }}>
              Run your first denied claim free
            </h2>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.92)', margin: '0 0 16px', lineHeight: 1.55 }}>
              New accounts include 3 free appeal generations. See citation-backed appeals and estimated recovery before you commit to a plan.
            </p>
            <button
              type="button"
              onClick={() => navigate('/start')}
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 700,
                color: '#047857',
                background: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Start with 3 free claims
            </button>
          </div>

          {/* Core Value Prop */}
          <div style={{
            maxWidth: '900px',
            margin: '0 auto 48px',
            textAlign: 'left'
          }}>
          <p style={{
            fontSize: '17px',
            color: 'rgba(255,255,255,0.9)',
            lineHeight: '1.8',
            marginBottom: '20px',
            fontWeight: 500
          }}>
            Across medical billing environments,<br/>
            many denials are not final decisions —<br/>
            they result from documentation gaps, coding misalignment, or incorrect application of payer policy.
          </p>

          <p style={{
            fontSize: '16px',
            color: '#93c5fd',
            lineHeight: '1.7',
            marginBottom: '32px',
            fontWeight: 600,
            fontStyle: 'italic'
          }}>
            Most teams already appeal denials — but inconsistent structure and limited capacity leave significant revenue unrecovered.
          </p>

              <h3 style={{
                fontSize: '22px',
                fontWeight: 800,
                marginBottom: '24px',
                color: 'white'
              }}>
                Denial Appeal Pro systematically identifies:
            </h3>

            <div style={{ display: 'grid', gap: '1px', marginBottom: '40px', background: 'rgba(255,255,255,0.1)' }}>
              {[
                'Denial code breakdown (CARC/RARC → true failure point)',
                'Medical necessity gaps vs payer-specific criteria',
                'Missing or insufficient clinical documentation',
                'CPT/ICD coding misalignment',
                'Policy misapplication and guideline errors'
              ].map((item, i) => (
                <div key={i} style={{
                  background: 'rgba(15, 23, 42, 0.5)',
                  padding: '18px 24px',
                  fontSize: '15px',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    background: '#60a5fa',
                    flexShrink: 0,
                    borderRadius: '1px'
                  }}></div>
                  {item}
                </div>
              ))}
            </div>

            <h3 style={{
              fontSize: '22px',
              fontWeight: 800,
              marginBottom: '20px',
              color: 'white'
            }}>
              All outputs are:
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '1px',
              marginBottom: '40px',
              background: 'rgba(59, 130, 246, 0.2)',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              {[
                'Structured for payer review',
                'Aligned to appeal-level requirements',
                'Ready for submission (portal, fax, or mail)',
                'Built to withstand escalation or audit'
              ].map((item, i) => (
                <div key={i} style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  padding: '16px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#bfdbfe',
                  textAlign: 'center',
                  backdropFilter: 'blur(10px)'
                }}>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Positioning Statement */}
          <div style={{
            maxWidth: '700px',
            margin: '0 auto 48px',
            textAlign: 'center'
          }}>
            <p style={{
              fontSize: '24px',
              fontWeight: 800,
              color: 'white',
              lineHeight: '1.4',
              marginBottom: '12px',
              fontStyle: 'italic'
            }}>
              You're not writing an appeal.<br/>
              You're correcting the decision pathway.
            </p>
          </div>

          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '2px',
            padding: '40px 48px',
            maxWidth: '800px',
            margin: '0 auto 48px',
            textAlign: 'center'
          }}>
            <h2 style={{
              fontSize: '28px',
              fontWeight: 700,
              margin: '0 0 20px 0',
              color: '#e0e7ff',
              letterSpacing: '-0.5px'
            }}>
              Stop Letting Denials Sit Unworked
            </h2>
            <p style={{
              fontSize: '16px',
              color: 'rgba(255,255,255,0.8)',
              fontWeight: 500,
              lineHeight: '1.8',
              marginBottom: '0'
            }}>
              Recover eligible revenue.<br/>
              Correct the submission.<br/>
              Resubmit with precision.
            </p>
          </div>

          <div style={{
            maxWidth: '900px',
            margin: '0 auto 40px'
          }}>
            <h3 style={{
              fontSize: '24px',
              fontWeight: 700,
              marginBottom: '32px',
              color: 'white',
              textAlign: 'center',
              letterSpacing: '-0.5px'
            }}>
              Denial Outcome Preview
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              gap: '32px',
              alignItems: 'center'
            }}>
              <div style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                borderRadius: '2px',
                padding: '32px 28px',
                textAlign: 'center',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#94a3b8',
                  marginBottom: '16px',
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase'
                }}>
                  Denied Claim
                </div>
                <div style={{
                  fontSize: '36px',
                  fontWeight: 700,
                  color: '#cbd5e1',
                  marginBottom: '12px',
                  letterSpacing: '-1px'
                }}>
                  $18,550
                </div>
                <div style={{
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.6)',
                  fontWeight: 500
                }}>
                  Not Paid
                </div>
              </div>

              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#60a5fa',
                padding: '0 16px',
                letterSpacing: '1px'
              }}>
                VS
              </div>

              <div style={{
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                borderRadius: '2px',
                padding: '32px 28px',
                textAlign: 'center',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#93c5fd',
                  marginBottom: '16px',
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase'
                }}>
                  Corrected Appeal Submission
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#e0e7ff',
                  lineHeight: '1.6'
                }}>
                  Aligned to Payer Criteria —<br/>
                  Ready for Review
                </div>
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            marginBottom: '32px',
            flexWrap: 'wrap'
          }}>
            <button 
              onClick={() => navigate('/start')}
              style={{
                background: 'white',
                color: '#0f172a',
                border: 'none',
                padding: '16px 40px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                borderRadius: '2px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                transition: 'all 0.2s ease',
                letterSpacing: '0.3px'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 8px 20px rgba(0,0,0,0.25)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              }}
            >
              Run Denial Analysis → Generate Appeal
            </button>
            
            <button 
              onClick={scrollToSample}
              style={{
                background: 'transparent',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '16px 32px',
                fontSize: '15px',
                fontWeight: 500,
                cursor: 'pointer',
                borderRadius: '2px',
                transition: 'all 0.2s ease',
                letterSpacing: '0.3px'
              }}
              onMouseOver={(e) => {
                e.target.style.borderColor = 'rgba(255,255,255,0.6)';
                e.target.style.background = 'rgba(255,255,255,0.05)';
              }}
              onMouseOut={(e) => {
                e.target.style.borderColor = 'rgba(255,255,255,0.3)';
                e.target.style.background = 'transparent';
              }}
            >
              See a Sample Letter ↓
            </button>
          </div>

          {/* CTA SUPPORT LINE */}
          <p style={{
            fontSize: '16px',
            color: 'rgba(255,255,255,0.8)',
            fontWeight: 600,
            textAlign: 'center',
            fontStyle: 'italic',
            marginBottom: '12px'
          }}>
            See exactly how your appeal will be structured before you submit it.
          </p>

          <p style={{
            fontSize: '15px',
            color: '#bfdbfe',
            fontWeight: 500,
            textAlign: 'center'
          }}>
            No workflow overhaul required — apply this to your existing denial process immediately.
          </p>
        </div>
      </section>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '72px 24px' }}>
        
        {/* PARITY LAYER - PROFESSIONAL ALIGNMENT */}
        <section style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '2px',
          padding: '48px 56px',
          marginBottom: '72px',
          textAlign: 'center'
        }}>
          <p style={{
            fontSize: '18px',
            color: '#0f172a',
            lineHeight: '1.8',
            fontWeight: 500,
            maxWidth: '900px',
            margin: '0 auto',
            marginBottom: '24px'
          }}>
            Medical billing professionals and appeal specialists follow a structured process to challenge denied claims — identifying the denial reason, applying correct coding logic, and submitting a formal appeal.
          </p>
          <p style={{
            fontSize: '18px',
            color: '#1e40af',
            lineHeight: '1.8',
            fontWeight: 600,
            maxWidth: '900px',
            margin: '0 auto'
          }}>
            This system applies that same structured approach — instantly and without percentage-based fees.
          </p>
        </section>

        {/* REALITY LINE */}
        <section style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '2px',
          padding: '32px 48px',
          marginBottom: '72px',
          textAlign: 'center'
        }}>
          <p style={{
            fontSize: '17px',
            color: '#475569',
            lineHeight: '1.7',
            fontWeight: 500,
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            Most claim denials follow predictable patterns. The real challenge is responding with the correct appeal structure.
          </p>
        </section>
        
        {/* 2. SAMPLE LETTER SECTION */}
        <section id="sample-letter" style={{ marginBottom: '72px' }}>
          <h2 style={{
            fontSize: '40px',
            fontWeight: 800,
            textAlign: 'center',
            margin: '0 0 16px 0',
            letterSpacing: '-1px',
            color: '#0f172a'
          }}>
            Here's exactly what you get
          </h2>
          
          <p style={{
            textAlign: 'center',
            color: '#64748b',
            fontSize: '18px',
            marginBottom: '16px',
            fontWeight: 500
          }}>
            A real, professionally formatted appeal letter — not a form-filled template.
          </p>

          {/* OUTPUT CONFIDENCE LINE */}
          <p style={{
            textAlign: 'center',
            color: '#1e40af',
            fontSize: '15px',
            marginBottom: '12px',
            fontWeight: 600,
            fontStyle: 'italic'
          }}>
            Each appeal is generated using structured logic designed to match how professional medical appeals are prepared.
          </p>

          <p style={{
            textAlign: 'center',
            color: '#475569',
            fontSize: '14px',
            marginBottom: '48px',
            fontWeight: 500
          }}>
            Each appeal is generated based on denial type, coding, and documentation requirements — not reused templates.
          </p>

          {/* EVIDENCE LAYER - DETAILED EXAMPLES */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '2px',
            padding: '40px',
            marginBottom: '48px'
          }}>
            <h3 style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: '32px',
              textAlign: 'center'
            }}>
              Denial Type Examples
            </h3>

            {/* Medical Necessity Example */}
            <div style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '2px',
              padding: '32px',
              marginBottom: '24px'
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#1e40af',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                marginBottom: '16px'
              }}>
                Denial Type: Medical Necessity
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: '8px'
                }}>
                  Denial (Input):
                </div>
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '2px',
                  padding: '16px',
                  fontSize: '14px',
                  color: '#991b1b',
                  fontFamily: 'monospace',
                  lineHeight: '1.6'
                }}>
                  "Claim denied due to lack of medical necessity. CPT code 97110 not supported by documentation."
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: '8px'
                }}>
                  System Analysis:
                </div>
                <div style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '2px',
                  padding: '16px'
                }}>
                  <div style={{ display: 'grid', gap: '8px', fontSize: '14px', color: '#1e40af', lineHeight: '1.6' }}>
                    <div>• Denial reason identified: medical necessity</div>
                    <div>• CPT code flagged: 97110</div>
                    <div>• Documentation support required</div>
                    <div>• Appeal deadline applicable</div>
                  </div>
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: '8px'
                }}>
                  Generated Appeal (Excerpt):
                </div>
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '2px',
                  padding: '20px',
                  fontSize: '14px',
                  color: '#166534',
                  lineHeight: '1.8',
                  fontFamily: 'Georgia, serif'
                }}>
                  <p style={{ margin: '0 0 12px 0' }}>
                    "This letter is submitted in response to the denial of services associated with CPT code 97110.
                  </p>
                  <p style={{ margin: '0 0 12px 0' }}>
                    The services provided were medically necessary based on the patient's documented condition and treatment plan.
                  </p>
                  <p style={{ margin: '0 0 12px 0' }}>
                    Supporting clinical documentation is available to substantiate the necessity and appropriateness of the services rendered.
                  </p>
                  <p style={{ margin: '0' }}>
                    We respectfully request reconsideration of this claim based on the provided information."
                  </p>
                </div>
              </div>
            </div>

            {/* Coding Denial Example */}
            <div style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '2px',
              padding: '32px',
              marginBottom: '24px'
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#1e40af',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                marginBottom: '16px'
              }}>
                Denial Type: Coding Error
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: '8px'
                }}>
                  Denial (Input):
                </div>
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '2px',
                  padding: '16px',
                  fontSize: '14px',
                  color: '#991b1b',
                  fontFamily: 'monospace',
                  lineHeight: '1.6'
                }}>
                  "Claim denied. CPT code 99214 does not match diagnosis code provided."
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: '8px'
                }}>
                  System Analysis:
                </div>
                <div style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '2px',
                  padding: '16px'
                }}>
                  <div style={{ display: 'grid', gap: '8px', fontSize: '14px', color: '#1e40af', lineHeight: '1.6' }}>
                    <div>• Denial reason identified: coding mismatch</div>
                    <div>• CPT/ICD alignment issue detected</div>
                    <div>• Coding correction or justification required</div>
                    <div>• Timely filing window verified</div>
                  </div>
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: '8px'
                }}>
                  Generated Appeal (Excerpt):
                </div>
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '2px',
                  padding: '20px',
                  fontSize: '14px',
                  color: '#166534',
                  lineHeight: '1.8',
                  fontFamily: 'Georgia, serif'
                }}>
                  <p style={{ margin: '0 0 12px 0' }}>
                    "This letter addresses the denial based on coding alignment concerns.
                  </p>
                  <p style={{ margin: '0 0 12px 0' }}>
                    The CPT code submitted accurately reflects the services provided and is appropriately supported by the diagnosis code on file.
                  </p>
                  <p style={{ margin: '0 0 12px 0' }}>
                    We request review of the coding relationship and reconsideration of the claim.
                  </p>
                  <p style={{ margin: '0' }}>
                    Additional documentation is available upon request to support the coding submitted."
                  </p>
                </div>
              </div>
            </div>

            {/* Prior Authorization Example */}
            <div style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '2px',
              padding: '32px'
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#1e40af',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                marginBottom: '16px'
              }}>
                Denial Type: Prior Authorization
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: '8px'
                }}>
                  Denial (Input):
                </div>
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '2px',
                  padding: '16px',
                  fontSize: '14px',
                  color: '#991b1b',
                  fontFamily: 'monospace',
                  lineHeight: '1.6'
                }}>
                  "Services denied. Prior authorization not obtained before service date."
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: '8px'
                }}>
                  System Analysis:
                </div>
                <div style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '2px',
                  padding: '16px'
                }}>
                  <div style={{ display: 'grid', gap: '8px', fontSize: '14px', color: '#1e40af', lineHeight: '1.6' }}>
                    <div>• Denial reason identified: authorization requirement</div>
                    <div>• Service date and authorization timeline reviewed</div>
                    <div>• Retroactive authorization pathway applicable</div>
                    <div>• Appeal submission deadline calculated</div>
                  </div>
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: '8px'
                }}>
                  Generated Appeal (Excerpt):
                </div>
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '2px',
                  padding: '20px',
                  fontSize: '14px',
                  color: '#166534',
                  lineHeight: '1.8',
                  fontFamily: 'Georgia, serif'
                }}>
                  <p style={{ margin: '0 0 12px 0' }}>
                    "This letter requests reconsideration of the denial related to authorization requirements.
                  </p>
                  <p style={{ margin: '0 0 12px 0' }}>
                    The services rendered were medically necessary and clinically appropriate at the time of service.
                  </p>
                  <p style={{ margin: '0 0 12px 0' }}>
                    We respectfully request retroactive authorization review based on the clinical circumstances documented.
                  </p>
                  <p style={{ margin: '0' }}>
                    Supporting documentation demonstrating medical necessity is available for review."
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* BEFORE vs AFTER MICRO EVIDENCE */}
          <div className="before-after-grid" style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px',
            marginBottom: '48px'
          }}>
            <div style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '2px',
              padding: '24px'
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#dc2626',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                marginBottom: '12px'
              }}>
                Before
              </div>
              <div style={{
                fontSize: '15px',
                color: '#64748b',
                lineHeight: '1.6',
                fontWeight: 500,
                marginBottom: '16px'
              }}>
                "Unclear how to respond to a denial"
              </div>
              <div style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#16a34a',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                marginBottom: '12px'
              }}>
                After
              </div>
              <div style={{
                fontSize: '15px',
                color: '#0f172a',
                lineHeight: '1.6',
                fontWeight: 600
              }}>
                "Structured appeal aligned with denial reason"
              </div>
            </div>

            <div style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '2px',
              padding: '24px'
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#dc2626',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                marginBottom: '12px'
              }}>
                Before
              </div>
              <div style={{
                fontSize: '15px',
                color: '#64748b',
                lineHeight: '1.6',
                fontWeight: 500,
                marginBottom: '16px'
              }}>
                "Generic or incomplete appeal"
              </div>
              <div style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#16a34a',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                marginBottom: '12px'
              }}>
                After
              </div>
              <div style={{
                fontSize: '15px',
                color: '#0f172a',
                lineHeight: '1.6',
                fontWeight: 600
              }}>
                "Targeted appeal based on denial classification"
              </div>
            </div>
          </div>
          
          <div style={{
            background: 'white',
            border: '1px solid #cbd5e1',
            borderRadius: '2px',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
          }}>
            <div style={{
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              padding: '16px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{
                flex: 1,
                fontSize: '13px',
                color: '#475569',
                fontWeight: 600,
                letterSpacing: '0.2px'
              }}>
                Appeal_Letter_CO50_CLM-2024-12345.pdf
              </div>
              <div style={{
                background: '#1e40af',
                color: 'white',
                padding: '6px 16px',
                borderRadius: '2px',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}>
                Submission Ready
              </div>
            </div>
            
            {/* Letter body */}
            <div className="letter-body" style={{
              fontFamily: 'Georgia, serif',
              fontSize: '14px',
              lineHeight: '1.8',
              color: '#0f172a',
              padding: '48px',
              textAlign: 'left'
            }}>
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>ABC Medical Group</div>
                <div>123 Healthcare Drive, Suite 200</div>
                <div>Medical City, ST 12345</div>
                <div>NPI: 1234567890 | Tax ID: 12-3456789</div>
                <div>Phone: (555) 123-4567</div>
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontWeight: 700 }}>Blue Cross Blue Shield</div>
                <div>Appeals Department</div>
                <div>PO Box 9999</div>
                <div>Payer City, ST 54321</div>
              </div>
              
              <div style={{ marginBottom: '24px', fontWeight: 700 }}>
                RE: Appeal of Claim Denial
                <div style={{ fontWeight: 400, marginTop: '8px', lineHeight: '1.6' }}>
                  Claim Number: CLM-2024-12345<br/>
                  Patient: John Doe (DOB: 01/15/1980, ID: MEM-67890)<br/>
                  Date of Service: 12/01/2023<br/>
                  CPT Code: 99214 (Office Visit, Level 4)<br/>
                  Denial Date: 12/15/2023<br/>
                  Denial Code: CO-50 (Lack of Medical Necessity)
                </div>
              </div>
              
              <div style={{ marginBottom: '16px' }}>Dear Appeals Reviewer,</div>
              
              <p style={{ marginBottom: '16px' }}>
                This letter formally appeals the denial of the above-referenced claim on the basis of lack of medical necessity. The service rendered was medically necessary, appropriately documented, and meets the coverage criteria outlined in the member's benefit plan.
              </p>
              
              <p style={{ marginBottom: '16px' }}>
                The patient presented with documented symptoms consistent with ICD-10 code Z00.00, requiring a comprehensive evaluation. The level 4 office visit (CPT 99214) was medically appropriate given the complexity of the patient's condition, the detailed history and examination performed, and the medical decision-making required. This service aligns with evidence-based clinical guidelines and your own medical policy criteria for coverage of evaluation and management services.
              </p>
              
              <p style={{ marginBottom: '24px' }}>
                We respectfully request reconsideration of this denial and ask that payment be issued in accordance with the contracted rate or the plan's fee schedule. The complete medical record is available upon request. If additional documentation is required, please contact our office directly at (555) 123-4567.
              </p>
              
              <div style={{ marginTop: '40px' }}>
                <div>Sincerely,</div>
                <div style={{ marginTop: '48px', marginBottom: '8px' }}>_________________________________</div>
                <div style={{ fontWeight: 700 }}>Dr. Jane Smith, MD</div>
                <div>NPI: 1234567890</div>
                <div style={{ marginTop: '16px' }}>Date: _______________</div>
              </div>
            </div>
          </div>
          
          <div style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '2px',
            padding: '20px 24px',
            marginTop: '24px',
            fontSize: '14px',
            color: '#1e40af',
            lineHeight: '1.6',
            fontWeight: 500
          }}>
            <strong style={{ fontWeight: 700 }}>Sample only.</strong> Your generated letter uses your actual claim details, denial code, payer policies, and clinical context.
          </div>

          {/* WHAT YOU RECEIVE */}
          <div style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '2px',
            padding: '40px',
            marginTop: '48px'
          }}>
            <h3 style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: '24px',
              textAlign: 'center'
            }}>
              What You Receive
            </h3>
            
            <div style={{
              display: 'grid',
              gap: '1px',
              background: '#e2e8f0',
              marginBottom: '24px'
            }}>
              {[
                'Structured medical appeal letter ready for submission',
                'Denial reason identification and classification',
                'Proper appeal framing and language',
                'Clear next steps for submission'
              ].map((item, i) => (
                <div key={i} style={{
                  background: 'white',
                  padding: '16px 20px',
                  fontSize: '15px',
                  color: '#0f172a',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    background: '#1e40af',
                    flexShrink: 0,
                    borderRadius: '1px'
                  }}></div>
                  {item}
                </div>
              ))}
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '2px',
              padding: '20px',
              textAlign: 'center',
              fontSize: '14px',
              color: '#475569',
              fontWeight: 500,
              fontStyle: 'italic'
            }}>
              Structured to match standard medical appeal practices.
            </div>
          </div>
        </section>

        {/* 3. WHAT'S INCLUDED */}
        <section style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '2px',
          padding: '56px 48px',
          marginBottom: '48px'
        }}>
          <div className="grid-2" style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '48px'
          }}>
            {/* Left column */}
            <div>
              <h3 style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#0f172a',
                margin: '0 0 12px 0',
                letterSpacing: '-0.5px'
              }}>
                What's in every letter
              </h3>
              
              <p style={{
                color: '#64748b',
                fontSize: '16px',
                marginBottom: '32px',
                fontWeight: 500
              }}>
                Built to meet payer requirements and pass initial review.
              </p>
              
              <div style={{ display: 'grid', gap: '1px', background: '#e2e8f0' }}>
                {[
                  { num: '01', title: 'Provider & Payer Headers', desc: 'Complete identification and contact information' },
                  { num: '02', title: 'Claim Reference Block', desc: 'Claim number, patient ID, dates of service' },
                  { num: '03', title: 'Denial Restatement', desc: 'Clear documentation of the denial reason' },
                  { num: '04', title: 'Medical Necessity Argument', desc: 'Policy references and regulatory citations' },
                  { num: '05', title: 'Formal Appeal Language', desc: 'Professional reconsideration request' },
                  { num: '06', title: 'Signature Block', desc: 'Provider signature area with NPI' }
                ].map((item, i) => (
                  <div key={i} style={{ 
                    display: 'flex', 
                    gap: '16px', 
                    alignItems: 'flex-start',
                    background: 'white',
                    padding: '20px'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      background: '#1e40af',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                      flexShrink: 0,
                      borderRadius: '2px'
                    }}>{item.num}</div>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 400, lineHeight: '1.5' }}>
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Right column */}
            <div>
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '2px',
                padding: '32px',
                marginBottom: '24px'
              }}>
                <h4 style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: '0 0 12px 0',
                  letterSpacing: '0.3px'
                }}>
                  What you'll need
                </h4>

                <p style={{
                  fontSize: '13px',
                  color: '#1e40af',
                  marginBottom: '20px',
                  fontWeight: 500,
                  fontStyle: 'italic'
                }}>
                  Designed to integrate into existing billing and appeal workflows without disruption.
                </p>
                
                <div style={{ display: 'grid', gap: '12px' }}>
                  {[
                    'Payer name and member ID',
                    'Claim number',
                    'Denial date and reason code',
                    'Date of service',
                    'Provider NPI and Tax ID',
                    'Patient name, DOB, and ID',
                    'CPT codes billed',
                    'Supporting documentation (optional)'
                  ].map((item, i) => (
                    <div key={i} style={{
                      fontSize: '14px',
                      color: '#475569',
                      paddingLeft: '20px',
                      position: 'relative',
                      fontWeight: 400,
                      lineHeight: '1.5'
                    }}>
                      <span style={{ 
                        position: 'absolute', 
                        left: 0, 
                        color: '#1e40af', 
                        fontWeight: 700,
                        fontSize: '16px'
                      }}>·</span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '2px',
                padding: '24px'
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#1e40af',
                  marginBottom: '16px',
                  letterSpacing: '0.3px'
                }}>
                  Auto-validation included
                </div>
                <div style={{ display: 'grid', gap: '10px', fontSize: '13px', color: '#475569', fontWeight: 400 }}>
                  <div style={{ paddingLeft: '16px', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: '#1e40af', fontWeight: 700 }}>·</span>
                    Timely filing window check
                  </div>
                  <div style={{ paddingLeft: '16px', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: '#1e40af', fontWeight: 700 }}>·</span>
                    Duplicate appeal detection
                  </div>
                  <div style={{ paddingLeft: '16px', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: '#1e40af', fontWeight: 700 }}>·</span>
                    Required field validation
                  </div>
                </div>
              </div>
              
              <div style={{
                marginTop: '24px',
                padding: '28px 32px',
                background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
                borderRadius: '2px',
                textAlign: 'center',
                border: '1px solid rgba(59, 130, 246, 0.3)'
              }}>
                <div style={{
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: 600,
                  marginBottom: '16px',
                  letterSpacing: '0.3px'
                }}>
                  Delivered as PDF — ready for portal, fax, or mail
                </div>
                <button 
                  onClick={() => navigate('/start')}
                  style={{
                    background: 'white',
                    color: '#0f172a',
                    border: 'none',
                    padding: '12px 32px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    borderRadius: '2px',
                    transition: 'all 0.2s ease',
                    letterSpacing: '0.3px'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  Start Now →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* PROCESS ALIGNMENT */}
        <section style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '2px',
          padding: '48px 56px',
          marginBottom: '48px'
        }}>
          <h2 style={{
            fontSize: '28px',
            fontWeight: 700,
            textAlign: 'center',
            margin: '0 0 32px 0',
            letterSpacing: '-0.5px',
            color: '#0f172a'
          }}>
            Structured Like Professional Appeals
          </h2>

          <div style={{
            display: 'grid',
            gap: '1px',
            background: '#e2e8f0',
            marginBottom: '32px'
          }}>
            {[
              'Identifies denial reason and classification',
              'Applies appropriate appeal logic and coding context',
              'Generates structured appeal language',
              'Organizes supporting points for review'
            ].map((item, i) => (
              <div key={i} style={{
                background: 'white',
                padding: '20px 24px',
                fontSize: '15px',
                color: '#0f172a',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: '#1e40af',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 700,
                  flexShrink: 0,
                  borderRadius: '2px'
                }}>
                  {(i + 1).toString().padStart(2, '0')}
                </div>
                {item}
              </div>
            ))}
          </div>

          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '2px',
            padding: '20px',
            textAlign: 'center',
            fontSize: '14px',
            color: '#475569',
            fontWeight: 500,
            fontStyle: 'italic'
          }}>
            This reflects the same structured methodology used in standard medical appeal preparation.
          </div>
        </section>

        {/* 4. HOW IT WORKS */}
        <section style={{
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
            How It Works
          </h2>

          <p style={{
            textAlign: 'center',
            color: '#1e40af',
            fontSize: '15px',
            marginBottom: '48px',
            fontWeight: 600
          }}>
            Reduces time per appeal while increasing consistency — allowing teams to handle more denials without adding staff.
          </p>
          
          <div className="grid-4" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1px',
            background: '#e2e8f0'
          }}>
            {[
              { num: '01', title: 'Enter denial details', desc: 'Claim info, denial code, dates' },
              { num: '02', title: 'We validate it', desc: 'Timely filing, duplicate check' },
              { num: '03', title: 'Pay $10', desc: 'Secure one-time payment' },
              { num: '04', title: 'Download your PDF', desc: 'Ready to submit immediately' }
            ].map((step, i) => (
              <div 
                key={i}
                onMouseEnter={() => setHoveredCard(i)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  background: hoveredCard === i ? 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)' : 'white',
                  padding: '40px 24px',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                <div style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: hoveredCard === i ? '#93c5fd' : '#1e40af',
                  marginBottom: '20px',
                  transition: 'color 0.2s ease',
                  letterSpacing: '-0.5px'
                }}>
                  {step.num}
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: hoveredCard === i ? 'white' : '#0f172a',
                  marginBottom: '8px',
                  transition: 'color 0.2s ease',
                  lineHeight: '1.4'
                }}>
                  {step.title}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: hoveredCard === i ? 'rgba(255,255,255,0.8)' : '#64748b',
                  fontWeight: 400,
                  transition: 'color 0.2s ease',
                  lineHeight: '1.5'
                }}>
                  {step.desc}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* TRADITIONAL APPEAL SERVICES COMPARISON */}
        <section style={{
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
            margin: '0 0 48px 0',
            letterSpacing: '-0.5px',
            color: '#0f172a'
          }}>
            Traditional Appeal Services vs Denial Appeal Pro
          </h2>

          <div className="grid-2" style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '32px'
          }}>
            {/* Left Side - Traditional */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '2px',
              padding: '40px 32px'
            }}>
              <h3 style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#64748b',
                marginBottom: '24px',
                textAlign: 'center'
              }}>
                Medical Billing / Appeal Specialists
              </h3>

              <div style={{ display: 'grid', gap: '16px' }}>
                {[
                  { icon: '💰', text: '25%–40% of recovered amount' },
                  { icon: '👤', text: 'Manual case review' },
                  { icon: '⏱️', text: 'Multi-day turnaround' },
                  { icon: '💬', text: 'Requires back-and-forth communication' }
                ].map((item, i) => (
                  <div key={i} style={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '2px',
                    padding: '16px 20px',
                    fontSize: '15px',
                    color: '#475569',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <span style={{ fontSize: '20px' }}>{item.icon}</span>
                    {item.text}
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side - Denial Appeal Pro */}
            <div style={{
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              border: '2px solid #3b82f6',
              borderRadius: '2px',
              padding: '40px 32px',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '-12px',
                right: '24px',
                background: '#1e40af',
                color: 'white',
                padding: '4px 16px',
                borderRadius: '2px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}>
                FLAT FEE
              </div>

              <h3 style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#1e40af',
                marginBottom: '24px',
                textAlign: 'center'
              }}>
                Denial Appeal Pro
              </h3>

              <div style={{ display: 'grid', gap: '16px' }}>
                {[
                  { icon: '✓', text: 'Flat cost per appeal' },
                  { icon: '✓', text: 'Immediate structured output' },
                  { icon: '✓', text: 'No delays' },
                  { icon: '✓', text: 'Ready-to-submit appeal letter' }
                ].map((item, i) => (
                  <div key={i} style={{
                    background: 'white',
                    border: '1px solid #93c5fd',
                    borderRadius: '2px',
                    padding: '16px 20px',
                    fontSize: '15px',
                    color: '#1e40af',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <span style={{ 
                      fontSize: '18px',
                      fontWeight: 700,
                      color: '#16a34a'
                    }}>{item.icon}</span>
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* INSTITUTIONAL LAYER - DECISION CONTROL */}
        <section style={{
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
            Built with Appeal Decision Guardrails
          </h2>

          <p style={{
            textAlign: 'center',
            color: '#64748b',
            fontSize: '17px',
            marginBottom: '48px',
            fontWeight: 500
          }}>
            Not all denials require the same level of response or escalation.
          </p>

          <div className="decision-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '24px',
            marginBottom: '40px'
          }}>
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '2px',
              padding: '32px 28px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: '#1e40af',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 700,
                borderRadius: '2px',
                marginBottom: '20px'
              }}>
                01
              </div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: '12px'
              }}>
                Standard Denial Appeals
              </h3>
              <p style={{
                fontSize: '15px',
                color: '#475569',
                lineHeight: '1.7',
                margin: 0,
                fontWeight: 400
              }}>
                Many denials (medical necessity, coding, authorization) follow structured appeal patterns.
              </p>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '2px',
              padding: '32px 28px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: '#1e40af',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 700,
                borderRadius: '2px',
                marginBottom: '20px'
              }}>
                02
              </div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: '12px'
              }}>
                When Complexity Increases
              </h3>
              <p style={{
                fontSize: '15px',
                color: '#475569',
                lineHeight: '1.7',
                margin: 0,
                fontWeight: 400
              }}>
                High-value claims, multiple denials, or complex treatment cases may require additional review.
              </p>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '2px',
              padding: '32px 28px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: '#1e40af',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 700,
                borderRadius: '2px',
                marginBottom: '20px'
              }}>
                03
              </div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: '12px'
              }}>
                Professional Threshold
              </h3>
              <p style={{
                fontSize: '15px',
                color: '#475569',
                lineHeight: '1.7',
                margin: 0,
                fontWeight: 400
              }}>
                In more complex cases, working with a billing specialist or provider may be appropriate.
              </p>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '2px',
              padding: '32px 28px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: '#1e40af',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 700,
                borderRadius: '2px',
                marginBottom: '20px'
              }}>
                04
              </div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: '12px'
              }}>
                Structured First Appeal
              </h3>
              <p style={{
                fontSize: '15px',
                color: '#475569',
                lineHeight: '1.7',
                margin: 0,
                fontWeight: 400
              }}>
                This system ensures your initial appeal is properly structured before escalation.
              </p>
            </div>
          </div>

          {/* DECISION CONTROL LINE */}
          <div style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '2px',
            padding: '24px 32px',
            textAlign: 'center'
          }}>
            <p style={{
              fontSize: '17px',
              color: '#1e40af',
              lineHeight: '1.6',
              margin: 0,
              fontWeight: 600,
              fontStyle: 'italic'
            }}>
              The goal is to challenge the denial correctly — and escalate only when necessary.
            </p>
          </div>
        </section>

        {/* 5. PRICING */}
        <section style={{
          background: '#0f172a',
          borderRadius: '2px',
          padding: '56px 48px',
          marginBottom: '48px',
          color: 'white',
          border: '1px solid #1e293b'
        }}>
          <div className="grid-2" style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr',
            gap: '56px',
            alignItems: 'center'
          }}>
            <div>
              <h2 style={{
                fontSize: '56px',
                fontWeight: 700,
                margin: '0 0 12px 0',
                letterSpacing: '-2px'
              }}>
                $10
              </h2>
              
              <p style={{
                fontSize: '18px',
                color: '#93c5fd',
                marginBottom: '16px',
                fontWeight: 500,
                letterSpacing: '0.2px'
              }}>
                per appeal letter
              </p>
              
              <p style={{
                fontSize: '15px',
                color: 'rgba(255,255,255,0.6)',
                marginBottom: '12px',
                fontWeight: 400,
                lineHeight: '1.6'
              }}>
                One-time payment. No hidden fees. No subscription.
              </p>

              <p style={{
                fontSize: '14px',
                color: '#93c5fd',
                marginBottom: '32px',
                fontWeight: 500,
                fontStyle: 'italic',
                lineHeight: '1.6'
              }}>
                Small improvements in overturn rates can translate into significant recovered revenue at scale.
              </p>
              
              <button 
                onClick={() => navigate('/start')}
                style={{
                  background: 'white',
                  color: '#0f172a',
                  border: 'none',
                  padding: '14px 36px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderRadius: '2px',
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.3px'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 16px rgba(255,255,255,0.3)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                Start Your Appeal
              </button>
            </div>
            
            <div style={{ display: 'grid', gap: '1px', background: 'rgba(255,255,255,0.1)' }}>
              {[
                'Instant generation',
                'Professional formatting',
                'HIPAA compliant',
                'PDF download',
                'No recurring charges',
                'All denial codes'
              ].map((item, i) => (
                <div key={i} style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  padding: '16px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    background: '#60a5fa',
                    flexShrink: 0,
                    borderRadius: '1px'
                  }}></div>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. COMPARISON TABLE */}
        <ComparisonTable />

        {/* 7. STATS ROW */}
        <section style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '2px',
          padding: '56px 48px',
          marginBottom: '48px'
        }}>
          <div className="grid-4" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1px',
            textAlign: 'center',
            background: '#e2e8f0'
          }}>
            {[
              { num: '95%+', label: 'Citation accuracy', color: '#1e40af' },
              { num: '85%+', label: 'Success rate', color: '#1e40af' },
              { num: '<5 min', label: 'From entry to PDF', color: '#1e40af' },
              { num: '$10', label: 'Flat fee per appeal', color: '#1e40af' }
            ].map((stat, i) => (
              <div key={i} style={{
                background: '#f8fafc',
                padding: '40px 24px'
              }}>
                <div style={{
                  fontSize: '48px',
                  fontWeight: 700,
                  color: stat.color,
                  marginBottom: '12px',
                  letterSpacing: '-1px'
                }}>
                  {stat.num}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: '#64748b',
                  fontWeight: 500,
                  letterSpacing: '0.3px'
                }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 8. FINAL CTA */}
        <section style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
          borderRadius: '2px',
          padding: '64px 48px',
          textAlign: 'center',
          color: 'white',
          marginBottom: '48px',
          border: '1px solid rgba(59, 130, 246, 0.3)'
        }}>
          <h2 style={{
            fontSize: '36px',
            fontWeight: 700,
            margin: '0 0 20px 0',
            letterSpacing: '-0.5px'
          }}>
            Don't let a denial become a write-off.
          </h2>
          
          <p style={{
            fontSize: '16px',
            color: '#bfdbfe',
            marginBottom: '12px',
            fontWeight: 400,
            maxWidth: '600px',
            margin: '0 auto 12px',
            lineHeight: '1.6'
          }}>
            A $10 appeal letter costs less than the reimbursement you're trying to recover.
          </p>

          <p style={{
            fontSize: '15px',
            color: '#93c5fd',
            marginBottom: '32px',
            fontWeight: 500,
            maxWidth: '650px',
            margin: '0 auto 32px',
            lineHeight: '1.6',
            fontStyle: 'italic'
          }}>
            The advantage is consistency — applying the right appeal structure across every denial, not just a portion of them.
          </p>
          
          <button 
            onClick={() => navigate('/start')}
            style={{
              background: 'white',
              color: '#0f172a',
              border: 'none',
              padding: '16px 48px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              borderRadius: '2px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              transition: 'all 0.2s ease',
              letterSpacing: '0.3px'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
            }}
          >
            Generate My Appeal Letter
          </button>
        </section>

        {/* 9. FOOTER */}
        <footer style={{
          background: '#0f172a',
          borderRadius: '2px',
          padding: '48px 40px',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.6)',
          border: '1px solid #1e293b'
        }}>
          <p style={{
            fontSize: '13px',
            lineHeight: '1.7',
            marginBottom: '32px',
            fontWeight: 400,
            maxWidth: '800px',
            margin: '0 auto 32px'
          }}>
            <strong style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>Disclaimer:</strong> This service generates procedurally valid appeal letters only. We do not provide legal advice, outcome predictions, claim optimization strategies, or enforcement assistance. All documents are templates requiring your review and customization as appropriate for your specific situation.
          </p>
          
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingTop: '32px',
            fontSize: '13px'
          }}>
            <p style={{ margin: '0 0 16px 0', color: 'rgba(255,255,255,0.5)' }}>
              © {new Date().getFullYear()} Denial Appeal Pro. All rights reserved.
            </p>
            <p style={{ margin: 0 }}>
              <a href="/terms" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', marginRight: '24px', transition: 'color 0.2s' }}
                onMouseEnter={(e) => e.target.style.color = 'rgba(255,255,255,0.8)'}
                onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.5)'}
              >
                Terms of Service
              </a>
              <a href="/privacy" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', marginRight: '24px', transition: 'color 0.2s' }}
                onMouseEnter={(e) => e.target.style.color = 'rgba(255,255,255,0.8)'}
                onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.5)'}
              >
                Privacy Policy
              </a>
              <a 
                href="/admin/login" 
                style={{ 
                  color: 'rgba(255,255,255,0.3)', 
                  textDecoration: 'none',
                  fontSize: '12px',
                  opacity: 0.4,
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                onMouseLeave={(e) => e.target.style.opacity = '0.4'}
              >
                Admin
              </a>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default LandingPro;

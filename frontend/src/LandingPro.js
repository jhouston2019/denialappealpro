import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

          {/* NEW: Verified AI Trust Badge */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '2px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '16px',
            padding: '24px 32px',
            maxWidth: '900px',
            margin: '0 auto 48px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#6ee7b7',
              marginBottom: '12px',
              letterSpacing: '1px'
            }}>
              ✓ VERIFIED AI TECHNOLOGY
            </div>
            <div style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'white',
              lineHeight: '1.6'
            }}>
              95%+ Citation Accuracy • 85%+ Success Rate<br/>
              Automated Quality Assurance • Proven ROI Tracking
            </div>
            <div style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.7)',
              marginTop: '12px',
              fontWeight: 500
            }}>
              Every regulatory citation verified against our knowledge base
            </div>
          </div>

          {/* Scenario Box */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '16px',
            padding: '40px',
            marginBottom: '48px',
            maxWidth: '900px',
            margin: '0 auto 48px'
          }}>
            <p style={{
              fontSize: '18px',
              fontWeight: 600,
              marginBottom: '20px',
              color: 'rgba(255,255,255,0.9)',
              lineHeight: '1.6'
            }}>
              Their claim was denied as<br/>
              <span style={{ fontSize: '24px', color: '#fbbf24', fontWeight: 800 }}>"Not Medically Necessary."</span>
            </p>
            
            <p style={{
              fontSize: '16px',
              color: 'rgba(255,255,255,0.85)',
              lineHeight: '1.8',
              marginBottom: '0'
            }}>
              <strong style={{ color: 'white', fontSize: '18px' }}>Denial Appeal Pro</strong><br/>
              analyzes the denial reason, payer criteria, and clinical documentation —<br/>
              identifying exactly what failed and generating a<br/>
              <strong style={{ color: '#93c5fd' }}>submission-ready appeal aligned to payer requirements.</strong>
            </p>
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
              marginBottom: '32px',
              fontWeight: 500
            }}>
              Across medical billing environments,<br/>
              many denials are not final decisions —<br/>
              they result from documentation gaps, coding misalignment, or incorrect application of payer policy.
            </p>

            <h3 style={{
              fontSize: '22px',
              fontWeight: 800,
              marginBottom: '24px',
              color: 'white'
            }}>
              Denial Appeal Pro systematically identifies:
            </h3>

            <div style={{ display: 'grid', gap: '12px', marginBottom: '40px' }}>
              {[
                'Denial code breakdown (CARC/RARC → true failure point)',
                'Medical necessity gaps vs payer-specific criteria',
                'Missing or insufficient clinical documentation',
                'CPT/ICD coding misalignment',
                'Policy misapplication and guideline errors'
              ].map((item, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '8px',
                  padding: '16px 20px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.95)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{ color: '#10b981', fontSize: '18px', flexShrink: 0 }}>✓</span>
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
              gap: '12px',
              marginBottom: '40px'
            }}>
              {[
                'Structured for payer review',
                'Aligned to appeal-level requirements',
                'Ready for submission (portal, fax, or mail)',
                'Built to withstand escalation or audit'
              ].map((item, i) => (
                <div key={i} style={{
                  background: 'rgba(147, 197, 253, 0.1)',
                  border: '1px solid rgba(147, 197, 253, 0.3)',
                  borderRadius: '8px',
                  padding: '14px 18px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#93c5fd',
                  textAlign: 'center'
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

          {/* CTA Section */}
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '2px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '800px',
            margin: '0 auto 48px',
            textAlign: 'center'
          }}>
            <h2 style={{
              fontSize: '32px',
              fontWeight: 900,
              margin: '0 0 16px 0',
              color: '#fca5a5'
            }}>
              Stop Letting Denials Sit Unworked
            </h2>
            <p style={{
              fontSize: '18px',
              color: 'rgba(255,255,255,0.9)',
              fontWeight: 600,
              lineHeight: '1.6',
              marginBottom: '0'
            }}>
              Recover eligible revenue.<br/>
              Correct the submission.<br/>
              Resubmit with precision.
            </p>
          </div>

          {/* Denial Outcome Preview */}
          <div style={{
            maxWidth: '900px',
            margin: '0 auto 40px'
          }}>
            <h3 style={{
              fontSize: '28px',
              fontWeight: 800,
              marginBottom: '32px',
              color: 'white',
              textAlign: 'center'
            }}>
              Denial Outcome Preview
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              gap: '24px',
              alignItems: 'center'
            }}>
              {/* Denied Claim */}
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '2px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '12px',
                padding: '28px',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#fca5a5',
                  marginBottom: '12px',
                  letterSpacing: '0.5px'
                }}>
                  DENIED CLAIM
                </div>
                <div style={{
                  fontSize: '36px',
                  fontWeight: 900,
                  color: '#ef4444',
                  marginBottom: '8px'
                }}>
                  $18,550
                </div>
                <div style={{
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.7)',
                  fontWeight: 600
                }}>
                  Not Paid
                </div>
              </div>

              {/* VS */}
              <div style={{
                fontSize: '24px',
                fontWeight: 900,
                color: '#93c5fd',
                padding: '0 16px'
              }}>
                vs.
              </div>

              {/* Corrected Appeal */}
              <div style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '2px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '12px',
                padding: '28px',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#6ee7b7',
                  marginBottom: '12px',
                  letterSpacing: '0.5px'
                }}>
                  CORRECTED APPEAL SUBMISSION
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#10b981',
                  lineHeight: '1.5'
                }}>
                  Aligned to Payer Criteria —<br/>
                  Ready for Review
                </div>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            marginBottom: '32px',
            flexWrap: 'wrap'
          }}>
            <button 
              onClick={() => navigate('/appeal-form')}
              style={{
                background: 'white',
                color: '#0f172a',
                border: 'none',
                padding: '18px 40px',
                fontSize: '16px',
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: '50px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 15px 40px rgba(0,0,0,0.4)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
              }}
            >
              Run Denial Analysis → Generate Appeal
            </button>
            
            <button 
              onClick={scrollToSample}
              style={{
                background: 'transparent',
                color: 'white',
                border: '2px solid rgba(255,255,255,0.3)',
                padding: '16px 32px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                borderRadius: '50px',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.borderColor = 'white';
                e.target.style.background = 'rgba(255,255,255,0.1)';
              }}
              onMouseOut={(e) => {
                e.target.style.borderColor = 'rgba(255,255,255,0.3)';
                e.target.style.background = 'transparent';
              }}
            >
              See a Sample Letter ↓
            </button>
          </div>

          {/* Optional High-Conversion Subline */}
          <p style={{
            fontSize: '16px',
            color: 'rgba(255,255,255,0.8)',
            fontWeight: 600,
            textAlign: 'center',
            fontStyle: 'italic'
          }}>
            Every denial has a reason.<br/>
            This shows you exactly how to overturn it.
          </p>
        </div>
      </section>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '72px 24px' }}>
        
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
            marginBottom: '48px',
            fontWeight: 500
          }}>
            A real, professionally formatted appeal letter — not a form-filled template.
          </p>
          
          <div style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(0,0,0,0.08)'
          }}>
            {/* Browser chrome */}
            <div style={{
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }}></div>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }}></div>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }}></div>
              </div>
              <div style={{
                flex: 1,
                fontSize: '13px',
                color: '#64748b',
                fontWeight: 600
              }}>
                Appeal_Letter_CO50_CLM-2024-12345.pdf
              </div>
              <div style={{
                background: '#10b981',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.5px'
              }}>
                SUBMISSION READY
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
            background: '#dbeafe',
            border: '1px solid #93c5fd',
            borderRadius: '12px',
            padding: '20px',
            marginTop: '24px',
            fontSize: '14px',
            color: '#1e40af',
            lineHeight: '1.6'
          }}>
            <strong>Sample only.</strong> Your generated letter uses your actual claim details, denial code, payer policies, and clinical context.
          </div>
        </section>

        {/* 3. WHAT'S INCLUDED */}
        <section style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
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
                fontWeight: 800,
                color: '#0f172a',
                margin: '0 0 12px 0'
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
              
              <div style={{ display: 'grid', gap: '20px' }}>
                {[
                  { icon: '🏥', title: 'Provider & Payer Headers', desc: 'Complete identification and contact information' },
                  { icon: '📋', title: 'Claim Reference Block', desc: 'Claim number, patient ID, dates of service' },
                  { icon: '❌', title: 'Denial Restatement', desc: 'Clear documentation of the denial reason' },
                  { icon: '⚕️', title: 'Medical Necessity Argument', desc: 'Policy references and regulatory citations' },
                  { icon: '📝', title: 'Formal Appeal Language', desc: 'Professional reconsideration request' },
                  { icon: '✍️', title: 'Signature Block', desc: 'Provider signature area with NPI' }
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '28px', flexShrink: 0 }}>{item.icon}</div>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
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
                borderRadius: '16px',
                padding: '32px',
                marginBottom: '24px'
              }}>
                <h4 style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: '0 0 20px 0'
                }}>
                  What you'll need
                </h4>
                
                <div style={{ display: 'grid', gap: '10px' }}>
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
                      color: '#0f172a',
                      paddingLeft: '20px',
                      position: 'relative',
                      fontWeight: 500
                    }}>
                      <span style={{ position: 'absolute', left: 0, color: '#1e3a8a', fontWeight: 700 }}>•</span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              
              <div style={{
                background: '#dbeafe',
                border: '1px solid #93c5fd',
                borderRadius: '16px',
                padding: '24px'
              }}>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#1e40af',
                  marginBottom: '16px'
                }}>
                  ✓ Auto-validation included
                </div>
                <div style={{ display: 'grid', gap: '8px', fontSize: '14px', color: '#1e40af', fontWeight: 500 }}>
                  <div>• Timely filing window check</div>
                  <div>• Duplicate appeal detection</div>
                  <div>• Required field validation</div>
                </div>
              </div>
              
              <div style={{
                marginTop: '24px',
                padding: '20px',
                background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
                borderRadius: '16px',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '24px',
                  marginBottom: '12px'
                }}>📄</div>
                <div style={{
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: 600,
                  marginBottom: '12px'
                }}>
                  Delivered as PDF — ready for portal, fax, or mail
                </div>
                <button 
                  onClick={() => navigate('/appeal-form')}
                  style={{
                    background: 'white',
                    color: '#0f172a',
                    border: 'none',
                    padding: '12px 28px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    borderRadius: '50px',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                >
                  Start Now →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 4. HOW IT WORKS */}
        <section style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          padding: '56px 48px',
          marginBottom: '48px'
        }}>
          <h2 style={{
            fontSize: '36px',
            fontWeight: 800,
            textAlign: 'center',
            margin: '0 0 48px 0',
            letterSpacing: '-1px',
            color: '#0f172a'
          }}>
            How It Works
          </h2>
          
          <div className="grid-4" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '24px'
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
                  background: hoveredCard === i ? 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)' : '#f8fafc',
                  border: hoveredCard === i ? 'none' : '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '32px 24px',
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  transform: hoveredCard === i ? 'translateY(-8px)' : 'translateY(0)',
                  boxShadow: hoveredCard === i ? '0 20px 40px rgba(30,58,138,0.3)' : 'none'
                }}
              >
                <div style={{
                  fontSize: '32px',
                  fontWeight: 900,
                  color: hoveredCard === i ? '#93c5fd' : '#1e3a8a',
                  marginBottom: '16px',
                  transition: 'color 0.3s ease'
                }}>
                  {step.num}
                </div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: hoveredCard === i ? 'white' : '#0f172a',
                  marginBottom: '8px',
                  transition: 'color 0.3s ease'
                }}>
                  {step.title}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: hoveredCard === i ? 'rgba(255,255,255,0.8)' : '#64748b',
                  fontWeight: 500,
                  transition: 'color 0.3s ease'
                }}>
                  {step.desc}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. PRICING */}
        <section style={{
          background: '#0f172a',
          borderRadius: '20px',
          padding: '56px 48px',
          marginBottom: '48px',
          color: 'white'
        }}>
          <div className="grid-2" style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr',
            gap: '48px',
            alignItems: 'center'
          }}>
            <div>
              <h2 style={{
                fontSize: '56px',
                fontWeight: 900,
                margin: '0 0 12px 0',
                letterSpacing: '-2px'
              }}>
                $10
              </h2>
              
              <p style={{
                fontSize: '20px',
                color: '#93c5fd',
                marginBottom: '16px',
                fontWeight: 600
              }}>
                per appeal letter
              </p>
              
              <p style={{
                fontSize: '16px',
                color: 'rgba(255,255,255,0.7)',
                marginBottom: '32px',
                fontWeight: 500
              }}>
                One-time payment. No hidden fees. No subscription.
              </p>
              
              <button 
                onClick={() => navigate('/appeal-form')}
                style={{
                  background: 'white',
                  color: '#0f172a',
                  border: 'none',
                  padding: '16px 40px',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  borderRadius: '50px',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 10px 30px rgba(255,255,255,0.3)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                Start Your Appeal
              </button>
            </div>
            
            <div style={{ display: 'grid', gap: '16px' }}>
              {[
                'Instant generation',
                'Professional formatting',
                'HIPAA compliant',
                'PDF download',
                'No recurring charges',
                'All denial codes'
              ].map((item, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  fontSize: '15px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{ color: '#10b981', fontSize: '18px' }}>✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. VERIFIED AI COMPARISON */}
        <section style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          padding: '56px 48px',
          marginBottom: '48px'
        }}>
          <h2 style={{
            fontSize: '36px',
            fontWeight: 800,
            textAlign: 'center',
            margin: '0 0 16px 0',
            letterSpacing: '-1px',
            color: '#0f172a'
          }}>
            Why Our AI Is Different
          </h2>
          
          <p style={{
            textAlign: 'center',
            color: '#64748b',
            fontSize: '18px',
            marginBottom: '48px',
            fontWeight: 500
          }}>
            Not all AI is created equal. Here's what sets us apart.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '24px',
            marginBottom: '48px'
          }}>
            {/* Generic ChatGPT */}
            <div style={{
              background: '#fef2f2',
              border: '2px solid #fecaca',
              borderRadius: '16px',
              padding: '32px 24px',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '16px',
                fontWeight: 700,
                color: '#991b1b',
                marginBottom: '16px'
              }}>
                Generic ChatGPT
              </div>
              <div style={{
                fontSize: '48px',
                fontWeight: 900,
                color: '#dc2626',
                marginBottom: '16px'
              }}>
                40/100
              </div>
              <div style={{ display: 'grid', gap: '8px', fontSize: '13px', color: '#991b1b', textAlign: 'left' }}>
                <div>❌ No citation verification</div>
                <div>❌ Generic language</div>
                <div>❌ No outcome tracking</div>
                <div>❌ ~70% citation accuracy</div>
              </div>
            </div>

            {/* Other AI Tools */}
            <div style={{
              background: '#fef9c3',
              border: '2px solid #fde047',
              borderRadius: '16px',
              padding: '32px 24px',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '16px',
                fontWeight: 700,
                color: '#854d0e',
                marginBottom: '16px'
              }}>
                Other AI Tools
              </div>
              <div style={{
                fontSize: '48px',
                fontWeight: 900,
                color: '#ca8a04',
                marginBottom: '16px'
              }}>
                60/100
              </div>
              <div style={{ display: 'grid', gap: '8px', fontSize: '13px', color: '#854d0e', textAlign: 'left' }}>
                <div>⚠️ Limited verification</div>
                <div>⚠️ Basic templates</div>
                <div>⚠️ No quality tracking</div>
                <div>⚠️ ~80% citation accuracy</div>
              </div>
            </div>

            {/* Denial Appeal Pro */}
            <div style={{
              background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
              border: '3px solid #3b82f6',
              borderRadius: '16px',
              padding: '32px 24px',
              textAlign: 'center',
              position: 'relative',
              boxShadow: '0 10px 30px rgba(59, 130, 246, 0.2)'
            }}>
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#10b981',
                color: 'white',
                padding: '6px 16px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.5px'
              }}>
                VERIFIED AI
              </div>
              <div style={{
                fontSize: '16px',
                fontWeight: 700,
                color: '#1e40af',
                marginBottom: '16px'
              }}>
                Denial Appeal Pro
              </div>
              <div style={{
                fontSize: '48px',
                fontWeight: 900,
                color: '#1e3a8a',
                marginBottom: '16px'
              }}>
                95/100
              </div>
              <div style={{ display: 'grid', gap: '8px', fontSize: '13px', color: '#1e40af', textAlign: 'left', fontWeight: 600 }}>
                <div>✓ 95%+ citation accuracy</div>
                <div>✓ 85%+ success rate</div>
                <div>✓ Automated QA</div>
                <div>✓ ROI tracking</div>
              </div>
            </div>
          </div>

          {/* Key Differentiators */}
          <div style={{
            background: '#f8fafc',
            borderRadius: '12px',
            padding: '32px',
            textAlign: 'left'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: 800,
              color: '#0f172a',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              What "Verified AI" Means
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px'
            }}>
              {[
                { icon: '🔍', title: 'Citation Verification', desc: 'Every regulatory citation cross-referenced against our knowledge base' },
                { icon: '📊', title: 'Quality Scoring', desc: 'Automated 100-point quality check on every appeal' },
                { icon: '🎯', title: 'Success Tracking', desc: 'Real-world outcome data proves what works' },
                { icon: '⚡', title: 'Zero Hallucinations', desc: 'AI cannot cite non-existent regulations' }
              ].map((item, i) => (
                <div key={i} style={{
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'flex-start'
                }}>
                  <div style={{ fontSize: '28px', flexShrink: 0 }}>{item.icon}</div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, lineHeight: '1.5' }}>
                      {item.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. STATS ROW */}
        <section style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          padding: '48px',
          marginBottom: '48px'
        }}>
          <div className="grid-4" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '40px',
            textAlign: 'center'
          }}>
            {[
              { num: '95%+', label: 'Citation accuracy', color: '#10b981' },
              { num: '85%+', label: 'Success rate', color: '#3b82f6' },
              { num: '<5 min', label: 'From entry to PDF', color: '#8b5cf6' },
              { num: '$10', label: 'Flat fee per appeal', color: '#1e3a8a' }
            ].map((stat, i) => (
              <div key={i}>
                <div style={{
                  fontSize: '48px',
                  fontWeight: 900,
                  color: stat.color,
                  marginBottom: '8px'
                }}>
                  {stat.num}
                </div>
                <div style={{
                  fontSize: '15px',
                  color: '#64748b',
                  fontWeight: 600
                }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 8. FINAL CTA */}
        <section style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
          borderRadius: '20px',
          padding: '64px 48px',
          textAlign: 'center',
          color: 'white',
          marginBottom: '48px'
        }}>
          <h2 style={{
            fontSize: '40px',
            fontWeight: 900,
            margin: '0 0 16px 0',
            letterSpacing: '-1px'
          }}>
            Don't let a denial become a write-off.
          </h2>
          
          <p style={{
            fontSize: '18px',
            color: '#93c5fd',
            marginBottom: '32px',
            fontWeight: 500,
            maxWidth: '600px',
            margin: '0 auto 32px'
          }}>
            A $10 appeal letter costs less than the reimbursement you're trying to recover.
          </p>
          
          <button 
            onClick={() => navigate('/appeal-form')}
            style={{
              background: 'white',
              color: '#0f172a',
              border: 'none',
              padding: '20px 48px',
              fontSize: '18px',
              fontWeight: 700,
              cursor: 'pointer',
              borderRadius: '50px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-4px)';
              e.target.style.boxShadow = '0 15px 40px rgba(0,0,0,0.4)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
            }}
          >
            Generate My Appeal Letter
          </button>
        </section>

        {/* 9. FOOTER */}
        <footer style={{
          background: '#0f172a',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.7)'
        }}>
          <p style={{
            fontSize: '13px',
            lineHeight: '1.6',
            marginBottom: '24px',
            fontWeight: 500,
            maxWidth: '800px',
            margin: '0 auto 24px'
          }}>
            <strong style={{ color: 'white' }}>Disclaimer:</strong> This service generates procedurally valid appeal letters only. We do not provide legal advice, outcome predictions, claim optimization strategies, or enforcement assistance. All documents are templates requiring your review and customization as appropriate for your specific situation.
          </p>
          
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: '24px',
            fontSize: '14px'
          }}>
            <p style={{ margin: '0 0 12px 0' }}>
              © {new Date().getFullYear()} Denial Appeal Pro. All rights reserved.
            </p>
            <p style={{ margin: 0 }}>
              <a href="/terms" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', marginRight: '20px' }}>
                Terms of Service
              </a>
              <a href="/privacy" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
                Privacy Policy
              </a>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default LandingPro;

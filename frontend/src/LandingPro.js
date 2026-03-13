import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
        textAlign: 'center',
        color: 'white'
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(147, 197, 253, 0.15)',
            border: '1px solid rgba(147, 197, 253, 0.3)',
            padding: '8px 20px',
            borderRadius: '50px',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '24px',
            letterSpacing: '0.5px'
          }}>
            For billing managers & practice administrators
          </div>
          
          <h1 style={{
            fontSize: '56px',
            fontWeight: 900,
            margin: '0 0 24px 0',
            letterSpacing: '-2px',
            lineHeight: '1.1'
          }}>
            Your denied claim, appealed in 5 minutes.
          </h1>
          
          <p style={{
            fontSize: '20px',
            color: '#93c5fd',
            marginBottom: '24px',
            fontWeight: 600,
            lineHeight: '1.5'
          }}>
            Most payers give you 90–180 days to appeal.
          </p>
          
          <p style={{
            fontSize: '18px',
            color: 'rgba(255,255,255,0.85)',
            marginBottom: '40px',
            lineHeight: '1.7',
            fontWeight: 500,
            maxWidth: '700px',
            margin: '0 auto 40px'
          }}>
            Don't lose a reimbursable claim to paperwork. Enter your denial details, pay $10, download a submission-ready PDF.
          </p>
          
          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            marginBottom: '40px',
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
              Write My Appeal — $10
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
          
          <div style={{
            display: 'flex',
            gap: '32px',
            justifyContent: 'center',
            fontSize: '14px',
            color: 'rgba(255,255,255,0.7)',
            fontWeight: 600
          }}>
            <div>✓ HIPAA compliant</div>
            <div>✓ Instant PDF</div>
            <div>✓ 30+ denial codes covered</div>
          </div>
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

        {/* 6. STATS ROW */}
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
              { num: '30+', label: 'Denial codes covered' },
              { num: '<5 min', label: 'From entry to PDF' },
              { num: '$10', label: 'Flat fee, no surprises' },
              { num: '24/7', label: 'Available anytime' }
            ].map((stat, i) => (
              <div key={i}>
                <div style={{
                  fontSize: '48px',
                  fontWeight: 900,
                  color: '#1e3a8a',
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

        {/* 7. FINAL CTA */}
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

        {/* 8. FOOTER */}
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

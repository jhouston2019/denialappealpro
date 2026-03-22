import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// Build: 2026-02-11-v2

function LandingConsumer() {
  const navigate = useNavigate();
  const [hoveredStep, setHoveredStep] = useState(null);

  const scrollToSample = () => {
    document.getElementById('sample-letter')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f0faf8',
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
          .grid-3 { grid-template-columns: 1fr !important; }
          .grid-4 { grid-template-columns: 1fr !important; }
          .letter-body { padding: 24px !important; }
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
        background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
        padding: '80px 24px 100px',
        textAlign: 'center',
        color: 'white'
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            padding: '10px 24px',
            borderRadius: '2px',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '32px',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            color: '#93c5fd'
          }}>
            Got an insurance denial? You can push back.
          </div>
          
          <h1 style={{
            fontSize: '52px',
            fontWeight: 700,
            margin: '0 0 20px 0',
            letterSpacing: '-1.5px',
            lineHeight: '1.15'
          }}>
            Your insurance company said no.
          </h1>
          
          <h2 style={{
            fontSize: '44px',
            fontWeight: 700,
            margin: '0 0 32px 0',
            letterSpacing: '-1.5px',
            lineHeight: '1.15',
            color: '#93c5fd'
          }}>
            Here's how to say not yet.
          </h2>
          
          <p style={{
            fontSize: '17px',
            color: 'rgba(255,255,255,0.85)',
            marginBottom: '40px',
            lineHeight: '1.7',
            fontWeight: 400,
            maxWidth: '700px',
            margin: '0 auto 40px'
          }}>
            Insurance companies deny valid claims every day. Many get overturned on appeal — but most people never file one because the paperwork feels impossible. We make it simple. Answer a few questions, pay $10, and we write a professional appeal letter for you.
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
              Fight My Denial — $10
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
              See what the letter looks like ↓
            </button>
          </div>
          
          <div style={{
            display: 'flex',
            gap: '32px',
            justifyContent: 'center',
            fontSize: '13px',
            color: 'rgba(255,255,255,0.6)',
            fontWeight: 500,
            flexWrap: 'wrap',
            letterSpacing: '0.3px'
          }}>
            <div style={{ paddingLeft: '16px', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: '#60a5fa' }}>·</span>
              No medical knowledge required
            </div>
            <div style={{ paddingLeft: '16px', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: '#60a5fa' }}>·</span>
              Plain English form
            </div>
            <div style={{ paddingLeft: '16px', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: '#60a5fa' }}>·</span>
              Ready to mail or fax
            </div>
          </div>
        </div>
      </section>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '72px 24px' }}>
        
        {/* 2. EMPATHY STRIP */}
        <section style={{ marginBottom: '72px' }}>
          <div className="grid-3" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1px',
            background: '#e2e8f0'
          }}>
            {[
              { num: '01', title: 'They denied it. That doesn\'t mean it\'s final.', desc: 'Most denials can be appealed. You have the right to ask for a second look.' },
              { num: '02', title: 'You don\'t need to know the system.', desc: 'We translate your denial into the language insurers respond to.' },
              { num: '03', title: 'But you do have a deadline.', desc: 'Most plans give you 90–180 days to appeal. The clock starts at denial.' }
            ].map((card, i) => (
              <div key={i} style={{
                background: 'white',
                padding: '40px 32px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: '#1e40af',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 700,
                  margin: '0 auto 24px',
                  borderRadius: '2px'
                }}>{card.num}</div>
                <h3 style={{
                  fontSize: '17px',
                  fontWeight: 600,
                  color: '#0f172a',
                  marginBottom: '12px',
                  lineHeight: '1.4',
                  letterSpacing: '-0.2px'
                }}>
                  {card.title}
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: '#64748b',
                  fontWeight: 400,
                  lineHeight: '1.6',
                  margin: 0
                }}>
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 3. SAMPLE LETTER SECTION */}
        <section id="sample-letter" style={{ marginBottom: '72px' }}>
          <h2 style={{
            fontSize: '40px',
            fontWeight: 800,
            textAlign: 'center',
            margin: '0 0 16px 0',
            letterSpacing: '-1px',
            color: '#1e293b'
          }}>
            This is the letter we write for you.
          </h2>
          
          <p style={{
            textAlign: 'center',
            color: '#4b5563',
            fontSize: '18px',
            marginBottom: '48px',
            fontWeight: 500
          }}>
            Professional. Specific. Ready to submit.
          </p>
          
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
                Ready to submit
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
                  Service: Office Visit<br/>
                  Denial Date: 12/15/2023<br/>
                  Reason: Not medically necessary
                </div>
              </div>
              
              <div style={{ marginBottom: '16px' }}>Dear Appeals Reviewer,</div>
              
              <p style={{ marginBottom: '16px' }}>
                This letter formally appeals the denial of the above-referenced claim. The service was medically necessary, appropriately documented, and meets the coverage criteria outlined in the member's benefit plan.
              </p>
              
              <p style={{ marginBottom: '16px' }}>
                The patient presented with documented symptoms requiring a comprehensive evaluation. The office visit was medically appropriate given the patient's condition and the detailed examination performed. This service aligns with evidence-based clinical guidelines and your medical policy criteria for coverage.
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
            <strong style={{ fontWeight: 700 }}>This is a sample.</strong> Your letter is written using your actual denial details, insurance company, and the specific reason they gave.
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
            margin: '0 0 12px 0',
            letterSpacing: '-0.5px',
            color: '#0f172a'
          }}>
            Three steps and you're done.
          </h2>
          
          <p style={{
            textAlign: 'center',
            color: '#64748b',
            fontSize: '16px',
            marginBottom: '48px',
            fontWeight: 400
          }}>
            No medical degree required.
          </p>
          
          <div className="grid-3" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1px',
            background: '#e2e8f0'
          }}>
            {[
              { num: '01', title: 'Tell us about your denial', desc: 'What was denied, who your insurer is, and when it happened.' },
              { num: '02', title: 'We write your appeal', desc: 'Our system generates a professional letter using the information you provided. $10, one-time.' },
              { num: '03', title: 'You sign and send it', desc: 'Print, sign, and mail or fax it to your insurer. That\'s it.' }
            ].map((step, i) => (
              <div 
                key={i}
                onMouseEnter={() => setHoveredStep(i)}
                onMouseLeave={() => setHoveredStep(null)}
                style={{
                  background: hoveredStep === i ? 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)' : 'white',
                  padding: '48px 32px',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                <div style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: hoveredStep === i ? '#93c5fd' : '#1e40af',
                  marginBottom: '24px',
                  transition: 'color 0.2s ease',
                  letterSpacing: '-0.5px'
                }}>
                  {step.num}
                </div>
                <div style={{
                  fontSize: '17px',
                  fontWeight: 600,
                  color: hoveredStep === i ? 'white' : '#0f172a',
                  marginBottom: '12px',
                  transition: 'color 0.2s ease',
                  lineHeight: '1.4',
                  letterSpacing: '-0.2px'
                }}>
                  {step.title}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: hoveredStep === i ? 'rgba(255,255,255,0.8)' : '#64748b',
                  fontWeight: 400,
                  lineHeight: '1.6',
                  transition: 'color 0.2s ease'
                }}>
                  {step.desc}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. WHAT YOU'LL NEED */}
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
                What to have on hand
              </h3>
              
              <p style={{
                color: '#64748b',
                fontSize: '16px',
                marginBottom: '32px',
                fontWeight: 400
              }}>
                It's all on the denial letter they sent you.
              </p>
              
              <div style={{ display: 'grid', gap: '14px' }}>
                {[
                  'The denial letter from your insurance company',
                  'Your insurance member ID',
                  'The name of your doctor or hospital',
                  'The date of your appointment or procedure',
                  'A description of what was denied (e.g. "MRI of knee" or "physical therapy")'
                ].map((item, i) => (
                  <div key={i} style={{
                    fontSize: '14px',
                    color: '#475569',
                    paddingLeft: '20px',
                    position: 'relative',
                    fontWeight: 400,
                    lineHeight: '1.6'
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
            
            {/* Right column */}
            <div style={{ display: 'grid', gap: '20px' }}>
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '2px',
                padding: '28px'
              }}>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: '12px',
                  letterSpacing: '0.3px'
                }}>
                  No coding knowledge needed
                </div>
                <p style={{
                  fontSize: '14px',
                  color: '#64748b',
                  fontWeight: 400,
                  lineHeight: '1.6',
                  margin: 0
                }}>
                  You don't need to know CPT codes, ICD codes, or insurance terminology. We handle that.
                </p>
              </div>
              
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '2px',
                padding: '28px'
              }}>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#1e40af',
                  marginBottom: '12px',
                  letterSpacing: '0.3px'
                }}>
                  Your information is protected
                </div>
                <p style={{
                  fontSize: '14px',
                  color: '#475569',
                  fontWeight: 400,
                  lineHeight: '1.6',
                  margin: 0
                }}>
                  We never store, sell, or share your personal health information. HIPAA compliant.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. REASSURANCE SECTION */}
        <section style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
          borderRadius: '2px',
          padding: '64px 48px',
          textAlign: 'center',
          color: 'white',
          marginBottom: '48px',
          border: '1px solid rgba(59, 130, 246, 0.3)'
        }}>
          <blockquote style={{
            fontSize: '28px',
            fontWeight: 600,
            margin: '0 0 28px 0',
            letterSpacing: '-0.5px',
            lineHeight: '1.4',
            fontStyle: 'italic'
          }}>
            "Insurance companies count on you not appealing."
          </blockquote>
          
          <p style={{
            fontSize: '16px',
            color: 'rgba(255,255,255,0.8)',
            marginBottom: '40px',
            lineHeight: '1.7',
            fontWeight: 400,
            maxWidth: '700px',
            margin: '0 auto 40px'
          }}>
            About 50% of appealed denials are overturned. Most people never file because they don't know how — or they assume it won't work. For $10, you have nothing to lose and a real shot at getting your claim paid.
          </p>
          
          <button 
            onClick={() => navigate('/appeal-form')}
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
            Write My Appeal — $10
          </button>
        </section>

        {/* 7. FAQ */}
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
            Common questions
          </h2>
          
          <div style={{ display: 'grid', gap: '1px', maxWidth: '800px', margin: '0 auto', background: '#e2e8f0' }}>
            {[
              {
                q: 'Will this actually work?',
                a: 'We can\'t guarantee outcomes, but about 50% of appealed denials are overturned. The letter we generate is professionally formatted and includes the arguments insurers expect to see. Many denials are reversed simply because someone formally asked for reconsideration.'
              },
              {
                q: 'What if I don\'t understand my denial letter?',
                a: 'That\'s okay. Our form asks for the information in plain language — you don\'t need to interpret codes or insurance jargon. Just tell us what was denied and why they said no, and we\'ll handle the rest.'
              },
              {
                q: 'Is my health information safe?',
                a: 'Yes. We never store your personal health information. The letter is generated on-demand and delivered directly to you as a PDF. We\'re HIPAA compliant and don\'t sell or share any data.'
              },
              {
                q: 'What happens after I send the letter?',
                a: 'Your insurance company is required to review your appeal within a specific timeframe (usually 30–60 days). They\'ll send you a written decision. If they uphold the denial, you may have the right to an external review or further appeal.'
              },
              {
                q: 'What if my appeal is denied again?',
                a: 'You may have the right to request an external review by an independent third party, depending on your plan type and state. The letter we generate will include information about your appeal rights, but we don\'t provide legal advice or handle further escalation.'
              }
            ].map((faq, i) => (
              <div key={i} style={{
                background: 'white',
                padding: '32px'
              }}>
                <h4 style={{
                  fontSize: '17px',
                  fontWeight: 600,
                  color: '#0f172a',
                  marginBottom: '12px',
                  letterSpacing: '-0.2px'
                }}>
                  {faq.q}
                </h4>
                <p style={{
                  fontSize: '14px',
                  color: '#64748b',
                  fontWeight: 400,
                  lineHeight: '1.7',
                  margin: 0
                }}>
                  {faq.a}
                </p>
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
            You paid for this coverage.
          </h2>
          
          <p style={{
            fontSize: '18px',
            color: '#bfdbfe',
            marginBottom: '32px',
            fontWeight: 500,
            letterSpacing: '-0.2px'
          }}>
            Make them explain why it doesn't apply.
          </p>
          
          <button 
            onClick={() => navigate('/appeal-form')}
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
              marginBottom: '20px',
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
            Fight My Denial — $10
          </button>
          
          <div style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.6)',
            fontWeight: 500,
            letterSpacing: '0.3px'
          }}>
            No account required · Instant download · $10 one-time
          </div>
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
            <strong style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>Disclaimer:</strong> This service generates appeal letters only and does not constitute legal or medical advice. All letters require review and signature before submission.
          </p>
          
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingTop: '32px',
            fontSize: '13px'
          }}>
            <p style={{ margin: '0 0 16px 0', color: 'rgba(255,255,255,0.5)' }}>
              © {new Date().getFullYear()} Medical Denial Appeal Pro. All rights reserved.
            </p>
            <p style={{ margin: 0 }}>
              <a href="/terms" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', marginRight: '24px', transition: 'color 0.2s' }}
                onMouseEnter={(e) => e.target.style.color = 'rgba(255,255,255,0.8)'}
                onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.5)'}
              >
                Terms of Service
              </a>
              <a href="/privacy" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={(e) => e.target.style.color = 'rgba(255,255,255,0.8)'}
                onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.5)'}
              >
                Privacy Policy
              </a>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default LandingConsumer;

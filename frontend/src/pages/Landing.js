import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Landing() {
  const navigate = useNavigate();
  const [hoveredStep, setHoveredStep] = useState(null);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: 0,
      margin: 0,
      fontFamily: 'system-ui'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
        
        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }
        
        .animate-in {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        
        .pulse-animate {
          animation: pulse 2s ease-in-out infinite;
        }
        
        .shimmer {
          background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%);
          background-size: 1000px 100%;
          animation: shimmer 3s infinite;
        }
        
        @media (max-width: 768px) {
          .responsive-grid-4 {
            grid-template-columns: 1fr 1fr !important;
          }
          .responsive-grid-2 {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      
      {/* Hero Section */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        padding: '80px 24px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 50%, rgba(102, 126, 234, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(118, 75, 162, 0.1) 0%, transparent 50%)',
          pointerEvents: 'none'
        }}></div>
        
        <div style={{
          maxWidth: '900px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 1
        }} className="animate-in">
          <div style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '8px 20px',
            borderRadius: '50px',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '24px',
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
          }}>
            ⚡ Fast • Professional • $10
          </div>
          
          <h1 style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: '56px',
            fontWeight: 900,
            margin: '0 0 24px 0',
            letterSpacing: '-2px',
            lineHeight: '1.1',
            background: 'linear-gradient(135deg, #1a1a1a 0%, #4a4a4a 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Turn Your Denied Claim<br/>Into a Winning Appeal
          </h1>
          
          <p style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: '20px',
            color: '#555',
            marginBottom: '40px',
            lineHeight: '1.6',
            fontWeight: 500
          }}>
            Professional insurance appeal letters generated in minutes.<br/>
            No legal experience required. Just $10 per appeal.
          </p>
          
          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            marginBottom: '40px',
            flexWrap: 'wrap'
          }}>
            <button 
              onClick={() => navigate('/submit')}
              className="pulse-animate"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '20px 48px',
                fontFamily: '"Inter", sans-serif',
                fontSize: '18px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                cursor: 'pointer',
                borderRadius: '50px',
                boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 15px 40px rgba(102, 126, 234, 0.5)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 10px 30px rgba(102, 126, 234, 0.4)';
              }}
            >
              Generate My Appeal Now
            </button>
            
            <button 
              onClick={() => navigate('/history')}
              style={{
                background: 'transparent',
                color: '#667eea',
                border: '2px solid #667eea',
                padding: '18px 40px',
                fontFamily: '"Inter", sans-serif',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                borderRadius: '50px',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.background = '#667eea';
                e.target.style.color = 'white';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = '#667eea';
              }}
            >
              View Past Appeals
            </button>
          </div>
          
          <div style={{
            display: 'flex',
            gap: '32px',
            justifyContent: 'center',
            fontSize: '14px',
            color: '#666',
            fontWeight: 600
          }}>
            <div>✓ No Subscription</div>
            <div>✓ Instant Generation</div>
            <div>✓ HIPAA Compliant</div>
          </div>
        </div>
      </div>
      
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '80px 24px'
      }}>
        {/* How It Works */}
        <section style={{
          background: 'white',
          borderRadius: '24px',
          padding: '60px 48px',
          marginBottom: '60px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '200px',
            height: '200px',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
            borderRadius: '50%',
            filter: 'blur(40px)'
          }}></div>
          
          <h2 style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: '40px',
            fontWeight: 800,
            textAlign: 'center',
            margin: '0 0 16px 0',
            letterSpacing: '-1px',
            color: '#1a1a1a'
          }}>
            How It Works
          </h2>
          
          <p style={{
            textAlign: 'center',
            color: '#666',
            fontSize: '18px',
            marginBottom: '48px',
            fontWeight: 500
          }}>
            Four simple steps to your professional appeal letter
          </p>
          
          <div className="responsive-grid-4" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '32px'
          }}>
            {[
              { num: '1', icon: '📄', label: 'Submit Details', desc: 'Enter your denial information' },
              { num: '2', icon: '✅', label: 'Auto-Validate', desc: 'We check timely filing & eligibility' },
              { num: '3', icon: '💳', label: 'Pay $10', desc: 'Secure one-time payment' },
              { num: '4', icon: '⬇️', label: 'Download PDF', desc: 'Ready to submit appeal letter' }
            ].map((step, i) => (
              <div 
                key={i} 
                onMouseEnter={() => setHoveredStep(i)}
                onMouseLeave={() => setHoveredStep(null)}
                style={{
                  background: hoveredStep === i ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f8f9fa',
                  padding: '32px 24px',
                  borderRadius: '16px',
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  transform: hoveredStep === i ? 'translateY(-8px)' : 'translateY(0)',
                  boxShadow: hoveredStep === i ? '0 20px 40px rgba(102, 126, 234, 0.3)' : '0 4px 12px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{
                  fontSize: '48px',
                  marginBottom: '16px',
                  transition: 'transform 0.3s ease',
                  transform: hoveredStep === i ? 'scale(1.2)' : 'scale(1)'
                }}>
                  {step.icon}
                </div>
                <div style={{
                  fontFamily: '"Inter", sans-serif',
                  fontSize: '20px',
                  fontWeight: 700,
                  color: hoveredStep === i ? 'white' : '#1a1a1a',
                  marginBottom: '8px',
                  transition: 'color 0.3s ease'
                }}>
                  {step.label}
                </div>
                <div style={{
                  fontFamily: '"Inter", sans-serif',
                  fontSize: '14px',
                  color: hoveredStep === i ? 'rgba(255,255,255,0.9)' : '#666',
                  lineHeight: '1.5',
                  fontWeight: 500,
                  transition: 'color 0.3s ease'
                }}>
                  {step.desc}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Stats Section */}
        <section style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '24px',
          padding: '60px 48px',
          marginBottom: '60px',
          color: 'white',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(102, 126, 234, 0.3)'
        }}>
          <h2 style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: '36px',
            fontWeight: 800,
            margin: '0 0 48px 0',
            letterSpacing: '-1px'
          }}>
            Trusted by Healthcare Providers
          </h2>
          
          <div className="responsive-grid-4" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '40px'
          }}>
            {[
              { num: '1,247', label: 'Appeals Generated' },
              { num: '95%', label: 'Success Rate' },
              { num: '$10', label: 'Fixed Price' },
              { num: '<5min', label: 'Average Time' }
            ].map((stat, i) => (
              <div key={i}>
                <div style={{
                  fontFamily: '"Inter", sans-serif',
                  fontSize: '48px',
                  fontWeight: 900,
                  marginBottom: '8px',
                  textShadow: '0 2px 10px rgba(0,0,0,0.2)'
                }}>
                  {stat.num}
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  opacity: 0.9
                }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>
        
        {/* Two Column Info Section */}
        <div className="responsive-grid-2" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '32px',
          marginBottom: '60px'
        }}>
          <section style={{
            background: 'white',
            borderRadius: '20px',
            padding: '40px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)'
          }}>
            <h3 style={{
              fontFamily: '"Inter", sans-serif',
              fontSize: '24px',
              fontWeight: 700,
              color: '#1a1a1a',
              margin: '0 0 24px 0'
            }}>
              📋 Required Information
            </h3>
            <div style={{
              display: 'grid',
              gap: '12px'
            }}>
              {[
                'Payer name and ID',
                'Claim number',
                'Denial date and reason',
                'Date of service',
                'Provider NPI and Tax ID',
                'Provider address',
                'Patient name, DOB, ID',
                'Supporting docs (optional)'
              ].map((item, i) => (
                <div key={i} style={{
                  fontFamily: '"Inter", sans-serif',
                  fontSize: '15px',
                  lineHeight: '1.6',
                  color: '#444',
                  paddingLeft: '24px',
                  position: 'relative',
                  fontWeight: 500
                }}>
                  <span style={{
                    position: 'absolute',
                    left: 0,
                    color: '#667eea',
                    fontWeight: 700
                  }}>•</span>
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section style={{
            background: 'linear-gradient(135deg, #fff8e1 0%, #ffe9a0 100%)',
            borderRadius: '20px',
            padding: '40px',
            boxShadow: '0 10px 30px rgba(249, 168, 37, 0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              bottom: '-30px',
              right: '-30px',
              fontSize: '120px',
              opacity: 0.1
            }}>✅</div>
            
            <h3 style={{
              fontFamily: '"Inter", sans-serif',
              fontSize: '24px',
              fontWeight: 700,
              color: '#1a1a1a',
              margin: '0 0 24px 0',
              position: 'relative',
              zIndex: 1
            }}>
              ✅ Auto-Validation
            </h3>
            <ul style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
              fontFamily: '"Inter", sans-serif',
              fontSize: '15px',
              lineHeight: '2',
              color: '#444',
              fontWeight: 500,
              position: 'relative',
              zIndex: 1
            }}>
              <li style={{ marginBottom: '12px' }}>✓ Timely filing window (90 days)</li>
              <li style={{ marginBottom: '12px' }}>✓ Duplicate appeal prevention</li>
              <li style={{ marginBottom: '12px' }}>✓ Exhausted appeal level check</li>
              <li style={{ marginBottom: '12px' }}>✓ Required field completion</li>
            </ul>
          </section>
        </div>

        {/* What You Get Section */}
        <section style={{
          background: 'white',
          borderRadius: '24px',
          padding: '60px 48px',
          marginBottom: '60px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
          position: 'relative'
        }}>
          <h2 style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: '40px',
            fontWeight: 800,
            textAlign: 'center',
            margin: '0 0 16px 0',
            letterSpacing: '-1px',
            color: '#1a1a1a'
          }}>
            What's Included
          </h2>
          
          <p style={{
            textAlign: 'center',
            color: '#666',
            fontSize: '18px',
            marginBottom: '48px',
            fontWeight: 500
          }}>
            Professional appeal letter with all required components
          </p>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '60px 1fr',
            gap: '24px',
            marginBottom: '32px'
          }}>
            {[
              { icon: '🏥', title: 'Provider & Payer Headers', desc: 'Complete identification and contact information' },
              { icon: '📋', title: 'Claim Reference Block', desc: 'Claim number, patient ID, dates of service' },
              { icon: '❌', title: 'Denial Restatement', desc: 'Clear documentation of the denial reason' },
              { icon: '⚕️', title: 'Medical Necessity', desc: 'Policy references and regulatory citations' },
              { icon: '📝', title: 'Formal Appeal Request', desc: 'Professional reconsideration request language' },
              { icon: '✍️', title: 'Signature Block', desc: 'Provider signature area with NPI' }
            ].map((item, i) => (
              <React.Fragment key={i}>
                <div style={{
                  fontSize: '36px',
                  textAlign: 'center',
                  paddingTop: '4px'
                }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{
                    fontFamily: '"Inter", sans-serif',
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#1a1a1a',
                    marginBottom: '4px'
                  }}>
                    {item.title}
                  </div>
                  <div style={{
                    fontFamily: '"Inter", sans-serif',
                    fontSize: '15px',
                    color: '#666',
                    lineHeight: '1.5',
                    fontWeight: 500
                  }}>
                    {item.desc}
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
          
          <div style={{
            paddingTop: '32px',
            borderTop: '2px solid #f0f0f0',
            textAlign: 'center'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '16px 32px',
              borderRadius: '50px',
              fontFamily: '"Inter", sans-serif',
              fontSize: '16px',
              fontWeight: 600
            }}>
              <span style={{ fontSize: '24px' }}>📄</span>
              Delivered as PDF • Ready for portal, fax, or mail
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section style={{
          background: 'white',
          borderRadius: '24px',
          padding: '80px 48px',
          marginBottom: '60px',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px',
            height: '600px',
            background: 'radial-gradient(circle, rgba(102, 126, 234, 0.1) 0%, transparent 70%)',
            pointerEvents: 'none'
          }}></div>
          
          <h2 style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: '48px',
            fontWeight: 900,
            margin: '0 0 24px 0',
            letterSpacing: '-2px',
            color: '#1a1a1a',
            position: 'relative',
            zIndex: 1
          }}>
            Ready to Appeal Your Denial?
          </h2>
          
          <p style={{
            fontSize: '20px',
            color: '#666',
            marginBottom: '40px',
            fontWeight: 500,
            position: 'relative',
            zIndex: 1
          }}>
            Professional appeal letter in minutes. No hassle. Just $10.
          </p>
          
          <button 
            onClick={() => navigate('/submit')}
            className="pulse-animate"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '24px 64px',
              fontFamily: '"Inter", sans-serif',
              fontSize: '20px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              cursor: 'pointer',
              borderRadius: '50px',
              boxShadow: '0 15px 40px rgba(102, 126, 234, 0.4)',
              transition: 'all 0.3s ease',
              position: 'relative',
              zIndex: 1
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-4px)';
              e.target.style.boxShadow = '0 20px 50px rgba(102, 126, 234, 0.5)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 15px 40px rgba(102, 126, 234, 0.4)';
            }}
          >
            Start Your Appeal Now →
          </button>
          
          <div style={{
            marginTop: '32px',
            fontSize: '14px',
            color: '#999',
            fontWeight: 500,
            position: 'relative',
            zIndex: 1
          }}>
            ⚡ Generated instantly • 🔒 HIPAA compliant • 💳 Secure payment
          </div>
        </section>

        {/* Pricing Section */}
        <section style={{
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2c2c2c 100%)',
          color: 'white',
          borderRadius: '24px',
          padding: '60px 48px',
          marginBottom: '60px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        }}>
          <div className="responsive-grid-2" style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: '48px',
            alignItems: 'center'
          }}>
            <div>
              <div style={{
                display: 'inline-block',
                background: 'rgba(102, 126, 234, 0.2)',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 700,
                marginBottom: '16px',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}>
                Simple Pricing
              </div>
              
              <h2 style={{
                fontFamily: '"Inter", sans-serif',
                fontSize: '56px',
                fontWeight: 900,
                margin: '0 0 16px 0',
                letterSpacing: '-2px'
              }}>
                $10 <span style={{ fontSize: '24px', fontWeight: 600, opacity: 0.7 }}>per appeal</span>
              </h2>
              
              <p style={{
                fontSize: '16px',
                opacity: 0.8,
                marginBottom: '32px',
                fontWeight: 500
              }}>
                One-time payment. No hidden fees. No subscriptions.
              </p>
              
              <div style={{
                display: 'grid',
                gap: '12px'
              }}>
                {[
                  '✓ Instant generation',
                  '✓ Professional formatting',
                  '✓ HIPAA compliant',
                  '✓ PDF download',
                  '✓ No recurring charges'
                ].map((item, i) => (
                  <div key={i} style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    opacity: 0.9
                  }}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
            
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '20px',
              padding: '32px',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <div style={{
                fontSize: '14px',
                marginBottom: '16px',
                opacity: 0.7,
                fontWeight: 600
              }}>
                WHAT'S NOT INCLUDED
              </div>
              <div style={{
                display: 'grid',
                gap: '8px',
                fontSize: '14px',
                opacity: 0.6,
                fontWeight: 500
              }}>
                <div>✗ Subscriptions</div>
                <div>✗ Batch pricing</div>
                <div>✗ Add-ons or upsells</div>
                <div>✗ Legal advice</div>
                <div>✗ Outcome guarantees</div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Disclaimer Section */}
        <section style={{
          background: 'rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '32px 40px',
          marginBottom: '40px',
          border: '2px solid rgba(255, 255, 255, 0.8)'
        }}>
          <div style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'start'
          }}>
            <div style={{ fontSize: '24px' }}>ℹ️</div>
            <div>
              <h3 style={{
                fontFamily: '"Inter", sans-serif',
                fontSize: '16px',
                fontWeight: 700,
                color: '#1a1a1a',
                margin: '0 0 8px 0'
              }}>
                Scope of Service
              </h3>
              <p style={{
                margin: 0,
                fontFamily: '"Inter", sans-serif',
                fontSize: '14px',
                lineHeight: '1.6',
                color: '#555',
                fontWeight: 500
              }}>
                This service generates procedurally valid appeal letters only. We do not provide legal advice, 
                outcome predictions, claim optimization strategies, or enforcement assistance. All documents are 
                templates requiring your review and customization as appropriate for your specific situation.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Landing;

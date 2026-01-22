import React from 'react';
import { useNavigate } from 'react-router-dom';

function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fafafa',
      padding: 0,
      margin: 0,
      fontFamily: 'system-ui'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
      `}</style>
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '60px 24px'
      }}>
        <div style={{
          background: '#2c3e50',
          color: 'white',
          padding: '32px 40px',
          marginBottom: '48px',
          border: '3px solid #1a252f'
        }}>
          <h1 style={{
            fontFamily: '"IBM Plex Sans", sans-serif',
            fontSize: '32px',
            fontWeight: 600,
            margin: 0,
            letterSpacing: '-0.5px',
            lineHeight: '1.2'
          }}>
            Health Insurance Denial → Appeal Execution
          </h1>
        </div>
        
        <section style={{
          background: 'white',
          border: '2px solid #2c3e50',
          padding: '32px 40px',
          marginBottom: '40px'
        }}>
          <h3 style={{
            fontFamily: '"IBM Plex Sans", sans-serif',
            fontSize: '14px',
            fontWeight: 700,
            color: '#2c3e50',
            margin: '0 0 24px 0',
            textTransform: 'uppercase',
            letterSpacing: '1.5px'
          }}>
            Process
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1px',
            background: '#2c3e50'
          }}>
            {[
              { num: '1', label: 'Submit denial details' },
              { num: '2', label: 'Validate eligibility' },
              { num: '3', label: 'Pay $10' },
              { num: '4', label: 'Download appeal letter' }
            ].map((step, i) => (
              <div key={i} style={{
                background: 'white',
                padding: '20px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: '#2c3e50',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: '"IBM Plex Sans", sans-serif',
                  fontWeight: 700,
                  fontSize: '24px'
                }}>
                  {step.num}
                </div>
                <span style={{
                  fontFamily: '"IBM Plex Sans", sans-serif',
                  fontSize: '12px',
                  textAlign: 'center',
                  color: '#1a1a1a',
                  lineHeight: '1.4',
                  fontWeight: 600
                }}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          marginBottom: '40px'
        }}>
          <section style={{
            background: 'white',
            border: '1px solid #ccc',
            padding: '28px 32px'
          }}>
            <h3 style={{
              fontFamily: '"IBM Plex Sans", sans-serif',
              fontSize: '13px',
              fontWeight: 700,
              color: '#1a1a1a',
              margin: '0 0 20px 0',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              paddingBottom: '12px',
              borderBottom: '1px solid #e0e0e0'
            }}>
              Required Information
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px 16px'
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
                  fontFamily: '"IBM Plex Sans", sans-serif',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  color: '#333',
                  paddingLeft: '12px',
                  borderLeft: '2px solid #e0e0e0',
                  fontWeight: 500
                }}>
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section style={{
            background: '#fff8e1',
            border: '2px solid #f9a825',
            padding: '28px 32px'
          }}>
            <h3 style={{
              fontFamily: '"IBM Plex Sans", sans-serif',
              fontSize: '13px',
              fontWeight: 700,
              color: '#1a1a1a',
              margin: '0 0 20px 0',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              paddingBottom: '12px',
              borderBottom: '1px solid #f9a825'
            }}>
              Eligibility Validation
            </h3>
            <ul style={{
              margin: 0,
              paddingLeft: '20px',
              fontFamily: '"IBM Plex Sans", sans-serif',
              fontSize: '12px',
              lineHeight: '1.8',
              color: '#333',
              fontWeight: 500
            }}>
              <li style={{ marginBottom: '8px' }}>Timely filing window (90 days)</li>
              <li style={{ marginBottom: '8px' }}>Duplicate appeal prevention</li>
              <li style={{ marginBottom: '8px' }}>Exhausted appeal level check</li>
              <li style={{ marginBottom: '8px' }}>Required field completion</li>
            </ul>
          </section>
        </div>

        <section style={{
          background: 'white',
          border: '1px solid #ccc',
          padding: '28px 32px',
          marginBottom: '40px'
        }}>
          <h3 style={{
            fontFamily: '"IBM Plex Sans", sans-serif',
            fontSize: '13px',
            fontWeight: 700,
            color: '#1a1a1a',
            margin: '0 0 20px 0',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            paddingBottom: '12px',
            borderBottom: '1px solid #e0e0e0'
          }}>
            Generated Appeal Letter Contains
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '40px 1fr',
            gap: '10px 16px',
            marginBottom: '20px'
          }}>
            {[
              'Payer and provider identification header',
              'Claim reference block',
              'Denial reason restatement',
              'Medical necessity and policy reference section',
              'Formal appeal request',
              'Provider signature block'
            ].map((item, i) => (
              <React.Fragment key={i}>
                <div style={{
                  fontFamily: '"IBM Plex Sans", sans-serif',
                  fontSize: '12px',
                  color: '#999',
                  textAlign: 'right',
                  paddingTop: '2px',
                  fontWeight: 600
                }}>
                  [{i + 1}]
                </div>
                <div style={{
                  fontFamily: '"IBM Plex Sans", sans-serif',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  color: '#333',
                  fontWeight: 500
                }}>
                  {item}
                </div>
              </React.Fragment>
            ))}
          </div>
          <div style={{
            paddingTop: '16px',
            borderTop: '1px solid #e0e0e0',
            fontFamily: '"IBM Plex Sans", sans-serif',
            fontSize: '12px',
            color: '#666',
            fontStyle: 'italic',
            fontWeight: 400
          }}>
            Delivered as PDF suitable for portal upload, fax, or mail submission
          </div>
        </section>

        <section style={{
          background: '#f5f5f5',
          border: '1px solid #999',
          padding: '20px 32px',
          marginBottom: '48px'
        }}>
          <h3 style={{
            fontFamily: '"IBM Plex Sans", sans-serif',
            fontSize: '13px',
            fontWeight: 700,
            color: '#1a1a1a',
            margin: '0 0 12px 0',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            Scope
          </h3>
          <p style={{
            margin: 0,
            fontFamily: '"IBM Plex Sans", sans-serif',
            fontSize: '12px',
            lineHeight: '1.6',
            color: '#555',
            fontWeight: 500
          }}>
            Generates procedurally valid appeal letters only. Does not provide legal advice, 
            outcome prediction, claim optimization, or enforcement assistance.
          </p>
        </section>

        <div style={{
          background: 'white',
          border: '3px solid #2c3e50',
          padding: '48px',
          marginBottom: '32px',
          textAlign: 'center'
        }}>
          <button 
            onClick={() => navigate('/submit')}
            style={{
              background: '#2c3e50',
              color: 'white',
              border: '3px solid #1a252f',
              padding: '20px 64px',
              fontFamily: '"IBM Plex Sans", sans-serif',
              fontSize: '16px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '2px',
              cursor: 'pointer',
              boxShadow: '4px 4px 0 #1a252f',
              transition: 'all 0.1s'
            }}
            onMouseOver={(e) => {
              e.target.style.background = '#1a252f';
              e.target.style.transform = 'translate(2px, 2px)';
              e.target.style.boxShadow = '2px 2px 0 #0f1419';
            }}
            onMouseOut={(e) => {
              e.target.style.background = '#2c3e50';
              e.target.style.transform = 'translate(0, 0)';
              e.target.style.boxShadow = '4px 4px 0 #1a252f';
            }}
          >
            Generate Appeal
          </button>
        </div>

        <section style={{
          background: '#2c3e50',
          color: 'white',
          border: '3px solid #1a252f',
          padding: '28px 40px',
          marginBottom: '32px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{
                fontFamily: '"IBM Plex Sans", sans-serif',
                fontSize: '32px',
                fontWeight: 600,
                marginBottom: '8px'
              }}>
                $10 per appeal
              </div>
              <div style={{
                fontFamily: '"IBM Plex Sans", sans-serif',
                fontSize: '12px',
                color: '#ccc',
                fontWeight: 400
              }}>
                Payment processed before letter generation
              </div>
            </div>
            <div style={{
              fontFamily: '"IBM Plex Sans", sans-serif',
              fontSize: '11px',
              color: '#999',
              textAlign: 'right',
              lineHeight: '1.6',
              fontWeight: 400
            }}>
              No subscriptions<br/>
              No batch pricing<br/>
              No add-ons
            </div>
          </div>
        </section>

        <div style={{
          padding: '16px 0',
          borderTop: '1px solid #ccc'
        }}>
          <button
            onClick={() => navigate('/history')}
            style={{
              fontFamily: '"IBM Plex Sans", sans-serif',
              fontSize: '12px',
              color: '#2c3e50',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              letterSpacing: '0.5px',
              padding: 0
            }}
          >
            → View past appeals
          </button>
        </div>
      </div>
    </div>
  );
}

export default Landing;

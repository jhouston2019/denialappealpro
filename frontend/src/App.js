import React, { Suspense, lazy, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Link } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import './App.css';
// Force rebuild: 2026-02-11-v3

// Lazy load pages for code splitting
const LandingPro = lazy(() => import('./LandingPro'));
const LandingConsumer = lazy(() => import('./LandingConsumer'));
const AppealForm = lazy(() => import('./pages/AppealForm'));
const AppealFormWizard = lazy(() => import('./pages/AppealFormWizard'));
const Pricing = lazy(() => import('./pages/Pricing'));
const AppealHistory = lazy(() => import('./pages/AppealHistory'));
const PaymentConfirmation = lazy(() => import('./pages/PaymentConfirmation'));
const AppealDownload = lazy(() => import('./pages/AppealDownload'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const SubscriptionSuccess = lazy(() => import('./pages/SubscriptionSuccess'));
const BillingManagement = lazy(() => import('./pages/BillingManagement'));

// Loading component
const PageLoader = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f5f5f5'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        display: 'inline-block',
        width: '50px',
        height: '50px',
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #1e3a8a',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '1rem'
      }}></div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <p style={{ fontSize: '18px', color: '#666' }}>Loading...</p>
    </div>
  </div>
);

// Navigation bar component
const Navbar = ({ transparent }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Start Appeal', path: '/appeal-form' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'History', path: '/history' },
    { label: 'Billing', path: '/billing' },
  ];

  const isActive = (path) => location.pathname === path;

  const baseStyle = transparent
    ? { background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }
    : { background: '#0f172a', borderBottom: '1px solid #1e293b' };

  return (
    <nav style={{
      ...baseStyle,
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      fontFamily: '"Inter", -apple-system, sans-serif',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '60px',
      }}>
        {/* Brand */}
        <Link
          to="/"
          style={{
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div style={{
            width: '32px',
            height: '32px',
            background: 'linear-gradient(135deg, #3b82f6, #1e40af)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: '700',
            color: 'white',
            flexShrink: 0,
          }}>M</div>
          <span style={{
            fontSize: '16px',
            fontWeight: '700',
            color: 'white',
            letterSpacing: '-0.3px',
            whiteSpace: 'nowrap',
          }}>
            Denial Appeal Pro
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="nav-links" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              style={{
                padding: '6px 14px',
                fontSize: '14px',
                fontWeight: isActive(link.path) ? '600' : '500',
                color: isActive(link.path) ? 'white' : 'rgba(255,255,255,0.65)',
                textDecoration: 'none',
                borderRadius: '6px',
                background: isActive(link.path) ? 'rgba(59,130,246,0.2)' : 'transparent',
                border: isActive(link.path) ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                if (!isActive(link.path)) {
                  e.target.style.color = 'white';
                  e.target.style.background = 'rgba(255,255,255,0.06)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive(link.path)) {
                  e.target.style.color = 'rgba(255,255,255,0.65)';
                  e.target.style.background = 'transparent';
                }
              }}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => navigate('/appeal-form')}
            style={{
              marginLeft: '8px',
              padding: '7px 18px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#0f172a',
              background: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.target.style.background = '#e2e8f0'; }}
            onMouseLeave={e => { e.target.style.background = 'white'; }}
          >
            New Appeal →
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="nav-hamburger"
          onClick={() => setMenuOpen(o => !o)}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: 'white',
            fontSize: '22px',
          }}
          aria-label="Toggle menu"
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="nav-mobile-menu" style={{
          background: '#0f172a',
          borderTop: '1px solid #1e293b',
          padding: '12px 24px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}>
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMenuOpen(false)}
              style={{
                padding: '10px 14px',
                fontSize: '15px',
                fontWeight: '500',
                color: isActive(link.path) ? 'white' : 'rgba(255,255,255,0.7)',
                textDecoration: 'none',
                borderRadius: '6px',
                background: isActive(link.path) ? 'rgba(59,130,246,0.2)' : 'transparent',
              }}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => { navigate('/appeal-form'); setMenuOpen(false); }}
            style={{
              marginTop: '8px',
              padding: '10px 18px',
              fontSize: '15px',
              fontWeight: '600',
              color: '#0f172a',
              background: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            New Appeal →
          </button>
        </div>
      )}
    </nav>
  );
};

function AppContent() {
  const location = useLocation();
  const adminPages = ['/admin/login', '/admin/dashboard'];
  const successPages = ['/subscription/success', '/credits/success'];
  const isAdminPage = adminPages.some(page => location.pathname.startsWith('/admin'));
  const isSuccessPage = successPages.some(page => location.pathname.startsWith(page));
  const isLandingPage = ['/', '/pro', '/appeal', '/denied'].includes(location.pathname);

  return (
    <div className="App">
      {!isAdminPage && !isSuccessPage && (
        <Navbar transparent={isLandingPage} />
      )}
      <main className="App-main" style={(isLandingPage || isAdminPage || isSuccessPage) ? { padding: 0, maxWidth: 'none' } : {}}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Landing pages - dual routing strategy */}
            <Route path="/" element={<LandingPro />} />
            <Route path="/pro" element={<LandingPro />} />
            <Route path="/appeal" element={<LandingConsumer />} />
            <Route path="/denied" element={<LandingConsumer />} />

            {/* Admin pages */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />

            {/* App pages */}
            <Route path="/submit" element={<AppealForm />} />
            <Route path="/appeal-form" element={<AppealFormWizard />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/history" element={<AppealHistory />} />
            <Route path="/payment/:appealId" element={<PaymentConfirmation />} />
            <Route path="/download/:appealId" element={<AppealDownload />} />
            <Route path="/subscription/success" element={<SubscriptionSuccess />} />
            <Route path="/billing" element={<BillingManagement />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
          </Routes>
        </Suspense>
      </main>
      {!isLandingPage && !isAdminPage && !isSuccessPage && (
        <footer className="App-footer">
          <p style={{ margin: '0 0 8px 0' }}>© {new Date().getFullYear()} Denial Appeal Pro. All rights reserved.</p>
          <p style={{ fontSize: '13px', margin: 0 }}>
            <a href="/terms" style={{ color: '#64748b', marginRight: '20px', textDecoration: 'none' }}>Terms of Service</a>
            <a href="/privacy" style={{ color: '#64748b', textDecoration: 'none' }}>Privacy Policy</a>
          </p>
        </footer>
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </Router>
  );
}

export default App;

import React, { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppealProvider } from './context/AppealContext';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';
import { PAGE_BG_SLATE, TEXT_ON_SLATE } from './theme/appShell';
// Force rebuild: 2026-02-11-v3

// Lazy load pages for code splitting
const LandingPro = lazy(() => import('./LandingPro'));
const LandingConsumer = lazy(() => import('./LandingConsumer'));
const AppealForm = lazy(() => import('./pages/AppealForm'));
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
const Login = lazy(() => import('./pages/Login'));
const DenialQueue = lazy(() => import('./pages/DenialQueue'));
const ClaimDetail = lazy(() => import('./pages/ClaimDetail'));
const OnboardingStart = lazy(() => import('./pages/OnboardingStart'));
const OnboardingPreview = lazy(() => import('./pages/OnboardingPreview'));
const OnboardingAccount = lazy(() => import('./pages/OnboardingAccount'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

// Loading component
const PageLoader = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: PAGE_BG_SLATE
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        display: 'inline-block',
        width: '50px',
        height: '50px',
        border: '4px solid rgba(148, 163, 184, 0.35)',
        borderTop: '4px solid #22c55e',
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
      <p style={{ fontSize: '18px', color: TEXT_ON_SLATE }}>Loading...</p>
    </div>
  </div>
);

/** After document extract confirmation, send user into the new-appeal onboarding flow. */
function AppealConfirmRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/start', { replace: true });
  }, [navigate]);
  return <PageLoader />;
}

// Navigation bar component
const Navbar = ({ transparent }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, logout, newDenialsBanner, newDenialsDollarValue } = useAuth();

  const navLinks = [
    { label: 'New Appeal', path: '/start' },
    ...(isAuthenticated
      ? [
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Queue', path: '/queue' },
        ]
      : []),
    { label: 'Pricing', path: '/pricing' },
    { label: 'History', path: '/history' },
    { label: 'Billing', path: '/billing' },
  ];

  const isActive = (path) => {
    if (path === '/start') return location.pathname.startsWith('/start');
    return location.pathname === path;
  };

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
          {(newDenialsBanner ?? 0) > 0 && (
            <span
              style={{
                marginLeft: 8,
                fontSize: 12,
                fontWeight: 700,
                color: '#fbbf24',
                background: 'rgba(0,0,0,0.25)',
                padding: '4px 8px',
                borderRadius: 4,
              }}
              title="New denials since last queue visit"
            >
              +{newDenialsBanner} new
              {typeof newDenialsDollarValue === 'number' && newDenialsDollarValue > 0 && (
                <span style={{ fontWeight: 600 }}> · ${Number(newDenialsDollarValue).toLocaleString()}</span>
              )}
            </span>
          )}
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => { logout(); navigate('/'); }}
              style={{
                marginLeft: '8px',
                padding: '7px 14px',
                fontSize: '13px',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.9)',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.35)',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Log out
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{
                marginLeft: '8px',
                padding: '7px 14px',
                fontSize: '13px',
                fontWeight: '600',
                color: '#0f172a',
                background: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Log in
            </button>
          )}
          <button
            onClick={() => navigate('/start')}
            style={{
              marginLeft: '8px',
              padding: '7px 18px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#fff',
              background: '#22c55e',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.target.style.background = '#16a34a'; }}
            onMouseLeave={e => { e.target.style.background = '#22c55e'; }}
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
            type="button"
            onClick={() => {
              if (isAuthenticated) {
                logout();
                navigate('/');
              } else {
                navigate('/login');
              }
              setMenuOpen(false);
            }}
            style={{
              marginTop: '8px',
              padding: '10px 18px',
              fontSize: '15px',
              fontWeight: '600',
              color: 'white',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.35)',
              borderRadius: '6px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            {isAuthenticated ? 'Log out' : 'Log in'}
          </button>
          <button
            onClick={() => { navigate('/start'); setMenuOpen(false); }}
            style={{
              marginTop: '8px',
              padding: '10px 18px',
              fontSize: '15px',
              fontWeight: '600',
              color: '#fff',
              background: '#22c55e',
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

function ReferralCapture() {
  const location = useLocation();
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const ref = p.get('ref');
    if (ref && ref.trim()) {
      localStorage.setItem('dap_ref', ref.trim().slice(0, 64));
    }
  }, [location.search]);
  return null;
}

function AppContent() {
  const location = useLocation();
  const adminPages = ['/admin/login', '/admin/dashboard'];
  const successPages = ['/subscription/success', '/credits/success'];
  const isAdminPage = adminPages.some(page => location.pathname.startsWith('/admin'));
  const isSuccessPage = successPages.some(page => location.pathname.startsWith(page));
  const isLandingPage = ['/', '/pro', '/appeal', '/denied'].includes(location.pathname);
  const isPricingPage = location.pathname === '/pricing';
  const isQueuePage =
    location.pathname.startsWith('/queue') ||
    location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/start');
  const isStartFlow = location.pathname.startsWith('/start') || location.pathname.startsWith('/onboarding');

  return (
    <div className="App">
      <ReferralCapture />
      {!isAdminPage && !isSuccessPage && (
        <Navbar transparent={isLandingPage || isPricingPage || isQueuePage} />
      )}
      <main className="App-main" style={(isLandingPage || isAdminPage || isSuccessPage || isPricingPage || isQueuePage) ? { padding: 0, maxWidth: 'none' } : {}}>
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
            <Route path="/appeal/confirm" element={<AppealConfirmRedirect />} />
            <Route path="/appeal-form" element={<Navigate to="/start" replace />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/history" element={<AppealHistory />} />
            <Route path="/login" element={<Login />} />
            <Route path="/start" element={<OnboardingStart />} />
            <Route path="/start/preview/:appealId" element={<OnboardingPreview />} />
            <Route path="/onboarding/account" element={<OnboardingAccount />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/queue"
              element={
                <ProtectedRoute>
                  <DenialQueue />
                </ProtectedRoute>
              }
            />
            <Route
              path="/queue/:appealId"
              element={
                <ProtectedRoute>
                  <ClaimDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route path="/payment/:appealId" element={<PaymentConfirmation />} />
            <Route path="/download/:appealId" element={<AppealDownload />} />
            <Route path="/subscription/success" element={<SubscriptionSuccess />} />
            <Route path="/billing" element={<BillingManagement />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
          </Routes>
        </Suspense>
      </main>
      {!isLandingPage && !isAdminPage && !isSuccessPage && !isStartFlow && (
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
      <AppealProvider>
        <UserProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </UserProvider>
      </AppealProvider>
    </Router>
  );
}

export default App;

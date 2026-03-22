import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
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
    <div style={{
      textAlign: 'center'
    }}>
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

function AppContent() {
  const location = useLocation();
  const landingPages = ['/', '/pro', '/appeal', '/denied'];
  const adminPages = ['/admin/login', '/admin/dashboard'];
  const successPages = ['/subscription/success', '/credits/success'];
  const isLandingPage = landingPages.includes(location.pathname);
  const isAdminPage = adminPages.some(page => location.pathname.startsWith('/admin'));
  const isSuccessPage = successPages.some(page => location.pathname.startsWith(page));

  return (
    <div className="App">
      {!isLandingPage && !isAdminPage && !isSuccessPage && (
        <header className="App-header">
          <h1>Medical Denial Appeal Pro</h1>
        </header>
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
          <p>Starting at $29/month</p>
          <p style={{ fontSize: '14px', marginTop: '10px' }}>
            <a href="/terms" style={{ color: '#1e3a8a', marginRight: '20px' }}>Terms of Service</a>
            <a href="/privacy" style={{ color: '#1e3a8a' }}>Privacy Policy</a>
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

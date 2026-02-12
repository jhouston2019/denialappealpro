import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import './App.css';

// Lazy load pages for code splitting
const Landing = lazy(() => import('./pages/Landing'));
const AppealForm = lazy(() => import('./pages/AppealForm'));
const AppealFormWizard = lazy(() => import('./pages/AppealFormWizard'));
const Pricing = lazy(() => import('./pages/Pricing'));
const AppealHistory = lazy(() => import('./pages/AppealHistory'));
const PaymentConfirmation = lazy(() => import('./pages/PaymentConfirmation'));
const AppealDownload = lazy(() => import('./pages/AppealDownload'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));

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
  const isLandingPage = location.pathname === '/';

  return (
    <div className="App">
      {!isLandingPage && (
        <header className="App-header">
          <h1>Denial Appeal Pro</h1>
        </header>
      )}
      <main className="App-main" style={isLandingPage ? { padding: 0, maxWidth: 'none' } : {}}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/submit" element={<AppealForm />} />
            <Route path="/appeal-form" element={<AppealFormWizard />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/history" element={<AppealHistory />} />
            <Route path="/payment/:appealId" element={<PaymentConfirmation />} />
            <Route path="/download/:appealId" element={<AppealDownload />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
          </Routes>
        </Suspense>
      </main>
      {!isLandingPage && (
        <footer className="App-footer">
          <p>$10 per appeal</p>
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
      <AppContent />
    </Router>
  );
}

export default App;

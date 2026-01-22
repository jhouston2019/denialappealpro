import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import AppealForm from './components/AppealForm';
import AppealList from './components/AppealList';
import BatchUpload from './components/BatchUpload';
import PayerRules from './components/PayerRules';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <div className="header-content">
            <h1>Denial Appeal Pro</h1>
            <p className="header-subtitle">Execution Utility</p>
          </div>
        </header>

        <nav className="App-nav">
          <Link to="/">New Appeal</Link>
          <Link to="/appeals">Appeal History</Link>
          <Link to="/batch">Batch Processing</Link>
          <Link to="/payer-rules">Payer Rules</Link>
        </nav>

        <main className="App-main">
          <Routes>
            <Route path="/" element={<AppealForm />} />
            <Route path="/appeals" element={<AppealList />} />
            <Route path="/batch" element={<BatchUpload />} />
            <Route path="/payer-rules" element={<PayerRules />} />
          </Routes>
        </main>

        <footer className="App-footer">
          <p>Execution only. No advisory function.</p>
          <p>$10 per appeal execution</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;

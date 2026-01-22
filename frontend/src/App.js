import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Landing from './pages/Landing';
import AppealForm from './pages/AppealForm';
import AppealHistory from './pages/AppealHistory';
import PaymentConfirmation from './pages/PaymentConfirmation';
import AppealDownload from './pages/AppealDownload';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Denial Appeal Pro</h1>
        </header>
        <main className="App-main">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/submit" element={<AppealForm />} />
            <Route path="/history" element={<AppealHistory />} />
            <Route path="/payment/:appealId" element={<PaymentConfirmation />} />
            <Route path="/download/:appealId" element={<AppealDownload />} />
          </Routes>
        </main>
        <footer className="App-footer">
          <p>$10 per appeal</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;

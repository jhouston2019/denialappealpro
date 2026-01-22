import React from 'react';
import { useNavigate } from 'react-router-dom';

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      <div className="landing-content">
        <h2>Health Insurance Denial → Appeal Execution</h2>
        <div className="landing-actions">
          <button className="btn btn-primary btn-large" onClick={() => navigate('/submit')}>
            Generate Appeal
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/history')}>
            View History
          </button>
        </div>
        <div className="landing-info">
          <p>$10 per appeal</p>
          <p>Payment required before generation</p>
        </div>
      </div>
    </div>
  );
}

export default Landing;

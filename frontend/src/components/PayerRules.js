import React, { useState, useEffect } from 'react';
import axios from 'axios';

function PayerRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    payer_name: '',
    plan_type: 'commercial',
    appeal_deadline_days: '180',
    max_appeal_levels: '2',
    supports_portal: false,
    supports_fax: true,
    supports_mail: true
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await axios.get('/api/payer-rules');
      setRules(response.data.rules);
    } catch (err) {
      setError('Failed to load payer rules');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await axios.post('/api/payer-rules', formData);
      setSuccess('Payer rule created successfully');
      setShowForm(false);
      setFormData({
        payer_name: '',
        plan_type: 'commercial',
        appeal_deadline_days: '180',
        max_appeal_levels: '2',
        supports_portal: false,
        supports_fax: true,
        supports_mail: true
      });
      fetchRules();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create payer rule');
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="table-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Payer Rules Configuration</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : 'Add New Rule'}
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      {showForm && (
        <div style={{ 
          background: '#f8f9fa', 
          padding: '1.5rem', 
          borderRadius: '4px', 
          marginBottom: '1.5rem' 
        }}>
          <h3 style={{ marginBottom: '1rem' }}>New Payer Rule</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Payer Name *</label>
                <input
                  type="text"
                  name="payer_name"
                  value={formData.payer_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Plan Type *</label>
                <select
                  name="plan_type"
                  value={formData.plan_type}
                  onChange={handleChange}
                  required
                >
                  <option value="commercial">Commercial</option>
                  <option value="medicare">Medicare</option>
                  <option value="medicaid">Medicaid</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Appeal Deadline (Days) *</label>
                <input
                  type="number"
                  name="appeal_deadline_days"
                  value={formData.appeal_deadline_days}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Max Appeal Levels *</label>
                <input
                  type="number"
                  name="max_appeal_levels"
                  value={formData.max_appeal_levels}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                Supported Channels:
              </label>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    name="supports_portal"
                    checked={formData.supports_portal}
                    onChange={handleChange}
                  />
                  Portal
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    name="supports_fax"
                    checked={formData.supports_fax}
                    onChange={handleChange}
                  />
                  Fax
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    name="supports_mail"
                    checked={formData.supports_mail}
                    onChange={handleChange}
                  />
                  Mail
                </label>
              </div>
            </div>

            <button type="submit" className="btn btn-primary">
              Create Rule
            </button>
          </form>
        </div>
      )}

      {rules.length === 0 ? (
        <div className="empty-state">
          <h3>No payer rules configured</h3>
          <p>Add payer-specific rules to enable deterministic validation</p>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Payer Name</th>
              <th>Plan Type</th>
              <th>Deadline (Days)</th>
              <th>Max Levels</th>
              <th>Portal</th>
              <th>Fax</th>
              <th>Mail</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td>{rule.payer_name}</td>
                <td>
                  <span className="badge badge-info">
                    {rule.plan_type}
                  </span>
                </td>
                <td>{rule.appeal_deadline_days}</td>
                <td>{rule.max_appeal_levels}</td>
                <td>{rule.supports_portal ? '✓' : '✗'}</td>
                <td>{rule.supports_fax ? '✓' : '✗'}</td>
                <td>{rule.supports_mail ? '✓' : '✗'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default PayerRules;

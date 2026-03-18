import React, { useState } from 'react';
import './Login.css';

const ROLES = ['Admin', 'NGO', 'Volunteer'];

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Admin');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(); }, 900);
  };

  return (
    <div className="login-page">
      {/* Animated background grid */}
      <div className="login-grid" aria-hidden="true">
        {Array.from({ length: 64 }).map((_, i) => (
          <div key={i} className="grid-cell" />
        ))}
      </div>

      {/* Glow orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      {/* Topnav */}
      <nav className="login-nav">
        <div className="login-brand">
          <div className="brand-icon-sm">🛡️</div>
          <span className="brand-name-sm">DRAMS</span>
        </div>
        <div className="login-nav-links">
          <a href="#" className="nav-link-plain">System Status</a>
          <a href="#" className="nav-link-plain">Help Desk</a>
          <a href="#" className="nav-link-plain">About</a>
          <button className="btn btn-danger btn-sm">Emergency Protocol</button>
        </div>
      </nav>

      {/* Login card */}
      <div className="login-center">
        <div className="login-card anim-1">
          <div className="login-card-header">
            <div className="login-shield">🛡️</div>
            <h1 className="login-title">Disaster Relief System</h1>
            <p className="login-desc">National Disaster Management Agency · Secured Official Portal</p>
          </div>

          <div className="login-card-body">
            <h2 className="login-section-title">Account Access</h2>
            <p className="login-section-sub">Please sign in to the resource management dashboard.</p>

            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginTop: 20 }}>
                <label className="form-label">Username</label>
                <div className="input-wrap">
                  <span className="input-icon">👤</span>
                  <input
                    className="form-control login-input"
                    placeholder="Enter your username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="flex-between mb-2">
                  <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                  <a href="#" className="forgot-link">Forgot?</a>
                </div>
                <div className="input-wrap">
                  <span className="input-icon">🔒</span>
                  <input
                    className="form-control login-input"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Access Level</label>
                <div className="role-selector">
                  {ROLES.map(r => (
                    <button
                      key={r}
                      type="button"
                      className={`role-btn${role === r ? ' active' : ''}`}
                      onClick={() => setRole(r)}
                    >
                      <span className="role-icon">
                        {r === 'Admin' ? '⚡' : r === 'NGO' ? '🏢' : '🙋'}
                      </span>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className={`btn btn-primary btn-lg login-submit${loading ? ' loading' : ''}`}
                style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                disabled={loading}
              >
                {loading ? (
                  <span className="spinner" />
                ) : (
                  <>LOGIN →</>
                )}
              </button>
            </form>

            <p className="register-link">
              Need a responder account? <a href="#">Register now</a>
            </p>
          </div>
        </div>
      </div>

      <footer className="login-footer">
        © 2024 National Disaster Management Agency. Secured Official Portal. &nbsp;·&nbsp;
        <a href="#">Privacy Policy</a> &nbsp;·&nbsp;
        <a href="#">Terms of Use</a> &nbsp;·&nbsp;
        <a href="#">System Guidelines</a>
      </footer>
    </div>
  );
}

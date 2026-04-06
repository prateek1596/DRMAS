import React, { useState } from 'react';
import './Login.css';

const ROLES = [
  { id: 'Admin', icon: '⚡', label: 'Admin' },
  { id: 'NGO', icon: '🏢', label: 'NGO' },
  { id: 'Volunteer', icon: '🙋', label: 'Volunteer' },
];

export default function Login({ onLogin, onRegister }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [register, setRegister] = useState({
    fullName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'Volunteer',
  });
  const [registerStatus, setRegisterStatus] = useState('');
  const [parallax, setParallax] = useState({ x: 0, y: 0, s: 0 });

  React.useEffect(() => {
    const onMove = (event) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 18;
      const y = (event.clientY / window.innerHeight - 0.5) * 18;
      setParallax((current) => ({ ...current, x, y }));
    };
    const onScroll = () => {
      setParallax((current) => ({ ...current, s: window.scrollY }));
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('scroll', onScroll);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const handleLoginSubmit = (event) => {
    event.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password.');
      return;
    }

    setError('');
    setLoading(true);
    setTimeout(() => {
      const result = onLogin({ username: username.trim(), password, role });
      if (!result?.ok) setError(result?.message || 'Unable to sign in.');
      setLoading(false);
    }, 700);
  };

  const setRegisterField = (key) => (event) => {
    setRegister((current) => ({ ...current, [key]: event.target.value }));
    setRegisterStatus('');
  };

  const handleRegisterSubmit = (event) => {
    event.preventDefault();
    if (!register.fullName || !register.email || !register.username || !register.password || !register.confirmPassword) {
      setRegisterStatus('Please fill all required registration fields.');
      return;
    }
    if (register.password.length < 6) {
      setRegisterStatus('Password must be at least 6 characters.');
      return;
    }
    if (register.password !== register.confirmPassword) {
      setRegisterStatus('Passwords do not match.');
      return;
    }

    const result = onRegister({
      fullName: register.fullName.trim(),
      email: register.email.trim(),
      username: register.username.trim(),
      password: register.password,
      role: register.role,
    });

    if (!result?.ok) {
      setRegisterStatus(result?.message || 'Unable to register user.');
      return;
    }

    setRegisterStatus(result.message || 'Registration successful. Please sign in.');
    setMode('login');
    setUsername(register.username.trim());
    setRole(register.role);
    setPassword('');
    setRegister({ fullName: '', email: '', username: '', password: '', confirmPassword: '', role: 'Volunteer' });
  };

  return (
    <div className="login-page">
      <div className="login-bg-grid" aria-hidden="true">{Array.from({length:48}).map((_,i)=><div key={i} className="bg-cell" />)}</div>
      <div className="orb orb1" style={{ transform: `translate3d(${parallax.x * 0.8}px, ${parallax.y * 0.8 + parallax.s * 0.02}px, 0)` }} />
      <div className="orb orb2" style={{ transform: `translate3d(${parallax.x * -0.6}px, ${parallax.y * -0.5 + parallax.s * -0.03}px, 0)` }} />

      <nav className="login-nav">
        <div className="brand-row">
          <div className="brand-icon" style={{width:28,height:28,fontSize:14}}>🛡️</div>
          <span className="brand-name" style={{fontSize:16}}>DRAMS</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:18}}>
          {['System Status','Help Desk','About'].map(l => <a key={l} href="#" className="nav-plain">{l}</a>)}
          <button className="btn btn-danger btn-sm">🚨 Emergency Protocol</button>
        </div>
      </nav>

      <div className="login-center">
        <div className="login-card anim-1" style={{ transform: `translate3d(${parallax.x * 0.12}px, ${parallax.y * 0.12}px, 0)` }}>
          <div className="login-card-top">
            <div className="login-shield">🛡️</div>
            <h1 className="login-h1">Disaster Relief System</h1>
            <p className="login-desc">National Disaster Management Agency · Secured Official Portal</p>
          </div>
          <div className="login-card-body">
            <div className="auth-mode-switch">
              <button className={`auth-tab${mode === 'login' ? ' active' : ''}`} onClick={() => setMode('login')} type="button">Sign In</button>
              <button className={`auth-tab${mode === 'register' ? ' active' : ''}`} onClick={() => setMode('register')} type="button">Register</button>
            </div>

            {mode === 'login' ? (
              <>
                <h2 className="login-h2">Account Access</h2>
                <p className="login-sub">Please sign in to the resource management dashboard.</p>
                <form onSubmit={handleLoginSubmit} style={{marginTop:18}}>
                  <div className="form-group">
                    <label className="form-label">Username</label>
                    <div className="input-icon-wrap">
                      <span className="ii">👤</span>
                      <input className="form-control" style={{paddingLeft:36}} placeholder="Enter your username" value={username} onChange={e=>{setUsername(e.target.value);setError('')}} />
                    </div>
                  </div>
                  <div className="form-group">
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                      <label className="form-label" style={{marginBottom:0}}>Password</label>
                      <a href="#" className="forgot-link">Forgot?</a>
                    </div>
                    <div className="input-icon-wrap">
                      <span className="ii">🔒</span>
                      <input className="form-control" style={{paddingLeft:36}} type="password" placeholder="••••••••" value={password} onChange={e=>{setPassword(e.target.value);setError('')}} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Access Level</label>
                    <div className="role-grid">
                      {ROLES.map(r => (
                        <button key={r.id} type="button" className={`role-btn${role===r.id?' active':''}`} onClick={()=>setRole(r.id)}>
                          <span style={{fontSize:20}}>{r.icon}</span>{r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {error && <div className="auth-feedback auth-error">{error}</div>}
                  <button type="submit" className="btn btn-primary btn-lg" style={{width:'100%',justifyContent:'center'}} disabled={loading}>
                    {loading ? <span className="spinner" /> : 'LOGIN →'}
                  </button>
                </form>
                <p className="register-link">Need a responder account? <a href="#" onClick={(e) => { e.preventDefault(); setMode('register'); }}>Register now</a></p>
              </>
            ) : (
              <>
                <h2 className="login-h2">Create Account</h2>
                <p className="login-sub">Register a new responder profile for system access.</p>
                <form onSubmit={handleRegisterSubmit} style={{marginTop:18}}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input className="form-control" placeholder="e.g. Priya Sharma" value={register.fullName} onChange={setRegisterField('fullName')} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input className="form-control" type="email" placeholder="name@agency.org" value={register.email} onChange={setRegisterField('email')} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Role</label>
                      <select className="form-control" value={register.role} onChange={setRegisterField('role')}>
                        {ROLES.map((item) => <option key={item.id}>{item.id}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Username</label>
                    <input className="form-control" placeholder="Create a username" value={register.username} onChange={setRegisterField('username')} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Password</label>
                      <input className="form-control" type="password" placeholder="Minimum 6 characters" value={register.password} onChange={setRegisterField('password')} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Confirm Password</label>
                      <input className="form-control" type="password" placeholder="Re-enter password" value={register.confirmPassword} onChange={setRegisterField('confirmPassword')} />
                    </div>
                  </div>
                  {registerStatus && <div className={`auth-feedback${registerStatus.includes('successful') ? ' auth-success' : ' auth-error'}`}>{registerStatus}</div>}
                  <button type="submit" className="btn btn-primary btn-lg" style={{width:'100%',justifyContent:'center'}}>REGISTER USER</button>
                </form>
                <p className="register-link">Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setMode('login'); }}>Sign in</a></p>
              </>
            )}
          </div>
        </div>
      </div>

      <footer className="login-footer">
        © 2024 National Disaster Management Agency · <a href="#">Privacy Policy</a> · <a href="#">Terms of Use</a> · <a href="#">System Guidelines</a>
      </footer>
    </div>
  );
}

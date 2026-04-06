import React, { useEffect, useState } from 'react';
import './styles/global.css';
import { StoreProvider } from './store';
import { ToastProvider } from './components/Toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Report from './pages/Report';
import Allocation from './pages/Allocation';

const USERS_KEY = 'drams-users';
const SESSION_KEY = 'drams-session-user';

const seedUsers = [
  { id: 1, fullName: 'Alex Morgan', username: 'admin', email: 'admin@drams.gov', password: 'admin123', role: 'Admin' },
  { id: 2, fullName: 'Nina Kareem', username: 'ngo1', email: 'ngo1@partners.org', password: 'ngo12345', role: 'NGO' },
  { id: 3, fullName: 'Vikram Das', username: 'volunteer1', email: 'volunteer1@relief.org', password: 'vol12345', role: 'Volunteer' },
];

const readUsers = () => {
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) {
    localStorage.setItem(USERS_KEY, JSON.stringify(seedUsers));
    return seedUsers;
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {}
  localStorage.setItem(USERS_KEY, JSON.stringify(seedUsers));
  return seedUsers;
};

function AppInner() {
  const [users, setUsers] = useState(() => readUsers());
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [page, setPage] = useState('dashboard');

  const loggedIn = Boolean(currentUser);

  useEffect(() => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (!currentUser) {
      localStorage.removeItem(SESSION_KEY);
      return;
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    const root = document.documentElement;
    const onMouseMove = (event) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 2;
      const y = (event.clientY / window.innerHeight - 0.5) * 2;
      root.style.setProperty('--mx', x.toFixed(4));
      root.style.setProperty('--my', y.toFixed(4));
    };
    const onScroll = () => {
      root.style.setProperty('--sy', String(window.scrollY || 0));
    };

    onScroll();
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('scroll', onScroll);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    const nodes = document.querySelectorAll('.card, .stat-card, .topbar, .page-title, .page-subtitle');
    nodes.forEach((node) => node.classList.add('reveal-on-scroll'));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('in-view');
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [page, loggedIn]);

  const handleLogin = ({ username, password, role }) => {
    const account = users.find((user) => user.username.toLowerCase() === username.toLowerCase());
    if (!account) return { ok: false, message: 'User account not found.' };
    if (account.password !== password) return { ok: false, message: 'Incorrect password.' };
    if (role && account.role !== role) return { ok: false, message: `Role mismatch. Account is registered as ${account.role}.` };

    setCurrentUser({ fullName: account.fullName, username: account.username, role: account.role, email: account.email });
    setPage('dashboard');
    return { ok: true };
  };

  const handleRegister = ({ fullName, email, username, password, role }) => {
    const existsByUsername = users.some((user) => user.username.toLowerCase() === username.toLowerCase());
    if (existsByUsername) return { ok: false, message: 'Username already exists. Choose another one.' };
    const existsByEmail = users.some((user) => user.email.toLowerCase() === email.toLowerCase());
    if (existsByEmail) return { ok: false, message: 'Email already registered. Try logging in.' };

    const account = {
      id: Date.now(),
      fullName,
      email,
      username,
      password,
      role,
    };
    setUsers((current) => [...current, account]);
    return { ok: true, message: 'Account created successfully. Please log in.' };
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setPage('dashboard');
  };

  if (!loggedIn) return <Login onLogin={handleLogin} onRegister={handleRegister} />;

  const props = { page, onNav: setPage, currentUser, onLogout: handleLogout };
  return (
    <>
      {page === 'dashboard' && <Dashboard {...props} />}
      {page === 'inventory' && <Inventory {...props} />}
      {page === 'report'    && <Report    {...props} />}
      {page === 'allocation'&& <Allocation {...props} />}
      {page === 'volunteers' && (
        <div className="app-shell">
          <div style={{flex:1,marginLeft:230,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100vh',gap:12,color:'var(--text-secondary)'}}>
            <span style={{fontSize:48}}>👥</span>
            <div style={{fontFamily:'var(--font-d)',fontSize:22,fontWeight:700,color:'var(--text-primary)'}}>Volunteers Module</div>
            <div>Coming soon</div>
            <button className="btn btn-outline" onClick={() => setPage('dashboard')}>← Back to Dashboard</button>
          </div>
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <AppInner />
      </ToastProvider>
    </StoreProvider>
  );
}

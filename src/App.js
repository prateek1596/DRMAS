import React, { useEffect, useState } from 'react';
import './styles/global.css';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { StoreProvider } from './store';
import { ToastProvider } from './components/Toast';
import { api, bootstrapSession, login, logout, register, session } from './api';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Report from './pages/Report';
import Allocation from './pages/Allocation';
import Ots from './pages/Ots';
import HazardZoning from './pages/HazardZoning';
import AuditLogs from './pages/AuditLogs';
import Volunteers from './pages/Volunteers';
import Settings from './pages/Settings';

const PAGE_ROUTES = {
  dashboard: '/dashboard',
  inventory: '/inventory',
  report: '/report',
  allocation: '/allocation',
  ots: '/ots',
  hazard: '/hazard',
  audit: '/audit',
  volunteers: '/volunteers',
  settings: '/settings',
};

const PAGE_FLAG_MAP = {
  allocation: 'allocationModule',
  ots: 'otsModule',
  hazard: 'hazardModule',
  volunteers: 'volunteersModule',
};

function getPageFromPath(pathname) {
  const match = Object.entries(PAGE_ROUTES).find(([, path]) => path === pathname);
  return match ? match[0] : 'dashboard';
}

function AppInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(() => session.getUser());
  const [featureFlags, setFeatureFlags] = useState({
    allocationModule: true,
    otsModule: true,
    hazardModule: true,
    volunteersModule: true,
    dashboardTrends: true,
  });

  const loggedIn = Boolean(currentUser);
  const page = getPageFromPath(location.pathname);

  const isPageEnabled = (pageName) => {
    const flag = PAGE_FLAG_MAP[pageName];
    if (!flag) return true;
    return featureFlags[flag] !== false;
  };

  const onNav = (nextPage) => {
    const destination = isPageEnabled(nextPage) ? nextPage : 'dashboard';
    navigate(PAGE_ROUTES[destination] || PAGE_ROUTES.dashboard);
  };

  useEffect(() => {
    const init = async () => {
      const user = await bootstrapSession();
      if (user) setCurrentUser(user);
    };
    init();
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    api
      .getFeatureFlags()
      .then((flags) => setFeatureFlags((prev) => ({ ...prev, ...flags })))
      .catch(() => {
        // Keep defaults if flags cannot be fetched.
      });
  }, [loggedIn]);

  useEffect(() => {
    const desiredPage = getPageFromPath(location.pathname);
    if (loggedIn && !isPageEnabled(desiredPage)) {
      navigate(PAGE_ROUTES.dashboard, { replace: true });
    }
  }, [featureFlags, location.pathname, loggedIn, navigate]);

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
  }, [location.pathname, loggedIn]);

  const handleLogin = ({ username, password }) => {
    return login({ username, password })
      .then((user) => {
        setCurrentUser(user);
        navigate(PAGE_ROUTES.dashboard, { replace: true });
        return { ok: true };
      })
      .catch((error) => ({ ok: false, message: error.message || 'Unable to sign in.' }));
  };

  const handleRegister = ({ fullName, email, username, password }) => {
    return register({ fullName, email, username, password })
      .then((result) => ({ ok: true, message: result.message || 'Account created successfully. Please log in.' }))
      .catch((error) => ({ ok: false, message: error.message || 'Unable to register user.' }));
  };

  const handleLogout = () => {
    logout().finally(() => {
      setCurrentUser(null);
      navigate('/login', { replace: true });
    });
  };

  if (!loggedIn) {
    return (
      <div className="route-transition" key={location.pathname}>
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} onRegister={handleRegister} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    );
  }

  const props = { page, onNav, currentUser, onLogout: handleLogout, featureFlags };
  return (
    <div className="route-transition" key={location.pathname}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard {...props} />} />
        <Route path="/inventory" element={<Inventory {...props} />} />
        <Route path="/report" element={<Report {...props} />} />
        <Route path="/allocation" element={<Allocation {...props} />} />
        <Route path="/ots" element={<Ots {...props} />} />
        <Route path="/hazard" element={<HazardZoning {...props} />} />
        <Route path="/audit" element={<AuditLogs {...props} />} />
        <Route path="/volunteers" element={<Volunteers {...props} />} />
        <Route path="/settings" element={<Settings {...props} />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppInner />
        </BrowserRouter>
      </ToastProvider>
    </StoreProvider>
  );
}

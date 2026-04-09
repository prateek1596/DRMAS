import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

const mockBootstrapSession = jest.fn();
const mockGetFeatureFlags = jest.fn();

jest.mock('./api', () => ({
  api: {
    getFeatureFlags: (...args) => mockGetFeatureFlags(...args),
  },
  bootstrapSession: (...args) => mockBootstrapSession(...args),
  login: jest.fn(),
  logout: jest.fn().mockResolvedValue({ ok: true }),
  register: jest.fn(),
  session: {
    getUser: jest.fn(() => null),
  },
}));

jest.mock('./store', () => ({
  StoreProvider: ({ children }) => <>{children}</>,
}));

jest.mock('./components/Toast', () => ({
  ToastProvider: ({ children }) => <>{children}</>,
}));

jest.mock('./pages/Login', () => function MockLogin() {
  return <div>Login Page</div>;
});

jest.mock('./pages/Dashboard', () => function MockDashboard() {
  return <div>Dashboard Page</div>;
});

jest.mock('./pages/Inventory', () => function MockInventory() {
  return <div>Inventory Page</div>;
});

jest.mock('./pages/Report', () => function MockReport() {
  return <div>Report Page</div>;
});

jest.mock('./pages/Allocation', () => function MockAllocation() {
  return <div>Allocation Page</div>;
});

jest.mock('./pages/Ots', () => function MockOts() {
  return <div>OTS Page</div>;
});

jest.mock('./pages/HazardZoning', () => function MockHazard() {
  return <div>Hazard Page</div>;
});

jest.mock('./pages/AuditLogs', () => function MockAudit() {
  return <div>Audit Page</div>;
});

describe('App auth bootstrap and feature flags', () => {
  beforeAll(() => {
    class MockIntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    global.IntersectionObserver = MockIntersectionObserver;
  });

  afterAll(() => {
    delete global.IntersectionObserver;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    window.history.pushState({}, '', '/dashboard');
    mockGetFeatureFlags.mockResolvedValue({
      allocationModule: true,
      otsModule: true,
      hazardModule: true,
      volunteersModule: true,
      dashboardTrends: true,
    });
  });

  test('shows dashboard after successful bootstrap session', async () => {
    mockBootstrapSession.mockResolvedValue({ id: 1, username: 'tester' });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard Page')).toBeTruthy();
    });
  });

  test('redirects disabled feature route to dashboard', async () => {
    window.history.pushState({}, '', '/hazard');
    mockBootstrapSession.mockResolvedValue({ id: 1, username: 'tester' });
    mockGetFeatureFlags.mockResolvedValue({
      hazardModule: false,
      allocationModule: true,
      otsModule: true,
      volunteersModule: true,
      dashboardTrends: true,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard Page')).toBeTruthy();
    });

    expect(screen.queryByText('Hazard Page')).toBeNull();
  });
});

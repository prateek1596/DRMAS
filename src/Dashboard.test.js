import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Dashboard from './pages/Dashboard';

const mockReload = jest.fn();
const mockGetSettings = jest.fn();
const mockGetDashboardStats = jest.fn();
const mockGetTrends = jest.fn();

jest.mock('./store', () => ({
  useStore: () => ({
    resources: [],
    disasters: [],
    allocations: [],
    otsTasks: [],
    hazardZones: [],
    volunteers: [],
    loading: false,
    error: '',
    reload: mockReload,
  }),
}));

jest.mock('./api', () => ({
  api: {
    getSettings: (...args) => mockGetSettings(...args),
    getDashboardStats: (...args) => mockGetDashboardStats(...args),
    getTrends: (...args) => mockGetTrends(...args),
  },
}));

jest.mock('./components/Sidebar', () => function MockSidebar() {
  return <nav>Sidebar</nav>;
});

jest.mock('./components/Topbar', () => function MockTopbar() {
  return <header>Topbar</header>;
});

jest.mock('./components/PageState', () => function MockPageState() {
  return null;
});

describe('Dashboard operational controls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReload.mockResolvedValue();
    mockGetSettings.mockResolvedValue({ operations: { autoRefreshSeconds: '30' }, notifications: {} });
    mockGetDashboardStats.mockResolvedValue(null);
    mockGetTrends.mockResolvedValue({ incidentsByDay: [], allocationsByDay: [], stockByCategory: [] });
  });

  test('hides quick actions for disabled modules', async () => {
    render(
      <Dashboard
        page="dashboard"
        onNav={jest.fn()}
        currentUser={{ username: 'tester', role: 'Operator' }}
        featureFlags={{
          allocationModule: false,
          otsModule: false,
          hazardModule: false,
          volunteersModule: false,
          dashboardTrends: true,
        }}
      />
    );

    expect(screen.getByText('Report Disaster')).toBeTruthy();
    expect(screen.getByText('Manage Resources')).toBeTruthy();
    expect(screen.queryByText('Allocate Resources')).toBeNull();
    expect(screen.queryByText('OTS Board')).toBeNull();
    expect(screen.queryByText('Hazard Zoning')).toBeNull();
    expect(screen.queryByText('Volunteer Roster')).toBeNull();

    await waitFor(() => {
      expect(mockGetSettings).toHaveBeenCalled();
    });
  });

  test('refresh now reloads dashboard data', async () => {
    render(
      <Dashboard
        page="dashboard"
        onNav={jest.fn()}
        currentUser={{ username: 'tester', role: 'Operator' }}
        featureFlags={{ dashboardTrends: true }}
      />
    );

    await waitFor(() => {
      expect(mockGetTrends).toHaveBeenCalledTimes(1);
      expect(mockGetDashboardStats).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByText('Refresh now'));

    await waitFor(() => {
      expect(mockReload).toHaveBeenCalledTimes(1);
      expect(mockGetTrends).toHaveBeenCalledTimes(2);
      expect(mockGetDashboardStats).toHaveBeenCalledTimes(2);
    });
  });
});

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Sidebar from './components/Sidebar';
import { getEnabledPages } from './navigation';

describe('Sidebar navigation filtering', () => {
  test('hides disabled module links and keeps core pages visible', () => {
    render(
      <Sidebar
        page="dashboard"
        onNav={jest.fn()}
        currentUser={{ fullName: 'Test Operator', role: 'Operator' }}
        enabledPages={getEnabledPages({
          allocationModule: false,
          otsModule: false,
          hazardModule: false,
          volunteersModule: false,
        })}
      />
    );

    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.getByText('Resources')).toBeTruthy();
    expect(screen.getByText('Report Disaster')).toBeTruthy();
    expect(screen.getByText('Audit Logs')).toBeTruthy();
    expect(screen.getByText('Settings')).toBeTruthy();
    expect(screen.queryByText('Allocation')).toBeNull();
    expect(screen.queryByText('OTS Control')).toBeNull();
    expect(screen.queryByText('Hazard Zoning')).toBeNull();
    expect(screen.queryByText('Volunteers')).toBeNull();
  });

  test('navigates using page keys for enabled links', () => {
    const onNav = jest.fn();
    render(
      <Sidebar
        page="dashboard"
        onNav={onNav}
        currentUser={{ fullName: 'Test Operator', role: 'Operator' }}
        enabledPages={getEnabledPages({ allocationModule: true })}
      />
    );

    fireEvent.click(screen.getByText('Allocation'));

    expect(onNav).toHaveBeenCalledWith('allocation');
  });
});

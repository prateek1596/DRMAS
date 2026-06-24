import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { StoreProvider, useStore } from './store';

const mockBootstrap = jest.fn();

jest.mock('./api', () => ({
  api: {
    bootstrap: (...args) => mockBootstrap(...args),
  },
}));

function StoreProbe() {
  const store = useStore();
  return <div data-testid="resource-count">{store.resources.length}</div>;
}

describe('StoreProvider queue replay refresh', () => {
  beforeEach(() => {
    mockBootstrap.mockReset();
  });

  test('reloads bootstrap data after queued mutations replay', async () => {
    mockBootstrap
      .mockResolvedValueOnce({
        resources: [{ id: 1, name: 'Water' }],
        disasters: [],
        allocations: [],
        otsTasks: [],
        hazardZones: [],
        volunteers: [],
      })
      .mockResolvedValueOnce({
        resources: [
          { id: 1, name: 'Water' },
          { id: 2, name: 'Medical Kit' },
        ],
        disasters: [],
        allocations: [],
        otsTasks: [],
        hazardZones: [],
        volunteers: [],
      });

    render(
      <StoreProvider>
        <StoreProbe />
      </StoreProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('resource-count').textContent).toBe('1');
    });

    act(() => {
      window.dispatchEvent(new CustomEvent('drams:queue-replayed', { detail: { replayed: 1, remaining: 0 } }));
    });

    await waitFor(() => {
      expect(mockBootstrap).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId('resource-count').textContent).toBe('2');
    });
  });
});


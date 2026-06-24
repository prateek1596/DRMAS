import { getEnabledPages, getPageFromPath, isPageEnabled, PAGE_ROUTES } from './navigation';

describe('navigation helpers', () => {
  test('maps paths to page keys with dashboard fallback', () => {
    expect(getPageFromPath('/inventory')).toBe('inventory');
    expect(getPageFromPath('/hazard')).toBe('hazard');
    expect(getPageFromPath('/unknown')).toBe('dashboard');
  });

  test('treats unflagged pages as enabled', () => {
    expect(isPageEnabled('dashboard', {})).toBe(true);
    expect(isPageEnabled('audit', { hazardModule: false })).toBe(true);
  });

  test('builds enabled page map from feature flags', () => {
    const enabledPages = getEnabledPages({
      allocationModule: false,
      otsModule: true,
      hazardModule: false,
      volunteersModule: true,
    });

    expect(Object.keys(enabledPages)).toEqual(Object.keys(PAGE_ROUTES));
    expect(enabledPages.dashboard).toBe(true);
    expect(enabledPages.allocation).toBe(false);
    expect(enabledPages.ots).toBe(true);
    expect(enabledPages.hazard).toBe(false);
    expect(enabledPages.audit).toBe(true);
  });
});

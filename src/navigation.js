export const PAGE_ROUTES = {
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

export const PAGE_FLAG_MAP = {
  allocation: 'allocationModule',
  ots: 'otsModule',
  hazard: 'hazardModule',
  volunteers: 'volunteersModule',
};

export function getPageFromPath(pathname) {
  const match = Object.entries(PAGE_ROUTES).find(([, path]) => path === pathname);
  return match ? match[0] : 'dashboard';
}

export function isPageEnabled(pageName, featureFlags = {}) {
  const flag = PAGE_FLAG_MAP[pageName];
  if (!flag) return true;
  return featureFlags[flag] !== false;
}

export function getEnabledPages(featureFlags = {}) {
  return Object.fromEntries(
    Object.keys(PAGE_ROUTES).map((page) => [page, isPageEnabled(page, featureFlags)])
  );
}

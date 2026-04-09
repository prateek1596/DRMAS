const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const TOKEN_KEY = "drams_access_token";
const REFRESH_KEY = "drams_refresh_token";
const USER_KEY = "drams_user";

let accessToken = localStorage.getItem(TOKEN_KEY) || "";
let refreshToken = localStorage.getItem(REFRESH_KEY) || "";
let memoryUser = safeParse(localStorage.getItem(USER_KEY));
let isRefreshing = false;
let refreshPromise = null;

const queuedMutationsKey = "drams_queued_mutations";

function safeParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function saveSession({ token, refresh, user }) {
  accessToken = token || "";
  refreshToken = refresh || refreshToken || "";
  memoryUser = user || null;

  if (accessToken) {
    localStorage.setItem(TOKEN_KEY, accessToken);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }

  if (refreshToken) {
    localStorage.setItem(REFRESH_KEY, refreshToken);
  } else {
    localStorage.removeItem(REFRESH_KEY);
  }

  if (memoryUser) {
    localStorage.setItem(USER_KEY, JSON.stringify(memoryUser));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

function clearSession() {
  accessToken = "";
  refreshToken = "";
  memoryUser = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

function getQueuedMutations() {
  return safeParse(localStorage.getItem(queuedMutationsKey)) || [];
}

function setQueuedMutations(queue) {
  localStorage.setItem(queuedMutationsKey, JSON.stringify(queue));
}

function enqueueMutation(entry) {
  const queue = getQueuedMutations();
  queue.push({ ...entry, queuedAt: new Date().toISOString() });
  setQueuedMutations(queue);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(requestFn, maxAttempts = 3) {
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      return await requestFn();
    } catch (error) {
      attempt += 1;
      const status = error?.status || 0;
      const isTransient = !status || status >= 500;

      if (!isTransient || attempt >= maxAttempts) {
        throw error;
      }

      const delay = Math.min(1500, 250 * 2 ** (attempt - 1));
      await wait(delay);
    }
  }

  throw new Error("Request failed after retries");
}

async function refreshAccessToken() {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = fetch(`${API_BASE}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.accessToken) {
        throw Object.assign(new Error(data?.message || "Failed to refresh token"), {
          status: res.status,
          body: data,
        });
      }

      saveSession({ token: data.accessToken, refresh: refreshToken, user: data.user || memoryUser });
      return data.accessToken;
    })
    .finally(() => {
      isRefreshing = false;
      refreshPromise = null;
    });

  return refreshPromise;
}

async function request(path, options = {}, retryOnAuth = true) {
  const method = (options.method || "GET").toUpperCase();
  const shouldQueueOnOffline = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  const doRequest = async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine && shouldQueueOnOffline) {
      enqueueMutation({ path, options });
      return { queued: true, offline: true };
    }

    const headers = {
      ...(options.headers || {}),
    };

    const hasBody = options.body !== undefined;
    if (hasBody && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      method,
      headers,
    });

    const payload = await response.json().catch(() => ({}));

    if (response.status === 401 && retryOnAuth) {
      try {
        await refreshAccessToken();
      } catch {
        clearSession();
        throw Object.assign(new Error("Session expired. Please log in again."), {
          status: 401,
          body: payload,
        });
      }
      return request(path, options, false);
    }

    if (!response.ok) {
      throw Object.assign(new Error(payload?.message || "Request failed"), {
        status: response.status,
        body: payload,
      });
    }

    return payload;
  };

  return withRetry(doRequest);
}

export async function replayQueuedMutations() {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const queue = getQueuedMutations();
  if (!queue.length) return;

  const remaining = [];

  for (const entry of queue) {
    try {
      // Replayed mutations skip re-queueing to avoid loops.
      await request(entry.path, entry.options, true);
    } catch {
      remaining.push(entry);
    }
  }

  setQueuedMutations(remaining);
}

export const session = {
  getToken: () => accessToken,
  getRefreshToken: () => refreshToken,
  getUser: () => memoryUser,
  isAuthenticated: () => Boolean(accessToken),
  save: saveSession,
  clear: clearSession,
};

export async function login(payload) {
  const data = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  saveSession({ token: data.accessToken, refresh: data.refreshToken, user: data.user });
  return data.user;
}

export async function register(payload) {
  const data = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return data;
}

export async function logout() {
  try {
    await request(
      "/api/auth/logout",
      { method: "POST", body: JSON.stringify({ refreshToken }) },
      false
    );
  } finally {
    clearSession();
  }
}

export async function bootstrapSession() {
  if (!accessToken) {
    try {
      await refreshAccessToken();
    } catch {
      clearSession();
      return null;
    }
  }

  return memoryUser;
}

export const api = {
  bootstrap: () => request("/api/bootstrap"),

  // Resource aliases keep existing store/page code working.
  getInventory: () => request("/api/resources"),
  createInventory: (payload) =>
    request("/api/resources", { method: "POST", body: JSON.stringify(payload) }),
  updateInventory: (id, payload) =>
    request(`/api/resources/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteInventory: (id) => request(`/api/resources/${id}`, { method: "DELETE" }),
  createResource: (payload) => request("/api/resources", { method: "POST", body: JSON.stringify(payload) }),
  updateResource: (id, payload) => request(`/api/resources/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteResource: (id) => request(`/api/resources/${id}`, { method: "DELETE" }),
  assignResource: (id, assignedTo) =>
    request(`/api/resources/${id}/assign`, { method: "POST", body: JSON.stringify({ assignedTo }) }),
  unassignResource: (id) => request(`/api/resources/${id}/unassign`, { method: "POST" }),

  getAllocations: () => request("/api/allocations"),
  createAllocation: (payload) =>
    request("/api/allocations", { method: "POST", body: JSON.stringify(payload) }),

  getDisasters: () => request("/api/disasters"),
  createDisaster: (payload) =>
    request("/api/disasters", { method: "POST", body: JSON.stringify(payload) }),
  updateDisaster: (id, payload) =>
    request(`/api/disasters/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteDisaster: (id) => request(`/api/disasters/${id}`, { method: "DELETE" }),

  getOts: () => request("/api/ots"),
  createOts: (payload) => request("/api/ots", { method: "POST", body: JSON.stringify(payload) }),
  updateOts: (id, payload) =>
    request(`/api/ots/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteOts: (id) => request(`/api/ots/${id}`, { method: "DELETE" }),
  createOtsTask: (payload) => request("/api/ots", { method: "POST", body: JSON.stringify(payload) }),
  updateOtsTask: (id, payload) => request(`/api/ots/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteOtsTask: (id) => request(`/api/ots/${id}`, { method: "DELETE" }),

  getHazards: () => request("/api/hazard-zones"),
  createHazard: (payload) =>
    request("/api/hazard-zones", { method: "POST", body: JSON.stringify(payload) }),
  updateHazard: (id, payload) =>
    request(`/api/hazard-zones/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteHazard: (id) => request(`/api/hazard-zones/${id}`, { method: "DELETE" }),
  createHazardZone: (payload) => request("/api/hazard-zones", { method: "POST", body: JSON.stringify(payload) }),
  updateHazardZone: (id, payload) =>
    request(`/api/hazard-zones/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteHazardZone: (id) => request(`/api/hazard-zones/${id}`, { method: "DELETE" }),

  getDashboardStats: () => request("/api/dashboard/stats"),
  getTrends: () => request("/api/trends"),
  getFeatureFlags: () => request("/api/feature-flags"),
  getAuditLogs: () => request("/api/audit-logs"),
  geocode: (query) => request(`/api/geocode?q=${encodeURIComponent(query)}`),
};

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    replayQueuedMutations();
  });
}

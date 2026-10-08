const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status: number;
  /** Per-field validation messages (Laravel 422 `errors`), keyed by field name. */
  fields?: Record<string, string>;
  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

/**
 * Paths that may legitimately answer 401 without meaning "session is dead"
 * (login form, token refresh, session restore) — never trigger a logout.
 */
const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/me", "/logout"];

/**
 * A 401 on any other endpoint means the stored token is dead (expired,
 * revoked, or the account was deleted elsewhere). Clear the session so
 * ProtectedRoute sends the user to log in again, instead of showing a
 * cryptic "Unauthenticated." on every action. Dynamic import keeps
 * authStore (which imports this module) out of a static cycle.
 */
function handleUnauthorized(path: string): void {
  try {
    if (!localStorage.getItem("taskflow_token")) return;
    if (AUTH_PATHS.some((p) => path.endsWith(p))) return;
    void import("../stores/authStore").then(({ useAuthStore }) => {
      if (useAuthStore.getState().user) useAuthStore.getState().logout();
    });
  } catch {
    // Storage/import unavailable (tests, SSR) — just surface the error.
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("taskflow_token");

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    // Most common cause: the Laravel backend (php artisan serve) isn't running,
    // or VITE_API_URL doesn't match where it's actually listening.
    throw new ApiError(
      `Couldn't reach the API at ${API_URL}. Is the backend running (XAMPP Apache or "php artisan serve")?`,
      0
    );
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized(path);
    const message =
      body?.message ||
      (body?.errors && Object.values(body.errors).flat().join(" ")) ||
      `Request failed with status ${response.status}`;
    const fields =
      body?.errors && typeof body.errors === "object"
        ? Object.fromEntries(
            Object.entries(body.errors as Record<string, unknown>).map(([field, value]) => [
              field,
              Array.isArray(value) ? String(value[0] ?? "") : String(value),
            ])
          )
        : undefined;
    throw new ApiError(message, response.status, fields);
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "DELETE", body: data ? JSON.stringify(data) : undefined }),
  /**
   * Multipart upload (plan documents). Goes through the same bearer-token
   * fetch but must NOT set a JSON Content-Type — the browser sets the
   * multipart boundary itself.
   */
  upload: async <T>(path: string, form: FormData): Promise<T> => {
    const token = localStorage.getItem("taskflow_token");
    let response: Response;
    try {
      response = await fetch(`${API_URL}${path}`, {
        method: "POST",
        body: form,
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    } catch {
      throw new ApiError(
        `Couldn't reach the API at ${API_URL}. Is the backend running (XAMPP Apache or "php artisan serve")?`,
        0
      );
    }
    const isJson = response.headers.get("content-type")?.includes("application/json");
    const body = isJson ? await response.json().catch(() => null) : null;
    if (!response.ok) {
      const message =
        body?.message ||
        (body?.errors && Object.values(body.errors).flat().join(" ")) ||
        `Request failed with status ${response.status}`;
      const fields =
        body?.errors && typeof body.errors === "object"
          ? Object.fromEntries(
              Object.entries(body.errors as Record<string, unknown>).map(([field, value]) => [
                field,
                Array.isArray(value) ? String(value[0] ?? "") : String(value),
              ])
            )
          : undefined;
      throw new ApiError(message, response.status, fields);
    }
    return body as T;
  },
};

/**
 * Fetch every page of a Laravel resource-paginated index (`{data, meta}`).
 * Endpoints cap per_page at 100, so larger workspaces need paging; the loop
 * stops at meta.last_page with a 10-page (1000-row) safety stop.
 */
export async function fetchAll<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  const separator = path.includes("?") ? "&" : "?";
  for (let page = 1; page <= 10; page++) {
    const res = await request<{ data: T[]; meta?: { last_page?: number } }>(
      `${path}${separator}per_page=100&page=${page}`,
      { method: "GET" }
    );
    items.push(...res.data);
    if (page >= (res.meta?.last_page ?? 1)) break;
  }
  return items;
}

/**
 * Authenticated file download: fetches with the bearer token (plain `<a>`
 * links can't send one), then triggers a browser save via an object URL.
 * Throws ApiError with the server's message on failure, like every call.
 */
export async function download(path: string): Promise<void> {
  const token = localStorage.getItem("taskflow_token");
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      Accept: "*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized(path);
    const isJson = response.headers.get("content-type")?.includes("application/json");
    const body = isJson ? await response.json().catch(() => null) : null;
    throw new ApiError(body?.message || `Download failed with status ${response.status}`, response.status);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") ?? "";
  const filename = disposition.match(/filename="?([^";]+)"?/)?.[1];

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  if (filename) link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the save before releasing the blob.
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export { API_URL };

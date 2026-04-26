import { ApiError } from "@/lib/api/api-error";

type ReqConfig = { responseType?: "json" | "blob" };

function buildUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return path;
}

async function parseErrorBody(
  res: Response,
  wantBlob: boolean
): Promise<unknown> {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      return {};
    }
  }
  if (wantBlob) {
    return { _raw: await res.text() };
  }
  return { error: await res.text() };
}

export async function apiRequest<T = unknown>(
  method: string,
  url: string,
  data?: unknown,
  config?: ReqConfig
): Promise<{ data: T }> {
  const wantBlob = config?.responseType === "blob";
  const headers: Record<string, string> = {};
  const init: RequestInit = { method, credentials: "include" };

  if (data instanceof FormData) {
    init.body = data;
  } else if (data !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(data);
  }
  if (Object.keys(headers).length) init.headers = headers;

  const res = await fetch(buildUrl(url), init);

  if (!res.ok) {
    const errData = await parseErrorBody(res, wantBlob);
    throw new ApiError("Request failed", { status: res.status, data: errData });
  }

  if (wantBlob) {
    return { data: (await res.blob()) as T };
  }
  if (res.status === 204) {
    return { data: null as T };
  }
  const text = await res.text();
  if (!text) {
    return { data: null as T };
  }
  try {
    return { data: JSON.parse(text) as T };
  } catch {
    return { data: text as T };
  }
}

const api = {
  get: <T = unknown>(url: string, config?: ReqConfig) => apiRequest<T>("GET", url, undefined, config),
  post: <T = unknown>(url: string, data?: unknown, config?: ReqConfig) => apiRequest<T>("POST", url, data, config),
  put: <T = unknown>(url: string, data?: unknown) => apiRequest<T>("PUT", url, data),
  patch: <T = unknown>(url: string, data?: unknown) => apiRequest<T>("PATCH", url, data),
};

export default api;

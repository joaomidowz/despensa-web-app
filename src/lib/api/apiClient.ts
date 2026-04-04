import { getErrorMessage } from "../errors/errorMessages";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  headers?: HeadersInit;
  token?: string | null;
};

type ErrorListener = (error: ApiClientError) => void;

export class ApiClientError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";
const errorListeners = new Set<ErrorListener>();

export function subscribeToApiErrors(listener: ErrorListener) {
  errorListeners.add(listener);
  return () => {
    errorListeners.delete(listener);
  };
}

export async function apiClient<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, method = "GET", token } = options;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const error = new ApiClientError("NETWORK_ERROR", getErrorMessage("NETWORK_ERROR"), 0);
    errorListeners.forEach((listener) => listener(error));
    throw error;
  }

  if (!response.ok) {
    let errorCode = "UNKNOWN_ERROR";
    try {
      const payload = (await response.json()) as { error?: { code?: string } };
      errorCode = payload.error?.code ?? errorCode;
    } catch {
      errorCode = response.status === 401 ? "UNAUTHORIZED" : "UNKNOWN_ERROR";
    }
    const error = new ApiClientError(errorCode, getErrorMessage(errorCode), response.status);
    errorListeners.forEach((listener) => listener(error));
    throw error;
  }

  return (await response.json()) as T;
}

const API_BASE = "/api";

interface FetchOptions extends RequestInit {
    params?: Record<string, string>;
}

async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
    const { params, ...fetchOptions } = options;

    let url = `${API_BASE}${path}`;
    if (params) {
        const searchParams = new URLSearchParams(params);
        url += `?${searchParams.toString()}`;
    }

    const response = await fetch(url, {
        ...fetchOptions,
        headers: {
            "Content-Type": "application/json",
            ...fetchOptions.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({
            error: `HTTP ${response.status}`,
        }));
        throw new Error(error.error || `Request failed: ${response.status}`);
    }

    return response.json();
}

export const api = {
    get: <T>(path: string, params?: Record<string, string>) =>
        request<T>(path, { method: "GET", params }),

    post: <T>(path: string, body?: unknown) =>
        request<T>(path, {
            method: "POST",
            body: body ? JSON.stringify(body) : undefined,
        }),

    put: <T>(path: string, body?: unknown) =>
        request<T>(path, {
            method: "PUT",
            body: body ? JSON.stringify(body) : undefined,
        }),

    delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

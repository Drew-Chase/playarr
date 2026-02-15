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
        credentials: "same-origin",
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
    get: <T>(path: string, params?: Record<string, string>, headers?: Record<string, string>) =>
        request<T>(path, { method: "GET", params, headers }),

    post: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
        request<T>(path, {
            method: "POST",
            body: body ? JSON.stringify(body) : undefined,
            headers,
        }),

    put: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
        request<T>(path, {
            method: "PUT",
            body: body ? JSON.stringify(body) : undefined,
            headers,
        }),

    delete: <T>(path: string, headers?: Record<string, string>) =>
        request<T>(path, { method: "DELETE", headers }),
};

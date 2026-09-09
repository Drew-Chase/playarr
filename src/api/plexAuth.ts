export async function request<T>(url: string, opts: { method?: string; headers?: Record<string, string>; body?: string } = {}): Promise<T> {
  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers: opts.headers,
    body: opts.body,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      if (err && err.error) msg = err.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

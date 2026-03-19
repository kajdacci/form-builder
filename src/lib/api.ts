const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export async function callEdge<T = unknown>(name: string, body?: object): Promise<T> {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ANON_KEY}`,
            apikey: ANON_KEY,
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    return data as T;
}

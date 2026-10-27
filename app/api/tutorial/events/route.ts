// Server-only proxy. Browser requests stay on the tutorial origin; no CRM secret is exposed.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
    const origin = request.headers.get("origin");
    if (origin && origin !== (process.env.TUTORIAL_PUBLIC_ORIGIN ?? new URL(request.url).origin)) {
        return Response.json({ error: "Forbidden origin" }, { status: 403 });
    }
    const base = process.env.AUTOMARKETING_INTERNAL_BASE_URL;
    if (!base) return Response.json({ error: "Tracking is not configured" }, { status: 503 });
    if (Number(request.headers.get("content-length") ?? 0) > 65536) {
        return Response.json({ error: "Payload too large" }, { status: 413 });
    }
    // Stream with a hard byte limit, including requests without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return Response.json({ error: "Empty request" }, { status: 400 });
    const parts: Uint8Array[] = []; let length = 0;
    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 65536) { await reader.cancel(); return Response.json({ error: "Payload too large" }, { status: 413 }); }
        parts.push(value);
    }
    const body = new Uint8Array(length); let offset = 0;
    for (const part of parts) { body.set(part, offset); offset += part.byteLength; }
    try {
        const response = await fetch(`${base.replace(/\/$/, "")}/api/tutorial/events`, {
            method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000),
        });
        // Never relay upstream stack traces, headers, cookies, or HTML to the public client.
        if (!response.ok) return Response.json({ error: "Tracking request rejected" }, {
            status: [401, 409, 413, 422, 429].includes(response.status) ? response.status : 502,
        });
        const result = await response.json();
        if (!Array.isArray(result.accepted) || !result.accepted.every((id: unknown) => typeof id === "string")) {
            return Response.json({ error: "Invalid tracking response" }, { status: 502 });
        }
        return Response.json({ accepted: result.accepted }, { headers: { "Cache-Control": "no-store" } });
    } catch { return Response.json({ error: "Tracking temporarily unavailable" }, { status: 502 }); }
}

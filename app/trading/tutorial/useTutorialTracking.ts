"use client";

import { useEffect, useRef } from "react";
import type { AmountMethod, PurchaseIntent, TutorialStep } from "./tutorialTypes";

export type TutorialSnapshot = {
    side: "buy" | "sell";
    step: TutorialStep;
    stepNumber: number;
    totalSteps: number;
    matchIndex: number;
    intent: PurchaseIntent | null;
    amountMethod: AmountMethod | null;
};
type TrackingEvent = TutorialSnapshot & {
    eventId: string; runId: string; sequence: number;
    name: "page_opened" | "started" | "step_viewed" | "action_completed" | "completed" | "heartbeat";
    action: "order_registered" | "order_cancelled" | null;
    occurredAt: string; activeSeconds: number; version: "silver-v1";
};
const MAX_QUEUE = 500;

// A link identifies its holder, not an authenticated customer identity.
// No tracking token means the tutorial works normally without customer tracking.
export function useTutorialTracking(snapshot: TutorialSnapshot) {
    const current = useRef(snapshot);
    current.current = snapshot;
    const tracker = useRef<ReturnType<typeof createTracker> | null>(null);

    useEffect(() => {
        try {
            const hash = new URLSearchParams(window.location.hash.slice(1));
            const query = new URLSearchParams(window.location.search);
            const supplied = hash.get("t") ?? query.get("t");
            if (supplied && /^[a-f0-9]{64}$/.test(supplied)) {
                // Keep the capability out of referrers and the visible URL.
                sessionStorage.setItem("silver-tutorial-token", supplied);
                hash.delete("t"); query.delete("t");
                history.replaceState(history.state, "", window.location.pathname +
                    (query.size ? `?${query}` : "") + (hash.size ? `#${hash}` : ""));
            }
            const token = supplied ?? sessionStorage.getItem("silver-tutorial-token");
            if (!token || !/^[a-f0-9]{64}$/.test(token)) return;
            // Retain the instance across React Strict Mode effect replays.
            tracker.current ??= createTracker(token, () => current.current);
            return tracker.current.connect();
        } catch { /* Restricted browser storage must never block the lesson. */ }
    }, []);

    useEffect(() => { tracker.current?.observe(); }, [snapshot.side, snapshot.step,
        snapshot.stepNumber, snapshot.totalSteps, snapshot.matchIndex, snapshot.intent, snapshot.amountMethod]);

    return {
        action: (action: "order_registered" | "order_cancelled") => tracker.current?.action(action),
        finish: () => tracker.current?.finish(),
    };
}

function createTracker(token: string, snapshot: () => TutorialSnapshot) {
    const key = `silver-tutorial-outbox:${token}`;
    let queue: TrackingEvent[] = [];
    try {
        const saved: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
        if (Array.isArray(saved)) queue = saved.filter(e => e && typeof e.eventId === "string").slice(-MAX_QUEUE);
    } catch { /* An in-memory queue still works if storage is unavailable. */ }
    let runId = crypto.randomUUID(), sequence = 0, side = snapshot().side;
    let activeSeconds = 0, started = false, finished = false, registered = false;
    let lastSignature = "", opened = false, sending = false;
    let lastTick = performance.now();
    const save = () => { try { localStorage.setItem(key, JSON.stringify(queue)); } catch { /* Keep in memory. */ } };
    const emit = (name: TrackingEvent["name"], action: TrackingEvent["action"] = null) => {
        if (queue.length >= MAX_QUEUE) return; // Bound offline storage; never disrupt trading UI.
        queue.push({ ...snapshot(), eventId: crypto.randomUUID(), runId, sequence: ++sequence,
            name, action, occurredAt: new Date().toISOString(), activeSeconds,
            version: "silver-v1" });
        save(); void flush();
    };
    async function flush() {
        if (sending || queue.length === 0 || !navigator.onLine) return;
        sending = true;
        try {
            while (queue.length) {
                const batch = queue.slice(0, 20);
                const response = await fetch("/api/tutorial/events", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token, events: batch }), credentials: "same-origin",
                });
                if (!response.ok) break;
                const result = await response.json() as { accepted?: string[] };
                if (!Array.isArray(result.accepted)) break;
                const accepted = new Set(result.accepted);
                if (!batch.every(e => accepted.has(e.eventId))) break;
                queue = queue.filter(e => !accepted.has(e.eventId)); save();
            }
        } catch { /* Retry the same event IDs on the next interval or reconnect. */ }
        finally { sending = false; }
    }
    function observe() {
        const s = snapshot();
        if (s.side !== side) {
            side = s.side; runId = crypto.randomUUID(); sequence = 0;
            activeSeconds = 0; started = false; finished = false; registered = false; lastSignature = "";
        }
        if (!opened) { opened = true; emit("page_opened"); }
        if (s.step === "finished") return; // Explicit finish/action records completion before reset.
        if (!started && s.step !== "welcome") { started = true; emit("started"); }
        const signature = JSON.stringify([s.side, s.step, s.matchIndex, s.intent, s.amountMethod]);
        if (signature !== lastSignature) { lastSignature = signature; emit("step_viewed"); }
    }
    function finish() {
        if (!started || !registered || finished) return;
        if (!["orders", "cancel-order"].includes(snapshot().step)) return;
        finished = true; emit("completed");
    }
    function tick() {
        const now = performance.now();
        if (document.visibilityState === "visible" && started && !finished) {
            activeSeconds += Math.max(0, Math.min(25, Math.floor((now - lastTick) / 1000)));
            emit("heartbeat");
        }
        lastTick = now;
    }
    const hide = () => {
        if (document.visibilityState === "hidden" && queue.length) {
            // Keep entries until a normal request acknowledges them. Beacon delivery is not an ACK.
            navigator.sendBeacon?.("/api/tutorial/events", new Blob([
                JSON.stringify({ token, events: queue.slice(0, 20) }),
            ], { type: "application/json" }));
        }
        lastTick = performance.now();
    };
    return {
        observe, finish,
        action(action: "order_registered" | "order_cancelled") {
            if (snapshot().step === "finished") return;
            if (action === "order_registered") registered = true;
            emit("action_completed", action);
        },
        connect() {
            observe(); void flush(); lastTick = performance.now();
            const retry = window.setInterval(() => { void flush(); }, 5000);
            const heartbeat = window.setInterval(tick, 20000);
            const online = () => { void flush(); };
            window.addEventListener("online", online);
            document.addEventListener("visibilitychange", hide);
            window.addEventListener("pagehide", hide);
            return () => {
                clearInterval(retry); clearInterval(heartbeat);
                window.removeEventListener("online", online);
                document.removeEventListener("visibilitychange", hide);
                window.removeEventListener("pagehide", hide);
            };
        },
    };
}

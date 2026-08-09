"use client";

import { useEffect, useState } from "react";

type Seat = { id: string; label: string };
type Event = {
  id: string;
  preview: string;
  profileUrl: string | null;
  createdAt: string;
};

export default function InboxPage() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [seatId, setSeatId] = useState("");
  const [events, setEvents] = useState<Event[]>([]);

  async function load() {
    const [s, e] = await Promise.all([
      fetch("/api/seats").then((r) => r.json()),
      fetch("/api/inbox").then((r) => r.json()),
    ]);
    setSeats(s.seats ?? []);
    setEvents(e.events ?? []);
    if (!seatId && s.seats?.[0]) setSeatId(s.seats[0].id);
  }

  useEffect(() => {
    void load();
  }, []);

  async function poll() {
    if (!seatId) return;
    await fetch("/api/inbox/poll", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ seatId }),
    });
    setTimeout(() => void load(), 1500);
  }

  return (
    <>
      <h1>Inbox</h1>
      <p className="lead">Detected LinkedIn replies (poll per seat).</p>
      <section className="panel">
        <div className="row">
          <select value={seatId} onChange={(e) => setSeatId(e.target.value)}>
            {seats.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => void poll()}>
            Poll inbox
          </button>
          <button type="button" className="secondary" onClick={() => void load()}>
            Refresh
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Preview</th>
              <th>Profile</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td className="muted">
                  {new Date(e.createdAt).toLocaleString()}
                </td>
                <td>{e.preview}</td>
                <td className="muted">{e.profileUrl ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

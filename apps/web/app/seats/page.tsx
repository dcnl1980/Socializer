"use client";

import { useEffect, useState } from "react";

type Seat = {
  id: string;
  label: string;
  status: string;
  killSwitch: boolean;
  actionsUsedToday: number;
  dailyCapPicked: number;
};

export default function SeatsPage() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [form, setForm] = useState({
    label: "Founder seat",
    linkedinEmail: "",
    linkedinPassword: "",
    proxyUrl: "http://user:pass@proxy.example:10000",
    timezone: "Europe/Amsterdam",
    browserEngine: "fake",
  });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/seats");
    const data = await res.json();
    setSeats(data.seats ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createSeat(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/seats", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    await load();
  }

  async function act(id: string, action: string) {
    await fetch(`/api/seats/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await load();
  }

  return (
    <>
      <h1>Seats</h1>
      <p className="lead">Connect LinkedIn seats with sticky proxies.</p>
      <section className="panel">
        <form className="grid" onSubmit={createSeat}>
          <label>
            Label
            <input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
          </label>
          <label>
            LinkedIn email
            <input
              value={form.linkedinEmail}
              onChange={(e) =>
                setForm({ ...form, linkedinEmail: e.target.value })
              }
            />
          </label>
          <label>
            LinkedIn password
            <input
              type="password"
              value={form.linkedinPassword}
              onChange={(e) =>
                setForm({ ...form, linkedinPassword: e.target.value })
              }
            />
          </label>
          <label>
            Proxy URL
            <input
              value={form.proxyUrl}
              onChange={(e) => setForm({ ...form, proxyUrl: e.target.value })}
            />
          </label>
          <button type="submit">Create seat</button>
          {error ? <p className="muted">{error}</p> : null}
        </form>
      </section>
      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>Label</th>
              <th>Status</th>
              <th>Usage</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {seats.map((s) => (
              <tr key={s.id}>
                <td>{s.label}</td>
                <td>
                  {s.status}
                  {s.killSwitch ? " · KILL" : ""}
                </td>
                <td>
                  {s.actionsUsedToday}/{s.dailyCapPicked}
                </td>
                <td className="row">
                  <button className="secondary" onClick={() => act(s.id, "pause")}>
                    Pause
                  </button>
                  <button className="secondary" onClick={() => act(s.id, "resume")}>
                    Resume
                  </button>
                  <button
                    className="secondary"
                    onClick={() =>
                      void fetch(`/api/seats/${s.id}/warm`, { method: "POST" })
                    }
                  >
                    Warm
                  </button>
                  <button className="danger" onClick={() => act(s.id, "kill")}>
                    Kill
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

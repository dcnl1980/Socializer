"use client";

import { useEffect, useState } from "react";

type Connection = {
  id: string;
  provider: string;
  webhookUrl: string | null;
  enabled: boolean;
};

type Health = {
  ok: boolean;
  checks: Record<string, string>;
};

export default function SettingsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [health, setHealth] = useState<Health | null>(null);

  async function load() {
    const [crm, h] = await Promise.all([
      fetch("/api/crm").then((r) => r.json()),
      fetch("/api/health").then((r) => r.json()),
    ]);
    setConnections(crm.connections ?? []);
    setHealth(h);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/crm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ webhookUrl, enabled: true }),
    });
    setWebhookUrl("");
    await load();
  }

  return (
    <>
      <h1>Settings</h1>
      <p className="lead">
        Providers are configured via env; CRM webhook can also be stored here.
      </p>
      <section className="panel">
        <h2>Health</h2>
        {health ? (
          <table>
            <tbody>
              {Object.entries(health.checks).map(([k, v]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">Loading…</p>
        )}
      </section>
      <section className="panel">
        <form className="grid" onSubmit={save}>
          <label>
            CRM webhook URL
            <input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.example.com/socializer"
            />
          </label>
          <button type="submit">Save CRM connection</button>
        </form>
        <p className="muted">
          Or set <code>HUBSPOT_ACCESS_TOKEN</code> for native HubSpot sync,{" "}
          <code>SMTP_URL</code> for real email, <code>EMAIL_FINDER_API_KEY</code>{" "}
          for Hunter, <code>AUTH_PASSWORD</code> for login.
        </p>
        <table>
          <thead>
            <tr>
              <th>Provider</th>
              <th>URL</th>
              <th>Enabled</th>
            </tr>
          </thead>
          <tbody>
            {connections.map((c) => (
              <tr key={c.id}>
                <td>{c.provider}</td>
                <td className="muted">{c.webhookUrl ?? "noop"}</td>
                <td>{c.enabled ? "yes" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

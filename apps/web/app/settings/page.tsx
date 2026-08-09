"use client";

import { useEffect, useState } from "react";

type Connection = {
  id: string;
  provider: string;
  webhookUrl: string | null;
  enabled: boolean;
};

export default function SettingsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [webhookUrl, setWebhookUrl] = useState("");

  async function load() {
    const res = await fetch("/api/crm");
    const data = await res.json();
    setConnections(data.connections ?? []);
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
      <p className="lead">CRM webhook sync (HubSpot/Make/Zapier-compatible).</p>
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

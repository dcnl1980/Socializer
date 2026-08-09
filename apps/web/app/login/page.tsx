"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setError("Invalid password");
      return;
    }
    window.location.href = "/";
  }

  return (
    <>
      <h1>Socializer</h1>
      <p className="lead">Internal login</p>
      <section className="panel">
        <form className="grid" onSubmit={onSubmit}>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button type="submit">Sign in</button>
          {error ? <p className="muted">{error}</p> : null}
        </form>
      </section>
    </>
  );
}

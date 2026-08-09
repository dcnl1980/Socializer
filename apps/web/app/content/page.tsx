"use client";

import { useEffect, useState } from "react";

type Seat = { id: string; label: string };
type Campaign = { id: string; name: string };
type Post = {
  id: string;
  status: string;
  topic: string | null;
  body: string | null;
  postUrl: string | null;
};

export default function ContentPage() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [seatId, setSeatId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [name, setName] = useState("Growth posts");
  const [keywords, setKeywords] = useState("ai, saas, founders");
  const [niche, setNiche] = useState("B2B SaaS");
  const [brandVoice, setBrandVoice] = useState("direct, practical");

  async function reload() {
    const [s, c, p] = await Promise.all([
      fetch("/api/seats").then((r) => r.json()),
      fetch("/api/content/campaigns").then((r) => r.json()),
      fetch("/api/content/posts").then((r) => r.json()),
    ]);
    setSeats(s.seats ?? []);
    setCampaigns(c.campaigns ?? []);
    setPosts(p.posts ?? []);
    if (!seatId && s.seats?.[0]) setSeatId(s.seats[0].id);
    if (!campaignId && c.campaigns?.[0]) setCampaignId(c.campaigns[0].id);
  }

  useEffect(() => {
    void reload();
  }, []);

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/content/campaigns", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        seatId,
        keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
        niche,
        brandVoice,
      }),
    });
    const data = await res.json();
    if (data.campaign) setCampaignId(data.campaign.id);
    await reload();
  }

  async function run(phase: string) {
    if (!campaignId) return;
    await fetch("/api/content/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ campaignId, phase }),
    });
    setTimeout(() => void reload(), 1500);
  }

  return (
    <>
      <h1>Content</h1>
      <p className="lead">
        Trend scout → AI draft → publish → boost related posts → auto-reply.
      </p>
      <section className="panel">
        <form className="grid" onSubmit={createCampaign}>
          <label>
            Campaign name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Seat
            <select value={seatId} onChange={(e) => setSeatId(e.target.value)}>
              {seats.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Keywords
            <input value={keywords} onChange={(e) => setKeywords(e.target.value)} />
          </label>
          <label>
            Niche
            <input value={niche} onChange={(e) => setNiche(e.target.value)} />
          </label>
          <label>
            Brand voice
            <input
              value={brandVoice}
              onChange={(e) => setBrandVoice(e.target.value)}
            />
          </label>
          <button type="submit">Create content campaign</button>
        </form>
      </section>
      <section className="panel">
        <label>
          Active campaign
          <select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
          >
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className="row">
          <button type="button" onClick={() => run("all")}>
            Run full loop
          </button>
          <button type="button" className="secondary" onClick={() => run("scout")}>
            Scout
          </button>
          <button type="button" className="secondary" onClick={() => run("publish")}>
            Publish
          </button>
          <button type="button" className="secondary" onClick={() => run("boost")}>
            Boost
          </button>
          <button type="button" className="secondary" onClick={() => run("reply")}>
            Reply
          </button>
        </div>
      </section>
      <section className="panel">
        <h2>Posts</h2>
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Topic</th>
              <th>URL</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id}>
                <td>{p.status}</td>
                <td className="muted">{p.topic ?? p.body?.slice(0, 80)}</td>
                <td className="muted">{p.postUrl ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

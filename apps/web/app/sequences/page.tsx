"use client";

import { useEffect, useState } from "react";

type Seat = { id: string; label: string };
type List = { id: string; name: string };
type Sequence = { id: string; name: string };

const templates: Record<string, Array<Record<string, unknown>>> = {
  classic: [
    { type: "connect" },
    { type: "wait", delayMinutes: 0 },
    { type: "condition", condition: "connected", onTrueNext: 3 },
    { type: "message" },
  ],
  warm: [
    { type: "profile_visit" },
    { type: "like_recent_post" },
    { type: "connect" },
    { type: "wait", delayMinutes: 0 },
    { type: "condition", condition: "connected", onTrueNext: 5 },
    { type: "message" },
  ],
  multichannel: [
    { type: "connect" },
    { type: "find_email" },
    { type: "wait", delayMinutes: 0 },
    { type: "condition", condition: "connected", onTrueNext: 4, onFalseNext: 5 },
    { type: "message" },
    { type: "send_email" },
  ],
};

export default function SequencesPage() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [seatId, setSeatId] = useState("");
  const [seatPool, setSeatPool] = useState<string[]>([]);
  const [listId, setListId] = useState("");
  const [sequenceId, setSequenceId] = useState("");
  const [name, setName] = useState("Warm connect");
  const [template, setTemplate] = useState("warm");

  useEffect(() => {
    void (async () => {
      const [s, l, seq] = await Promise.all([
        fetch("/api/seats").then((r) => r.json()),
        fetch("/api/lists").then((r) => r.json()),
        fetch("/api/sequences").then((r) => r.json()),
      ]);
      setSeats(s.seats ?? []);
      setLists(l.lists ?? []);
      setSequences(seq.sequences ?? []);
      if (s.seats?.[0]) {
        setSeatId(s.seats[0].id);
        setSeatPool(s.seats.map((x: Seat) => x.id));
      }
      if (l.lists?.[0]) setListId(l.lists[0].id);
      if (seq.sequences?.[0]) setSequenceId(seq.sequences[0].id);
    })();
  }, []);

  async function createSequence(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/sequences", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        seatId,
        seatPool,
        steps: templates[template] ?? templates.classic,
      }),
    });
    const data = await res.json();
    if (data.sequence) {
      setSequences((prev) => [...prev, data.sequence]);
      setSequenceId(data.sequence.id);
    }
  }

  async function enroll(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/enrollments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sequenceId, listId }),
    });
    await fetch("/api/scheduler/tick", { method: "POST" });
  }

  return (
    <>
      <h1>Sequences</h1>
      <p className="lead">
        Outbound + engagement + multichannel. Seat pool enables rotation across
        healthy accounts.
      </p>
      <section className="panel">
        <form className="grid" onSubmit={createSequence}>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Template
            <select value={template} onChange={(e) => setTemplate(e.target.value)}>
              <option value="classic">Connect → message</option>
              <option value="warm">Visit → like → connect → message</option>
              <option value="multichannel">Connect → email finder → message/email</option>
            </select>
          </label>
          <label>
            Primary seat
            <select value={seatId} onChange={(e) => setSeatId(e.target.value)}>
              {seats.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Seat pool (rotation)
            <select
              multiple
              value={seatPool}
              onChange={(e) =>
                setSeatPool(Array.from(e.target.selectedOptions, (o) => o.value))
              }
            >
              {seats.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Create sequence</button>
        </form>
      </section>
      <section className="panel">
        <form className="grid" onSubmit={enroll}>
          <label>
            Sequence
            <select
              value={sequenceId}
              onChange={(e) => setSequenceId(e.target.value)}
            >
              {sequences.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            List
            <select value={listId} onChange={(e) => setListId(e.target.value)}>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Enroll list + tick scheduler</button>
        </form>
      </section>
    </>
  );
}

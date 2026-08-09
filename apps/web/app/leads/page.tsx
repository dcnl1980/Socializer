"use client";

import { useEffect, useState } from "react";

type List = { id: string; name: string };

export default function LeadsPage() {
  const [lists, setLists] = useState<List[]>([]);
  const [listName, setListName] = useState("Outbound ICP");
  const [selectedList, setSelectedList] = useState("");
  const [lead, setLead] = useState({
    linkedinUrl: "https://www.linkedin.com/in/example",
    firstName: "Jane",
    lastName: "Doe",
    title: "CEO",
    company: "Acme",
    domain: "acme.io",
  });

  async function load() {
    const res = await fetch("/api/lists");
    const data = await res.json();
    setLists(data.lists ?? []);
    if (!selectedList && data.lists?.[0]) setSelectedList(data.lists[0].id);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createList(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/lists", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: listName }),
    });
    const data = await res.json();
    await load();
    if (data.list) setSelectedList(data.list.id);
  }

  async function addLead(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedList) return;
    await fetch(`/api/lists/${selectedList}/leads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(lead),
    });
  }

  async function enrich() {
    if (!selectedList) return;
    await fetch("/api/enrichment/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ listId: selectedList }),
    });
  }

  return (
    <>
      <h1>Leads</h1>
      <p className="lead">Lists from CSV/extension/manual entry.</p>
      <section className="panel">
        <form className="row" onSubmit={createList}>
          <input value={listName} onChange={(e) => setListName(e.target.value)} />
          <button type="submit">Create list</button>
        </form>
        <label>
          Active list
          <select
            value={selectedList}
            onChange={(e) => setSelectedList(e.target.value)}
          >
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
      </section>
      <section className="panel">
        <form className="grid" onSubmit={addLead}>
          {Object.entries(lead).map(([key, value]) => (
            <label key={key}>
              {key}
              <input
                value={value}
                onChange={(e) => setLead({ ...lead, [key]: e.target.value })}
              />
            </label>
          ))}
          <div className="row">
            <button type="submit">Add lead</button>
            <button type="button" className="secondary" onClick={enrich}>
              Enrich list emails
            </button>
          </div>
        </form>
      </section>
    </>
  );
}

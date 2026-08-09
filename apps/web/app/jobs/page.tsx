"use client";

import { useEffect, useState } from "react";

type Job = {
  id: string;
  stepType: string;
  status: string;
  detail: string | null;
  aiOutput: string | null;
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);

  async function load() {
    const res = await fetch("/api/action-jobs");
    const data = await res.json();
    setJobs(data.jobs ?? []);
  }

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <h1>Jobs</h1>
      <p className="lead">Action queue + AI copy audit.</p>
      <section className="panel">
        <div className="row">
          <button className="secondary" onClick={() => void load()}>
            Refresh
          </button>
          <button
            className="secondary"
            onClick={() => void fetch("/api/scheduler/tick", { method: "POST" })}
          >
            Scheduler tick
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Status</th>
              <th>Detail</th>
              <th>AI output</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id}>
                <td>{j.stepType}</td>
                <td>{j.status}</td>
                <td className="muted">{j.detail ?? "—"}</td>
                <td className="muted">{j.aiOutput ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

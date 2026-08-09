import { actionJobs, linkedinSeats } from "@socializer/db";
import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const db = getDb();
  const seats = await db.select().from(linkedinSeats);
  const jobs = await db
    .select()
    .from(actionJobs)
    .orderBy(desc(actionJobs.createdAt))
    .limit(8);

  return (
    <>
      <h1>Socializer</h1>
      <p className="lead">
        Internal LinkedIn growth OS — cloud workers, sticky proxies, outbound
        sequences, and DIY enrichment.
      </p>
      <section className="panel">
        <h2>Seats</h2>
        {seats.length === 0 ? (
          <p className="muted">No seats yet. Create one under Seats.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Label</th>
                <th>Status</th>
                <th>Used / Cap</th>
                <th>Kill</th>
              </tr>
            </thead>
            <tbody>
              {seats.map((s) => (
                <tr key={s.id}>
                  <td>{s.label}</td>
                  <td>{s.status}</td>
                  <td>
                    {s.actionsUsedToday} / {s.dailyCapPicked}
                  </td>
                  <td>{s.killSwitch ? "ON" : "off"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="panel">
        <h2>Recent jobs</h2>
        {jobs.length === 0 ? (
          <p className="muted">No action jobs yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Status</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td>{j.stepType}</td>
                  <td>{j.status}</td>
                  <td className="muted">{j.detail ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

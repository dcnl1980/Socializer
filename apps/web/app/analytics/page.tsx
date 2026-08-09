"use client";

import { useEffect, useState } from "react";

type Analytics = {
  summary: {
    totalJobs: number;
    succeeded: number;
    failed: number;
    skipped: number;
    connects: number;
    messages: number;
    inmails: number;
    emails: number;
    contentPublishes: number;
    successRate: number;
  };
  contentPosts: number;
  contentPublished: number;
  emailsSent: number;
  crmSyncs: number;
  crmOk: number;
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    void fetch("/api/analytics")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <p className="muted">Loading analytics…</p>;
  const s = data.summary;

  return (
    <>
      <h1>Analytics</h1>
      <p className="lead">Pipeline, content, email, and CRM sync health.</p>
      <section className="panel">
        <table>
          <tbody>
            <tr>
              <td>Jobs</td>
              <td>
                {s.succeeded}/{s.totalJobs} succeeded (
                {Math.round(s.successRate * 100)}%)
              </td>
            </tr>
            <tr>
              <td>Connects</td>
              <td>{s.connects}</td>
            </tr>
            <tr>
              <td>Messages</td>
              <td>{s.messages}</td>
            </tr>
            <tr>
              <td>InMails</td>
              <td>{s.inmails}</td>
            </tr>
            <tr>
              <td>Emails sent</td>
              <td>
                {s.emails} (records: {data.emailsSent})
              </td>
            </tr>
            <tr>
              <td>Content publishes</td>
              <td>
                {s.contentPublishes} / drafts {data.contentPosts} / published{" "}
                {data.contentPublished}
              </td>
            </tr>
            <tr>
              <td>CRM syncs</td>
              <td>
                {data.crmOk}/{data.crmSyncs} ok
              </td>
            </tr>
            <tr>
              <td>Failed / skipped</td>
              <td>
                {s.failed} / {s.skipped}
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </>
  );
}

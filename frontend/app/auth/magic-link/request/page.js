"use client";

import { useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

export default function RequestMagicLinkPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true); setError("");
    try {
      await api.post("/auth/magic-link", { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "We could not send the sign-in link. Please try again.");
    } finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <section className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Email me a sign-in link</h1>
        <p className="mt-2 text-sm text-slate-600">Enter your account email. We’ll send a secure link that signs you in automatically.</p>
        {!sent ? <form onSubmit={submit} className="mt-6 space-y-4">
          <input className="w-full rounded-lg border px-3 py-2" type="email" required autoFocus value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
          <button className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50" disabled={loading}>{loading ? "Sending…" : "Send sign-in link"}</button>
        </form> : <p className="mt-6 text-sm text-emerald-700">If an account exists for that email, a sign-in link is on its way. You can close this page after checking your inbox.</p>}
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <Link className="mt-6 inline-block text-sm underline" href="/login">Back to login</Link>
      </section>
    </main>
  );
}

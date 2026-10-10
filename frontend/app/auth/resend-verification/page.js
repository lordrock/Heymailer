"use client";

import { useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

export default function ResendVerificationPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const response = await api.post("/auth/resend-verification", { email });
      setMessage(response.data?.message || "If that account exists, a verification email has been sent.");
    } catch (err) {
      setError(err.response?.data?.message || "We could not send the verification email. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <section className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Verify your email</h1>
        <p className="mt-2 text-sm text-slate-600">Enter the email you used to create your HeyMailer account and we’ll send a fresh verification link.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input className="w-full rounded-lg border px-3 py-2" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
          <button className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50" disabled={loading}>{loading ? "Sending…" : "Resend verification email"}</button>
        </form>
        {message && <p className="mt-4 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <Link className="mt-6 inline-block text-sm underline" href="/login">Back to login</Link>
      </section>
    </main>
  );
}

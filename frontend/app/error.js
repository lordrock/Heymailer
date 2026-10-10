"use client";

export default function GlobalError({ reset }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <section className="max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-3 text-sm text-slate-600">HeyMailer could not load this page. Please try again.</p>
        <button onClick={() => reset()} className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-white">Try again</button>
      </section>
    </main>
  );
}

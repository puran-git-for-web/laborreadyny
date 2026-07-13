"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      setError(body?.message || "Login failed.");
      setSubmitting(false);
      return;
    }

    router.replace("/admin/requests");
    router.refresh();
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <section
        style={{
          width: "100%",
          maxWidth: 460,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.2)",
          background:
            "linear-gradient(135deg, rgba(24,26,40,0.92), rgba(16,18,30,0.82))",
          color: "#f2f5ff",
          padding: 24,
          boxShadow: "0 16px 44px rgba(0,0,0,0.45)",
        }}
      >
        <h1 style={{ marginTop: 0 }}>Admin Login</h1>
        <p style={{ opacity: 0.8, marginTop: 0 }}>
          Log in to manage contact, dispatch, onboarding, and application requests.
        </p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="password" style={{ display: "block", marginBottom: 8 }}>
            Admin password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={{
              width: "100%",
              height: 44,
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.25)",
              background: "rgba(255,255,255,0.08)",
              color: "#fff",
              padding: "0 12px",
            }}
          />
          {error ? (
            <p style={{ color: "#ff8f8f", marginBottom: 0 }} role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: 16,
              width: "100%",
              height: 44,
              borderRadius: 10,
              border: 0,
              background: "linear-gradient(120deg, #58d6ff, #8f77ff)",
              color: "#101425",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p style={{ opacity: 0.75, marginBottom: 0, marginTop: 18 }}>
          <Link href="/" style={{ color: "#9ddcff" }}>
            Return to website
          </Link>
        </p>
      </section>
    </main>
  );
}

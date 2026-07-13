"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type IntakeRecord = {
  id: number;
  form_type: string;
  source_page: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  payload: Record<string, string>;
  submitted_at: string | null;
  status: "new" | "in_review" | "resolved" | "archived";
  created_at: string;
};

const STATUS_VALUES: IntakeRecord["status"][] = [
  "new",
  "in_review",
  "resolved",
  "archived",
];

export default function AdminRequestsPage() {
  const router = useRouter();
  const [items, setItems] = useState<IntakeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    async function loadRequests() {
      const response = await fetch("/api/admin/requests", {
        method: "GET",
        cache: "no-store",
      });
      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(body?.message || "Failed to load intake requests.");
        setLoading(false);
        return;
      }
      const body = (await response.json()) as { requests: IntakeRecord[] };
      setItems(body.requests || []);
      setLoading(false);
    }

    loadRequests();
  }, [router]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  async function updateStatus(id: number, status: IntakeRecord["status"]) {
    setUpdatingId(id);
    const response = await fetch("/api/admin/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (response.ok) {
      setItems((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
    } else {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      setError(body?.message || "Failed to update request.");
    }
    setUpdatingId(null);
  }

  const grouped = useMemo(() => {
    const map = new Map<IntakeRecord["status"], IntakeRecord[]>();
    STATUS_VALUES.forEach((status) => map.set(status, []));
    items.forEach((item) => {
      const list = map.get(item.status);
      if (list) {
        list.push(item);
      }
    });
    return map;
  }, [items]);

  return (
    <main style={{ minHeight: "100vh", padding: 24, background: "#0d1222", color: "#f4f8ff" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Intake Manager</h1>
          <p style={{ margin: "8px 0 0", opacity: 0.75 }}>
            Manage all website requests in one place.
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          style={{
            height: 38,
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.08)",
            color: "#fff",
            padding: "0 14px",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </header>

      {error ? (
        <p role="alert" style={{ color: "#ff9b9b", marginTop: 0 }}>
          {error}
        </p>
      ) : null}

      {loading ? (
        <p>Loading requests...</p>
      ) : (
        STATUS_VALUES.map((status) => (
          <section key={status} style={{ marginBottom: 18 }}>
            <h2 style={{ textTransform: "capitalize" }}>
              {status.replace("_", " ")} ({grouped.get(status)?.length || 0})
            </h2>
            <div style={{ display: "grid", gap: 12 }}>
              {(grouped.get(status) || []).map((request) => (
                <article
                  key={request.id}
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "rgba(255,255,255,0.05)",
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <strong>
                      #{request.id} - {request.form_type}
                    </strong>
                    <small>{new Date(request.created_at).toLocaleString()}</small>
                  </div>
                  <p style={{ marginBottom: 6 }}>
                    <strong>Email:</strong> {request.contact_email || "N/A"} |{" "}
                    <strong>Phone:</strong> {request.contact_phone || "N/A"}
                  </p>
                  <p style={{ marginTop: 0 }}>
                    <strong>Source:</strong> {request.source_page || "N/A"}
                  </p>
                  <details>
                    <summary>View submitted fields</summary>
                    <pre
                      style={{
                        whiteSpace: "pre-wrap",
                        marginBottom: 0,
                        background: "rgba(0,0,0,0.32)",
                        borderRadius: 10,
                        padding: 10,
                        fontSize: 12,
                      }}
                    >
                      {JSON.stringify(request.payload, null, 2)}
                    </pre>
                  </details>
                  <label style={{ display: "block", marginTop: 10 }}>
                    Status{" "}
                    <select
                      value={request.status}
                      disabled={updatingId === request.id}
                      onChange={(event) =>
                        updateStatus(request.id, event.target.value as IntakeRecord["status"])
                      }
                      style={{
                        marginLeft: 8,
                        height: 32,
                        borderRadius: 8,
                        border: "1px solid rgba(255,255,255,0.24)",
                        background: "rgba(10,14,26,0.9)",
                        color: "#f4f8ff",
                        padding: "0 8px",
                      }}
                    >
                      {STATUS_VALUES.map((value) => (
                        <option key={value} value={value}>
                          {value.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </main>
  );
}

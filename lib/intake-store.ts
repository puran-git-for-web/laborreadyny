import { getDbClient } from "@/lib/db";

export type IntakeBody = {
  formType: string;
  sourcePage: string;
  submittedAt: string | null;
  email: string | null;
  phone: string | null;
  payload: Record<string, string>;
};

export type IntakeStatus = "new" | "in_review" | "resolved" | "archived";

export const INTAKE_STATUS_VALUES: IntakeStatus[] = [
  "new",
  "in_review",
  "resolved",
  "archived",
];

export async function ensureIntakeTable() {
  const sql = getDbClient();
  if (!sql) {
    return null;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS intake_requests (
      id BIGSERIAL PRIMARY KEY,
      form_type TEXT NOT NULL,
      source_page TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      payload JSONB NOT NULL,
      submitted_at TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  return sql;
}

export async function insertIntakeRequest(intake: IntakeBody) {
  const sql = await ensureIntakeTable();
  if (!sql) {
    return null;
  }

  const submittedTimestamp =
    intake.submittedAt && !Number.isNaN(Date.parse(intake.submittedAt))
      ? intake.submittedAt
      : null;

  const [created] = await sql`
    INSERT INTO intake_requests (
      form_type,
      source_page,
      contact_email,
      contact_phone,
      payload,
      submitted_at
    ) VALUES (
      ${intake.formType},
      ${intake.sourcePage},
      ${intake.email},
      ${intake.phone},
      ${JSON.stringify(intake.payload)}::jsonb,
      ${submittedTimestamp}::timestamptz
    )
    RETURNING id, form_type, status, created_at
  `;

  return created;
}

export async function listIntakeRequests(limit = 200) {
  const sql = await ensureIntakeTable();
  if (!sql) {
    return null;
  }
  return sql`
    SELECT id, form_type, source_page, contact_email, contact_phone, payload, submitted_at, status, created_at
    FROM intake_requests
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
}

export async function updateIntakeRequestStatus(id: number, status: IntakeStatus) {
  const sql = await ensureIntakeTable();
  if (!sql) {
    return null;
  }
  const [updated] = await sql`
    UPDATE intake_requests
    SET status = ${status}
    WHERE id = ${id}
    RETURNING id, form_type, source_page, contact_email, contact_phone, payload, submitted_at, status, created_at
  `;
  return updated || null;
}

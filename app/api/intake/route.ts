import { NextResponse } from "next/server";

import { getDbClient, isDatabaseEnabled } from "@/lib/db";

type IntakeBody = {
  formType: string;
  sourcePage: string;
  submittedAt: string | null;
  email: string | null;
  phone: string | null;
  payload: Record<string, string>;
};

function dbDisabledResponse() {
  return NextResponse.json(
    {
      ok: false,
      featureDisabled: true,
      message:
        "Database is not configured. Set DATABASE_URL to enable Neon-backed request intake.",
    },
    { status: 503 }
  );
}

function getAdminToken(request: Request): string {
  const headerToken = request.headers.get("x-admin-token");
  if (headerToken) {
    return headerToken;
  }
  const url = new URL(request.url);
  return url.searchParams.get("token") ?? "";
}

async function parseIntakeBody(request: Request): Promise<IntakeBody> {
  const contentType = request.headers.get("content-type") || "";
  const payload: Record<string, string> = {};

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as Record<string, unknown>;
    Object.entries(body).forEach(([key, value]) => {
      if (typeof value === "string") {
        payload[key] = value.trim();
      }
    });
  } else {
    const form = await request.formData();
    form.forEach((value, key) => {
      if (typeof value === "string") {
        payload[key] = value.trim();
      }
    });
  }

  const formType = payload.form_type || "general_request";
  const sourcePage = payload.source_page || "";
  const submittedAt = payload.submitted_at || null;
  const email = payload.email || null;
  const phone = payload.phone || payload.contact_phone || null;

  return { formType, sourcePage, submittedAt, email, phone, payload };
}

export async function GET(request: Request) {
  if (!isDatabaseEnabled()) {
    return dbDisabledResponse();
  }

  const expectedToken = process.env.INTAKE_ADMIN_TOKEN?.trim();
  const providedToken = getAdminToken(request);

  if (!expectedToken || providedToken !== expectedToken) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized. Valid admin token required." },
      { status: 401 }
    );
  }

  const sql = getDbClient();
  if (!sql) {
    return dbDisabledResponse();
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

  const result = await sql`
    SELECT id, form_type, source_page, contact_email, contact_phone, payload, submitted_at, status, created_at
    FROM intake_requests
    ORDER BY created_at DESC
    LIMIT 200
  `;

  return NextResponse.json({ ok: true, requests: result });
}

export async function POST(request: Request) {
  if (!isDatabaseEnabled()) {
    return dbDisabledResponse();
  }

  const intake = await parseIntakeBody(request);

  const sql = getDbClient();
  if (!sql) {
    return dbDisabledResponse();
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

  return NextResponse.json({ ok: true, request: created }, { status: 201 });
}

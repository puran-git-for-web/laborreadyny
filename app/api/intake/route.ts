import { NextResponse } from "next/server";

import { isAuthenticatedRequest } from "@/lib/admin-session";
import {
  insertIntakeRequest,
  IntakeBody,
  listIntakeRequests,
} from "@/lib/intake-store";
import { isDatabaseEnabled } from "@/lib/db";

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
  const cookieAuthenticated = await isAuthenticatedRequest();

  if (!cookieAuthenticated && (!expectedToken || providedToken !== expectedToken)) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized. Valid admin token required." },
      { status: 401 }
    );
  }

  const result = await listIntakeRequests();
  if (!result) {
    return dbDisabledResponse();
  }

  return NextResponse.json({ ok: true, requests: result });
}

export async function POST(request: Request) {
  if (!isDatabaseEnabled()) {
    return dbDisabledResponse();
  }

  const intake = await parseIntakeBody(request);
  const created = await insertIntakeRequest(intake);
  if (!created) {
    return dbDisabledResponse();
  }

  return NextResponse.json({ ok: true, request: created }, { status: 201 });
}

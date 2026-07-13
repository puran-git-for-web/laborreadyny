import { NextResponse } from "next/server";

import { isAuthenticatedRequest } from "@/lib/admin-session";
import {
  INTAKE_STATUS_VALUES,
  IntakeStatus,
  listIntakeRequests,
  updateIntakeRequestStatus,
} from "@/lib/intake-store";
import { isDatabaseEnabled } from "@/lib/db";

function unauthorized() {
  return NextResponse.json(
    { ok: false, message: "Unauthorized. Log in as admin first." },
    { status: 401 }
  );
}

export async function GET() {
  if (!isDatabaseEnabled()) {
    return NextResponse.json(
      {
        ok: false,
        message: "Database is not configured. Set DATABASE_URL to enable intake admin.",
      },
      { status: 503 }
    );
  }

  if (!(await isAuthenticatedRequest())) {
    return unauthorized();
  }

  const requests = await listIntakeRequests();
  if (!requests) {
    return NextResponse.json(
      { ok: false, message: "Failed to load intake requests." },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, requests });
}

export async function PATCH(request: Request) {
  if (!isDatabaseEnabled()) {
    return NextResponse.json(
      {
        ok: false,
        message: "Database is not configured. Set DATABASE_URL to enable intake admin.",
      },
      { status: 503 }
    );
  }

  if (!(await isAuthenticatedRequest())) {
    return unauthorized();
  }

  const body = (await request.json()) as { id?: number; status?: IntakeStatus };
  const id = Number(body.id);
  const status = body.status;

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { ok: false, message: "A valid request id is required." },
      { status: 400 }
    );
  }
  if (!status || !INTAKE_STATUS_VALUES.includes(status)) {
    return NextResponse.json(
      { ok: false, message: "A valid intake status is required." },
      { status: 400 }
    );
  }

  const updated = await updateIntakeRequestStatus(id, status);
  if (!updated) {
    return NextResponse.json(
      { ok: false, message: "Request not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, request: updated });
}

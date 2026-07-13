import { NextResponse } from "next/server";

import {
  createSessionValue,
  getSessionCookieName,
  getSessionMaxAgeSeconds,
  isAdminAuthConfigured,
  verifyAdminPassword,
} from "@/lib/admin-session";

export async function POST(request: Request) {
  if (!isAdminAuthConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Admin auth is not configured. Set INTAKE_ADMIN_TOKEN and ADMIN_SESSION_SECRET.",
      },
      { status: 503 }
    );
  }

  const contentType = request.headers.get("content-type") || "";
  let password = "";
  if (contentType.includes("application/json")) {
    const json = (await request.json()) as { password?: string };
    password = (json.password || "").trim();
  } else {
    const form = await request.formData();
    password = String(form.get("password") || "").trim();
  }

  if (!verifyAdminPassword(password)) {
    return NextResponse.json(
      { ok: false, message: "Invalid admin password." },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: getSessionCookieName(),
    value: createSessionValue(),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: getSessionMaxAgeSeconds(),
  });
  return response;
}

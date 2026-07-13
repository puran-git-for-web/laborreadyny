import { createHmac, timingSafeEqual } from "crypto";

import { cookies } from "next/headers";

const SESSION_COOKIE = "lrny_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET?.trim() || "";
}

function intakeToken() {
  return process.env.INTAKE_ADMIN_TOKEN?.trim() || "";
}

function hmac(input: string) {
  return createHmac("sha256", sessionSecret()).update(input).digest("hex");
}

function tokenHash() {
  return createHmac("sha256", sessionSecret()).update(intakeToken()).digest("hex");
}

export function isAdminAuthConfigured() {
  return Boolean(sessionSecret() && intakeToken());
}

export function verifyAdminPassword(password: string) {
  const expected = intakeToken();
  if (!expected || !password) {
    return false;
  }
  if (expected.length !== password.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(expected), Buffer.from(password));
}

export function createSessionValue() {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${expiresAt}:${tokenHash()}`;
  const signature = hmac(payload);
  return `${expiresAt}.${signature}`;
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export function getSessionMaxAgeSeconds() {
  return SESSION_TTL_SECONDS;
}

export async function isAuthenticatedRequest() {
  if (!isAdminAuthConfigured()) {
    return false;
  }
  const jar = await cookies();
  const session = jar.get(SESSION_COOKIE)?.value;
  if (!session) {
    return false;
  }
  const [expRaw, signature] = session.split(".");
  const exp = Number(expRaw);
  if (!expRaw || !signature || Number.isNaN(exp) || exp < Math.floor(Date.now() / 1000)) {
    return false;
  }
  const payload = `${exp}:${tokenHash()}`;
  const expected = hmac(payload);
  if (signature.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

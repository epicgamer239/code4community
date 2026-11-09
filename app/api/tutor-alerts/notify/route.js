import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { notifyAcceptingTutors } from "@/lib/tutorAlerts/notifyTutorsServer";
import {
  TUTOR_ALERT_MATHLAB,
  TUTOR_ALERT_WRITING_CENTER,
} from "@/lib/tutorAlerts/services";

export const runtime = "nodejs";

async function verifyIdToken(req) {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try {
    getAdminFirestore();
    return await getAuth().verifyIdToken(match[1]);
  } catch {
    return null;
  }
}

/**
 * POST { service, title, body, href?, tag? }
 * Authenticated students/staff trigger a fan-out to accepting tutors' web push tokens.
 */
export async function POST(req) {
  const decoded = await verifyIdToken(req);
  if (!decoded?.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const service = body?.service;
  if (service !== TUTOR_ALERT_MATHLAB && service !== TUTOR_ALERT_WRITING_CENTER) {
    return NextResponse.json({ error: "Invalid service" }, { status: 400 });
  }

  const title = String(body?.title || "").trim().slice(0, 120);
  const text = String(body?.body || "").trim().slice(0, 240);
  const href = String(body?.href || "/").trim().slice(0, 200);
  const tag = String(body?.tag || "").trim().slice(0, 80);
  if (!title || !text) {
    return NextResponse.json({ error: "Missing title/body" }, { status: 400 });
  }

  try {
    const result = await notifyAcceptingTutors({
      service,
      title,
      body: text,
      href,
      tag,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Notify failed" },
      { status: 500 },
    );
  }
}

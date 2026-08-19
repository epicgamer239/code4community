import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { normalizeEmail } from "@/lib/email";
import { resolveDisplayName } from "@/lib/profile";
import { getAdminFirestore } from "@/lib/firebase/admin";

const SESSIONS = "sessions";

const EMAIL_ALIASES = [
  "lcps email",
  "school email",
  "student email",
  "email address",
  "your email",
  "email",
];

const NAME_ALIASES = [
  "name (first & last)",
  "name",
  "full name",
  "your name",
  "student name",
  "first and last name",
];

const SUBJECT_ALIASES = [
  "describe the type of writing",
  "type of writing",
  "subject",
  "topic",
  "assignment",
  "title",
  "what do you need help with",
  "what would you like help with",
  "type of help",
  "writing assignment",
];

const NOTES_ALIASES = [
  "anything specific",
  "do you have anything specific",
  "notes",
  "note",
  "comments",
  "additional information",
  "additional notes",
  "anything else",
  "questions",
  "description",
];

const LINK_ALIASES = [
  "upload essay link",
  "essay link",
  "upload prompt",
  "prompt/directions",
  "link",
  "url",
  "google doc",
  "document",
  "document link",
  "paste a link",
  "share a link",
  "file",
  "upload",
  "your writing",
  "essay",
];

function normalizeKey(key) {
  return String(key || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function pickByAliases(fields, aliases) {
  const map = new Map();
  for (const [k, v] of Object.entries(fields || {})) {
    map.set(normalizeKey(k), v);
  }
  for (const alias of aliases) {
    const val = map.get(alias);
    if (val != null && String(val).trim()) return String(val).trim();
  }
  for (const [k, v] of map.entries()) {
    for (const alias of aliases) {
      if (k.includes(alias) && v != null && String(v).trim()) {
        return String(v).trim();
      }
    }
  }
  return "";
}

function extractUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const match = text.match(/https?:\/\/[^\s,]+/i);
  return match ? match[0] : text.startsWith("http") ? text : "";
}

function flattenResponseValue(value) {
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).join("\n");
  }
  return value == null ? "" : String(value);
}

export function mapGoogleFormFields(fields) {
  const flat = {};
  for (const [k, v] of Object.entries(fields || {})) {
    flat[k] = flattenResponseValue(v);
  }

  const linkRaw =
    pickByAliases(flat, LINK_ALIASES) ||
    Object.values(flat).map(extractUrl).find(Boolean) ||
    "";

  const docLink = extractUrl(linkRaw) || linkRaw;
  const promptRaw = pickByAliases(flat, [
    "upload prompt/directions link",
    "upload prompt",
    "prompt/directions",
    "directions link",
  ]);
  const promptLink = extractUrl(promptRaw) || promptRaw;
  let notes = pickByAliases(flat, NOTES_ALIASES);
  if (docLink && !notes.includes(docLink)) {
    notes = notes ? `${notes}\n\nEssay link: ${docLink}` : `Essay link: ${docLink}`;
  }
  if (promptLink && !notes.includes(promptLink)) {
    notes = notes ? `${notes}\n\nPrompt link: ${promptLink}` : `Prompt link: ${promptLink}`;
  }

  return {
    studentEmail: pickByAliases(flat, EMAIL_ALIASES),
    studentName: pickByAliases(flat, NAME_ALIASES),
    subject: pickByAliases(flat, SUBJECT_ALIASES) || "Async writing help",
    notes,
  };
}

async function findUserByEmail(db, email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const snap = await db.collection("users").where("email", "==", normalized).limit(1).get();
  if (!snap.empty) {
    const doc = snap.docs[0];
    return { uid: doc.id, data: doc.data() };
  }

  const alt = await db.collection("users").where("email", "==", email.trim()).limit(1).get();
  if (!alt.empty) {
    const doc = alt.docs[0];
    return { uid: doc.id, data: doc.data() };
  }

  return null;
}

async function sessionExistsForResponse(db, responseId) {
  const snap = await db
    .collection(SESSIONS)
    .where("googleFormResponseId", "==", responseId)
    .limit(1)
    .get();
  return !snap.empty;
}

/**
 * @param {{ responseId: string, submittedAt?: string, fields: Record<string, string> }} payload
 */
export async function createSessionFromGoogleForm(payload) {
  const googleFormResponseUrl = String(payload.googleFormResponseUrl || "").trim();
  const googleFormId = String(payload.googleFormId || "").trim();
  const googleFormApiResponseId = String(payload.googleFormApiResponseId || "").trim();
  const db = getAdminFirestore();
  if (!db) {
    return { ok: false, status: 503, error: "Server database is not configured." };
  }

  const responseId = String(payload.responseId || "").trim();
  if (!responseId) {
    return { ok: false, status: 400, error: "Missing responseId." };
  }

  if (await sessionExistsForResponse(db, responseId)) {
    return { ok: true, status: 200, duplicate: true };
  }

  const mapped = mapGoogleFormFields(payload.fields);
  if (!mapped.studentEmail) {
    return {
      ok: false,
      status: 400,
      error: "Could not find an email field in the form response.",
    };
  }

  const user = await findUserByEmail(db, mapped.studentEmail);
  if (!user) {
    return {
      ok: false,
      status: 400,
      error:
        "No Code4Community account for that email. Students must sign up and log in before submitting the form.",
    };
  }

  const profile = user.data;
  const studentName =
    mapped.studentName ||
    resolveDisplayName(profile, mapped.studentEmail.split("@")[0]);

  const createdAt = payload.submittedAt ? new Date(payload.submittedAt) : new Date();
  const safeCreatedAt = Number.isNaN(createdAt.getTime()) ? new Date() : createdAt;

  const doc = {
    studentId: user.uid,
    studentName,
    studentEmail: normalizeEmail(mapped.studentEmail) || mapped.studentEmail,
    subject: mapped.subject.slice(0, 200),
    notes: mapped.notes.slice(0, 2000),
    sessionType: "ASYNC",
    status: "PENDING",
    source: "google_form",
    googleFormResponseId: responseId,
    createdAt: Timestamp.fromDate(safeCreatedAt),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (googleFormId) {
    doc.googleFormId = googleFormId.slice(0, 80);
  }
  if (googleFormApiResponseId) {
    doc.googleFormApiResponseId = googleFormApiResponseId.slice(0, 200);
  }
  if (googleFormResponseUrl && googleFormResponseUrl.includes("#response=")) {
    doc.googleFormResponseUrl = googleFormResponseUrl.slice(0, 500);
  }

  const ref = await db.collection(SESSIONS).add(doc);

  return { ok: true, status: 201, sessionId: ref.id };
}

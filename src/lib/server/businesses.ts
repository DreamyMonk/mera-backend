import "server-only";
import { db, FieldValue } from "./firebase";
import { HttpError } from "./http";
import type { Business, ChatSummary, Note } from "../shared/types";

const millis = (v: unknown) => (v as { toMillis?: () => number })?.toMillis?.() ?? 0;

export const businessesRef = (uid: string) => db().collection("users").doc(uid).collection("businesses");
export const chatsRef = (uid: string) => db().collection("users").doc(uid).collection("chats");

export async function listBusinesses(uid: string): Promise<Business[]> {
  const snap = await businessesRef(uid).orderBy("createdAt").get();
  return snap.docs.map((d) => ({ id: d.id, name: d.data().name, about: d.data().about || "", createdAt: millis(d.data().createdAt), updatedAt: millis(d.data().updatedAt) }));
}

export async function ensureBusiness(uid: string) {
  const existing = await businessesRef(uid).limit(1).get();
  if (existing.empty) {
    await businessesRef(uid).add({ name: "My business", about: "", createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  }
}

export async function requireBusiness(uid: string, id: string) {
  const ref = businessesRef(uid).doc(id);
  if (!(await ref.get()).exists) throw new HttpError(404, "not_found_error", "Business not found.");
  return ref;
}

export async function listNotes(uid: string, businessId: string): Promise<Note[]> {
  const snap = await businessesRef(uid).doc(businessId).collection("notes").orderBy("createdAt").get();
  return snap.docs.map((d) => {
    const n = d.data();
    return { id: d.id, text: n.text, category: n.category, due: n.due || "", date: n.date };
  });
}

export function toChatSummary(id: string, data: FirebaseFirestore.DocumentData): ChatSummary {
  const transcript = (data.transcript || []) as { kind: string; text: string }[];
  const lastReply = [...transcript].reverse().find((t) => t.kind === "assistant");
  return {
    id,
    businessId: data.businessId || "",
    title: data.title || "Untitled chat",
    createdAt: data.createdAt || 0,
    updatedAt: data.updatedAt || 0,
    itemCount: transcript.length,
    preview: lastReply?.text.slice(0, 160) || "",
  };
}

// Deletes a query's documents in batches (Firestore has no cascading delete).
export async function deleteAll(query: FirebaseFirestore.Query) {
  for (;;) {
    const snap = await query.limit(300).get();
    if (snap.empty) return;
    const batch = db().batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

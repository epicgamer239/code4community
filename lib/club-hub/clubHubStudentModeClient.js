import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { firestore } from "@/firebase";
import { assertClientRateLimit } from "@/utils/clientRateLimit";

/**
 * @param {string} userId
 * @param {boolean} enabled
 */
export async function setClubHubStudentMode(userId, enabled) {
  if (!firestore || !userId) throw new Error("Could not update setting.");
  assertClientRateLimit("profileWrite", userId);
  await updateDoc(doc(firestore, "users", userId), {
    clubHubStudentMode: Boolean(enabled),
    updatedAt: serverTimestamp(),
  });
}

import { runWithClubHubSchool } from "@/lib/club-hub/activeSchool";
import { getClubHubConfigBySchoolId } from "@/lib/club-hub/schoolConfig";

/**
 * @param {Request} request
 * @param {{ schoolId?: unknown } | null | undefined} [body]
 */
export function clubHubSchoolFromRequest(request, body) {
  const fromBody =
    body && typeof body.schoolId === "string" ? body.schoolId.trim() : "";
  const fromQuery =
    typeof request?.nextUrl?.searchParams?.get === "function"
      ? request.nextUrl.searchParams.get("schoolId")?.trim() || ""
      : "";
  return getClubHubConfigBySchoolId(fromBody || fromQuery || "broad-run");
}

/**
 * @template T
 * @param {Request} request
 * @param {{ schoolId?: unknown } | null | undefined} body
 * @param {() => T | Promise<T>} fn
 * @returns {T | Promise<T>}
 */
export function runWithClubHubSchoolFromRequest(request, body, fn) {
  return runWithClubHubSchool(clubHubSchoolFromRequest(request, body), fn);
}

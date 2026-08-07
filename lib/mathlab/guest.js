/** Redirect unauthenticated users to login with return path. */
export function mathlabLoginPath(redirectTo = "/mathlab") {
  return `/login?redirectTo=${encodeURIComponent(redirectTo)}`;
}

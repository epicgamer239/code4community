/**
 * @param {{ message: string, variant?: "status" | "alert" }} props
 */
export default function ClubHubLiveMessage({ message, variant = "status" }) {
  if (!message) return null;
  const isAlert = variant === "alert";
  return (
    <p
      role={isAlert ? "alert" : "status"}
      aria-live={isAlert ? "assertive" : "polite"}
      className={
        isAlert
          ? "mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
          : "mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900"
      }
    >
      {message}
    </p>
  );
}

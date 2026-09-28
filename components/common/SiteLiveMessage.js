/**
 * @param {{ message: string, variant?: "status" | "alert" }} props
 */
export default function SiteLiveMessage({ message, variant = "status" }) {
  if (!message) return null;
  const isAlert = variant === "alert";
  return (
    <p
      role={isAlert ? "alert" : "status"}
      aria-live={isAlert ? "assertive" : "polite"}
      className={isAlert ? "text-sm text-destructive" : "text-sm text-foreground"}
    >
      {message}
    </p>
  );
}

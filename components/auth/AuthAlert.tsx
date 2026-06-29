interface AuthAlertProps {
  type: "error" | "success";
  message: string;
}

export default function AuthAlert({ type, message }: AuthAlertProps) {
  const styles =
    type === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <div
      role="alert"
      className={`mb-5 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${styles}`}
    >
      {message}
    </div>
  );
}

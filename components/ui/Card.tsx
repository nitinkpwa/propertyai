import { buyerTokens } from "@/lib/buyer/design";
import { ui } from "@/lib/design/tokens";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  press?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const PADDING = {
  none: "",
  sm: "p-4",
  md: "p-4 sm:p-5 lg:p-6",
  lg: "p-5 sm:p-6 lg:p-8",
};

export default function Card({
  children,
  className = "",
  hover = false,
  press = true,
  padding = "md",
}: CardProps) {
  return (
    <div
      className={`${ui.card} ${PADDING[padding]} ${hover ? buyerTokens.cardHover : ""} ${
        press ? ui.cardPress : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold text-heading-primary lg:text-lg">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

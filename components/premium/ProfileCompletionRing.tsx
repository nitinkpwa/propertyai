"use client";

interface ProfileCompletionRingProps {
  percent: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const SIZES = {
  sm: { dim: 36, stroke: 3, text: "text-[10px]" },
  md: { dim: 48, stroke: 4, text: "text-xs" },
  lg: { dim: 72, stroke: 5, text: "text-sm" },
};

export default function ProfileCompletionRing({
  percent,
  size = "md",
  showLabel = true,
  className = "",
}: ProfileCompletionRingProps) {
  const { dim, stroke, text } = SIZES[size];
  const radius = (dim - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} className="-rotate-90">
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={stroke}
          />
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            stroke="#059669"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <span
          className={`absolute inset-0 flex items-center justify-center font-bold text-emerald-700 ${text}`}
        >
          {percent}%
        </span>
      </div>
      {showLabel ? (
        <span className="text-[11px] font-medium text-neutral-500">Profile</span>
      ) : null}
    </div>
  );
}

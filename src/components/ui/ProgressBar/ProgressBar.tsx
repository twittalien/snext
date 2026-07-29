import { classNames } from "../../../utils/classNames";
import "./ProgressBar.css";

type ProgressBarProps = {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  size?: "small" | "medium";
  tone?: "brand" | "success" | "warning" | "danger";
  className?: string;
};

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = false,
  size = "medium",
  tone = "brand",
  className,
}: ProgressBarProps) {
  const safeMax = max > 0 ? max : 100;
  const percentage = Math.min(
    100,
    Math.max(0, (value / safeMax) * 100),
  );

  return (
    <div
      className={classNames(
        "snext-progress",
        `snext-progress--${size}`,
        `snext-progress--${tone}`,
        className,
      )}
    >
      {(label || showValue) && (
        <div className="snext-progress__meta">
          {label && <span>{label}</span>}
          {showValue && <strong>{Math.round(percentage)}%</strong>}
        </div>
      )}

      <div
        className="snext-progress__track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={Math.min(safeMax, Math.max(0, value))}
      >
        <span style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
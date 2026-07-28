import { type ReactNode } from "react";
import { classNames } from "../../../utils/classNames";
import "./EmptyState.css";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={classNames(
        "snext-empty-state",
        {
          "snext-empty-state--compact": compact,
        },
        className,
      )}
    >
      {icon && (
        <div className="snext-empty-state__icon" aria-hidden="true">
          {icon}
        </div>
      )}

      <div className="snext-empty-state__copy">
        <h3>{title}</h3>

        {description && <p>{description}</p>}
      </div>

      {action && (
        <div className="snext-empty-state__action">{action}</div>
      )}
    </div>
  );
}
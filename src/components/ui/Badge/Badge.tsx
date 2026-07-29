import { type HTMLAttributes, type ReactNode } from "react";
import { classNames } from "../../../utils/classNames";
import "./Badge.css";

type BadgeTone =
  | "neutral"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "info";

type BadgeProps = {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
} & HTMLAttributes<HTMLSpanElement>;

export function Badge({
  tone = "neutral",
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={classNames(
        "snext-badge",
        `snext-badge--${tone}`,
        className,
      )}
      {...props}
    >
      {dot && <i aria-hidden="true" />}
      {children}
    </span>
  );
}
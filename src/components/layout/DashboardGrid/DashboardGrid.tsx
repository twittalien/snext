import { type HTMLAttributes, type ReactNode } from "react";
import { classNames } from "../../../utils/classNames";
import "./DashboardGrid.css";

type DashboardGridProps = {
  children: ReactNode;
} & HTMLAttributes<HTMLDivElement>;

export function DashboardGrid({
  children,
  className,
  ...props
}: DashboardGridProps) {
  return (
    <div
      className={classNames("snext-dashboard-grid", className)}
      {...props}
    >
      {children}
    </div>
  );
}

type DashboardCellProps = {
  children: ReactNode;
  span?: 3 | 4 | 5 | 6 | 7 | 8 | 9 | 12;
  portraitSpan?: 1 | 2;
} & HTMLAttributes<HTMLDivElement>;

export function DashboardCell({
  children,
  span = 4,
  portraitSpan = 1,
  className,
  ...props
}: DashboardCellProps) {
  return (
    <div
      className={classNames(
        "snext-dashboard-cell",
        `snext-dashboard-cell--span-${span}`,
        `snext-dashboard-cell--portrait-${portraitSpan}`,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
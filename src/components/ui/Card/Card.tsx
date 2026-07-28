import {
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from "react";
import { classNames } from "../../../utils/classNames";
import "./Card.css";

type CardTone = "default" | "dark" | "transparent";
type CardPadding = "none" | "compact" | "normal" | "spacious";

type CardProps<T extends ElementType = "article"> = {
  as?: T;
  tone?: CardTone;
  padding?: CardPadding;
  interactive?: boolean;
  overflow?: "hidden" | "visible";
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children">;

export function Card<T extends ElementType = "article">({
  as,
  tone = "default",
  padding = "normal",
  interactive = false,
  overflow = "hidden",
  className,
  children,
  ...props
}: CardProps<T>) {
  const Component = as ?? "article";

  return (
    <Component
      className={classNames(
        "snext-card",
        `snext-card--${tone}`,
        `snext-card--padding-${padding}`,
        `snext-card--overflow-${overflow}`,
        {
          "snext-card--interactive": interactive,
        },
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
import { classNames } from "../../../utils/classNames";
import "./AvatarGroup.css";

export type PresenceStatus =
  | "online"
  | "idle"
  | "dnd"
  | "offline";

export type AvatarItem = {
  id: string;
  name: string;
  image?: string;
  initials?: string;
  status?: PresenceStatus;
};

type AvatarGroupProps = {
  items: AvatarItem[];
  max?: number;
  size?: "small" | "medium" | "large";
  showPresence?: boolean;
  className?: string;
};

export function AvatarGroup({
  items,
  max = 4,
  size = "medium",
  showPresence = true,
  className,
}: AvatarGroupProps) {
  const safeMax = Math.max(1, max);
  const visibleItems = items.slice(0, safeMax);
  const hiddenCount = Math.max(0, items.length - visibleItems.length);

  return (
    <div
      className={classNames(
        "snext-avatar-group",
        `snext-avatar-group--${size}`,
        className,
      )}
      aria-label={`${items.length} personas`}
    >
      {visibleItems.map((item) => (
        <span
          className="snext-avatar-group__item"
          title={item.name}
          key={item.id}
        >
          {item.image ? (
            <img src={item.image} alt="" loading="lazy" />
          ) : (
            <span aria-hidden="true">
              {item.initials ??
                item.name
                  .trim()
                  .slice(0, 2)
                  .toUpperCase()}
            </span>
          )}

          {showPresence && item.status && (
            <i
              className={`snext-avatar-group__presence snext-avatar-group__presence--${item.status}`}
              aria-label={item.status}
            />
          )}

          <span className="sr-only">{item.name}</span>
        </span>
      ))}

      {hiddenCount > 0 && (
        <span
          className="snext-avatar-group__more"
          aria-label={`${hiddenCount} personas adicionales`}
        >
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}
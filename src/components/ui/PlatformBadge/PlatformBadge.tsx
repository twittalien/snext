import type { CSSProperties } from "react";
import { getPlatformInfo } from "../../../services/platformCatalog";
import "./PlatformBadge.css";

type PlatformBadgeProps = {
  platform: string;
  label?: string;
  compact?: boolean;
};

export function PlatformBadge({
  platform,
  label,
  compact = false,
}: PlatformBadgeProps) {
  const info = getPlatformInfo(platform);

  return (
    <span
      className={[
        "snext-platform-badge",
        info.assetUrl ? "snext-platform-badge--asset" : "",
        compact ? "snext-platform-badge--compact" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        "--platform-color": info.color,
        "--platform-bg": info.background,
      } as CSSProperties}
      title={info.name}
    >
      <span className="snext-platform-badge__icon" aria-hidden="true">
        {info.assetUrl ? (
          <img src={info.assetUrl} alt="" loading="lazy" />
        ) : (
          info.glyph
        )}
      </span>

      {!compact && (
        <span className="snext-platform-badge__label">
          {label ?? info.name}
        </span>
      )}
    </span>
  );
}

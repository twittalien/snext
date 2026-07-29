import {
  type MouseEvent,
  type ReactNode,
  useEffect,
  useId,
} from "react";
import { createPortal } from "react-dom";
import { classNames } from "../../../utils/classNames";
import "./Modal.css";

type ModalSize = "small" | "medium" | "large";

type ModalProps = {
  open: boolean;
  title: string;
  eyebrow?: string;
  size?: ModalSize;
  closeLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  onClose: () => void;
};

export function Modal({
  open,
  title,
  eyebrow,
  size = "medium",
  closeLabel = "Cerrar",
  children,
  footer,
  className,
  onClose,
}: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", closeWithEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const stopPropagation = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  return createPortal(
    <div
      className="snext-modal-layer"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className={classNames(
          "snext-modal",
          `snext-modal--${size}`,
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={stopPropagation}
      >
        <header className="snext-modal__header">
          <div>
            {eyebrow && (
              <p className="snext-eyebrow">{eyebrow}</p>
            )}

            <h2 id={titleId}>{title}</h2>
          </div>

          <button
            className="snext-modal__close"
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="snext-modal__content">{children}</div>

        {footer && (
          <footer className="snext-modal__footer">{footer}</footer>
        )}
      </section>
    </div>,
    document.body,
  );
}
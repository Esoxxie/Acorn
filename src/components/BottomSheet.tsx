import { useEffect, type PropsWithChildren } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type BottomSheetProps = PropsWithChildren<{
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
}>;

export function BottomSheet({ children, open, onClose, subtitle, title }: BottomSheetProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="sheet__header">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p className="sheet__subtitle">{subtitle}</p> : null}
          </div>
          <button aria-label="Close" className="icon-button" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>
        <div className="sheet__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

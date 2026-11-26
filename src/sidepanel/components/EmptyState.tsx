interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  shortcut?: string[];
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  shortcut,
}: EmptyStateProps) {
  return (
    <div className="px-5 py-12 flex flex-col items-start gap-5">
      <img src="/icons/icon.svg" alt="" width={40} height={40} className="h-10 w-10 shrink-0" />

      <div className="space-y-1.5 max-w-[320px]">
        <h2 className="text-[17px] font-medium leading-6 text-[var(--ll-text)]">{title}</h2>
        <p className="text-[14px] leading-6 text-[var(--ll-text-secondary)]">{description}</p>
      </div>

      <div className="flex items-center gap-3">
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="ll-btn ll-btn-primary !h-10 !px-4 !text-[14px]"
          >
            {actionLabel}
          </button>
        )}
        {shortcut && shortcut.length > 0 && (
          <div className="inline-flex items-center gap-1" aria-label={`Shortcut ${shortcut.join(' ')}`}>
            {shortcut.map((key) => (
              <kbd key={key} className="ll-kbd">
                {key}
              </kbd>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

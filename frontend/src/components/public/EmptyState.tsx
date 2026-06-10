interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <svg
        aria-hidden="true"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="oklch(0.55 0.006 140)"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mb-6 opacity-50"
      >
        <path d="M6 9l6 6 6-6" />
        <circle cx="12" cy="5" r="2" />
        <path d="M5 20h14" />
      </svg>
      <h2 className="font-display font-bold text-xl text-ink mb-2">{title}</h2>
      {description && (
        <p className="text-ash text-sm leading-relaxed max-w-[40ch]">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

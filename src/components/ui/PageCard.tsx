interface PageCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  headerRight?: React.ReactNode;
}

export function PageCard({
  title,
  children,
  className = "",
  headerRight,
}: PageCardProps) {
  return (
    <section
      className={`rounded-xl border ${className}`}
      style={{
        backgroundColor: "var(--theme-bg-card)",
        borderColor: "var(--theme-border)",
      }}
    >
      {(title || headerRight) && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3"
          style={{ borderColor: "var(--theme-border)" }}
        >
          {title && <h2 className="text-[13px] font-semibold tracking-tight">{title}</h2>}
          {headerRight}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

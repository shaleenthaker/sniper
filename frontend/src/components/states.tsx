export function LoadingRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y hairline border-y hairline">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="grid grid-cols-[1fr_1fr_80px] gap-4 px-3 py-3">
          <div className="h-3 skeleton" />
          <div className="h-3 skeleton" />
          <div className="h-3 skeleton" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <div className="flex min-h-[260px] items-center justify-center text-[12px] text-[var(--ink-soft)]">{text}</div>;
}

export function ErrorState({ error }: { error: Error }) {
  return <div className="border hairline border-[var(--offered)] p-3 text-[12px] text-[var(--offered)]">{error.message}</div>;
}

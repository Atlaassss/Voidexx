import { cn } from "@/lib/utils";

export function Panel({
  title,
  meta,
  className,
  children,
  bracketed = true,
}: {
  title: string;
  meta?: string;
  className?: string;
  children: React.ReactNode;
  bracketed?: boolean;
}) {
  return (
    <section className={cn("cell relative", bracketed && "brackets", className)}>
      {bracketed && (
        <>
          <span className="b1" />
          <span className="b2" />
        </>
      )}
      <div className="cell-header">
        <span className="text-void-800">{title}</span>
        {meta && <span className="text-void-600">{meta}</span>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

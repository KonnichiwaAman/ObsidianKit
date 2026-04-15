import { Construction } from "lucide-react";
import React from "react";

interface ComingSoonToolProps {
  title: string;
  description: string;
  icon: React.ElementType;
  reason: string;
}

export function ComingSoonTool({ title, description, icon: Icon, reason }: ComingSoonToolProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center mb-8">
        <p className="text-sm text-[var(--color-text-muted)]">{description}</p>
      </div>

      <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-12 text-center animate-in fade-in zoom-in-95 duration-300">
         <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-bg-input)]">
            <Construction className="h-8 w-8 text-[var(--color-text-secondary)]" />
         </div>
         <h2 className="mb-2 text-xl font-bold text-[var(--color-text-primary)]">Feature Coming Soon</h2>
         <p className="mb-6 text-sm text-[var(--color-text-muted)] max-w-md mx-auto leading-relaxed">
            {reason}
         </p>
         
         <div className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-6 py-3 text-sm font-medium text-[var(--color-text-secondary)] opacity-70 cursor-not-allowed">
            <Icon className="h-4 w-4" />
            {title}
         </div>
      </div>
    </div>
  );
}

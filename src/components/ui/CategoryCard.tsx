import { useNavigate } from "react-router-dom";
import type { Category } from "@/types";

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  const navigate = useNavigate();
  const Icon = category.icon;

  return (
    <button
      id={`category-${category.id}`}
      onClick={() => navigate(category.path)}
      className="group flex flex-col items-center gap-4 rounded-2xl border
                 border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6
                 text-center transition-all duration-200
                 hover:border-[var(--color-border-hover)] hover:bg-[var(--color-bg-card-hover)]
                 cursor-pointer"
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl
                    border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)]
                    text-[var(--color-text-secondary)] transition-colors duration-200
                    group-hover:text-[var(--color-text-primary)]"
      >
        <Icon className="h-5 w-5" />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
          {category.name}
        </h3>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          {category.toolCount} tools
        </p>
      </div>
    </button>
  );
}

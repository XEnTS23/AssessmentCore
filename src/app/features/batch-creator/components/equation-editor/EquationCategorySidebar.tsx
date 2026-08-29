import React from "react";
import { EquationCategory } from "./types/equation-editor.types";
import { cn } from "../../../../components/ui/utils";

interface CategoryOption {
  id: EquationCategory;
  label: string;
  icon: React.ReactNode;
}

const CATEGORIES: CategoryOption[] = [];

interface Props {
  activeCategory: EquationCategory;
  onSelectCategory: (category: EquationCategory) => void;
}

export function EquationCategorySidebar({ activeCategory, onSelectCategory }: Props) {
  return (
    <div className="w-[160px] md:w-[188px] border-r border-border bg-card flex flex-col py-4 overflow-y-auto">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelectCategory(cat.id)}
          className={cn(
            "flex items-center gap-3 px-4 py-2.5 mx-2 rounded-md text-sm font-medium transition-colors mb-1",
            activeCategory === cat.id
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-[var(--foreground)]"
          )}
        >
          {cat.icon}
          {cat.label}
        </button>
      ))}
    </div>
  );
}

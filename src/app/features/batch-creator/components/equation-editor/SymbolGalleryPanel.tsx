import React, { useState, useMemo, useRef, useEffect } from "react";
import { SymbolCategory, SymbolEntry } from "./types/equation-editor.types";
import { SYMBOL_DATA, SYMBOL_CATEGORY_LABELS } from "./data/symbols-full";
import { cn } from "../../../../components/ui/utils";
import { Search, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import katex from "katex";

interface Props {
  onInsertSymbol: (latex: string) => void;
  activeCategory: SymbolCategory;
  onChangeCategory: (category: SymbolCategory) => void;
}

const CATEGORIES: SymbolCategory[] = [
  "basic-math",
  "greek",
  "relations",
  "operators",
  "arrows",
  "sets-logic",
  "calculus",
  "geometry",
  "letter-like",
  "miscellaneous",
];

export function SymbolGalleryPanel({ onInsertSymbol, activeCategory, onChangeCategory }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSymbols, setRecentSymbols] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(Math.ceil(scrollLeft) + clientWidth < scrollWidth);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, []);

  const scrollBy = (offset: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
      setTimeout(checkScroll, 350);
    }
  };

  const filteredSymbols = useMemo(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return SYMBOL_DATA.filter(
        (s) =>
          s.label.toLowerCase().includes(q) ||
          s.latex.toLowerCase().includes(q) ||
          s.keywords.some((k) => k.toLowerCase().includes(q))
      );
    }
    return SYMBOL_DATA.filter((s) => s.category === activeCategory);
  }, [searchQuery, activeCategory]);

  const handleInsert = (symbol: SymbolEntry) => {
    onInsertSymbol(symbol.latex);
    setRecentSymbols((prev) => {
      const filtered = prev.filter((id) => id !== symbol.id);
      return [symbol.id, ...filtered].slice(0, 12);
    });
  };

  const recentEntries = useMemo(
    () => recentSymbols.map((id) => SYMBOL_DATA.find((s) => s.id === id)).filter(Boolean) as SymbolEntry[],
    [recentSymbols]
  );

  return (
    <div className="w-[260px] shrink-0 flex flex-col border-l border-border bg-card overflow-hidden">
      {/* Search */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search symbols..."
            className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded-md bg-card focus:outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Category tabs (scrollable horizontally) */}
      {!searchQuery && (
        <div className="relative flex items-center px-3 pb-2 shrink-0 group">
          {canScrollLeft && (
            <button
              onClick={() => scrollBy(-120)}
              className="absolute left-3 z-10 p-0.5 rounded-full bg-background shadow-[0_0_5px_rgba(0,0,0,0.2)] border border-border text-foreground hover:bg-muted transition-opacity"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
          <div 
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex gap-1 overflow-x-auto scrollbar-hide shrink-0 scroll-smooth w-full mask-edges"
            style={{ maskImage: "linear-gradient(to right, transparent, black 10px, black calc(100% - 10px), transparent)" }}
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => onChangeCategory(cat)}
                className={cn(
                  "px-2 py-1 text-[10px] font-medium rounded-md whitespace-nowrap transition-colors",
                  activeCategory === cat
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {SYMBOL_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
          {canScrollRight && (
            <button
              onClick={() => scrollBy(120)}
              className="absolute right-3 z-10 p-0.5 rounded-full bg-background shadow-[0_0_5px_rgba(0,0,0,0.2)] border border-border text-foreground hover:bg-muted transition-opacity"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Recent symbols */}
      {!searchQuery && recentEntries.length > 0 && (
        <div className="px-3 pb-2 shrink-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground">Recent</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {recentEntries.map((symbol) => (
              <SymbolButton key={`recent-${symbol.id}`} symbol={symbol} onClick={() => handleInsert(symbol)} />
            ))}
          </div>
        </div>
      )}

      {/* Symbol grid */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {searchQuery && (
          <div className="text-[10px] text-muted-foreground mb-2">
            {filteredSymbols.length} result{filteredSymbols.length !== 1 ? "s" : ""}
          </div>
        )}
        <div className="flex flex-wrap gap-1">
          {filteredSymbols.map((symbol) => (
            <SymbolButton key={symbol.id} symbol={symbol} onClick={() => handleInsert(symbol)} />
          ))}
          {filteredSymbols.length === 0 && (
            <div className="w-full text-center py-6 text-xs text-muted-foreground">
              No symbols found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SymbolButton({ symbol, onClick }: { symbol: SymbolEntry; onClick: () => void }) {
  let html = "";
  try {
    html = katex.renderToString(symbol.latex, { throwOnError: false, displayMode: false });
  } catch {
    html = symbol.label;
  }

  return (
    <button
      onClick={onClick}
      title={`${symbol.label} — ${symbol.latex}`}
      className="w-[34px] h-[34px] flex items-center justify-center border border-border rounded bg-card hover:bg-muted hover:border-primary/30 transition-all text-foreground"
    >
      <span
        className="text-sm [&_.katex]:text-[14px]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </button>
  );
}

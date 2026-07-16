import { halalCategories, type HalalCategory } from "@/services/youtube";
import { cn } from "@/lib/utils";

interface HalalCategoryFilterProps {
  selected: HalalCategory;
  onSelect: (cat: HalalCategory) => void;
}

const HalalCategoryFilter = ({ selected, onSelect }: HalalCategoryFilterProps) => {
  return (
    <div className="border-b border-border bg-card/80 backdrop-blur-xl">
      <div className="mx-auto max-w-[1800px] px-4 md:px-6">
        <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
          {halalCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => onSelect(cat)}
              className={cn(
                "shrink-0 rounded-card px-4 py-1.5 text-sm font-medium transition-all",
                selected === cat
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-secondary-foreground hover:bg-muted"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HalalCategoryFilter;

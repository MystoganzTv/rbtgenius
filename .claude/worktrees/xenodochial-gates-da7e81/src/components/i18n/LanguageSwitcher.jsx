import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";

const options = [
  { id: "en", label: "EN" },
  { id: "es", label: "ES" },
];

export default function LanguageSwitcher({ compact = false }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white/80 p-1 dark:border-slate-700 dark:bg-slate-950/80">
      {!compact ? (
        <div className="flex items-center gap-1 px-2 text-slate-500 dark:text-slate-400">
          <Languages className="h-4 w-4" />
        </div>
      ) : null}
      {options.map((option) => (
        <Button
          key={option.id}
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 rounded-lg px-2.5 text-[11px] font-semibold",
            language === option.id
              ? "bg-[#1E5EFF] text-white hover:bg-[#1E5EFF]/90"
              : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
          )}
          onClick={() => setLanguage(option.id)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

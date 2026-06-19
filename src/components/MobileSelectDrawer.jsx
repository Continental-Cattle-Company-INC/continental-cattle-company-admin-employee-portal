import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MobileSelectDrawer({ value, onValueChange, options, placeholder, label, className }) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(opt => opt.value === value)?.label || placeholder;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center justify-between gap-2 bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground",
            className
          )}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[70vh]">
        <SheetHeader>
          <SheetTitle>{label || placeholder}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-1 overflow-y-auto max-h-[50vh]">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => {
                onValueChange(opt.value);
                setOpen(false);
              }}
              className={cn(
                "w-full text-left px-4 py-3 rounded-lg text-sm transition-colors",
                value === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-secondary text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
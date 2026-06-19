"use client";
import React, { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * MobileSelect - A mobile-friendly select component using Bottom Sheet
 * On mobile: Opens as a bottom sheet with large touch targets
 * On desktop: Renders as a standard select
 */
export function MobileSelect({ value, onValueChange, options, placeholder, label, className }) {
  const [open, setOpen] = React.useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label || placeholder;

  return (
    <>
      {/* Desktop: Standard Select */}
      <select
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn("w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground hidden md:block", className)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Mobile: Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground md:hidden text-left", className)}
      >
        {selectedLabel || placeholder}
      </button>

      {/* Mobile: Bottom Sheet Modal */}
      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 md:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-card border-t border-border rounded-t-2xl md:hidden max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              {label && <h3 className="font-medium text-foreground">{label}</h3>}
              <button
                onClick={() => setOpen(false)}
                className="p-2 -mr-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Options */}
            <div className="overflow-y-auto flex-1 p-2">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onValueChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors mb-1",
                    value === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-secondary"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {/* Safe area padding for iOS */}
            <div className="h-[env(safe-area-inset-bottom,0px)]" />
          </div>
        </>
      )}
    </>
  );
}
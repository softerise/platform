import * as React from "react";
import { cn } from "@project/ui";

interface StatusTab {
  label: string;
  value: string;
  count?: number;
}

interface InviteStatusTabsProps {
  tabs: StatusTab[];
  activeTab: string;
  onTabChange: (value: string) => void;
}

export function InviteStatusTabs({
  tabs,
  activeTab,
  onTabChange,
}: InviteStatusTabsProps) {
  return (
    <div className="border-b">
      <nav className="flex gap-4" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={cn(
              "py-2 px-1 border-b-2 text-sm font-medium transition-colors",
              activeTab === tab.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted",
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "ml-2 rounded-full px-2 py-0.5 text-xs",
                  activeTab === tab.value
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}


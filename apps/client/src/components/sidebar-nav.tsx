import { NavLink, useLocation } from "react-router-dom";
import { useCan } from "@refinedev/core";
import { Users, Mail } from "lucide-react";
import { cn } from "@project/ui";

const navItems = [
  {
    label: "Team Members",
    href: "/company/members",
    icon: Users,
    resource: "members",
    action: "list",
  },
  {
    label: "Invitations",
    href: "/company/invites",
    icon: Mail,
    resource: "invites",
    action: "list",
  },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();

  return (
    <nav className="flex-1 px-2 space-y-1">
      {navItems.map((item) => {
        const { data: canAccess } = useCan({
          resource: item.resource,
          action: item.action,
        });
        if (canAccess?.can === false) return null;
        const Icon = item.icon;
        const isActive = location.pathname.startsWith(item.href);
        return (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}


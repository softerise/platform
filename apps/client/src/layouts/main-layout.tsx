import * as React from "react";
import { Outlet } from "react-router-dom";
import { useGetIdentity } from "@refinedev/core";
import { Menu } from "lucide-react";
import { SidebarNav } from "../components/sidebar-nav";
import { UserMenu } from "../components/user-menu";
import { Button, Sheet, SheetContent } from "@project/ui";

export function MainLayout() {
  const { data: user } = useGetIdentity<{
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
    companyName?: string;
  }>();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
          <div className="flex flex-col flex-grow border-r bg-card pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4 mb-6">
              <div>
                <span className="text-xl font-bold">Company Portal</span>
                {user?.companyName && (
                  <p className="text-sm text-muted-foreground">
                    {user.companyName}
                  </p>
                )}
              </div>
            </div>
            <SidebarNav />
          </div>
        </aside>

        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex flex-col flex-grow pt-5 pb-4">
              <div className="px-4 mb-6">
                <span className="text-xl font-bold">Company Portal</span>
              </div>
              <SidebarNav onNavigate={() => setSidebarOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex flex-col flex-1 lg:pl-64">
          <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex-1" />
            {user && <UserMenu user={user} />}
          </header>
          <main className="flex-1 p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}


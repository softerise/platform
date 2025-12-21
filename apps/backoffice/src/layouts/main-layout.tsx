import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { useGetIdentity } from '@refinedev/core';
import { SidebarNav, TopNav } from '../components/sidebar-nav';
import { UserMenu } from '../components/user-menu';
import { ImpersonationBanner, Button, Sheet, SheetContent } from '@project/ui';
import { Menu } from 'lucide-react';

export function MainLayout() {
  const { data: user } = useGetIdentity<{
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
  }>();

  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const isImpersonating = false;
  const impersonationTarget = null;

  return (
    <div className="min-h-screen bg-background">
      {isImpersonating && impersonationTarget && (
        <ImpersonationBanner
          targetUser={impersonationTarget}
          onEndImpersonation={() => undefined}
        />
      )}

      <div className="flex">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex flex-grow flex-col overflow-y-auto pb-4 pt-5">
              <div className="mb-6 flex flex-shrink-0 items-center px-4">
                <span className="text-xl font-bold">Back Office</span>
              </div>
              <SidebarNav onNavigate={() => setSidebarOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-background px-4 lg:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <span className="text-lg font-semibold text-foreground">Back Office</span>

            <TopNav />

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


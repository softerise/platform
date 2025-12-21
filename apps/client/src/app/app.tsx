import { Refine, Authenticated } from "@refinedev/core";
import routerProvider, {
  CatchAllNavigate,
  NavigateToResource,
} from "@refinedev/react-router-v6";
import { Outlet, Route, Routes } from "react-router-dom";
import { Toaster } from "@project/ui";
import { authProvider } from "./providers/auth-provider";
import { accessControlProvider } from "./providers/access-control-provider";
import { dataProvider } from "./providers/data-provider";
import { MainLayout } from "../layouts/main-layout";
import { AuthLayout } from "../layouts/auth-layout";
import { LoginPage } from "../pages/login";
import { InviteAcceptPage } from "../pages/invite-accept";
import { MemberListPage } from "../pages/members/list";
import { InviteListPage } from "../pages/invites/list";
import { CreateInvitePage } from "../pages/invites/create";
import { BulkImportPage } from "../pages/invites/bulk";

export function App() {
  return (
    <>
      <Refine
        authProvider={authProvider}
        accessControlProvider={accessControlProvider}
        dataProvider={dataProvider}
        routerProvider={routerProvider}
        resources={[
          { name: "members", list: "/company/members" },
          { name: "invites", list: "/company/invites", create: "/company/invites/create" },
        ]}
        options={{ syncWithLocation: true, warnWhenUnsavedChanges: true }}
      >
        <Routes>
          <Route path="/invite/:code" element={<InviteAcceptPage />} />
          <Route
            element={
              <Authenticated fallback={<Outlet />} key="auth">
                <NavigateToResource resource="members" />
              </Authenticated>
            }
          >
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>
          </Route>
          <Route
            element={
              <Authenticated key="protected" fallback={<CatchAllNavigate to="/login" />}>
                <MainLayout />
              </Authenticated>
            }
          >
            <Route path="/company">
              <Route path="members" element={<MemberListPage />} />
              <Route path="invites" element={<InviteListPage />} />
              <Route path="invites/create" element={<CreateInvitePage />} />
              <Route path="invites/bulk" element={<BulkImportPage />} />
            </Route>
          </Route>
          <Route path="/" element={<NavigateToResource resource="members" />} />
          <Route path="*" element={<div>404 - Page Not Found</div>} />
        </Routes>
      </Refine>
      <Toaster position="top-right" />
    </>
  );
}

export default App;

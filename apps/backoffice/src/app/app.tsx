import { Refine, Authenticated } from '@refinedev/core';
import routerProvider, {
  NavigateToResource,
  CatchAllNavigate,
} from '@refinedev/react-router-v6';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Toaster } from '@project/ui';

import { authProvider } from './providers/auth-provider';
import { accessControlProvider } from './providers/access-control-provider';
import { dataProvider } from './providers/data-provider';

import { MainLayout } from '../layouts/main-layout';
import { AuthLayout } from '../layouts/auth-layout';

import { LoginPage } from '../pages/login';
import { UserListPage } from '../pages/users/list';
import { UserShowPage } from '../pages/users/show';
import { AuditLogListPage } from '../pages/audit-logs/list';
import {
  BookListPage,
  BookCreatePage,
  BookShowPage,
  BookEditPage,
} from '../pages/books';
import { PipelineListPage, PipelineShowPage } from '../pages/pipelines';
import { CourseListPage, CourseShowPage } from '../pages/courses';
import { DashboardPage } from '../pages/dashboard';
import { resources } from '../config/resources';

export function App() {
  return (
    <BrowserRouter>
      <Refine
        authProvider={authProvider}
        accessControlProvider={accessControlProvider}
        dataProvider={dataProvider}
        routerProvider={routerProvider}
        resources={resources}
        options={{
          syncWithLocation: true,
          warnWhenUnsavedChanges: true,
        }}
      >
        <Routes>
          <Route
            element={
              <Authenticated fallback={<Outlet />} key="auth">
                <NavigateToResource resource="dashboard" />
              </Authenticated>
            }
          >
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>
          </Route>

          <Route
            element={
              <Authenticated
                key="protected"
                fallback={<CatchAllNavigate to="/login" />}
              >
                <MainLayout />
              </Authenticated>
            }
          >
            <Route path="/admin">
              <Route index element={<DashboardPage />} />
              <Route path="books">
                <Route index element={<BookListPage />} />
                <Route path="create" element={<BookCreatePage />} />
                <Route path=":id" element={<BookShowPage />} />
                <Route path=":id/edit" element={<BookEditPage />} />
              </Route>
              <Route path="pipelines">
                <Route index element={<PipelineListPage />} />
                <Route path=":id" element={<PipelineShowPage />} />
              </Route>
              <Route path="courses">
                <Route index element={<CourseListPage />} />
                <Route path=":id" element={<CourseShowPage />} />
              </Route>
              <Route path="users">
                <Route index element={<UserListPage />} />
                <Route path=":id" element={<UserShowPage />} />
              </Route>
              <Route path="audit-logs" element={<AuditLogListPage />} />
            </Route>
          </Route>

          <Route path="/" element={<NavigateToResource resource="dashboard" />} />
          <Route path="*" element={<div>404 - Page Not Found</div>} />
        </Routes>
      </Refine>
      <Toaster position="top-right" />
    </BrowserRouter>
  );
}

export default App;

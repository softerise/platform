# MODULE_USER_AUTH_UI_SPEC.md

# User Authentication Module - UI Specification

---

## HEADER

```yaml
document_name: User Auth Module - UI Specification
document_id: user-auth-ui-spec
version: "1.0.0"
created: 2024-12-18
updated: 2024-12-18
status: ready
owner: Frontend Team

parent_doc: ./MODULE_USER_AUTH_ARCHITECTURE.md

platforms:
  - name: Back Office Web App
    app_path: apps/backoffice
    purpose: Platform administration
  - name: B2B Web App
    app_path: apps/client
    purpose: Company administration

tech_stack:
  framework: "Refine.js"
  styling: "Tailwind CSS"
  components: "shadcn/ui"
  state: "React Query (via Refine)"
  forms: "React Hook Form + Zod"

changelog:
  - {v: "1.0.0", date: "2024-12-18", note: "Initial UI specification"}
```

---

## TABLE OF CONTENTS

1. [Platform Overview](#platform-overview)
2. [Design System](#design-system)
3. [Shared Components](#shared-components)
4. [Back Office App Specification](#back-office-app-specification)
5. [B2B App Specification](#b2b-app-specification)
6. [State Patterns](#state-patterns)
7. [Permission System](#permission-system)
8. [Implementation Guide](#implementation-guide)

---

## PLATFORM OVERVIEW

### Architecture Decision

```yaml
decision: "Two separate Refine.js applications"
rationale:
  - Different authentication flows (Backoffice Admin vs B2B Company User)
  - Different permission models and role hierarchies
  - Independent deployment and scaling
  - Cleaner codebase separation
  - Different target users and UX requirements

shared_code:
  location: "packages/ui"
  contents:
    - shadcn/ui components
    - Common layouts
    - Shared hooks
    - Theme configuration
```

### Application Matrix

| Aspect | Back Office App | B2B App |
|--------|-----------------|---------|
| **Path** | `apps/backoffice` | `apps/client` |
| **Users** | Platform Admins | Company Admins |
| **Auth** | BackofficeAdmin entity | User entity (B2B type) |
| **Roles** | SUPER_ADMIN, SUPPORT_AGENT, B2B_MANAGER | COMPANY_ADMIN, HR_MANAGER, TEAM_LEAD |
| **Primary Color** | Slate/Gray (admin feel) | Brand primary (user feel) |
| **Base Route** | `/admin` | `/company` |

---

## DESIGN SYSTEM

### Color Tokens

```yaml
colors:
  # Semantic Colors
  primary:
    description: "Primary actions, links"
    light: "blue-600"
    dark: "blue-500"
  
  secondary:
    description: "Secondary actions"
    light: "slate-600"
    dark: "slate-400"
  
  success:
    description: "Success states, active status"
    light: "green-600"
    dark: "green-500"
  
  warning:
    description: "Warning states, pending status"
    light: "amber-600"
    dark: "amber-500"
  
  destructive:
    description: "Destructive actions, errors"
    light: "red-600"
    dark: "red-500"
  
  # Status Colors (User/Invite Status)
  status:
    active: "green"
    pending_verification: "amber"
    pending_onboarding: "blue"
    suspended: "red"
    deleted: "gray"
    expired: "gray"
    cancelled: "slate"
```

### Typography Scale

```yaml
typography:
  page_title:
    class: "text-2xl font-semibold tracking-tight"
    usage: "Main page headings"
  
  section_title:
    class: "text-lg font-medium"
    usage: "Card headers, section dividers"
  
  body:
    class: "text-sm text-muted-foreground"
    usage: "Regular content"
  
  label:
    class: "text-sm font-medium"
    usage: "Form labels, table headers"
  
  caption:
    class: "text-xs text-muted-foreground"
    usage: "Helper text, timestamps"
```

### Spacing System

```yaml
spacing:
  page_padding: "p-6"
  card_padding: "p-4"
  section_gap: "space-y-6"
  form_gap: "space-y-4"
  inline_gap: "space-x-2"
  table_cell_padding: "px-4 py-3"
```

### Breakpoints

```yaml
breakpoints:
  sm: "640px"   # Mobile landscape
  md: "768px"   # Tablet
  lg: "1024px"  # Desktop
  xl: "1280px"  # Large desktop
  
responsive_behavior:
  sidebar:
    mobile: "Hidden, hamburger menu"
    desktop: "Fixed 256px width"
  tables:
    mobile: "Horizontal scroll or card view"
    desktop: "Full table view"
  forms:
    mobile: "Single column"
    desktop: "Multi-column where appropriate"
```

---

## SHARED COMPONENTS

### Location: `packages/ui/src/lib/`

### Core Components from shadcn/ui

```yaml
components:
  layout:
    - Sidebar
    - Header
    - Breadcrumb
    - Tabs
    - Card
    - Sheet (mobile menu)
  
  data_display:
    - Table
    - DataTable (with sorting, filtering)
    - Badge
    - Avatar
    - Skeleton
    - EmptyState (custom)
  
  forms:
    - Input
    - Select
    - Checkbox
    - RadioGroup
    - Textarea
    - DatePicker
    - Form (React Hook Form wrapper)
  
  feedback:
    - Toast (sonner)
    - Alert
    - AlertDialog
    - Progress
    - Spinner (custom)
  
  navigation:
    - Button
    - DropdownMenu
    - Command (search)
    - Pagination
  
  overlay:
    - Dialog
    - Sheet
    - Popover
    - Tooltip
```

### Custom Components

#### StatusBadge

```typescript
// packages/ui/src/lib/status-badge.tsx

interface StatusBadgeProps {
  status: 
    | 'ACTIVE' 
    | 'PENDING_VERIFICATION' 
    | 'PENDING_ONBOARDING' 
    | 'SUSPENDED' 
    | 'DELETED'
    | 'PENDING'
    | 'ACCEPTED'
    | 'EXPIRED'
    | 'CANCELLED';
  size?: 'sm' | 'md';
}

const statusConfig = {
  ACTIVE: { label: 'Active', variant: 'success', icon: CheckCircle },
  PENDING_VERIFICATION: { label: 'Pending Verification', variant: 'warning', icon: Clock },
  PENDING_ONBOARDING: { label: 'Pending Onboarding', variant: 'info', icon: UserPlus },
  SUSPENDED: { label: 'Suspended', variant: 'destructive', icon: Ban },
  DELETED: { label: 'Deleted', variant: 'secondary', icon: Trash },
  PENDING: { label: 'Pending', variant: 'warning', icon: Clock },
  ACCEPTED: { label: 'Accepted', variant: 'success', icon: CheckCircle },
  EXPIRED: { label: 'Expired', variant: 'secondary', icon: XCircle },
  CANCELLED: { label: 'Cancelled', variant: 'secondary', icon: XCircle },
};
```

#### RoleBadge

```typescript
// packages/ui/src/lib/role-badge.tsx

interface RoleBadgeProps {
  role: B2BRole | BackofficeRole;
  size?: 'sm' | 'md';
}

// B2B Roles
const b2bRoleConfig = {
  COMPANY_ADMIN: { label: 'Admin', color: 'purple' },
  HR_MANAGER: { label: 'HR Manager', color: 'blue' },
  TEAM_LEAD: { label: 'Team Lead', color: 'green' },
  EMPLOYEE: { label: 'Employee', color: 'gray' },
};

// Backoffice Roles
const backofficeRoleConfig = {
  SUPER_ADMIN: { label: 'Super Admin', color: 'red' },
  SUPPORT_AGENT: { label: 'Support', color: 'blue' },
  B2B_MANAGER: { label: 'B2B Manager', color: 'purple' },
  CONTENT_MANAGER: { label: 'Content', color: 'green' },
  ANALYTICS_VIEWER: { label: 'Analytics', color: 'gray' },
};
```

#### EmptyState

```typescript
// packages/ui/src/lib/empty-state.tsx

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Usage
<EmptyState
  icon={Users}
  title="No members yet"
  description="Start building your team by inviting members"
  action={{
    label: "Invite Members",
    onClick: () => navigate('/invites/create')
  }}
/>
```

#### ConfirmDialog

```typescript
// packages/ui/src/lib/confirm-dialog.tsx

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

// Usage
<ConfirmDialog
  open={showSuspendDialog}
  onOpenChange={setShowSuspendDialog}
  title="Suspend User"
  description="Are you sure you want to suspend this user? They will lose access to the platform."
  confirmLabel="Suspend"
  variant="destructive"
  onConfirm={handleSuspend}
  loading={isSuspending}
/>
```

#### ImpersonationBanner

```typescript
// packages/ui/src/lib/impersonation-banner.tsx

interface ImpersonationBannerProps {
  targetUser: {
    email: string;
    displayName?: string;
  };
  onEndImpersonation: () => void;
}

// Renders sticky banner at top of viewport
// Background: amber-500
// Text: "You are viewing as {email}"
// Button: "End Impersonation"
```

#### DataTableToolbar

```typescript
// packages/ui/src/lib/data-table-toolbar.tsx

interface DataTableToolbarProps {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters?: FilterConfig[];
  onFilterChange: (filters: Record<string, any>) => void;
  actions?: React.ReactNode; // Right side actions (Create button, etc.)
}

interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'date-range' | 'multi-select';
  options?: { label: string; value: string }[];
}
```

---

## BACK OFFICE APP SPECIFICATION

### App Structure

```
apps/backoffice/src/
├── app/
│   ├── App.tsx                 # Refine app setup
│   ├── routes.tsx              # Route definitions
│   └── providers/
│       ├── auth-provider.ts    # Backoffice auth
│       └── access-control.ts   # Permission provider
├── pages/
│   ├── login/
│   │   └── index.tsx
│   ├── users/
│   │   ├── list.tsx
│   │   ├── show.tsx
│   │   └── components/
│   │       ├── user-filters.tsx
│   │       ├── user-table.tsx
│   │       ├── user-detail-card.tsx
│   │       ├── suspend-dialog.tsx
│   │       └── impersonate-button.tsx
│   └── audit-logs/
│       ├── list.tsx
│       └── components/
│           ├── audit-filters.tsx
│           └── audit-table.tsx
├── layouts/
│   └── main-layout.tsx
└── components/
    └── sidebar-nav.tsx
```

### Route Configuration

```typescript
// apps/backoffice/src/app/routes.tsx

export const routes = [
  {
    path: '/login',
    element: <LoginPage />,
    public: true,
  },
  {
    path: '/admin',
    element: <MainLayout />,
    children: [
      {
        path: 'users',
        element: <UserList />,
        meta: { 
          label: 'Users',
          icon: Users,
          permissions: ['SUPER_ADMIN', 'SUPPORT_AGENT', 'B2B_MANAGER']
        }
      },
      {
        path: 'users/:id',
        element: <UserShow />,
        meta: { permissions: ['SUPER_ADMIN', 'SUPPORT_AGENT', 'B2B_MANAGER'] }
      },
      {
        path: 'audit-logs',
        element: <AuditLogList />,
        meta: { 
          label: 'Audit Logs',
          icon: FileText,
          permissions: ['SUPER_ADMIN', 'SUPPORT_AGENT']
        }
      },
    ]
  }
];
```

### Sidebar Navigation

```yaml
navigation:
  - group: "User Management"
    items:
      - label: "Users"
        path: "/admin/users"
        icon: "Users"
        roles: [SUPER_ADMIN, SUPPORT_AGENT, B2B_MANAGER]
      
      - label: "Audit Logs"
        path: "/admin/audit-logs"
        icon: "FileText"
        roles: [SUPER_ADMIN, SUPPORT_AGENT]
```

---

### Page: Login

```yaml
page:
  id: BO-LOGIN
  path: /login
  title: "Back Office Login"
  layout: centered-card

wireframe: |
  ┌─────────────────────────────────────────────────────┐
  │                                                     │
  │                    [Logo]                           │
  │              Back Office Portal                     │
  │                                                     │
  │  ┌───────────────────────────────────────────────┐  │
  │  │                                               │  │
  │  │   Email                                       │  │
  │  │   ┌─────────────────────────────────────┐    │  │
  │  │   │ admin@softerise.com                 │    │  │
  │  │   └─────────────────────────────────────┘    │  │
  │  │                                               │  │
  │  │   Password                                    │  │
  │  │   ┌─────────────────────────────────────┐    │  │
  │  │   │ ••••••••••                          │    │  │
  │  │   └─────────────────────────────────────┘    │  │
  │  │                                               │  │
  │  │   ┌─────────────────────────────────────┐    │  │
  │  │   │           Sign In                    │    │  │
  │  │   └─────────────────────────────────────┘    │  │
  │  │                                               │  │
  │  └───────────────────────────────────────────────┘  │
  │                                                     │
  └─────────────────────────────────────────────────────┘

components:
  - type: Card
    children:
      - Logo
      - Typography (title)
      - Form
        - Input (email, required)
        - Input (password, required, type=password)
        - Button (submit, full-width)

states:
  default:
    - Empty form fields
    - Submit button enabled
  
  loading:
    - Submit button shows spinner
    - Form fields disabled
  
  error:
    - Toast notification with error message
    - Form fields retain values
    - Common errors:
      - "Invalid credentials"
      - "Account suspended"
      - "Account locked"

validation:
  email:
    - required: "Email is required"
    - format: "Please enter a valid email"
  password:
    - required: "Password is required"

api_integration:
  endpoint: "POST /api/v1/auth/login"
  request:
    idToken: "Firebase ID token"
    deviceType: "WEB"
  success:
    action: "Redirect to /admin/users"
    storage: "Store session in localStorage"
  error:
    401: "Show invalid credentials message"
    403: "Show account suspended message"
    423: "Show account locked message with unlock info"
```

---

### Page: User List

```yaml
page:
  id: BO-USER-LIST
  path: /admin/users
  title: "Users"
  permissions: [SUPER_ADMIN, SUPPORT_AGENT, B2B_MANAGER]

wireframe: |
  ┌─────────────────────────────────────────────────────────────────────┐
  │ [Sidebar]  │  Users                                                 │
  │            │                                                         │
  │  Users     │  ┌─────────────────────────────────────────────────┐   │
  │  Audit     │  │ 🔍 Search users...        [Status ▼] [Type ▼]   │   │
  │            │  └─────────────────────────────────────────────────┘   │
  │            │                                                         │
  │            │  ┌─────────────────────────────────────────────────┐   │
  │            │  │ □  User              Email           Status  Type│   │
  │            │  ├─────────────────────────────────────────────────┤   │
  │            │  │ □  John Doe          john@ex.com    🟢 Active B2C│   │
  │            │  │ □  Jane Smith        jane@co.com    🟡 Pending B2B│   │
  │            │  │ □  Bob Wilson        bob@test.com   🔴 Suspended B2C│  │
  │            │  └─────────────────────────────────────────────────┘   │
  │            │                                                         │
  │            │  Showing 1-10 of 156        [< 1 2 3 ... 16 >]         │
  │            │                                                         │
  └─────────────────────────────────────────────────────────────────────┘

components:
  layout:
    - MainLayout
    - PageHeader (title: "Users")
  
  toolbar:
    - SearchInput
      - placeholder: "Search by name or email..."
      - debounce: 300ms
    - FilterSelect (Status)
      - options: [All, Active, Pending Verification, Pending Onboarding, Suspended]
    - FilterSelect (User Type)
      - options: [All, B2C, B2B]
      - note: "B2B_MANAGER sees only B2B option"
  
  table:
    - DataTable
      - columns: [checkbox, user, email, status, userType, company, createdAt, actions]
      - sortable: [email, createdAt, status]
      - row_click: "Navigate to user detail"

table_columns:
  - key: select
    header: Checkbox
    width: 40px
    content: Checkbox (for bulk actions - future)
  
  - key: user
    header: "User"
    width: auto
    content: |
      Avatar + DisplayName
      Email (secondary text)
    sortable: false
  
  - key: status
    header: "Status"
    width: 150px
    content: StatusBadge
    sortable: true
    filterable: true
  
  - key: userType
    header: "Type"
    width: 100px
    content: Badge (B2C/B2B)
    filterable: true
  
  - key: company
    header: "Company"
    width: 150px
    content: "Company name or '-'"
    visible_when: "userType === B2B"
  
  - key: createdAt
    header: "Created"
    width: 120px
    content: "Relative date (e.g., '2 days ago')"
    sortable: true
  
  - key: actions
    header: ""
    width: 50px
    content: DropdownMenu
    items:
      - label: "View Details"
        action: navigate
        all_roles: true
      - label: "Impersonate"
        action: impersonate
        roles: [SUPER_ADMIN, SUPPORT_AGENT]
      - separator: true
      - label: "Suspend User"
        action: suspend
        roles: [SUPER_ADMIN]
        condition: "status === ACTIVE"
        variant: destructive
      - label: "Reactivate User"
        action: reactivate
        roles: [SUPER_ADMIN]
        condition: "status === SUSPENDED"

states:
  loading:
    - Table shows Skeleton rows (10)
    - Filters disabled
  
  empty:
    - EmptyState component
    - icon: Users
    - title: "No users found"
    - description: "Try adjusting your search or filters"
  
  error:
    - Alert component (destructive)
    - Retry button
  
  filtered_empty:
    - EmptyState
    - title: "No matching users"
    - action: "Clear filters"

pagination:
  type: "server-side"
  page_sizes: [10, 25, 50, 100]
  default: 25
  url_sync: true
  format: "Showing {from}-{to} of {total}"

api_integration:
  endpoint: "GET /api/v1/admin/users"
  params:
    search: "string (name or email)"
    status: "UserStatus enum"
    userType: "B2C | B2B"
    page: "number"
    limit: "number"
    sortBy: "string"
    sortOrder: "asc | desc"
  response:
    data: "User[]"
    meta:
      total: "number"
      page: "number"
      limit: "number"

role_specific_behavior:
  B2B_MANAGER:
    - Filter defaults to userType=B2B
    - Cannot change userType filter
    - Cannot see suspend/reactivate actions
    - Cannot impersonate
```

---

### Page: User Detail

```yaml
page:
  id: BO-USER-DETAIL
  path: /admin/users/:id
  title: "User Details"
  permissions: [SUPER_ADMIN, SUPPORT_AGENT, B2B_MANAGER]

wireframe: |
  ┌─────────────────────────────────────────────────────────────────────┐
  │ [Sidebar]  │  ← Back to Users                                       │
  │            │                                                         │
  │            │  ┌─────────────────────────────────────────────────┐   │
  │            │  │ [Avatar]  John Doe                              │   │
  │            │  │           john.doe@example.com                  │   │
  │            │  │           🟢 Active  |  B2B  |  Acme Corp       │   │
  │            │  │                                                 │   │
  │            │  │  [Impersonate]  [Suspend User]                  │   │
  │            │  └─────────────────────────────────────────────────┘   │
  │            │                                                         │
  │            │  ┌─────────────────┐  ┌─────────────────────────────┐  │
  │            │  │ Profile Info    │  │ Account Info                │  │
  │            │  │                 │  │                             │  │
  │            │  │ Display Name    │  │ User ID                     │  │
  │            │  │ John Doe        │  │ usr_abc123...               │  │
  │            │  │                 │  │                             │  │
  │            │  │ Preferred Lang  │  │ Firebase UID                │  │
  │            │  │ English         │  │ firebase_xyz...             │  │
  │            │  │                 │  │                             │  │
  │            │  │ Timezone        │  │ Identity Provider           │  │
  │            │  │ Europe/Istanbul │  │ Google                      │  │
  │            │  │                 │  │                             │  │
  │            │  │ Persona         │  │ Created At                  │  │
  │            │  │ Rising Leader   │  │ Dec 15, 2024 14:30          │  │
  │            │  └─────────────────┘  │                             │  │
  │            │                       │ Last Login                  │  │
  │            │                       │ Dec 18, 2024 09:15          │  │
  │            │                       └─────────────────────────────┘  │
  │            │                                                         │
  │            │  ┌─────────────────────────────────────────────────┐   │
  │            │  │ B2B Information                                 │   │
  │            │  │                                                 │   │
  │            │  │ Company: Acme Corp    Role: HR_MANAGER          │   │
  │            │  │ Joined: Dec 10, 2024                            │   │
  │            │  └─────────────────────────────────────────────────┘   │
  │            │                                                         │
  │            │  ┌─────────────────────────────────────────────────┐   │
  │            │  │ Active Sessions (3)                     [Revoke All]│ │
  │            │  │                                                 │   │
  │            │  │ 🖥️ Chrome on Windows  |  Dec 18, 09:15  [Revoke]│   │
  │            │  │ 📱 iOS App            |  Dec 17, 14:22  [Revoke]│   │
  │            │  │ 📱 Android App        |  Dec 15, 11:00  [Revoke]│   │
  │            │  └─────────────────────────────────────────────────┘   │
  │            │                                                         │
  │            │  ┌─────────────────────────────────────────────────┐   │
  │            │  │ Recent Activity                          [View All]│ │
  │            │  │                                                 │   │
  │            │  │ 🔑 Login Success      |  Dec 18, 09:15         │   │
  │            │  │ 🔑 Login Success      |  Dec 17, 14:22         │   │
  │            │  │ 📝 Profile Updated    |  Dec 16, 10:30         │   │
  │            │  └─────────────────────────────────────────────────┘   │
  │            │                                                         │
  └─────────────────────────────────────────────────────────────────────┘

sections:
  header:
    components:
      - BackButton (→ /admin/users)
      - UserHeader
        - Avatar (large, 64px)
        - DisplayName
        - Email
        - StatusBadge
        - UserTypeBadge
        - CompanyName (if B2B)
      - ActionButtons
        - ImpersonateButton (SUPER_ADMIN, SUPPORT_AGENT only)
        - SuspendButton (SUPER_ADMIN only, if ACTIVE)
        - ReactivateButton (SUPER_ADMIN only, if SUSPENDED)
  
  profile_info:
    title: "Profile Information"
    type: Card
    layout: "2-column grid"
    fields:
      - label: "Display Name"
        value: "user.displayName || '-'"
      - label: "Preferred Language"
        value: "user.preferredLanguage"
        format: "Language name (e.g., 'English')"
      - label: "Timezone"
        value: "user.timezone || '-'"
      - label: "Persona"
        value: "user.persona?.name || 'Not assigned'"
  
  account_info:
    title: "Account Information"
    type: Card
    layout: "2-column grid"
    fields:
      - label: "User ID"
        value: "user.id"
        format: "Truncated with copy button"
      - label: "Firebase UID"
        value: "user.firebaseUid"
        format: "Truncated with copy button"
      - label: "Identity Provider"
        value: "user.identityProvider"
        format: "Icon + Label (Google, Apple, Email)"
      - label: "Email Verified"
        value: "user.emailVerifiedAt"
        format: "Date or 'Not verified'"
      - label: "Created At"
        value: "user.createdAt"
        format: "Full date time"
      - label: "Last Login"
        value: "user.lastLoginAt"
        format: "Full date time or 'Never'"
      - label: "Last Login IP"
        value: "user.lastLoginIp"
        format: "IP or 'Unknown'"
        roles: [SUPER_ADMIN]
  
  b2b_info:
    title: "B2B Information"
    type: Card
    condition: "user.userType === 'B2B'"
    fields:
      - label: "Company"
        value: "user.company.name"
        link: "Future: /admin/companies/:id"
      - label: "Role"
        value: "user.b2bRole"
        format: "RoleBadge"
      - label: "Joined Company"
        value: "user.b2bJoinedAt"
        format: "Full date"
  
  sessions:
    title: "Active Sessions"
    type: Card
    components:
      - SessionList
        - DeviceIcon (based on deviceType)
        - DeviceName
        - LastActivityAt
        - RevokeButton (individual)
      - RevokeAllButton (header action)
    empty_state:
      title: "No active sessions"
      description: "User has no active sessions"
  
  recent_activity:
    title: "Recent Activity"
    type: Card
    components:
      - AuditLogList (compact, last 5)
      - ViewAllLink (→ /admin/audit-logs?userId=xxx)
    columns:
      - EventIcon
      - EventType (formatted)
      - Timestamp

actions:
  impersonate:
    label: "Impersonate User"
    icon: UserCog
    roles: [SUPER_ADMIN, SUPPORT_AGENT]
    dialog:
      title: "Start Impersonation"
      description: "You will be logged in as {displayName}. All actions will be logged."
      confirm: "Start Impersonation"
    api: "POST /api/v1/admin/users/:id/impersonate"
    success:
      - "Store impersonation token"
      - "Show ImpersonationBanner"
      - "Redirect to user's default page"
  
  suspend:
    label: "Suspend User"
    icon: Ban
    roles: [SUPER_ADMIN]
    condition: "user.status === 'ACTIVE'"
    variant: destructive
    dialog:
      title: "Suspend User"
      description: "This will immediately revoke all sessions and prevent login."
      form:
        - field: reason
          type: textarea
          label: "Reason for suspension"
          required: true
          maxLength: 500
      confirm: "Suspend User"
      cancel: "Cancel"
    api: "POST /api/v1/admin/users/:id/suspend"
    success:
      toast: "User suspended successfully"
      action: "Refresh user data"
  
  reactivate:
    label: "Reactivate User"
    icon: UserCheck
    roles: [SUPER_ADMIN]
    condition: "user.status === 'SUSPENDED'"
    dialog:
      title: "Reactivate User"
      description: "User will be able to login again."
      confirm: "Reactivate"
    api: "POST /api/v1/admin/users/:id/reactivate"
    success:
      toast: "User reactivated successfully"
      action: "Refresh user data"
  
  revoke_session:
    label: "Revoke"
    roles: [SUPER_ADMIN, SUPPORT_AGENT]
    api: "DELETE /api/v1/admin/users/:userId/sessions/:sessionId"
    success:
      toast: "Session revoked"
      action: "Remove from list"
  
  revoke_all_sessions:
    label: "Revoke All"
    roles: [SUPER_ADMIN, SUPPORT_AGENT]
    dialog:
      title: "Revoke All Sessions"
      description: "This will log out the user from all devices."
      confirm: "Revoke All"
    api: "POST /api/v1/admin/users/:id/sessions/revoke-all"
    success:
      toast: "All sessions revoked"
      action: "Clear session list"

states:
  loading:
    - Skeleton for all cards
  
  error:
    - Alert with error message
    - Retry button
  
  not_found:
    - EmptyState
    - title: "User not found"
    - action: "Back to Users"

api_integration:
  primary: "GET /api/v1/admin/users/:id"
  sessions: "GET /api/v1/admin/users/:id/sessions"
  activity: "GET /api/v1/admin/audit-logs?userId=:id&limit=5"
```

---

### Page: Audit Logs

```yaml
page:
  id: BO-AUDIT-LOGS
  path: /admin/audit-logs
  title: "Audit Logs"
  permissions: [SUPER_ADMIN, SUPPORT_AGENT]

wireframe: |
  ┌─────────────────────────────────────────────────────────────────────┐
  │ [Sidebar]  │  Audit Logs                                            │
  │            │                                                         │
  │  Users     │  ┌─────────────────────────────────────────────────┐   │
  │  Audit ●   │  │ 🔍 Search...  [Event Type ▼] [Date Range 📅]    │   │
  │            │  └─────────────────────────────────────────────────┘   │
  │            │                                                         │
  │            │  ┌─────────────────────────────────────────────────┐   │
  │            │  │ Event            User           Time      Status │   │
  │            │  ├─────────────────────────────────────────────────┤   │
  │            │  │ 🔑 Login Success  john@ex.com   09:15     ✅     │   │
  │            │  │ 🔑 Login Failure  jane@co.com   09:10     ❌     │   │
  │            │  │ 🚫 User Suspended bob@test.com  08:45     ✅     │   │
  │            │  │ 👤 Impersonate    admin@co.com  08:30     ✅     │   │
  │            │  └─────────────────────────────────────────────────┘   │
  │            │                                                         │
  │            │  [< 1 2 3 ... 50 >]                     [Export CSV]   │
  │            │                                                         │
  └─────────────────────────────────────────────────────────────────────┘

components:
  toolbar:
    - SearchInput
      - placeholder: "Search by user email..."
      - debounce: 300ms
    - FilterSelect (Event Type)
      - options: "All 23 AuthEventType values, grouped"
      - groups:
        - Authentication: [LOGIN_SUCCESS, LOGIN_FAILURE, LOGOUT]
        - Account: [SIGNUP_COMPLETED, PASSWORD_CHANGE, EMAIL_CHANGE_COMPLETE, ACCOUNT_DELETED]
        - Sessions: [SESSION_REVOKED, ALL_SESSIONS_REVOKED]
        - B2B: [B2B_JOIN, B2B_LEAVE]
        - Admin: [ADMIN_IMPERSONATE_START, ADMIN_IMPERSONATE_END, ACCOUNT_SUSPENDED, ACCOUNT_REACTIVATED]
    - DateRangePicker
      - presets: [Today, Yesterday, Last 7 days, Last 30 days, Custom]
    - ExportButton (future)
      - format: CSV
      - roles: [SUPER_ADMIN]

table_columns:
  - key: eventType
    header: "Event"
    width: 200px
    content: |
      EventIcon + EventLabel
      Format: Human readable (e.g., "Login Success")
    filterable: true
  
  - key: user
    header: "User"
    width: 200px
    content: |
      Email (link to user detail)
      Show "System" if no userId
    click: "Navigate to /admin/users/:userId"
  
  - key: targetUser
    header: "Target"
    width: 150px
    content: "Target user email (for admin actions)"
    condition: "eventType includes IMPERSONATE or SUSPEND"
  
  - key: timestamp
    header: "Time"
    width: 150px
    content: "Full datetime"
    sortable: true
    default_sort: desc
  
  - key: success
    header: "Status"
    width: 80px
    content: |
      ✅ (success: true)
      ❌ (success: false)
  
  - key: details
    header: ""
    width: 50px
    content: |
      Expand button → Shows:
      - IP Address (hashed)
      - User Agent
      - Device Type
      - Failure Reason (if failed)
      - Metadata (JSON)

event_type_config:
  LOGIN_SUCCESS:
    icon: LogIn
    color: green
    label: "Login Success"
  LOGIN_FAILURE:
    icon: LogIn
    color: red
    label: "Login Failure"
  LOGOUT:
    icon: LogOut
    color: gray
    label: "Logout"
  SIGNUP_COMPLETED:
    icon: UserPlus
    color: blue
    label: "Signup Completed"
  PASSWORD_CHANGE:
    icon: Key
    color: amber
    label: "Password Changed"
  SESSION_REVOKED:
    icon: Smartphone
    color: amber
    label: "Session Revoked"
  ACCOUNT_SUSPENDED:
    icon: Ban
    color: red
    label: "Account Suspended"
  ACCOUNT_REACTIVATED:
    icon: UserCheck
    color: green
    label: "Account Reactivated"
  ADMIN_IMPERSONATE_START:
    icon: UserCog
    color: purple
    label: "Impersonation Started"
  ADMIN_IMPERSONATE_END:
    icon: UserCog
    color: purple
    label: "Impersonation Ended"
  B2B_JOIN:
    icon: Building
    color: blue
    label: "Joined Company"
  B2B_LEAVE:
    icon: Building
    color: gray
    label: "Left Company"

role_specific_behavior:
  SUPPORT_AGENT:
    - Can only see own actions (adminId filter applied)
    - Cannot export
  SUPER_ADMIN:
    - Full access
    - Can export

states:
  loading:
    - Skeleton rows
  
  empty:
    - EmptyState
    - title: "No audit logs"
    - description: "No events match your filters"
  
  error:
    - Alert with retry

pagination:
  type: "server-side"
  page_sizes: [25, 50, 100]
  default: 50

api_integration:
  endpoint: "GET /api/v1/admin/audit-logs"
  params:
    search: "user email"
    eventType: "AuthEventType"
    startDate: "ISO date"
    endDate: "ISO date"
    page: "number"
    limit: "number"
```

---

## B2B APP SPECIFICATION

### App Structure

```
apps/client/src/
├── app/
│   ├── App.tsx
│   ├── routes.tsx
│   └── providers/
│       ├── auth-provider.ts    # B2B user auth
│       └── access-control.ts   # B2B role permissions
├── pages/
│   ├── login/
│   │   └── index.tsx
│   ├── members/
│   │   ├── list.tsx
│   │   └── components/
│   │       ├── member-table.tsx
│   │       ├── member-filters.tsx
│   │       ├── role-select.tsx
│   │       └── remove-member-dialog.tsx
│   └── invites/
│       ├── list.tsx
│       ├── create.tsx
│       ├── bulk-create.tsx
│       └── components/
│           ├── invite-table.tsx
│           ├── invite-form.tsx
│           ├── bulk-upload.tsx
│           └── cancel-invite-dialog.tsx
├── layouts/
│   ├── main-layout.tsx
│   └── onboarding-layout.tsx
└── components/
    ├── sidebar-nav.tsx
    └── welcome-banner.tsx
```

### Route Configuration

```typescript
// apps/client/src/app/routes.tsx

export const routes = [
  {
    path: '/login',
    element: <LoginPage />,
    public: true,
  },
  {
    path: '/invite/:code',
    element: <InviteAcceptPage />,
    public: true,
  },
  {
    path: '/company',
    element: <MainLayout />,
    children: [
      {
        path: 'members',
        element: <MemberList />,
        meta: { 
          label: 'Team Members',
          icon: Users,
          permissions: ['COMPANY_ADMIN', 'HR_MANAGER', 'TEAM_LEAD']
        }
      },
      {
        path: 'invites',
        element: <InviteList />,
        meta: { 
          label: 'Invitations',
          icon: Mail,
          permissions: ['COMPANY_ADMIN', 'HR_MANAGER']
        }
      },
      {
        path: 'invites/create',
        element: <InviteCreate />,
        meta: { permissions: ['COMPANY_ADMIN', 'HR_MANAGER'] }
      },
      {
        path: 'invites/bulk',
        element: <InviteBulkCreate />,
        meta: { permissions: ['COMPANY_ADMIN', 'HR_MANAGER'] }
      },
    ]
  }
];
```

### Sidebar Navigation

```yaml
navigation:
  - group: "Team Management"
    items:
      - label: "Team Members"
        path: "/company/members"
        icon: "Users"
        roles: [COMPANY_ADMIN, HR_MANAGER, TEAM_LEAD]
      
      - label: "Invitations"
        path: "/company/invites"
        icon: "Mail"
        badge: "pendingCount"
        roles: [COMPANY_ADMIN, HR_MANAGER]
```

---

### Page: Login (B2B)

```yaml
page:
  id: B2B-LOGIN
  path: /login
  title: "Company Portal Login"
  layout: centered-card

wireframe: |
  ┌─────────────────────────────────────────────────────┐
  │                                                     │
  │                    [Logo]                           │
  │              Company Portal                         │
  │                                                     │
  │  ┌───────────────────────────────────────────────┐  │
  │  │                                               │  │
  │  │   Email                                       │  │
  │  │   ┌─────────────────────────────────────┐    │  │
  │  │   │ user@company.com                    │    │  │
  │  │   └─────────────────────────────────────┘    │  │
  │  │                                               │  │
  │  │   Password                                    │  │
  │  │   ┌─────────────────────────────────────┐    │  │
  │  │   │ ••••••••••                          │    │  │
  │  │   └─────────────────────────────────────┘    │  │
  │  │                                               │  │
  │  │   ┌─────────────────────────────────────┐    │  │
  │  │   │           Sign In                    │    │  │
  │  │   └─────────────────────────────────────┘    │  │
  │  │                                               │  │
  │  │   ─────────── or continue with ───────────   │  │
  │  │                                               │  │
  │  │   [G Google]        [🍎 Apple]              │  │
  │  │                                               │  │
  │  │   Forgot password?                           │  │
  │  │                                               │  │
  │  └───────────────────────────────────────────────┘  │
  │                                                     │
  │      Have an invite code? Accept Invitation        │
  │                                                     │
  └─────────────────────────────────────────────────────┘

components:
  - Card
    - Logo (company logo if available)
    - Form
      - Input (email)
      - Input (password)
      - Button (submit)
      - Divider
      - SocialButtons (Google, Apple)
      - Link (Forgot password)
    - Link (Accept Invitation → /invite)

validation:
  - Same as backoffice login

special_behavior:
  - After login, check if user is B2B
  - If not B2B: Show error "This portal is for company members only"
  - If B2B but wrong role: Redirect to appropriate dashboard
```

---

### Page: Invite Accept (Public)

```yaml
page:
  id: B2B-INVITE-ACCEPT
  path: /invite/:code
  title: "Accept Invitation"
  layout: centered-card
  public: true

wireframe: |
  ┌─────────────────────────────────────────────────────┐
  │                                                     │
  │              You've been invited to join            │
  │                                                     │
  │  ┌───────────────────────────────────────────────┐  │
  │  │                                               │  │
  │  │           [Company Logo]                      │  │
  │  │                                               │  │
  │  │              Acme Corporation                 │  │
  │  │                                               │  │
  │  │   You'll join as: HR Manager                  │  │
  │  │                                               │  │
  │  │   "Welcome to the team! We're excited to      │  │
  │  │    have you on board."                        │  │
  │  │                         - John (Admin)        │  │
  │  │                                               │  │
  │  │   ┌─────────────────────────────────────┐    │  │
  │  │   │       Accept & Create Account        │    │  │
  │  │   └─────────────────────────────────────┘    │  │
  │  │                                               │  │
  │  │   Already have an account? Sign in           │  │
  │  │                                               │  │
  │  └───────────────────────────────────────────────┘  │
  │                                                     │
  └─────────────────────────────────────────────────────┘

states:
  loading:
    - Skeleton card
    - "Validating invitation..."
  
  valid:
    - Company info displayed
    - Role badge
    - Personal message (if any)
    - Accept button
  
  expired:
    - EmptyState
    - icon: Clock
    - title: "Invitation Expired"
    - description: "This invitation is no longer valid. Please contact your company admin for a new invitation."
  
  cancelled:
    - EmptyState
    - icon: XCircle
    - title: "Invitation Cancelled"
    - description: "This invitation has been cancelled."
  
  already_accepted:
    - EmptyState
    - icon: CheckCircle
    - title: "Already Accepted"
    - description: "This invitation has already been used."
    - action: "Go to Login"
  
  already_member:
    - EmptyState
    - icon: Building
    - title: "Already a Member"
    - description: "You're already a member of a company. Please leave your current company first."

flow:
  1_validate:
    api: "GET /api/v1/b2b/invite/:code"
    success: "Show invite details"
    error: "Show appropriate error state"
  
  2_accept:
    condition: "User must be logged in"
    not_logged_in:
      - Store invite code in session
      - Redirect to login/signup
      - After auth, auto-accept
    logged_in:
      api: "POST /api/v1/b2b/invite/accept"
      body: { inviteCode: ":code" }
      success:
        - Toast: "Welcome to {companyName}!"
        - Redirect to /company/members
      error:
        - Show error based on code (409, 403, 410)
```

---

### Page: Member List

```yaml
page:
  id: B2B-MEMBER-LIST
  path: /company/members
  title: "Team Members"
  permissions: [COMPANY_ADMIN, HR_MANAGER, TEAM_LEAD]

wireframe: |
  ┌─────────────────────────────────────────────────────────────────────┐
  │ [Sidebar]  │  Team Members                         [Invite Members] │
  │            │                                                         │
  │  Members   │  ┌─────────────────────────────────────────────────┐   │
  │  Invites   │  │ 🔍 Search members...              [Role ▼]      │   │
  │            │  └─────────────────────────────────────────────────┘   │
  │            │                                                         │
  │            │  ┌─────────────────────────────────────────────────┐   │
  │            │  │ Member            Role          Joined    Actions│   │
  │            │  ├─────────────────────────────────────────────────┤   │
  │            │  │ [👤] John Doe     🟣 Admin      Dec 1      •••  │   │
  │            │  │      john@co.com                                 │   │
  │            │  │ [👤] Jane Smith   🔵 HR Manager Dec 5      •••  │   │
  │            │  │      jane@co.com                                 │   │
  │            │  │ [👤] Bob Wilson   🟢 Team Lead  Dec 10     •••  │   │
  │            │  │      bob@co.com                                  │   │
  │            │  └─────────────────────────────────────────────────┘   │
  │            │                                                         │
  │            │  12 of 25 seats used                                   │
  │            │                                                         │
  └─────────────────────────────────────────────────────────────────────┘

components:
  header:
    - PageTitle: "Team Members"
    - InviteMembersButton
      - roles: [COMPANY_ADMIN, HR_MANAGER]
      - dropdown:
        - "Invite by Email" → /company/invites/create
        - "Bulk Import" → /company/invites/bulk
  
  toolbar:
    - SearchInput
      - placeholder: "Search by name or email..."
    - FilterSelect (Role)
      - options: [All, Admin, HR Manager, Team Lead, Employee]
  
  stats:
    - SeatUsage
      - format: "{used} of {limit} seats used"
      - progress_bar: true
      - warning_threshold: 90%

table_columns:
  - key: member
    header: "Member"
    content: |
      Avatar + DisplayName
      Email (secondary)
  
  - key: role
    header: "Role"
    content: RoleBadge
    editable:
      condition: "currentUser.role === COMPANY_ADMIN"
      component: RoleSelect
  
  - key: joinedAt
    header: "Joined"
    content: "Relative date"
    sortable: true
  
  - key: actions
    header: ""
    content: DropdownMenu
    items:
      - label: "View Profile"
        action: "Show profile sheet"
        all_roles: true
      - separator: true
      - label: "Change Role"
        action: "Open role dialog"
        roles: [COMPANY_ADMIN]
        condition: "member.id !== currentUser.id"
      - label: "Remove from Company"
        action: "Open remove dialog"
        roles: [COMPANY_ADMIN]
        condition: "member.id !== currentUser.id"
        variant: destructive

role_specific_behavior:
  TEAM_LEAD:
    - Sees only their team members (filter applied)
    - No action menu items except "View Profile"
    - No invite button
  
  HR_MANAGER:
    - Sees all members
    - Can view but not change roles
    - Can invite members
  
  COMPANY_ADMIN:
    - Full access
    - Can change roles
    - Can remove members

dialogs:
  change_role:
    title: "Change Role"
    description: "Select a new role for {memberName}"
    form:
      - field: role
        type: select
        options: [EMPLOYEE, TEAM_LEAD, HR_MANAGER, COMPANY_ADMIN]
        current: "member.b2bRole"
    confirm: "Update Role"
    api: "PUT /api/v1/b2b/members/:id/role"
    success:
      toast: "Role updated successfully"
  
  remove_member:
    title: "Remove Team Member"
    description: "Are you sure you want to remove {memberName} from the company? They will lose access immediately."
    variant: destructive
    confirm: "Remove Member"
    api: "DELETE /api/v1/b2b/members/:id"
    success:
      toast: "{memberName} has been removed"
      action: "Remove from list"

empty_state:
  icon: Users
  title: "No team members yet"
  description: "Start building your team by inviting members"
  action:
    label: "Invite Members"
    href: "/company/invites/create"
    roles: [COMPANY_ADMIN, HR_MANAGER]

first_time_experience:
  condition: "members.length === 1 && currentUser.role === COMPANY_ADMIN"
  component: WelcomeBanner
  content: |
    title: "Welcome to your Company Portal!"
    description: "You're all set up. Start by inviting your team members."
    action: "Invite Your First Team Member"
    dismissible: true
    storage_key: "b2b_welcome_dismissed"

api_integration:
  endpoint: "GET /api/v1/b2b/members"
  params:
    search: "string"
    role: "B2BRole"
    page: "number"
    limit: "number"
```

---

### Page: Invite List

```yaml
page:
  id: B2B-INVITE-LIST
  path: /company/invites
  title: "Invitations"
  permissions: [COMPANY_ADMIN, HR_MANAGER]

wireframe: |
  ┌─────────────────────────────────────────────────────────────────────┐
  │ [Sidebar]  │  Invitations                          [+ New Invite]   │
  │            │                                                         │
  │  Members   │  [All] [Pending] [Accepted] [Expired]                  │
  │  Invites ● │                                                         │
  │            │  ┌─────────────────────────────────────────────────┐   │
  │            │  │ 🔍 Search invites...                            │   │
  │            │  └─────────────────────────────────────────────────┘   │
  │            │                                                         │
  │            │  ┌─────────────────────────────────────────────────┐   │
  │            │  │ Recipient        Role      Status   Sent   Actions│  │
  │            │  ├─────────────────────────────────────────────────┤   │
  │            │  │ john@ex.com      Employee  🟡 Pending  2h    •••  │   │
  │            │  │ jane@ex.com      Team Lead 🟢 Accepted 1d    •••  │   │
  │            │  │ bob@ex.com       Employee  ⚪ Expired  7d    •••  │   │
  │            │  │ [Link Invite]    HR Manager 🟡 Pending 3d    •••  │   │
  │            │  │ 2/10 uses                                        │   │
  │            │  └─────────────────────────────────────────────────┘   │
  │            │                                                         │
  └─────────────────────────────────────────────────────────────────────┘

components:
  header:
    - PageTitle: "Invitations"
    - CreateInviteDropdown
      - "Invite by Email" → /company/invites/create
      - "Bulk Import" → /company/invites/bulk
      - "Create Link" → opens dialog
  
  tabs:
    - All (count: total)
    - Pending (count: pending, badge: true)
    - Accepted (count: accepted)
    - Expired/Cancelled (count: expired + cancelled)
  
  toolbar:
    - SearchInput
      - placeholder: "Search by email..."

table_columns:
  - key: recipient
    header: "Recipient"
    content: |
      EMAIL type: email address
      LINK type: "Invite Link" + copy button
      Secondary: Uses count for LINK type
  
  - key: role
    header: "Role"
    content: RoleBadge
  
  - key: status
    header: "Status"
    content: StatusBadge
  
  - key: sentAt
    header: "Sent"
    content: "Relative time"
    sortable: true
  
  - key: expiresAt
    header: "Expires"
    content: |
      "in X days" if pending
      "Expired" if past
    condition: "status === PENDING"
  
  - key: actions
    header: ""
    content: DropdownMenu
    items:
      - label: "Copy Invite Link"
        action: "Copy to clipboard"
        condition: "inviteType === LINK"
      - label: "Resend Email"
        action: "Resend invite"
        condition: "inviteType === EMAIL && status === PENDING"
      - separator: true
      - label: "Cancel Invite"
        action: "Open cancel dialog"
        condition: "status === PENDING"
        variant: destructive
        roles_for_others: [COMPANY_ADMIN]
        note: "HR_MANAGER can only cancel own invites"

dialogs:
  create_link_invite:
    title: "Create Invite Link"
    description: "Create a reusable invite link for multiple people"
    form:
      - field: role
        type: select
        label: "Role for invitees"
        options: [EMPLOYEE, TEAM_LEAD, HR_MANAGER]
        default: EMPLOYEE
      - field: maxUses
        type: number
        label: "Maximum uses"
        placeholder: "Unlimited"
        min: 1
      - field: expiresIn
        type: select
        label: "Link expires in"
        options: [7 days, 14 days, 30 days, Never]
        default: "7 days"
    confirm: "Create Link"
    api: "POST /api/v1/b2b/invite"
    success:
      - Show link in modal with copy button
      - Toast: "Invite link created"
  
  cancel_invite:
    title: "Cancel Invitation"
    description: "This will invalidate the invitation. The recipient won't be able to join."
    confirm: "Cancel Invite"
    api: "DELETE /api/v1/b2b/invite/:id"
    success:
      toast: "Invitation cancelled"

empty_states:
  all:
    icon: Mail
    title: "No invitations yet"
    description: "Invite team members to join your company"
    action: "Send Invitation"
  
  pending:
    icon: Clock
    title: "No pending invitations"
    description: "All invitations have been accepted or expired"
  
  accepted:
    icon: CheckCircle
    title: "No accepted invitations"
    description: "Accepted invitations will appear here"

api_integration:
  endpoint: "GET /api/v1/b2b/invites"
  params:
    search: "email"
    status: "InviteStatus"
    page: "number"
    limit: "number"
```

---

### Page: Create Invite

```yaml
page:
  id: B2B-INVITE-CREATE
  path: /company/invites/create
  title: "Invite Team Member"
  permissions: [COMPANY_ADMIN, HR_MANAGER]

wireframe: |
  ┌─────────────────────────────────────────────────────────────────────┐
  │ [Sidebar]  │  ← Back to Invitations                                 │
  │            │                                                         │
  │            │  Invite Team Member                                    │
  │            │                                                         │
  │            │  ┌───────────────────────────────────────────────────┐ │
  │            │  │                                                   │ │
  │            │  │   Email Address *                                 │ │
  │            │  │   ┌─────────────────────────────────────────┐    │ │
  │            │  │   │ colleague@company.com                   │    │ │
  │            │  │   └─────────────────────────────────────────┘    │ │
  │            │  │                                                   │ │
  │            │  │   Role *                                          │ │
  │            │  │   ┌─────────────────────────────────────────┐    │ │
  │            │  │   │ Employee                            ▼   │    │ │
  │            │  │   └─────────────────────────────────────────┘    │ │
  │            │  │   This person will join as an Employee           │ │
  │            │  │                                                   │ │
  │            │  │   Personal Message (optional)                     │ │
  │            │  │   ┌─────────────────────────────────────────┐    │ │
  │            │  │   │ Welcome to the team! Looking forward   │    │ │
  │            │  │   │ to working with you.                   │    │ │
  │            │  │   └─────────────────────────────────────────┘    │ │
  │            │  │   This message will be included in the email     │ │
  │            │  │                                                   │ │
  │            │  │              [Cancel]  [Send Invitation]         │ │
  │            │  │                                                   │ │
  │            │  └───────────────────────────────────────────────────┘ │
  │            │                                                         │
  │            │  Need to invite multiple people?                       │
  │            │  Use bulk import →                                     │
  │            │                                                         │
  └─────────────────────────────────────────────────────────────────────┘

form:
  fields:
    - name: email
      type: email
      label: "Email Address"
      required: true
      placeholder: "colleague@company.com"
      validation:
        - required: "Email is required"
        - email: "Please enter a valid email"
    
    - name: role
      type: select
      label: "Role"
      required: true
      options:
        - value: EMPLOYEE
          label: "Employee"
          description: "Standard team member access"
        - value: TEAM_LEAD
          label: "Team Lead"
          description: "Can view their team members"
        - value: HR_MANAGER
          label: "HR Manager"
          description: "Can invite members and view all"
          condition: "currentUser.role === COMPANY_ADMIN"
        - value: COMPANY_ADMIN
          label: "Company Admin"
          description: "Full administrative access"
          condition: "currentUser.role === COMPANY_ADMIN"
      default: EMPLOYEE
    
    - name: personalMessage
      type: textarea
      label: "Personal Message"
      required: false
      placeholder: "Add a welcome message..."
      maxLength: 500
      helper: "This message will be included in the invitation email"

actions:
  cancel:
    label: "Cancel"
    action: "Navigate to /company/invites"
  
  submit:
    label: "Send Invitation"
    loading_label: "Sending..."
    api: "POST /api/v1/b2b/invite"
    body:
      email: "form.email"
      role: "form.role"
      personalMessage: "form.personalMessage"
    success:
      toast: "Invitation sent to {email}"
      action: "Navigate to /company/invites"
    errors:
      409_EMAIL_EXISTS:
        message: "This email already has a pending invitation"
        action: "Show link to existing invite"
      409_ALREADY_MEMBER:
        message: "This person is already a member of your company"
      403_SEAT_LIMIT:
        message: "You've reached your seat limit. Contact support to upgrade."

validations:
  on_blur: true
  on_submit: true
```

---

### Page: Bulk Invite

```yaml
page:
  id: B2B-INVITE-BULK
  path: /company/invites/bulk
  title: "Bulk Import"
  permissions: [COMPANY_ADMIN, HR_MANAGER]

wireframe: |
  ┌─────────────────────────────────────────────────────────────────────┐
  │ [Sidebar]  │  ← Back to Invitations                                 │
  │            │                                                         │
  │            │  Bulk Import                                           │
  │            │                                                         │
  │            │  ┌───────────────────────────────────────────────────┐ │
  │            │  │                                                   │ │
  │            │  │   Step 1: Download Template                       │ │
  │            │  │                                                   │ │
  │            │  │   [📥 Download CSV Template]                      │ │
  │            │  │                                                   │ │
  │            │  │   The template includes columns for:              │ │
  │            │  │   • email (required)                              │ │
  │            │  │   • role (optional, default: EMPLOYEE)            │ │
  │            │  │   • personal_message (optional)                   │ │
  │            │  │                                                   │ │
  │            │  └───────────────────────────────────────────────────┘ │
  │            │                                                         │
  │            │  ┌───────────────────────────────────────────────────┐ │
  │            │  │                                                   │ │
  │            │  │   Step 2: Upload Your File                        │ │
  │            │  │                                                   │ │
  │            │  │   ┌─────────────────────────────────────────┐    │ │
  │            │  │   │                                         │    │ │
  │            │  │   │     📁 Drop CSV file here               │    │ │
  │            │  │   │        or click to browse               │    │ │
  │            │  │   │                                         │    │ │
  │            │  │   └─────────────────────────────────────────┘    │ │
  │            │  │                                                   │ │
  │            │  └───────────────────────────────────────────────────┘ │
  │            │                                                         │
  │            │  [After upload - Preview Table]                        │
  │            │  ┌───────────────────────────────────────────────────┐ │
  │            │  │ Email            Role       Message    Status     │ │
  │            │  ├───────────────────────────────────────────────────┤ │
  │            │  │ john@ex.com      Employee   Welcome!   ✅ Valid   │ │
  │            │  │ invalid-email    Employee   -          ❌ Invalid │ │
  │            │  │ jane@ex.com      Team Lead  Hi there   ✅ Valid   │ │
  │            │  └───────────────────────────────────────────────────┘ │
  │            │                                                         │
  │            │  3 valid, 1 invalid                                    │
  │            │                                                         │
  │            │             [Cancel]  [Send 3 Invitations]             │
  │            │                                                         │
  └─────────────────────────────────────────────────────────────────────┘

steps:
  1_download:
    title: "Download Template"
    content:
      - DownloadButton (CSV template)
      - Template description
    template_format: |
      email,role,personal_message
      john@company.com,EMPLOYEE,Welcome to the team!
      jane@company.com,TEAM_LEAD,

  2_upload:
    title: "Upload Your File"
    component: FileDropzone
    accept: ".csv"
    maxSize: "1MB"
    maxRows: 100

  3_preview:
    title: "Review & Send"
    condition: "file uploaded and parsed"
    components:
      - PreviewTable
        - columns: [email, role, message, status]
        - status: Valid/Invalid with reason
      - Summary
        - valid_count
        - invalid_count
        - seat_warning (if exceeds limit)
      - ActionButtons
        - Cancel
        - Send (disabled if all invalid)

validation:
  per_row:
    email:
      - required
      - valid email format
      - not duplicate in file
      - not existing pending invite
      - not existing member
    role:
      - valid B2BRole (if provided)
      - HR_MANAGER can't invite COMPANY_ADMIN
    personal_message:
      - max 500 characters

preview_table:
  columns:
    - email: "Email address"
    - role: "Role (badge)"
    - message: "Message preview (truncated)"
    - status:
        valid: "✅ Valid"
        invalid: "❌ {reason}"
        warning: "⚠️ {warning}"

api_integration:
  endpoint: "POST /api/v1/b2b/invite/bulk"
  body:
    invites: [
      { email, role, personalMessage }
    ]
  response:
    success: "Array of created invites"
    partial:
      - created: "Successfully created invites"
      - failed: "Failed invites with reasons"
  
success_handling:
  all_success:
    toast: "All {count} invitations sent successfully"
    action: "Navigate to /company/invites"
  
  partial_success:
    dialog:
      title: "Invitations Partially Sent"
      content: |
        {successCount} invitations sent successfully
        {failCount} invitations failed:
        [List of failed emails with reasons]
      action: "View Invitations"
```

---

## STATE PATTERNS

### Loading States

```yaml
loading_patterns:
  
  page_initial:
    description: "First load of a page"
    component: "Full page skeleton"
    elements:
      - Skeleton header
      - Skeleton toolbar
      - Skeleton table (5-10 rows)
    duration: "Show immediately, hide on data load"
  
  table_loading:
    description: "Table data refresh (filter, page change)"
    component: "Overlay with spinner"
    behavior:
      - Keep existing data visible
      - Overlay with semi-transparent background
      - Centered spinner
    duration: "Show after 200ms delay"
  
  button_loading:
    description: "Action in progress"
    component: "Button with spinner"
    behavior:
      - Replace button text with spinner + "Loading..."
      - Disable button
      - Disable form if applicable
  
  inline_loading:
    description: "Small inline operations"
    component: "Spinner icon"
    examples:
      - Session revoke
      - Role update
```

### Empty States

```yaml
empty_state_patterns:
  
  no_data:
    description: "Resource has never had data"
    components:
      - Icon (relevant to resource)
      - Title
      - Description
      - Primary action (if applicable)
    example:
      icon: Users
      title: "No team members yet"
      description: "Start building your team by inviting members"
      action: "Invite Members"
  
  no_results:
    description: "Search/filter returned no results"
    components:
      - Icon (Search)
      - Title
      - Description
      - Clear filters action
    example:
      icon: Search
      title: "No matching results"
      description: "Try adjusting your search or filters"
      action: "Clear filters"
  
  permission_restricted:
    description: "User lacks permission to view"
    components:
      - Icon (Lock)
      - Title
      - Description
    example:
      icon: Lock
      title: "Access Restricted"
      description: "You don't have permission to view this content"
```

### Error States

```yaml
error_patterns:
  
  page_error:
    description: "Failed to load page data"
    component: Alert (destructive variant)
    content:
      - Error message
      - Retry button
      - Support link (if persistent)
  
  action_error:
    description: "Action failed"
    component: Toast (destructive variant)
    content:
      - Error message from API
      - Auto-dismiss after 5s
    persistence: "Keep form data intact"
  
  validation_error:
    description: "Form validation failed"
    component: Inline field errors
    content:
      - Error message below field
      - Red border on field
      - Summary at form top (if multiple)
  
  network_error:
    description: "Network connectivity issue"
    component: Toast + retry
    content:
      - "Connection lost. Retrying..."
      - Auto-retry with backoff
      - Manual retry button

error_messages:
  # API Error Code → User Message mapping
  AUTH_TOKEN_INVALID: "Your session has expired. Please log in again."
  AUTH_ACCOUNT_SUSPENDED: "Your account has been suspended. Contact support."
  AUTH_ACCOUNT_LOCKED: "Account locked due to too many attempts. Try again in {minutes} minutes."
  B2B_INVITE_EXPIRED: "This invitation has expired."
  B2B_INVITE_CANCELLED: "This invitation has been cancelled."
  B2B_SEAT_LIMIT_REACHED: "Your company has reached its seat limit."
  B2B_ALREADY_MEMBER: "This user is already a member of a company."
  RATE_LIMIT_EXCEEDED: "Too many requests. Please wait a moment."
  NETWORK_ERROR: "Connection error. Please check your internet."
  UNKNOWN_ERROR: "Something went wrong. Please try again."
```

### Success States

```yaml
success_patterns:
  
  toast_notification:
    description: "Standard success feedback"
    component: Toast (default variant)
    duration: 3000ms
    examples:
      - "User suspended successfully"
      - "Invitation sent to john@example.com"
      - "Role updated successfully"
  
  inline_confirmation:
    description: "Confirmation within context"
    component: Checkmark animation
    usage: "Row-level actions"
    examples:
      - Session revoked → Row shows check, then removes
      - Copy to clipboard → Button shows "Copied!"
  
  redirect_with_message:
    description: "Navigate after success"
    behavior:
      - Perform action
      - Show toast
      - Navigate to target
    examples:
      - Create invite → Toast → Redirect to list
```

---

## PERMISSION SYSTEM

### Permission Matrix - Back Office

```yaml
backoffice_permissions:
  
  SUPER_ADMIN:
    description: "Full platform access"
    users:
      list: true
      view: true
      suspend: true
      reactivate: true
      impersonate: true
    audit_logs:
      view: true
      export: true
    notes: "Can perform all actions"
  
  SUPPORT_AGENT:
    description: "Customer support access"
    users:
      list: true
      view: true
      suspend: false
      reactivate: false
      impersonate: true
    audit_logs:
      view: true
      filter: "own_actions_only"
      export: false
    notes: "Can impersonate for troubleshooting, cannot modify accounts"
  
  B2B_MANAGER:
    description: "B2B account management"
    users:
      list: true
      filter: "b2b_only"
      view: true
      suspend: false
      reactivate: false
      impersonate: false
    audit_logs:
      view: false
    notes: "Limited to B2B user oversight"
```

### Permission Matrix - B2B App

```yaml
b2b_permissions:
  
  COMPANY_ADMIN:
    description: "Full company access"
    members:
      list: true
      filter: "all"
      view: true
      change_role: true
      remove: true
    invites:
      list: true
      create_email: true
      create_link: true
      create_bulk: true
      cancel_any: true
    notes: "Full administrative control"
  
  HR_MANAGER:
    description: "HR and recruitment access"
    members:
      list: true
      filter: "all"
      view: true
      change_role: false
      remove: false
    invites:
      list: true
      create_email: true
      create_link: true
      create_bulk: true
      cancel_own: true
      cancel_others: false
    notes: "Can manage invitations, view all members"
  
  TEAM_LEAD:
    description: "Team oversight access"
    members:
      list: true
      filter: "own_team"
      view: true
      change_role: false
      remove: false
    invites:
      list: false
      create: false
      cancel: false
    notes: "Limited to team visibility only"
```

### Implementation Pattern

```typescript
// Access Control Provider (Refine.js)
// apps/client/src/app/providers/access-control.ts

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action, params }) => {
    const user = getCurrentUser();
    const role = user?.b2bRole;
    
    // Define permission rules
    const permissions: Record<string, Record<string, B2BRole[]>> = {
      members: {
        list: ['COMPANY_ADMIN', 'HR_MANAGER', 'TEAM_LEAD'],
        show: ['COMPANY_ADMIN', 'HR_MANAGER', 'TEAM_LEAD'],
        edit: ['COMPANY_ADMIN'],
        delete: ['COMPANY_ADMIN'],
      },
      invites: {
        list: ['COMPANY_ADMIN', 'HR_MANAGER'],
        create: ['COMPANY_ADMIN', 'HR_MANAGER'],
        delete: ['COMPANY_ADMIN', 'HR_MANAGER'], // HR can only delete own
      },
    };
    
    const allowedRoles = permissions[resource]?.[action] || [];
    const canAccess = allowedRoles.includes(role);
    
    // Special case: HR_MANAGER can only cancel own invites
    if (resource === 'invites' && action === 'delete' && role === 'HR_MANAGER') {
      const invite = params?.invite;
      if (invite?.invitedByUserId !== user.id) {
        return { can: false, reason: 'Can only cancel your own invites' };
      }
    }
    
    // Special case: TEAM_LEAD sees filtered members
    if (resource === 'members' && role === 'TEAM_LEAD') {
      return { 
        can: true, 
        filter: { teamLeadId: user.id } // Applied as API filter
      };
    }
    
    return { can: canAccess };
  },
};
```

---

## IMPLEMENTATION GUIDE

### Phase 1: Foundation (Week 1)

```yaml
tasks:
  1.1_setup_apps:
    description: "Configure both Refine.js applications"
    subtasks:
      - Install Refine.js dependencies
      - Configure Tailwind + shadcn/ui
      - Setup auth providers
      - Configure routing
    files:
      - apps/backoffice/src/app/App.tsx
      - apps/client/src/app/App.tsx
  
  1.2_shared_components:
    description: "Create shared UI components"
    subtasks:
      - StatusBadge
      - RoleBadge
      - EmptyState
      - ConfirmDialog
      - DataTableToolbar
    location: packages/ui/src/lib/
  
  1.3_layouts:
    description: "Create app layouts"
    subtasks:
      - MainLayout with sidebar
      - CenteredCardLayout for login
      - ImpersonationBanner
    files:
      - apps/backoffice/src/layouts/
      - apps/client/src/layouts/
```

### Phase 2: Back Office (Week 2)

```yaml
tasks:
  2.1_login:
    description: "Implement backoffice login"
    acceptance:
      - Firebase authentication
      - Role validation
      - Error handling
  
  2.2_user_list:
    description: "Implement user listing page"
    acceptance:
      - Search and filters
      - Pagination
      - Role-based visibility
      - Action menu
  
  2.3_user_detail:
    description: "Implement user detail page"
    acceptance:
      - All info cards
      - Session management
      - Suspend/reactivate
      - Impersonation
  
  2.4_audit_logs:
    description: "Implement audit log page"
    acceptance:
      - Event type filtering
      - Date range picker
      - Expandable details
```

### Phase 3: B2B App (Week 3)

```yaml
tasks:
  3.1_login:
    description: "Implement B2B login"
    acceptance:
      - Firebase authentication
      - Social login buttons
      - B2B validation
  
  3.2_invite_accept:
    description: "Implement invite acceptance"
    acceptance:
      - Public page
      - All invite states
      - Auth flow integration
  
  3.3_member_list:
    description: "Implement member listing"
    acceptance:
      - Role-based filtering
      - Role change dialog
      - Remove member
      - Welcome banner
  
  3.4_invites:
    description: "Implement invite management"
    acceptance:
      - List with tabs
      - Create single
      - Create link
      - Bulk import
      - Cancel invite
```

### Phase 4: Polish (Week 4)

```yaml
tasks:
  4.1_error_handling:
    description: "Comprehensive error handling"
    subtasks:
      - Global error boundary
      - API error mapping
      - Network error handling
  
  4.2_loading_states:
    description: "All loading states"
    subtasks:
      - Page skeletons
      - Button loading
      - Table overlay
  
  4.3_empty_states:
    description: "All empty states"
    subtasks:
      - No data states
      - No results states
      - First-time experience
  
  4.4_accessibility:
    description: "Accessibility review"
    subtasks:
      - Keyboard navigation
      - Screen reader labels
      - Focus management
  
  4.5_testing:
    description: "E2E testing"
    subtasks:
      - Critical flows
      - Permission tests
      - Error scenarios
```

### File Checklist

```yaml
backoffice_files:
  - [ ] apps/backoffice/src/app/App.tsx
  - [ ] apps/backoffice/src/app/routes.tsx
  - [ ] apps/backoffice/src/app/providers/auth-provider.ts
  - [ ] apps/backoffice/src/app/providers/access-control.ts
  - [ ] apps/backoffice/src/layouts/main-layout.tsx
  - [ ] apps/backoffice/src/components/sidebar-nav.tsx
  - [ ] apps/backoffice/src/pages/login/index.tsx
  - [ ] apps/backoffice/src/pages/users/list.tsx
  - [ ] apps/backoffice/src/pages/users/show.tsx
  - [ ] apps/backoffice/src/pages/users/components/user-table.tsx
  - [ ] apps/backoffice/src/pages/users/components/user-filters.tsx
  - [ ] apps/backoffice/src/pages/users/components/user-detail-card.tsx
  - [ ] apps/backoffice/src/pages/users/components/suspend-dialog.tsx
  - [ ] apps/backoffice/src/pages/users/components/impersonate-button.tsx
  - [ ] apps/backoffice/src/pages/audit-logs/list.tsx
  - [ ] apps/backoffice/src/pages/audit-logs/components/audit-table.tsx
  - [ ] apps/backoffice/src/pages/audit-logs/components/audit-filters.tsx

b2b_app_files:
  - [ ] apps/client/src/app/App.tsx
  - [ ] apps/client/src/app/routes.tsx
  - [ ] apps/client/src/app/providers/auth-provider.ts
  - [ ] apps/client/src/app/providers/access-control.ts
  - [ ] apps/client/src/layouts/main-layout.tsx
  - [ ] apps/client/src/components/sidebar-nav.tsx
  - [ ] apps/client/src/components/welcome-banner.tsx
  - [ ] apps/client/src/pages/login/index.tsx
  - [ ] apps/client/src/pages/invite-accept/index.tsx
  - [ ] apps/client/src/pages/members/list.tsx
  - [ ] apps/client/src/pages/members/components/member-table.tsx
  - [ ] apps/client/src/pages/members/components/member-filters.tsx
  - [ ] apps/client/src/pages/members/components/role-select.tsx
  - [ ] apps/client/src/pages/members/components/remove-member-dialog.tsx
  - [ ] apps/client/src/pages/invites/list.tsx
  - [ ] apps/client/src/pages/invites/create.tsx
  - [ ] apps/client/src/pages/invites/bulk-create.tsx
  - [ ] apps/client/src/pages/invites/components/invite-table.tsx
  - [ ] apps/client/src/pages/invites/components/invite-form.tsx
  - [ ] apps/client/src/pages/invites/components/bulk-upload.tsx
  - [ ] apps/client/src/pages/invites/components/cancel-invite-dialog.tsx

shared_ui_files:
  - [ ] packages/ui/src/lib/status-badge.tsx
  - [ ] packages/ui/src/lib/role-badge.tsx
  - [ ] packages/ui/src/lib/empty-state.tsx
  - [ ] packages/ui/src/lib/confirm-dialog.tsx
  - [ ] packages/ui/src/lib/data-table-toolbar.tsx
  - [ ] packages/ui/src/lib/impersonation-banner.tsx
  - [ ] packages/ui/src/lib/file-dropzone.tsx
```

---

## APPENDIX

### A. API Endpoint Summary

```yaml
backoffice_api:
  auth:
    - POST /api/v1/auth/login
    - POST /api/v1/auth/logout
    - GET /api/v1/auth/me
  
  users:
    - GET /api/v1/admin/users
    - GET /api/v1/admin/users/:id
    - POST /api/v1/admin/users/:id/suspend
    - POST /api/v1/admin/users/:id/reactivate
    - POST /api/v1/admin/users/:id/impersonate
    - POST /api/v1/admin/impersonate/end
    - GET /api/v1/admin/users/:id/sessions
    - DELETE /api/v1/admin/users/:id/sessions/:sessionId
    - POST /api/v1/admin/users/:id/sessions/revoke-all
  
  audit:
    - GET /api/v1/admin/audit-logs

b2b_api:
  auth:
    - POST /api/v1/auth/login
    - POST /api/v1/auth/logout
    - GET /api/v1/auth/me
  
  invites:
    - GET /api/v1/b2b/invite/:code (public)
    - POST /api/v1/b2b/invite/accept
    - GET /api/v1/b2b/invites
    - POST /api/v1/b2b/invite
    - POST /api/v1/b2b/invite/bulk
    - DELETE /api/v1/b2b/invite/:id
  
  members:
    - GET /api/v1/b2b/members
    - PUT /api/v1/b2b/members/:id/role
    - DELETE /api/v1/b2b/members/:id
    - POST /api/v1/b2b/leave
```

### B. Keyboard Shortcuts

```yaml
shortcuts:
  global:
    - key: "Cmd/Ctrl + K"
      action: "Open command palette / search"
    - key: "Escape"
      action: "Close modal/dialog"
  
  tables:
    - key: "Enter"
      action: "Open selected row"
    - key: "Arrow Up/Down"
      action: "Navigate rows"
  
  forms:
    - key: "Cmd/Ctrl + Enter"
      action: "Submit form"
    - key: "Escape"
      action: "Cancel / close"
```

### C. Browser Support

```yaml
browsers:
  supported:
    - Chrome 90+
    - Firefox 88+
    - Safari 14+
    - Edge 90+
  
  not_supported:
    - Internet Explorer (any version)
```

---

## DOCUMENT END

```yaml
document_status: complete
total_pages: 10 (Back Office: 4, B2B App: 4, Shared: 2)
total_components: 25+ custom components
estimated_implementation: 4 weeks
```
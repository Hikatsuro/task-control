import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { AppShell, StorageRecovery, Toasts } from './components/AppShell';
import { NotFound } from './components/ui';
import { useWorkspace } from './state/workspace-context';
const Landing = lazy(() => import('./pages/landing/Landing').then((m) => ({ default: m.Landing })));
const Auth = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Auth })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Projects = lazy(() => import('./pages/Projects').then((m) => ({ default: m.Projects })));
const ProjectDetail = lazy(() =>
  import('./pages/Projects').then((m) => ({ default: m.ProjectDetail })),
);
const ProjectForm = lazy(() =>
  import('./pages/Projects').then((m) => ({ default: m.ProjectForm })),
);
const Tasks = lazy(() => import('./pages/tasks/TaskList').then((m) => ({ default: m.Tasks })));
const TaskDetail = lazy(() =>
  import('./pages/tasks/TaskDetail').then((m) => ({ default: m.TaskDetail })),
);
const TaskForm = lazy(() =>
  import('./pages/tasks/TaskForm').then((m) => ({ default: m.TaskForm })),
);
const Board = lazy(() => import('./pages/tasks/Board').then((m) => ({ default: m.Board })));
const Calendar = lazy(() =>
  import('./pages/tasks/Calendar').then((m) => ({ default: m.Calendar })),
);
const Clients = lazy(() => import('./pages/Clients').then((m) => ({ default: m.Clients })));
const ClientDetail = lazy(() =>
  import('./pages/Clients').then((m) => ({ default: m.ClientDetail })),
);
const ClientForm = lazy(() => import('./pages/Clients').then((m) => ({ default: m.ClientForm })));
const Team = lazy(() => import('./pages/Team').then((m) => ({ default: m.Team })));
const UserForm = lazy(() => import('./pages/Team').then((m) => ({ default: m.UserForm })));
const Departments = lazy(() => import('./pages/Team').then((m) => ({ default: m.Departments })));
const DepartmentForm = lazy(() =>
  import('./pages/Team').then((m) => ({ default: m.DepartmentForm })),
);
const MemberDetail = lazy(() => import('./pages/Team').then((m) => ({ default: m.MemberDetail })));
const Notifications = lazy(() =>
  import('./pages/Settings').then((m) => ({ default: m.Notifications })),
);
const Profile = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Profile })));
const Security = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Security })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
const Reports = lazy(() => import('./pages/Reports').then((m) => ({ default: m.Reports })));
const Assistant = lazy(() =>
  import('./pages/Intelligence').then((m) => ({ default: m.Assistant })),
);
const Forecast = lazy(() => import('./pages/Intelligence').then((m) => ({ default: m.Forecast })));
const Billing = lazy(() => import('./pages/Billing').then((m) => ({ default: m.Billing })));
const Checkout = lazy(() => import('./pages/Billing').then((m) => ({ default: m.Checkout })));
const PaymentResult = lazy(() =>
  import('./pages/Billing').then((m) => ({ default: m.PaymentResult })),
);
const Help = lazy(() => import('./pages/Help').then((m) => ({ default: m.Help })));

export function App() {
  const { data, user, error } = useWorkspace();
  const location = useLocation();
  const reduced = !!(user && data.settings.notifications[`${user.id}:reducedMotion`]);
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reduced);
  }, [reduced]);
  useEffect(() => {
    window.scrollTo(0, 0);
    const titles: Record<string, string> = {
      '/': 'TaskControl — планирование и контроль задач',
      '/login': 'Вход — TaskControl',
      '/forgot-password': 'Восстановление доступа — TaskControl',
      '/reset-password': 'Новый пароль — TaskControl',
    };
    const heading = document.querySelector('h1')?.textContent;
    document.title =
      titles[location.pathname] ??
      (heading ? `${heading} — TaskControl` : 'TaskControl — планирование и контроль задач');
  }, [location.pathname]);
  if (error)
    return (
      <>
        <StorageRecovery />
        <Toasts />
      </>
    );
  return (
    <MotionConfig
      reducedMotion={
        user && data.settings.notifications[`${user.id}:reducedMotion`] ? 'always' : 'user'
      }
      transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <Suspense
        fallback={
          <div className="loading-screen" role="status">
            Открываем TaskControl…
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Auth key="login" />} />
          <Route path="/server" element={<Navigate to="/app/projects" replace />} />
          <Route path="/forgot-password" element={<Auth key="forgot" mode="forgot" />} />
          <Route path="/reset-password" element={<Auth key="reset" mode="reset" />} />
          <Route path="/app" element={<AppShell />}>
            <Route index element={<Dashboard />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/new" element={<ProjectForm />} />
            <Route path="projects/:id/edit" element={<ProjectForm />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="archive" element={<Navigate to="/app/projects?tab=archived" replace />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="tasks/new" element={<TaskForm />} />
            <Route path="tasks/:id/edit" element={<TaskForm />} />
            <Route path="tasks/:id/history" element={<TaskDetail key="history" historyOnly />} />
            <Route path="tasks/:id/return" element={<TaskDetail key="return" returnOnly />} />
            <Route path="tasks/:id" element={<TaskDetail />} />
            <Route path="board" element={<Board />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/new" element={<ClientForm />} />
            <Route path="clients/:id/edit" element={<ClientForm />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="team" element={<Team />} />
            <Route path="team/:id" element={<MemberDetail />} />
            <Route path="users" element={<Team admin />} />
            <Route path="users/new" element={<UserForm />} />
            <Route path="users/:id/edit" element={<UserForm />} />
            <Route path="departments" element={<Departments />} />
            <Route path="departments/new" element={<DepartmentForm />} />
            <Route path="departments/:id/edit" element={<DepartmentForm />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Profile />} />
            <Route path="profile/security" element={<Security />} />
            <Route path="settings" element={<Settings />} />
            <Route path="settings/notifications" element={<Settings notificationsOnly />} />
            <Route path="reports" element={<Reports />} />
            <Route path="assistant" element={<Assistant />} />
            <Route path="forecast" element={<Forecast />} />
            <Route path="billing" element={<Billing />} />
            <Route path="billing/checkout" element={<Checkout />} />
            <Route path="billing/result" element={<PaymentResult />} />
            <Route path="help" element={<Help />} />
            <Route path="help/:page" element={<Help />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route
            path="*"
            element={
              <div className="public-not-found">
                <NotFound />
              </div>
            }
          />
        </Routes>
      </Suspense>
      <Toasts />
    </MotionConfig>
  );
}

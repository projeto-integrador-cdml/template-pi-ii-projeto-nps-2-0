import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ClientsPage from "./pages/ClientsPage";
import ClientDetailPage from "./pages/ClientDetailPage";
import PipelinePage from "./pages/PipelinePage";
import TasksPage from "./pages/TasksPage";
import AIAssistantPage from "./pages/AIAssistantPage";
import RecordingsPage from "./pages/RecordingsPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AttendantsPage from "./pages/AttendantsPage";
import SettingsPage from "./pages/SettingsPage";
import WhatsAppPage from "./pages/WhatsAppPage";
import ReportsPage from "./pages/ReportsPage";
import NotFound from "./pages/NotFound";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/clients" component={ClientsPage} />
        <Route path="/clients/:id" component={ClientDetailPage} />
        <Route path="/pipeline" component={PipelinePage} />
        <Route path="/tasks" component={TasksPage} />
        <Route path="/ai" component={AIAssistantPage} />
        <Route path="/recordings" component={RecordingsPage} />
        <Route path="/whatsapp" component={WhatsAppPage} />
        <Route path="/reports" component={ReportsPage} />
        <Route path="/admin/users" component={AdminUsersPage} />
        <Route path="/admin/attendants" component={AttendantsPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

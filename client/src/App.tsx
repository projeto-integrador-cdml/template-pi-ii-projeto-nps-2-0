import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import PlansPage from "./pages/PlansPage";
import ContactPage from "./pages/ContactPage";
import HelpCenterPage from "./pages/HelpCenterPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfUsePage from "./pages/TermsOfUsePage";
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
    <Switch>
      {/* Public routes */}
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/planos" component={PlansPage} />
      <Route path="/contato" component={ContactPage} />
      <Route path="/ajuda" component={HelpCenterPage} />
      <Route path="/politica-de-privacidade" component={PrivacyPolicyPage} />
      <Route path="/termos-de-uso" component={TermsOfUsePage} />

      {/* Protected routes wrapped in DashboardLayout */}
      <Route path="/dashboard">
        <DashboardLayout>
          <Home />
        </DashboardLayout>
      </Route>
      <Route path="/clients">
        <DashboardLayout>
          <ClientsPage />
        </DashboardLayout>
      </Route>
      <Route path="/clients/:id">
        <DashboardLayout>
          <ClientDetailPage />
        </DashboardLayout>
      </Route>
      <Route path="/pipeline">
        <DashboardLayout>
          <PipelinePage />
        </DashboardLayout>
      </Route>
      <Route path="/tasks">
        <DashboardLayout>
          <TasksPage />
        </DashboardLayout>
      </Route>
      <Route path="/ai">
        <DashboardLayout>
          <AIAssistantPage />
        </DashboardLayout>
      </Route>
      <Route path="/recordings">
        <DashboardLayout>
          <RecordingsPage />
        </DashboardLayout>
      </Route>
      <Route path="/whatsapp">
        <DashboardLayout>
          <WhatsAppPage />
        </DashboardLayout>
      </Route>
      <Route path="/reports">
        <DashboardLayout>
          <ReportsPage />
        </DashboardLayout>
      </Route>
      <Route path="/admin/users">
        <DashboardLayout>
          <AdminUsersPage />
        </DashboardLayout>
      </Route>
      <Route path="/admin/attendants">
        <DashboardLayout>
          <AttendantsPage />
        </DashboardLayout>
      </Route>
      <Route path="/settings">
        <DashboardLayout>
          <SettingsPage />
        </DashboardLayout>
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

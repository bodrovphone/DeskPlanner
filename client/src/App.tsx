import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import DeskCalendar from "@/pages/desk-calendar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "@/components/Login";
import MigrationRunner from "@/components/MigrationRunner";
import { Loader2 } from "lucide-react";
import { useState } from "react";

function AppContent() {
  const { user, loading } = useAuth();
  const [migrationCompleted, setMigrationCompleted] = useState(false);

  if (loading) {
    // Show loading spinner while checking auth status
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Show login screen if not authenticated
    return <Login onSuccess={() => window.location.reload()} />;
  }

  // Run migration before showing the main app
  if (!migrationCompleted) {
    return (
      <MigrationRunner onComplete={() => setMigrationCompleted(true)}>
        <DeskCalendar />
      </MigrationRunner>
    );
  }

  // Show the main app if authenticated and migration is complete
  return <DeskCalendar />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <AppContent />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

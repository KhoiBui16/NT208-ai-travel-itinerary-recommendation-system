import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './contexts/AuthContext';
import { TripWizardProvider } from './contexts/TripWizardContext';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <TripWizardProvider>
          <RouterProvider router={router} />
          <Toaster />
        </TripWizardProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
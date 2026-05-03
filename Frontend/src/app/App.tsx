import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './contexts/AuthContext';
import { TripWizardProvider } from './contexts/TripWizardContext';

export default function App() {
  return (
    <AuthProvider>
      <TripWizardProvider>
        <RouterProvider router={router} />
        <Toaster />
      </TripWizardProvider>
    </AuthProvider>
  );
}
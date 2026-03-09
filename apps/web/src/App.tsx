import { ThemeProvider } from './context/ThemeContext';
import { FileProvider } from './context/FileContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './components/auth/Login';
import './styles/global.css';

function AppContent() {
  const { isAuthenticated, isLoading, settings } = useAuth();

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  // If password protection is enabled and user is not authenticated, show login
  if (settings?.passwordEnabled && !isAuthenticated) {
    return <Login />;
  }

  return (
    <Layout />
  );
}

function App() {
  return (
    <ThemeProvider>
      <FileProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </FileProvider>
    </ThemeProvider>
  );
}

export default App;

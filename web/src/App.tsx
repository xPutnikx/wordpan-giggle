import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { UserProvider } from './contexts/UserContext'
import { UserLayout } from './layouts/UserLayout'
import { AuthLayout } from './layouts/AuthLayout'
import { Toaster } from './components/ui/sonner'
import { ErrorBoundary } from './components/ErrorBoundary'
import DashboardPage from './pages/dashboard'
import LoginPage from './pages/login'
import SignUpPage from './pages/signup'
import WordsPage from './pages/words'
import RandomPhrasePage from './pages/random-phrase'
import ProfilePage from './pages/profile'

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <UserProvider>
          <Routes>
            {/* Auth routes with /auth prefix */}
            <Route path="/auth" element={<AuthLayout />}>
              <Route path="login" element={<LoginPage />} />
              <Route path="signup" element={<SignUpPage />} />
            </Route>

            {/* Dashboard routes at root */}
            <Route element={<UserLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/words" element={<WordsPage />} />
              <Route path="/random-phrase" element={<RandomPhrasePage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <Toaster />
        </UserProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App

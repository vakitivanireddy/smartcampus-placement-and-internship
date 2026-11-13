import { Link } from 'react-router-dom';
import { ArrowLeft, Compass, LayoutDashboard, LogIn } from 'lucide-react';
import { Button, Card } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function NotFound() {
  const { isAuthenticated, isAdmin } = useAuth();
  const home = isAdmin ? '/admin' : '/dashboard';

  return (
    <div className="not-found">
      <Card className="not-found-card">
        <span className="not-found-icon">
          <Compass size={30} />
        </span>
        <span className="eyebrow">404 — Page not found</span>
        <h1>This page has moved off the roadmap</h1>
        <p>
          The page you were looking for does not exist, or you may not have access to it. Check the address, or head back to a
          known part of your workspace.
        </p>
        <div className="not-found-actions">
          {isAuthenticated ? (
            <>
              <Button to={home} icon={LayoutDashboard}>
                Back to {isAdmin ? 'admin overview' : 'dashboard'}
              </Button>
              <Button variant="secondary" to="/opportunities" icon={ArrowLeft}>
                Browse opportunities
              </Button>
            </>
          ) : (
            <>
              <Button to="/login" icon={LogIn}>
                Sign in
              </Button>
              <Button variant="secondary" to="/register">
                Create an account
              </Button>
            </>
          )}
        </div>
        <p className="not-found-note">
          Need a hand? Ask your placement cell to check which account role your email is registered with.
        </p>
      </Card>
      <p className="not-found-footer">
        <Link to={isAuthenticated ? home : '/login'}>SmartPlacement</Link> · Career readiness workspace
      </p>
    </div>
  );
}

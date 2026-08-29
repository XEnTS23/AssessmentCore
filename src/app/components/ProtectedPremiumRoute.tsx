import { Navigate } from "react-router";
import { useAuth } from "../../contexts/AuthContext";

interface ProtectedPremiumRouteProps {
  children: React.ReactNode;
}

export function ProtectedPremiumRoute({
  children,
}: ProtectedPremiumRouteProps) {
  const { userUsage, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!userUsage?.is_premium) {
    return <Navigate to="/pricing" replace />;
  }

  return <>{children}</>;
}

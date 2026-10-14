import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { usePermissions } from "../context/PermissionsContext";
import { resolveRequiredSection } from "../lib/routePermissions";

interface ProtectedRouteProps {
  section?: string | null;
  children: React.ReactNode;
}

/**
 * Route guard component for admin routes.
 * Verifies if current admin has permission to view the route.
 * Redirects to /403 if unauthorized.
 */
export default function ProtectedRoute({ section, children }: ProtectedRouteProps) {
  const { can, isSuperAdmin } = usePermissions();
  const location = useLocation();

  // super_admin bypasses all route guards
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // Determine section to check: explicit prop takes precedence, then resolve by pathname
  const requiredSection = section !== undefined ? section : resolveRequiredSection(location.pathname);

  // If section is null or undefined (public like / or unmapped), allow access
  if (!requiredSection) {
    return <>{children}</>;
  }

  // Check if admin has access to this section
  if (!can(requiredSection)) {
    return <Navigate to="/403" state={{ requiredSection, attemptedPath: location.pathname }} replace />;
  }

  return <>{children}</>;
}

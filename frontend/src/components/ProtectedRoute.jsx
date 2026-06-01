import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) {
    const dest = roles?.includes("owner")
      ? "/owner/login"
      : roles?.includes("admin")
      ? "/admin/login"
      : "/login";
    return <Navigate to={dest} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

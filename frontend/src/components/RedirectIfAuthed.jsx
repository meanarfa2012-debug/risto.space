import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * Wrap login pages with this so an already-authenticated user
 * cannot accidentally double-login as a different role.
 * Sends them to their canonical dashboard instead.
 */
export default function RedirectIfAuthed({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (user) {
    const dest =
      user.role === "admin"
        ? "/admin/dashboard"
        : user.role === "owner"
        ? "/owner/dashboard"
        : location.state?.from || "/";
    return <Navigate to={dest} replace />;
  }

  return children;
}

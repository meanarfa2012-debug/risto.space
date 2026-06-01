import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // While the AuthContext is verifying the token with the backend,
  // render a small loader so we never redirect based on stale cached state.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bone">
        <div className="flex flex-col items-center gap-3 text-inkSoft">
          <div className="w-10 h-10 rounded-full border-2 border-gold border-t-transparent animate-spin" />
          <span className="text-xs tracking-widest">جاري التحقق...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    const dest = roles?.includes("owner")
      ? "/owner/login"
      : roles?.includes("admin")
      ? "/admin/login"
      : "/login";
    return <Navigate to={dest} replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role)) {
    // Route the user to the dashboard that matches their actual role
    // instead of dumping them on the homepage (was confusing).
    const map = {
      admin: "/admin/dashboard",
      owner: "/owner/dashboard",
      customer: "/",
    };
    const safeDest = map[user.role] || "/";
    return <Navigate to={safeDest} replace />;
  }

  return children;
}

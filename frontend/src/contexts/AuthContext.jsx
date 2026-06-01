import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

const TOKEN_KEY = "resto_token";
const USER_KEY = "resto_user";

function readCachedUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  // Use cached user only for INSTANT UI on refresh; the real source of truth is the server.
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    return token ? readCachedUser() : null;
  });
  const [loading, setLoading] = useState(true);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const saveAuth = useCallback((token, userObj) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(userObj));
    setUser(userObj);
  }, []);

  // Verify token against the backend on mount; the server response is the authoritative role.
  useEffect(() => {
    let cancelled = false;
    const verify = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }
      try {
        const { data } = await api.get("/auth/me");
        if (cancelled) return;
        // Build a canonical user object derived from the server payload.
        const canonical = {
          id: data.id,
          role: data.role,
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
        };
        localStorage.setItem(USER_KEY, JSON.stringify(canonical));
        setUser(canonical);
      } catch (e) {
        if (cancelled) return;
        // Token invalid / user not found → wipe everything
        clearAuth();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    verify();
    return () => {
      cancelled = true;
    };
  }, [clearAuth]);

  // Cross-tab sync: if token or user changes in another tab, reflect it here.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === TOKEN_KEY) {
        if (!e.newValue) {
          setUser(null);
        } else {
          setUser(readCachedUser());
        }
      }
      if (e.key === USER_KEY) {
        setUser(e.newValue ? JSON.parse(e.newValue) : null);
      }
    };
    window.addEventListener("storage", onStorage);

    // Listen for 401-triggered auth purges from axios interceptor
    const onAuthCleared = () => setUser(null);
    window.addEventListener("resto:auth-cleared", onAuthCleared);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("resto:auth-cleared", onAuthCleared);
    };
  }, []);

  const customerLogin = async (phone, name) => {
    // Ensure no stale session bleeds across role logins
    clearAuth();
    const { data } = await api.post("/auth/customer/login", { phone, name });
    saveAuth(data.token, data.user);
    return data.user;
  };

  const ownerLogin = async (email, password) => {
    clearAuth();
    const { data } = await api.post("/auth/owner/login", { email, password });
    saveAuth(data.token, data.user);
    return data.user;
  };

  const ownerRegister = async (payload) => {
    clearAuth();
    const { data } = await api.post("/auth/owner/register", payload);
    saveAuth(data.token, data.user);
    return data.user;
  };

  const adminLogin = async (email, password) => {
    clearAuth();
    const { data } = await api.post("/auth/admin/login", { email, password });
    saveAuth(data.token, data.user);
    return data.user;
  };

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        customerLogin,
        ownerLogin,
        ownerRegister,
        adminLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem("resto_token");
    const u = localStorage.getItem("resto_user");
    if (t && u) {
      try {
        setUser(JSON.parse(u));
      } catch {
        // ignore
      }
    }
    setLoading(false);
  }, []);

  const saveAuth = (token, userObj) => {
    localStorage.setItem("resto_token", token);
    localStorage.setItem("resto_user", JSON.stringify(userObj));
    setUser(userObj);
  };

  const customerLogin = async (phone, name) => {
    const { data } = await api.post("/auth/customer/login", { phone, name });
    saveAuth(data.token, data.user);
    return data.user;
  };

  const ownerLogin = async (email, password) => {
    const { data } = await api.post("/auth/owner/login", { email, password });
    saveAuth(data.token, data.user);
    return data.user;
  };

  const ownerRegister = async (payload) => {
    const { data } = await api.post("/auth/owner/register", payload);
    saveAuth(data.token, data.user);
    return data.user;
  };

  const adminLogin = async (email, password) => {
    const { data } = await api.post("/auth/admin/login", { email, password });
    saveAuth(data.token, data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("resto_token");
    localStorage.removeItem("resto_user");
    setUser(null);
  };

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

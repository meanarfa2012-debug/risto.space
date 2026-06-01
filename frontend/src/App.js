import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import RedirectIfAuthed from "./components/RedirectIfAuthed";
import HomePage from "./pages/Home";
import ChaletsList from "./pages/ChaletsList";
import ChaletDetail from "./pages/ChaletDetail";
import CustomerLogin from "./pages/CustomerLogin";
import OwnerAuth from "./pages/OwnerAuth";
import OwnerDashboard from "./pages/OwnerDashboard";
import OwnerChaletForm from "./pages/OwnerChaletForm";
import OwnerSlotsPage from "./pages/OwnerSlotsPage";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import MyBookings from "./pages/MyBookings";
import NotificationsPage from "./pages/Notifications";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-center" richColors closeButton dir="rtl" />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/chalets" element={<ChaletsList />} />
            <Route path="/chalets/:slug" element={<ChaletDetail />} />
            <Route path="/login" element={<RedirectIfAuthed><CustomerLogin /></RedirectIfAuthed>} />
            <Route path="/owner/login" element={<RedirectIfAuthed><OwnerAuth /></RedirectIfAuthed>} />
            <Route path="/owner/register" element={<RedirectIfAuthed><OwnerAuth /></RedirectIfAuthed>} />
            <Route
              path="/owner/dashboard"
              element={
                <ProtectedRoute roles={["owner"]}>
                  <OwnerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/chalets/new"
              element={
                <ProtectedRoute roles={["owner"]}>
                  <OwnerChaletForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/chalets/:id/edit"
              element={
                <ProtectedRoute roles={["owner"]}>
                  <OwnerChaletForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/chalets/:id/slots"
              element={
                <ProtectedRoute roles={["owner"]}>
                  <OwnerSlotsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/admin/login" element={<RedirectIfAuthed><AdminLogin /></RedirectIfAuthed>} />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-bookings"
              element={
                <ProtectedRoute roles={["customer"]}>
                  <MyBookings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute roles={["customer", "owner", "admin"]}>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;

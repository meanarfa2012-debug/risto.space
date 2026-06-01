import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, LogOut, Menu, User } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import NotificationsBell from "./NotificationsBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";

export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const nav = useNavigate();

  const isHome = location.pathname === "/";

  return (
    <header
      data-testid="site-header"
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isHome ? "glass-header" : "bg-bone border-b border-border/40"
      }`}
    >
      <div className="container-wide flex items-center justify-between h-20">
        <Link to="/" data-testid="header-logo" className="flex items-center gap-3">
          <span className="font-heading text-3xl font-semibold text-forest tracking-tight">
            ريستو
          </span>
          <span className="hidden sm:block w-px h-6 bg-gold/40" />
          <span className="hidden sm:block text-xs text-inkSoft tracking-widest">
            RESTO · شاليهات فاخرة
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-10">
          <Link
            to="/"
            data-testid="nav-home"
            className="text-sm font-medium text-ink hover:text-gold transition-colors"
          >
            الرئيسية
          </Link>
          <Link
            to="/chalets"
            data-testid="nav-chalets"
            className="text-sm font-medium text-ink hover:text-gold transition-colors"
          >
            الشاليهات
          </Link>
          {user?.role === "customer" && (
            <Link
              to="/my-bookings"
              data-testid="nav-my-bookings"
              className="text-sm font-medium text-ink hover:text-gold transition-colors"
            >
              حجوزاتي
            </Link>
          )}
          {user?.role === "owner" && (
            <Link
              to="/owner/dashboard"
              data-testid="nav-owner-dashboard"
              className="text-sm font-medium text-ink hover:text-gold transition-colors"
            >
              لوحة المالك
            </Link>
          )}
          {user?.role === "admin" && (
            <Link
              to="/admin/dashboard"
              data-testid="nav-admin-dashboard"
              className="text-sm font-medium text-ink hover:text-gold transition-colors"
            >
              لوحة الإدارة
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {user && <NotificationsBell />}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  data-testid="user-menu-trigger"
                  className="rounded-full h-10 px-4 gap-2 hover:bg-forest/5"
                >
                  <span className="inline-flex h-7 w-7 rounded-full bg-forest text-bone items-center justify-center text-xs">
                    {user.name?.charAt(0) || "ض"}
                  </span>
                  <span className="hidden sm:inline text-sm font-medium text-ink">
                    {user.name}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" dir="rtl">
                <DropdownMenuItem disabled className="text-xs text-inkSoft">
                  {user.role === "customer" && "حساب عميل"}
                  {user.role === "owner" && "حساب مالك"}
                  {user.role === "admin" && "حساب مسؤول"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {user.role === "customer" && (
                  <DropdownMenuItem onClick={() => nav("/my-bookings")} data-testid="menu-bookings">
                    <User className="ml-2 h-4 w-4" />
                    حجوزاتي
                  </DropdownMenuItem>
                )}
                {user.role === "owner" && (
                  <DropdownMenuItem onClick={() => nav("/owner/dashboard")} data-testid="menu-owner">
                    <User className="ml-2 h-4 w-4" />
                    لوحة المالك
                  </DropdownMenuItem>
                )}
                {user.role === "admin" && (
                  <DropdownMenuItem onClick={() => nav("/admin/dashboard")} data-testid="menu-admin">
                    <User className="ml-2 h-4 w-4" />
                    لوحة الإدارة
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => nav("/notifications")} data-testid="menu-notifications">
                  <Bell className="ml-2 h-4 w-4" />
                  الإشعارات
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  data-testid="logout-btn"
                  onClick={() => {
                    logout();
                    nav("/");
                  }}
                  className="text-destructive"
                >
                  <LogOut className="ml-2 h-4 w-4" />
                  تسجيل الخروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" data-testid="header-login-btn">
                <Button variant="ghost" className="text-forest hover:text-gold">
                  تسجيل دخول
                </Button>
              </Link>
              <Link to="/owner/login" data-testid="header-owner-btn">
                <Button className="bg-forest text-bone hover:bg-forest-dark rounded-full px-6">
                  أصحاب الشاليهات
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

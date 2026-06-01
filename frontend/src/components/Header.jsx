import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, LogOut, Menu, User, Home, BedDouble, Sparkles, LifeBuoy, ShieldCheck, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import NotificationsBell from "./NotificationsBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "./ui/sheet";
import { Button } from "./ui/button";

export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const nav = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isHome = location.pathname === "/";

  const handleMobileNav = (path) => {
    setMobileOpen(false);
    nav(path);
  };

  const handleLogout = () => {
    setMobileOpen(false);
    logout();
    nav("/");
  };

  return (
    <header
      data-testid="site-header"
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isHome ? "glass-header" : "bg-bone border-b border-border/40"
      }`}
    >
      <div className="container-wide flex items-center justify-between h-20">
        {/* Mobile menu trigger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button
              data-testid="mobile-menu-btn"
              className="md:hidden p-2 -mr-2 rounded-md hover:bg-forest/5 text-forest"
              aria-label="القائمة"
            >
              <Menu size={24} strokeWidth={1.5} />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="bg-bone w-[88%] max-w-sm p-0" dir="rtl">
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/40">
              <SheetTitle className="font-heading text-2xl text-forest text-right">القائمة</SheetTitle>
            </SheetHeader>
            <nav data-testid="mobile-menu" className="px-4 py-4 space-y-1">
              <MobileLink icon={<Home size={16} />} label="الرئيسية" onClick={() => handleMobileNav("/")} testId="mobile-nav-home" />
              <MobileLink icon={<BedDouble size={16} />} label="جميع الشاليهات" onClick={() => handleMobileNav("/chalets")} testId="mobile-nav-chalets" />
              <MobileLink icon={<Sparkles size={16} />} label="الشاليهات المميزة" onClick={() => handleMobileNav("/chalets?featured=true")} testId="mobile-nav-featured" />
              {user?.role === "customer" && (
                <MobileLink icon={<User size={16} />} label="حجوزاتي" onClick={() => handleMobileNav("/my-bookings")} testId="mobile-nav-bookings" />
              )}
              {user?.role === "owner" && (
                <MobileLink icon={<User size={16} />} label="لوحة المالك" onClick={() => handleMobileNav("/owner/dashboard")} testId="mobile-nav-owner" />
              )}
              {user?.role === "admin" && (
                <MobileLink icon={<ShieldCheck size={16} />} label="لوحة الإدارة" onClick={() => handleMobileNav("/admin/dashboard")} testId="mobile-nav-admin" />
              )}
              <MobileLink icon={<LifeBuoy size={16} />} label="الدعم" onClick={() => handleMobileNav("/support")} testId="mobile-nav-support" />
              {user && (
                <MobileLink icon={<Bell size={16} />} label="الإشعارات" onClick={() => handleMobileNav("/notifications")} testId="mobile-nav-notifications" />
              )}

              <div className="pt-3 mt-3 border-t border-border/40">
                {user ? (
                  <button
                    onClick={handleLogout}
                    data-testid="mobile-logout-btn"
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-destructive hover:bg-destructive/10 transition"
                  >
                    <LogOut size={16} strokeWidth={1.5} />
                    <span>تسجيل الخروج</span>
                  </button>
                ) : (
                  <>
                    <MobileLink icon={<User size={16} />} label="تسجيل دخول العميل" onClick={() => handleMobileNav("/login")} testId="mobile-nav-login" />
                    <MobileLink icon={<User size={16} />} label="أصحاب الشاليهات" onClick={() => handleMobileNav("/owner/login")} testId="mobile-nav-owner-login" />
                    <MobileLink icon={<ShieldCheck size={16} />} label="دخول المسؤول" onClick={() => handleMobileNav("/admin/login")} testId="mobile-nav-admin-login" />
                  </>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>

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
          <Link to="/" data-testid="nav-home" className="text-sm font-medium text-ink hover:text-gold transition-colors">الرئيسية</Link>
          <Link to="/chalets" data-testid="nav-chalets" className="text-sm font-medium text-ink hover:text-gold transition-colors">الشاليهات</Link>
          <Link to="/support" data-testid="nav-support" className="text-sm font-medium text-ink hover:text-gold transition-colors">الدعم</Link>
          {user?.role === "customer" && (
            <Link to="/my-bookings" data-testid="nav-my-bookings" className="text-sm font-medium text-ink hover:text-gold transition-colors">حجوزاتي</Link>
          )}
          {user?.role === "owner" && (
            <Link to="/owner/dashboard" data-testid="nav-owner-dashboard" className="text-sm font-medium text-ink hover:text-gold transition-colors">لوحة المالك</Link>
          )}
          {user?.role === "admin" && (
            <Link to="/admin/dashboard" data-testid="nav-admin-dashboard" className="text-sm font-medium text-ink hover:text-gold transition-colors">لوحة الإدارة</Link>
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
                  <span className="hidden sm:inline text-sm font-medium text-ink">{user.name}</span>
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
                <DropdownMenuItem onClick={() => nav("/support")} data-testid="menu-support">
                  <LifeBuoy className="ml-2 h-4 w-4" />
                  الدعم
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  data-testid="logout-btn"
                  onClick={() => { logout(); nav("/"); }}
                  className="text-destructive"
                >
                  <LogOut className="ml-2 h-4 w-4" />
                  تسجيل الخروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link to="/login" data-testid="header-login-btn">
                <Button variant="ghost" className="text-forest hover:text-gold">تسجيل دخول</Button>
              </Link>
              <Link to="/owner/login" data-testid="header-owner-btn">
                <Button className="bg-forest text-bone hover:bg-forest-dark rounded-full px-6">أصحاب الشاليهات</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function MobileLink({ icon, label, onClick, testId }) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-forest/5 text-ink transition text-right"
    >
      <span className="text-gold">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Mail, Lock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Layout from "../components/Layout";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";

export default function AdminLogin() {
  const { adminLogin } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminLogin(email, password);
      toast.success("مرحباً بك أيها المسؤول");
      nav("/admin/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "بيانات غير صحيحة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout hideFooter>
      <div className="min-h-[calc(100vh-5rem)] bg-forest flex items-center justify-center px-6 py-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url(https://images.pexels.com/photos/31299067/pexels-photo-31299067.jpeg?w=2000)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }} />
        <div className="absolute inset-0 bg-forest/85" />

        <div className="relative w-full max-w-md bg-bone rounded-3xl p-10 luxury-shadow">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-full bg-gold/15 grid place-items-center mb-4">
              <Shield size={22} strokeWidth={1.5} className="text-gold" />
            </div>
            <div className="text-xs tracking-[0.3em] text-gold mb-2">منطقة محمية</div>
            <h1 className="font-heading text-3xl text-forest text-center">دخول المسؤول</h1>
            <p className="text-sm text-inkSoft mt-2 text-center">
              لوحة الإدارة الكاملة لمنصة ريستو
            </p>
          </div>

          <form onSubmit={submit} data-testid="admin-login-form" className="space-y-5">
            <div className="relative">
              <Label className="text-xs text-inkSoft mb-2 block">البريد الإلكتروني</Label>
              <Mail size={16} strokeWidth={1.5} className="absolute right-4 top-[42px] text-gold" />
              <Input
                data-testid="admin-email"
                type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                required dir="ltr"
                className="pr-12 h-12 bg-card border-forest/10"
              />
            </div>
            <div className="relative">
              <Label className="text-xs text-inkSoft mb-2 block">كلمة المرور</Label>
              <Lock size={16} strokeWidth={1.5} className="absolute right-4 top-[42px] text-gold" />
              <Input
                data-testid="admin-password"
                type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                required dir="ltr"
                className="pr-12 h-12 bg-card border-forest/10"
              />
            </div>

            <Button
              type="submit" disabled={loading}
              data-testid="admin-submit"
              className="w-full h-12 bg-forest text-bone hover:bg-forest-dark rounded-xl text-base"
            >
              {loading ? "..." : "دخول"}
              <ArrowLeft size={16} className="mr-2" />
            </Button>
          </form>

          <div className="mt-8 text-center">
            <Link to="/" className="text-xs text-inkSoft hover:text-forest">
              ← العودة للرئيسية
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}

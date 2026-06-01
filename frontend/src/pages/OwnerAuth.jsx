import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Mail, Lock, User, Phone, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Layout from "../components/Layout";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useAuth } from "../contexts/AuthContext";

const SIDE_IMG = "https://images.pexels.com/photos/35418211/pexels-photo-35418211.jpeg?auto=compress&cs=tinysrgb&w=940";

export default function OwnerAuth() {
  const location = useLocation();
  const isRegister = location.pathname.includes("register");
  const nav = useNavigate();
  const { ownerLogin, ownerRegister } = useAuth();

  const [mode, setMode] = useState(isRegister ? "register" : "login");

  // login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // register fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await ownerLogin(email, password);
      } else {
        await ownerRegister({ name, email, password, phone });
      }
      toast.success("تم تسجيل الدخول");
      nav("/owner/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "فشل تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout hideFooter>
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-5rem)]">
        <div className="hidden lg:block relative">
          <img src={SIDE_IMG} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-l from-forest/40 to-forest/80" />
          <div className="relative h-full flex flex-col justify-between p-16 text-bone">
            <Link to="/" className="font-heading text-3xl">ريستو</Link>
            <div>
              <div className="text-xs tracking-[0.3em] text-gold mb-4">شركاء ريستو</div>
              <h2 className="font-heading text-5xl leading-tight mb-4">
                دخل مستدام<br/>
                <span className="text-gold">من شاليهك</span>
              </h2>
              <p className="text-bone/80 leading-loose max-w-md">
                انضم لشبكة من أرقى الشاليهات. استقبل الحجوزات، شارك رابطك المميز، وحقق إقامات استثنائية.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center p-8 lg:p-16">
          <div className="w-full max-w-md">
            <Link to="/" className="lg:hidden font-heading text-3xl text-forest mb-12 inline-block">ريستو</Link>
            <div className="text-xs tracking-[0.3em] text-gold mb-3">لأصحاب الشاليهات</div>
            <h1 className="font-heading text-4xl md:text-5xl text-forest mb-3">
              {mode === "login" ? "تسجيل دخول المالك" : "إنشاء حساب جديد"}
            </h1>
            <p className="text-inkSoft mb-10 leading-loose">
              {mode === "login"
                ? "ادخل لإدارة شاليهاتك وحجوزاتك"
                : "أنشئ حسابك وابدأ بنشر شاليهاتك في دقائق"}
            </p>

            <Tabs value={mode} onValueChange={setMode} className="mb-6">
              <TabsList className="grid grid-cols-2 w-full bg-muted">
                <TabsTrigger value="login" data-testid="owner-tab-login">دخول</TabsTrigger>
                <TabsTrigger value="register" data-testid="owner-tab-register">تسجيل جديد</TabsTrigger>
              </TabsList>
            </Tabs>

            <form onSubmit={submit} data-testid="owner-form" className="space-y-5">
              {mode === "register" && (
                <>
                  <FieldWithIcon icon={<User size={16} strokeWidth={1.5} className="text-gold" />}>
                    <Label className="text-xs text-inkSoft mb-2 block">الاسم</Label>
                    <Input
                      data-testid="owner-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="اسمك الكامل"
                      required
                      className="pr-12 h-12 bg-bone border-forest/10"
                    />
                  </FieldWithIcon>
                  <FieldWithIcon icon={<Phone size={16} strokeWidth={1.5} className="text-gold" />}>
                    <Label className="text-xs text-inkSoft mb-2 block">رقم الهاتف</Label>
                    <Input
                      data-testid="owner-phone"
                      type="tel" value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="05xxxxxxxx" dir="ltr"
                      className="pr-12 h-12 bg-bone border-forest/10"
                    />
                  </FieldWithIcon>
                </>
              )}
              <FieldWithIcon icon={<Mail size={16} strokeWidth={1.5} className="text-gold" />}>
                <Label className="text-xs text-inkSoft mb-2 block">البريد الإلكتروني</Label>
                <Input
                  data-testid="owner-email"
                  type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" dir="ltr"
                  required
                  className="pr-12 h-12 bg-bone border-forest/10"
                />
              </FieldWithIcon>
              <FieldWithIcon icon={<Lock size={16} strokeWidth={1.5} className="text-gold" />}>
                <Label className="text-xs text-inkSoft mb-2 block">كلمة المرور</Label>
                <Input
                  data-testid="owner-password"
                  type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6} required dir="ltr"
                  className="pr-12 h-12 bg-bone border-forest/10"
                />
              </FieldWithIcon>

              <Button
                type="submit"
                disabled={loading}
                data-testid="owner-submit"
                className="w-full h-12 bg-forest text-bone hover:bg-forest-dark rounded-xl text-base"
              >
                {loading ? "..." : mode === "login" ? "دخول" : "إنشاء الحساب"}
                <ArrowLeft size={16} className="mr-2" />
              </Button>
            </form>

            <div className="mt-10 pt-8 border-t border-border/40 text-sm text-inkSoft">
              عميل؟{" "}
              <Link to="/login" className="text-gold hover:underline">
                دخول العملاء
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function FieldWithIcon({ icon, children }) {
  return (
    <div className="relative">
      {children}
      <span className="absolute right-4 top-[42px]">{icon}</span>
    </div>
  );
}

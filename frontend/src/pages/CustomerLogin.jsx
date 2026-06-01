import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Phone, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Layout from "../components/Layout";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";

const SIDE_IMG = "https://images.pexels.com/photos/11410735/pexels-photo-11410735.jpeg?auto=compress&cs=tinysrgb&w=940";

export default function CustomerLogin() {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { customerLogin } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();

  const submit = async (e) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error("أدخل رقم الهاتف");
      return;
    }
    setLoading(true);
    try {
      await customerLogin(phone.trim(), name.trim() || undefined);
      toast.success("مرحباً بك في ريستو");
      nav(params.get("redirect") || "/");
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
          <div className="absolute inset-0 bg-gradient-to-l from-forest/30 to-forest/70" />
          <div className="relative h-full flex flex-col justify-between p-16 text-bone">
            <Link to="/" className="font-heading text-3xl">ريستو</Link>
            <div>
              <div className="text-xs tracking-[0.3em] text-gold mb-4">للضيوف</div>
              <h2 className="font-heading text-5xl leading-tight mb-4">
                إقامة بسيطة<br/>
                <span className="text-gold">مدخلٌ أبسط</span>
              </h2>
              <p className="text-bone/80 leading-loose max-w-md">
                رقم هاتفك فقط — لا كلمات مرور، لا تعقيدات، استمتع بمنصتنا فوراً.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center p-8 lg:p-16">
          <div className="w-full max-w-md">
            <Link to="/" className="lg:hidden font-heading text-3xl text-forest mb-12 inline-block">ريستو</Link>
            <div className="text-xs tracking-[0.3em] text-gold mb-3">تسجيل دخول</div>
            <h1 className="font-heading text-4xl md:text-5xl text-forest mb-3">مرحباً بعودتك</h1>
            <p className="text-inkSoft mb-10 leading-loose">
              ادخل برقم هاتفك للبدء — لا حاجة إلى كلمة مرور.
            </p>

            <form onSubmit={submit} data-testid="customer-login-form" className="space-y-5">
              <div>
                <Label className="text-xs text-inkSoft mb-2 block">رقم الهاتف</Label>
                <div className="relative">
                  <Phone size={16} strokeWidth={1.5} className="absolute right-4 top-1/2 -translate-y-1/2 text-gold" />
                  <Input
                    data-testid="phone-input"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    required
                    className="pr-12 h-12 bg-bone border-forest/10 focus:ring-gold"
                    dir="ltr"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-inkSoft mb-2 block">اسمك (اختياري)</Label>
                <Input
                  data-testid="name-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: محمد"
                  className="h-12 bg-bone border-forest/10"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                data-testid="customer-login-submit"
                className="w-full h-12 bg-forest text-bone hover:bg-forest-dark rounded-xl text-base"
              >
                {loading ? "..." : "متابعة"}
                <ArrowLeft size={16} className="mr-2" />
              </Button>
            </form>

            <div className="mt-10 pt-8 border-t border-border/40 space-y-2 text-sm text-inkSoft">
              <div>
                هل أنت مالك شاليه؟{" "}
                <Link to="/owner/login" className="text-gold hover:underline" data-testid="link-owner-login">
                  دخول المالكين
                </Link>
              </div>
              <div>
                مسؤول؟{" "}
                <Link to="/admin/login" className="text-gold hover:underline" data-testid="link-admin-login">
                  دخول الإدارة
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

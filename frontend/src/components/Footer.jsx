import React from "react";
import { Link } from "react-router-dom";
import { Facebook, Instagram, Mail, Phone, LifeBuoy } from "lucide-react";
import { SUPPORT_PHONE } from "../lib/format";

export default function Footer() {
  return (
    <footer data-testid="site-footer" className="bg-forest text-bone mt-32">
      <div className="container-wide py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          <div className="md:col-span-5 space-y-5">
            <div className="font-heading text-4xl font-semibold">ريستو</div>
            <p className="text-bone/70 max-w-md leading-loose">
              منصة لاكتشاف وحجز أرقى الشاليهات والفلل في فلسطين. تجربة حجز مبسطة، شاليهات منتقاة بعناية، دفع نقدي عند الوصول.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <a href="#" className="w-10 h-10 rounded-full border border-bone/20 grid place-items-center hover:border-gold hover:text-gold transition-all">
                <Facebook size={16} strokeWidth={1.5} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full border border-bone/20 grid place-items-center hover:border-gold hover:text-gold transition-all">
                <Instagram size={16} strokeWidth={1.5} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full border border-bone/20 grid place-items-center hover:border-gold hover:text-gold transition-all">
                <Mail size={16} strokeWidth={1.5} />
              </a>
            </div>
          </div>

          <div className="md:col-span-3 space-y-4">
            <div className="text-xs tracking-widest text-gold uppercase">استكشف</div>
            <ul className="space-y-3 text-sm text-bone/80">
              <li><Link to="/" className="hover:text-gold transition">الرئيسية</Link></li>
              <li><Link to="/chalets" className="hover:text-gold transition">جميع الشاليهات</Link></li>
              <li><Link to="/chalets?featured=true" className="hover:text-gold transition">المميزة</Link></li>
              <li><Link to="/support" className="hover:text-gold transition">الدعم</Link></li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-4" data-testid="footer-support">
            <div className="text-xs tracking-widest text-gold uppercase">تواصل معنا</div>
            <a
              href={`tel:${SUPPORT_PHONE}`}
              data-testid="footer-support-phone"
              dir="ltr"
              className="block font-heading text-3xl text-bone hover:text-gold transition-colors"
            >
              {SUPPORT_PHONE}
            </a>
            <p className="text-xs text-bone/60 leading-relaxed">
              يومياً من 9 صباحاً حتى 9 مساءً<br/>
              للاستفسارات وحجوزات الشاليهات
            </p>
            <div className="flex items-center gap-2 text-xs">
              <Link to="/support" className="inline-flex items-center gap-1.5 text-gold hover:text-bone transition">
                <LifeBuoy size={12} strokeWidth={1.5} /> مركز الدعم
              </Link>
              <span className="text-bone/30">·</span>
              <Link to="/owner/login" className="text-bone/70 hover:text-gold transition">للملاك</Link>
              <span className="text-bone/30">·</span>
              <Link to="/admin/login" className="text-bone/70 hover:text-gold transition">للإدارة</Link>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-bone/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-bone/50">
            © {new Date().getFullYear()} ريستو · جميع الحقوق محفوظة
          </p>
          <p className="text-xs text-bone/50">
            صُنع بشغف لفلسطين · إقامة لا تُنسى
          </p>
        </div>
      </div>
    </footer>
  );
}

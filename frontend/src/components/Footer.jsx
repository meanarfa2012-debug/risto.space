import React from "react";
import { Link } from "react-router-dom";
import { Facebook, Instagram, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer data-testid="site-footer" className="bg-forest text-bone mt-32">
      <div className="container-wide py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          <div className="md:col-span-5 space-y-5">
            <div className="font-heading text-4xl font-semibold">ريستو</div>
            <p className="text-bone/70 max-w-md leading-loose">
              منصة فاخرة لاكتشاف وحجز أرقى الشاليهات. تجربة إقامة استثنائية في أجمل الوجهات.
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
            </ul>
          </div>

          <div className="md:col-span-2 space-y-4">
            <div className="text-xs tracking-widest text-gold uppercase">للأعمال</div>
            <ul className="space-y-3 text-sm text-bone/80">
              <li><Link to="/owner/login" className="hover:text-gold transition">أصحاب الشاليهات</Link></li>
              <li><Link to="/owner/register" className="hover:text-gold transition">سجل شاليهك</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-4">
            <div className="text-xs tracking-widest text-gold uppercase">الإدارة</div>
            <ul className="space-y-3 text-sm text-bone/80">
              <li><Link to="/admin/login" className="hover:text-gold transition">دخول المسؤول</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-bone/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-bone/50">
            © {new Date().getFullYear()} ريستو · جميع الحقوق محفوظة
          </p>
          <p className="text-xs text-bone/50">
            صُنع بشغف · إقامة لا تُنسى
          </p>
        </div>
      </div>
    </footer>
  );
}

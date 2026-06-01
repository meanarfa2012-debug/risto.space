import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import Layout from "../components/Layout";
import { Button } from "../components/ui/button";

const STATUS = {
  pending: { label: "بانتظار الموافقة", color: "bg-gold/15 text-gold" },
  accepted: { label: "مقبول · ادفع عند الوصول", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "مرفوض", color: "bg-destructive/10 text-destructive" },
  cancelled: { label: "ملغي", color: "bg-muted text-inkSoft" },
};

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);

  const load = async () => {
    try {
      const r = await api.get("/bookings/me");
      setBookings(r.data);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const cancel = async (id) => {
    if (!confirm("هل تريد إلغاء هذا الحجز؟")) return;
    try {
      await api.post(`/bookings/${id}/cancel`);
      toast.success("تم الإلغاء");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "تعذر الإلغاء");
    }
  };

  return (
    <Layout>
      <div className="container-wide py-12 max-w-5xl">
        <div className="mb-10">
          <div className="text-xs tracking-[0.25em] text-gold mb-2">إقاماتي</div>
          <h1 className="font-heading text-4xl md:text-5xl text-forest">حجوزاتي</h1>
          <p className="text-inkSoft mt-2">تتبع جميع طلبات الحجز</p>
        </div>

        {bookings.length === 0 ? (
          <div className="bg-card border border-border/40 rounded-2xl p-16 text-center">
            <div className="font-heading text-2xl text-forest mb-2">لا توجد حجوزات بعد</div>
            <p className="text-inkSoft mb-6">ابدأ بالاستكشاف واحجز شاليهك الأول</p>
            <Link to="/chalets">
              <Button data-testid="browse-chalets-btn" className="bg-forest text-bone hover:bg-forest-dark">استكشاف الشاليهات</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => {
              const s = STATUS[b.status] || STATUS.pending;
              return (
                <div key={b.id} data-testid={`my-booking-${b.id}`} className="bg-card border border-border/40 rounded-2xl p-6 luxury-shadow">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-5">
                      <h3 className="font-heading text-xl text-forest mb-1">
                        <Link to={`/chalets/${b.chalet_slug}`} className="hover:text-gold transition">
                          {b.chalet_name}
                        </Link>
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-inkSoft">
                        <Calendar size={12} strokeWidth={1.5} />
                        من {b.check_in} إلى {b.check_out} · {b.nights} ليالٍ
                      </div>
                    </div>
                    <div className="md:col-span-3">
                      <div className="text-xs text-inkSoft">المبلغ الكلي</div>
                      <div className="font-heading text-xl text-forest">
                        {b.total_price?.toLocaleString("ar")} <span className="text-sm text-gold">ر.س</span>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${s.color}`}>
                        {s.label}
                      </span>
                    </div>
                    <div className="md:col-span-2 flex justify-start md:justify-end">
                      {["pending", "accepted"].includes(b.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cancel(b.id)}
                          data-testid={`cancel-${b.id}`}
                          className="text-destructive border-destructive/30 gap-1.5"
                        >
                          <X size={12} /> إلغاء
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

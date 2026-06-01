import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Calendar, Clock, Plus, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import Layout from "../components/Layout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";

const STATUS_BADGE = {
  available: { label: "متاح", color: "bg-emerald-100 text-emerald-700" },
  booked: { label: "محجوز", color: "bg-gold/15 text-gold" },
  unavailable: { label: "غير متاح", color: "bg-muted text-inkSoft" },
};

export default function OwnerSlotsPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [chalet, setChalet] = useState(null);
  const [slots, setSlots] = useState([]);

  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");

  const load = async () => {
    const c = await api.get(`/chalets/${id}`);
    setChalet(c.data);
    const s = await api.get(`/chalets/${id}/slots`);
    setSlots(s.data);
  };

  useEffect(() => { load(); }, [id]);

  const addSlot = async (e) => {
    e.preventDefault();
    if (!date || !start || !end || !price) {
      toast.error("املأ جميع الحقول");
      return;
    }
    try {
      await api.post(`/chalets/${id}/slots`, {
        date,
        start_time: start,
        end_time: end,
        price: Number(price),
        notes,
      });
      toast.success("تم إضافة الموعد");
      setDate(""); setStart(""); setEnd(""); setPrice(""); setNotes("");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "تعذر الإضافة");
    }
  };

  const remove = async (slotId) => {
    if (!confirm("حذف هذا الموعد؟")) return;
    try {
      await api.delete(`/slots/${slotId}`);
      toast.success("تم الحذف");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "تعذر الحذف");
    }
  };

  const toggle = async (slot) => {
    const next = slot.status === "available" ? "unavailable" : "available";
    try {
      await api.put(`/slots/${slot.id}`, { status: next });
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "تعذرت العملية");
    }
  };

  // group slots by date
  const grouped = slots.reduce((acc, s) => {
    (acc[s.date] ||= []).push(s);
    return acc;
  }, {});

  return (
    <Layout>
      <div className="container-wide py-12 max-w-5xl">
        <button onClick={() => nav("/owner/dashboard")} className="text-sm text-inkSoft hover:text-forest mb-4 flex items-center gap-1">
          <ArrowRight size={14} /> العودة للوحة المالك
        </button>

        <div className="mb-10">
          <div className="text-xs tracking-[0.25em] text-gold mb-2">جدول المواعيد</div>
          <h1 className="font-heading text-4xl text-forest">
            {chalet?.name || "..."}
          </h1>
          <p className="text-inkSoft mt-2">حدد المواعيد المتاحة والأسعار، والعملاء سيختارون منها مباشرة.</p>
        </div>

        {/* Add slot form */}
        <form onSubmit={addSlot} data-testid="add-slot-form" className="bg-card border border-border/40 rounded-2xl p-6 mb-10 luxury-shadow">
          <div className="font-heading text-lg text-forest mb-4">إضافة موعد جديد</div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <div>
              <Label className="text-xs text-inkSoft mb-1.5 block">التاريخ</Label>
              <Input data-testid="slot-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-bone border-forest/10" required />
            </div>
            <div>
              <Label className="text-xs text-inkSoft mb-1.5 block">من</Label>
              <Input data-testid="slot-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} className="bg-bone border-forest/10" required />
            </div>
            <div>
              <Label className="text-xs text-inkSoft mb-1.5 block">إلى</Label>
              <Input data-testid="slot-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="bg-bone border-forest/10" required />
            </div>
            <div>
              <Label className="text-xs text-inkSoft mb-1.5 block">السعر (₪)</Label>
              <Input data-testid="slot-price" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="bg-bone border-forest/10" required />
            </div>
            <Button type="submit" data-testid="add-slot-btn" className="h-10 bg-forest text-bone hover:bg-forest-dark gap-1.5">
              <Plus size={14} /> إضافة
            </Button>
          </div>
          <div className="mt-3">
            <Label className="text-xs text-inkSoft mb-1.5 block">ملاحظات (اختياري)</Label>
            <Input data-testid="slot-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="مثلاً: يشمل إفطار، أو 24 ساعة..." className="bg-bone border-forest/10" />
          </div>
        </form>

        {/* Slots list grouped by date */}
        {Object.keys(grouped).length === 0 ? (
          <div className="bg-card border border-border/40 rounded-2xl p-16 text-center">
            <Calendar size={32} strokeWidth={1.5} className="text-gold mx-auto mb-3" />
            <div className="font-heading text-xl text-forest mb-1">لا توجد مواعيد بعد</div>
            <p className="text-sm text-inkSoft">ابدأ بإضافة المواعيد المتاحة لشاليهك</p>
          </div>
        ) : (
          <div className="space-y-6" data-testid="slots-list">
            {Object.keys(grouped).sort().map((d) => (
              <div key={d} className="bg-card border border-border/40 rounded-2xl overflow-hidden">
                <div className="bg-bone border-b border-border/40 px-6 py-4 flex items-center gap-3">
                  <Calendar size={16} strokeWidth={1.5} className="text-gold" />
                  <div className="font-heading text-lg text-forest">
                    {new Date(d).toLocaleDateString("ar", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </div>
                  <Badge variant="outline" className="mr-auto">{grouped[d].length} موعد</Badge>
                </div>
                <div className="divide-y divide-border/40">
                  {grouped[d].sort((a,b) => a.start_time.localeCompare(b.start_time)).map((s) => {
                    const b = STATUS_BADGE[s.status] || STATUS_BADGE.available;
                    return (
                      <div key={s.id} data-testid={`slot-row-${s.id}`} className="px-6 py-4 flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2 text-ink min-w-[140px]">
                          <Clock size={14} strokeWidth={1.5} className="text-gold" />
                          <span dir="ltr">{s.start_time} - {s.end_time}</span>
                        </div>
                        <div className="font-heading text-lg text-forest">
                          {s.price?.toLocaleString("ar")} <span className="text-sm text-gold">₪</span>
                        </div>
                        {s.notes && <div className="text-xs text-inkSoft italic">"{s.notes}"</div>}
                        <span className={`mr-auto inline-flex px-3 py-1 rounded-full text-xs font-medium ${b.color}`}>
                          {b.label}
                        </span>
                        {s.status !== "booked" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              data-testid={`toggle-slot-${s.id}`}
                              onClick={() => toggle(s)}
                              className="h-8"
                            >
                              {s.status === "available" ? "إيقاف" : "تفعيل"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              data-testid={`delete-slot-${s.id}`}
                              onClick={() => remove(s.id)}
                              className="h-8 text-destructive border-destructive/30"
                            >
                              <Trash2 size={12} />
                            </Button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

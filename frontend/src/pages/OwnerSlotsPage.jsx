import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Calendar, Clock, Plus, Trash2, ArrowRight, Lock, Tag, Ban } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import Layout from "../components/Layout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { formatTime12, todayISO, nowHHMM, BLOCK_REASONS, blockReasonLabel } from "../lib/format";

const STATUS_BADGE = {
  available: { label: "متاح", color: "bg-emerald-100 text-emerald-700" },
  booked: { label: "محجوز", color: "bg-gold/15 text-gold" },
  unavailable: { label: "غير مفعل", color: "bg-muted text-inkSoft" },
  blocked: { label: "محجوب", color: "bg-rose-100 text-rose-700" },
};

export default function OwnerSlotsPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [chalet, setChalet] = useState(null);
  const [slots, setSlots] = useState([]);

  const [mode, setMode] = useState("booking"); // "booking" | "block"
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [blockReason, setBlockReason] = useState("personal");

  const load = useCallback(async () => {
    const c = await api.get(`/chalets/${id}`);
    setChalet(c.data);
    const s = await api.get(`/chalets/${id}/slots`);
    setSlots(s.data);
  }, [id]);

  useEffect(() => {
  load();
}, [id, load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!date || !start || !end) {
      toast.error("يرجى تعبئة التاريخ ووقت البداية والنهاية");
      return;
    }
    if (start >= end) {
      toast.error("وقت الانتهاء يجب أن يكون بعد البداية");
      return;
    }
    const isBlock = mode === "block";
    if (!isBlock && !price) {
      toast.error("أدخل السعر");
      return;
    }
    try {
      await api.post(`/chalets/${id}/slots`, {
        date,
        start_time: start,
        end_time: end,
        price: isBlock ? 0 : Number(price),
        notes,
        block_reason: isBlock ? blockReason : null,
      });
      toast.success(isBlock ? "تم حجب الموعد" : "تم إضافة الموعد");
      setDate(""); setStart(""); setEnd(""); setPrice(""); setNotes("");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "تعذرت العملية");
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
    let next;
    if (slot.status === "available") next = "unavailable";
    else if (slot.status === "unavailable") next = "available";
    else if (slot.status === "blocked") next = "available";
    else return;
    try {
      const payload = { status: next };
      if (next === "available" && slot.status === "blocked") payload.block_reason = null;
      await api.put(`/slots/${slot.id}`, payload);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "تعذرت العملية");
    }
  };

  const today = todayISO();
  const minStartTime = date === today ? nowHHMM() : undefined;

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
          <h1 className="font-heading text-4xl text-forest">{chalet?.name || "..."}</h1>
          <p className="text-inkSoft mt-2">حدد المواعيد المتاحة للحجز، أو احجب أوقاتاً للاستخدام الشخصي والصيانة.</p>
        </div>

        <form onSubmit={submit} data-testid="slot-form" className="bg-card border border-border/40 rounded-2xl p-6 mb-10 luxury-shadow">
          <Tabs value={mode} onValueChange={setMode} className="mb-5">
            <TabsList className="bg-muted">
              <TabsTrigger value="booking" data-testid="mode-booking" className="gap-1.5">
                <Tag size={12} /> موعد قابل للحجز
              </TabsTrigger>
              <TabsTrigger value="block" data-testid="mode-block" className="gap-1.5">
                <Ban size={12} /> حجب موعد
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <div>
              <Label className="text-xs text-inkSoft mb-1.5 block">التاريخ</Label>
              <Input data-testid="slot-date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="bg-bone border-forest/10" required />
            </div>
            <div>
              <Label className="text-xs text-inkSoft mb-1.5 block">من</Label>
              <Input data-testid="slot-start" type="time" min={minStartTime} value={start} onChange={(e) => setStart(e.target.value)} className="bg-bone border-forest/10" required />
            </div>
            <div>
              <Label className="text-xs text-inkSoft mb-1.5 block">إلى</Label>
              <Input data-testid="slot-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="bg-bone border-forest/10" required />
            </div>
            {mode === "booking" ? (
              <div>
                <Label className="text-xs text-inkSoft mb-1.5 block">السعر (₪)</Label>
                <Input data-testid="slot-price" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="bg-bone border-forest/10" required />
              </div>
            ) : (
              <div>
                <Label className="text-xs text-inkSoft mb-1.5 block">السبب</Label>
                <Select value={blockReason} onValueChange={setBlockReason}>
                  <SelectTrigger data-testid="block-reason" className="bg-bone border-forest/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {BLOCK_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button type="submit" data-testid="add-slot-btn" className={`h-10 gap-1.5 ${mode === "block" ? "bg-rose-700 text-bone hover:bg-rose-800" : "bg-forest text-bone hover:bg-forest-dark"}`}>
              {mode === "block" ? <><Lock size={14} /> حجب</> : <><Plus size={14} /> إضافة</>}
            </Button>
          </div>
          <div className="mt-3">
            <Label className="text-xs text-inkSoft mb-1.5 block">ملاحظات (اختياري)</Label>
            <Input data-testid="slot-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={mode === "block" ? "تفاصيل الحجب (مثلاً: صيانة المسبح)" : "تفاصيل الموعد (مثلاً: يشمل إفطار)"} className="bg-bone border-forest/10" />
          </div>
        </form>

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
                    const sb = STATUS_BADGE[s.status] || STATUS_BADGE.available;
                    const rowBg = s.status === "booked" ? "bg-gold/5" : s.status === "blocked" ? "bg-rose-50" : "";
                    return (
                      <div key={s.id} data-testid={`slot-row-${s.id}`} className={`px-6 py-4 flex items-center gap-4 flex-wrap ${rowBg}`}>
                        <div className="flex items-center gap-2 text-ink min-w-[180px]">
                          <Clock size={14} strokeWidth={1.5} className="text-gold" />
                          <span dir="ltr">{formatTime12(s.start_time)} - {formatTime12(s.end_time)}</span>
                        </div>
                        {s.status === "blocked" ? (
                          <div className="font-heading text-base text-rose-700 inline-flex items-center gap-2">
                            <Lock size={12} /> {blockReasonLabel(s.block_reason)}
                          </div>
                        ) : (
                          <div className="font-heading text-lg text-forest">
                            {s.price?.toLocaleString("ar")} <span className="text-sm text-gold">₪</span>
                          </div>
                        )}
                        {s.notes && <div className="text-xs text-inkSoft italic">"{s.notes}"</div>}
                        <span className={`mr-auto inline-flex px-3 py-1 rounded-full text-xs font-medium ${sb.color}`}>
                          {sb.label}
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

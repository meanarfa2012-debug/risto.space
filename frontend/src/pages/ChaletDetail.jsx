import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Users,
  BedDouble,
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  QrCode,
  Download,
  Flag,
  Phone,
  ExternalLink,
  Film,
  Check,
} from "lucide-react";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import api, { fileUrl } from "../lib/api";
import Layout from "../components/Layout";
import StarRating from "../components/StarRating";
import ShareButtons from "../components/ShareButtons";
import { formatTime12 } from "../lib/format";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../components/ui/dialog";
import { useAuth } from "../contexts/AuthContext";

export default function ChaletDetail() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [chalet, setChalet] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [slots, setSlots] = useState([]);
  const [activeMedia, setActiveMedia] = useState({ kind: "image", idx: 0 });
  const [showQR, setShowQR] = useState(false);

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const loadChalet = async () => {
    const r = await api.get(`/chalets/by-slug/${slug}`);
    setChalet(r.data);
    const [rev, sl] = await Promise.all([
      api.get(`/reviews/chalet/${r.data.id}`),
      api.get(`/chalets/${r.data.id}/slots`),
    ]);
    setReviews(rev.data);
    setSlots(sl.data);
  };

  useEffect(() => {
    loadChalet().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (!chalet) {
    return (
      <Layout>
        <div className="container-wide py-24 text-center text-inkSoft">جاري التحميل...</div>
      </Layout>
    );
  }

  const publicUrl = `${window.location.origin}/chalets/${chalet.slug}`;

  const submitBooking = async () => {
    if (!user) {
      nav("/login?redirect=" + encodeURIComponent(`/chalets/${slug}`));
      return;
    }
    if (user.role !== "customer") {
      toast.error("الحجز متاح للعملاء فقط");
      return;
    }
    if (!selectedSlot) return;
    setBookingLoading(true);
    try {
      await api.post("/bookings", {
        slot_id: selectedSlot.id,
        notes: bookingNotes,
      });
      toast.success("تم إرسال طلب الحجز");
      nav("/my-bookings");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "فشل الحجز");
    } finally {
      setBookingLoading(false);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      nav("/login");
      return;
    }
    try {
      await api.post("/reviews", { chalet_id: chalet.id, rating, comment });
      toast.success("شكراً لتقييمك");
      setComment("");
      loadChalet();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "تعذر إضافة التقييم");
    }
  };

  const reportReview = async (id) => {
    try {
      await api.post(`/reviews/${id}/report`);
      toast.success("تم الإبلاغ");
      loadChalet();
    } catch {
      toast.error("تعذر الإبلاغ");
    }
  };

  const downloadQR = () => {
    const svg = document.querySelector("#chalet-qr svg");
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const canvas = document.createElement("canvas");
    canvas.width = 600; canvas.height = 600;
    const ctx = canvas.getContext("2d");
    img.onload = () => {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, 600, 600);
      ctx.drawImage(img, 30, 30, 540, 540);
      const png = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = png;
      a.download = `${chalet.slug}-qr.png`;
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(data)));
  };

  const images = chalet.images || [];
  const videos = chalet.videos || [];
  const heroSrc = activeMedia.kind === "image"
    ? (images[activeMedia.idx] ? fileUrl(images[activeMedia.idx]) : "https://images.unsplash.com/photo-1673469110171-dbf5d19a8336?w=2000")
    : null;

  // Show available + booked + blocked + unavailable, but disable non-bookable ones
  const visibleSlots = slots;
  const groupedSlots = visibleSlots.reduce((acc, s) => {
    (acc[s.date] ||= []).push(s);
    return acc;
  }, {});

  return (
    <Layout>
      {/* Media gallery */}
      <section className="container-wide pt-8 pb-12" data-testid="chalet-detail">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 aspect-[16/10] rounded-2xl overflow-hidden bg-muted">
            {activeMedia.kind === "image" ? (
              <img src={heroSrc} alt={chalet.name} className="w-full h-full object-cover" />
            ) : (
              <video src={fileUrl(videos[activeMedia.idx])} controls className="w-full h-full object-cover bg-ink" />
            )}
          </div>
          <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 gap-4">
            {[1, 2].map((idx) => {
              const img = images[idx];
              return (
                <button
                  key={idx}
                  onClick={() => img && setActiveMedia({ kind: "image", idx })}
                  data-testid={`gallery-thumb-${idx}`}
                  className="aspect-[16/10] lg:aspect-auto lg:h-full rounded-2xl overflow-hidden bg-muted group"
                >
                  {img ? (
                    <img src={fileUrl(img)} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full bg-muted" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {(images.length > 3 || videos.length > 0) && (
          <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
            {images.slice(3).map((p, i) => (
              <button
                key={p}
                onClick={() => setActiveMedia({ kind: "image", idx: i + 3 })}
                className="w-28 h-20 rounded-lg overflow-hidden flex-shrink-0 ring-2 ring-transparent hover:ring-gold"
              >
                <img src={fileUrl(p)} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
            {videos.map((p, i) => (
              <button
                key={p}
                onClick={() => setActiveMedia({ kind: "video", idx: i })}
                className="w-28 h-20 rounded-lg overflow-hidden flex-shrink-0 ring-2 ring-transparent hover:ring-gold bg-ink relative grid place-items-center text-bone"
              >
                <Film size={20} strokeWidth={1.5} />
                <span className="absolute bottom-1 text-[10px]">فيديو {i + 1}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Mobile-only: chalet title + summary BEFORE booking panel */}
      <section className="container-wide pb-4 lg:hidden" data-testid="mobile-title-block">
        {chalet.featured && (
          <div className="inline-flex items-center gap-1.5 bg-gold/15 text-gold text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
            <Sparkles size={12} strokeWidth={2} /> شاليه مميز
          </div>
        )}
        <h1 className="font-heading text-3xl sm:text-4xl text-forest leading-tight">
          {chalet.name}
        </h1>
        <div className="flex items-center flex-wrap gap-3 mt-3 text-inkSoft text-sm">
          <StarRating value={chalet.avg_rating || 0} size={14} testIdPrefix="mobile-rating" />
          <span>{chalet.avg_rating?.toFixed?.(1) || "—"} ({chalet.reviews_count || 0})</span>
          {chalet.google_maps_url && (
            <a
              href={chalet.google_maps_url}
              target="_blank"
              rel="noreferrer"
              data-testid="mobile-open-location"
              className="inline-flex items-center gap-1.5 text-gold font-medium"
            >
              <MapPin size={14} strokeWidth={1.5} /> فتح الموقع
            </a>
          )}
        </div>
        <p className="text-sm text-ink mt-3 leading-loose line-clamp-3">{chalet.description}</p>
      </section>

      {/* Main content - mobile reorder: booking sidebar appears HIGH on mobile */}
      <section className="container-wide pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          <div className="lg:col-span-8 space-y-10 order-2 lg:order-1">
            <div className="hidden lg:block">
              {chalet.featured && (
                <div className="inline-flex items-center gap-1.5 bg-gold/15 text-gold text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                  <Sparkles size={12} strokeWidth={2} /> شاليه مميز
                </div>
              )}
              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl text-forest leading-tight">
                {chalet.name}
              </h1>
              <div className="flex items-center flex-wrap gap-4 mt-4 text-inkSoft">
                <StarRating value={chalet.avg_rating || 0} size={14} testIdPrefix="detail-rating" />
                <span className="text-sm">
                  {chalet.avg_rating?.toFixed?.(1) || "—"} ({chalet.reviews_count || 0} تقييم)
                </span>
                {chalet.google_maps_url && (
                  <a
                    href={chalet.google_maps_url}
                    target="_blank"
                    rel="noreferrer"
                    data-testid="open-location-link"
                    className="inline-flex items-center gap-1.5 text-gold hover:text-forest transition text-sm font-medium"
                  >
                    <MapPin size={14} strokeWidth={1.5} /> فتح الموقع
                    <ExternalLink size={11} strokeWidth={1.5} />
                  </a>
                )}
                {chalet.phone && (
                  <a
                    href={`tel:${chalet.phone}`}
                    className="inline-flex items-center gap-1.5 text-forest hover:text-gold transition text-sm font-medium"
                    dir="ltr"
                  >
                    <Phone size={14} strokeWidth={1.5} /> {chalet.phone}
                  </a>
                )}
              </div>
            </div>

            <div className="hidden lg:block section-divider" />

            <div className="grid grid-cols-3 gap-6">
              <StatBlock icon={<BedDouble size={20} strokeWidth={1.5} />} label="الغرف" value={chalet.rooms} />
              <StatBlock icon={<Users size={20} strokeWidth={1.5} />} label="السعة" value={`${chalet.capacity} ضيوف`} />
              <StatBlock icon={<Sparkles size={20} strokeWidth={1.5} />} label="المميزات" value={`${chalet.features?.length || 0}`} />
            </div>

            <div>
              <h2 className="font-heading text-2xl text-forest mb-4">عن الشاليه</h2>
              <p className="text-ink leading-loose whitespace-pre-line">{chalet.description}</p>
            </div>

            {chalet.features?.length > 0 && (
              <div>
                <h2 className="font-heading text-2xl text-forest mb-5">المميزات</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {chalet.features.map((a) => (
                    <div key={a} className="flex items-center gap-2 text-ink">
                      <Check size={16} strokeWidth={1.5} className="text-gold shrink-0" />
                      <span className="text-sm">{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="section-divider" />

            <div>
              <h2 className="font-heading text-2xl text-forest mb-5">شارك الشاليه</h2>
              <div className="bg-card border border-border/40 rounded-2xl p-6 space-y-5">
                <ShareButtons url={publicUrl} title={chalet.name} />
                <Dialog open={showQR} onOpenChange={setShowQR}>
                  <DialogTrigger asChild>
                    <Button variant="outline" data-testid="show-qr-btn" className="border-forest/20 text-forest hover:bg-forest hover:text-bone gap-2">
                      <QrCode size={14} strokeWidth={1.5} /> رمز QR
                    </Button>
                  </DialogTrigger>
                  <DialogContent dir="rtl" className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="font-heading text-2xl text-forest">رمز QR للشاليه</DialogTitle>
                    </DialogHeader>
                    <div id="chalet-qr" className="bg-white p-8 rounded-lg flex flex-col items-center gap-4">
                      <QRCode value={publicUrl} size={220} bgColor="#FFFFFF" fgColor="#1A362D" />
                      <p className="text-xs text-inkSoft break-all text-center">{publicUrl}</p>
                    </div>
                    <Button onClick={downloadQR} data-testid="download-qr-btn" className="bg-forest text-bone hover:bg-forest-dark gap-2">
                      <Download size={14} /> تنزيل QR
                    </Button>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="section-divider" />

            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-2xl text-forest">التقييمات ({reviews.length})</h2>
              </div>

              {user?.role === "customer" && (
                <form onSubmit={submitReview} data-testid="review-form" className="bg-bone border border-border/40 rounded-2xl p-6 mb-8">
                  <div className="font-heading text-lg text-forest mb-4">أضف تقييمك</div>
                  <div className="mb-4">
                    <Label className="text-xs text-inkSoft mb-2 block">التقييم</Label>
                    <StarRating value={rating} interactive onChange={setRating} size={28} testIdPrefix="new-review" />
                  </div>
                  <Textarea
                    data-testid="review-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="شاركنا تجربتك..."
                    required minLength={5}
                    className="bg-card border-forest/10 mb-3"
                  />
                  <Button type="submit" data-testid="submit-review-btn" className="bg-forest text-bone hover:bg-forest-dark">
                    إرسال التقييم
                  </Button>
                </form>
              )}

              {reviews.length === 0 ? (
                <div className="text-center py-10 text-inkSoft">لا توجد تقييمات بعد</div>
              ) : (
                <div className="space-y-5">
                  {reviews.map((r) => (
                    <div key={r.id} data-testid={`review-${r.id}`} className="bg-card border border-border/40 rounded-xl p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-heading text-base text-forest">{r.customer_name}</div>
                            <StarRating value={r.rating} size={12} testIdPrefix={`review-${r.id}-stars`} />
                          </div>
                          <div className="text-xs text-inkSoft">
                            {new Date(r.created_at).toLocaleDateString("ar")}
                          </div>
                        </div>
                        <button
                          onClick={() => reportReview(r.id)}
                          data-testid={`report-review-${r.id}`}
                          className="text-xs text-inkSoft hover:text-destructive flex items-center gap-1"
                          title="إبلاغ"
                        >
                          <Flag size={12} strokeWidth={1.5} />
                        </button>
                      </div>
                      <p className="text-ink mt-3 leading-loose">{r.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Slots sidebar */}
          <aside className="order-1 lg:order-2 lg:col-span-4">
            <div className="lg:sticky lg:top-28 bg-card border border-border/40 rounded-2xl p-6 luxury-shadow space-y-4" data-testid="slots-sidebar">
              <div>
                <div className="font-heading text-xl text-forest">المواعيد المتاحة</div>
                <p className="text-xs text-inkSoft mt-1">اختر موعداً لإرسال طلب الحجز</p>
                <div className="text-[11px] text-gold mt-2">الدفع نقداً عند الوصول</div>
              </div>

              {Object.keys(groupedSlots).length === 0 ? (
                <div className="text-center py-10 text-sm text-inkSoft border border-dashed border-forest/15 rounded-lg">
                  لا توجد مواعيد متاحة حالياً
                </div>
              ) : (
                <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                  {Object.keys(groupedSlots).sort().map((d) => (
                    <div key={d}>
                      <div className="flex items-center gap-2 text-xs text-forest font-medium mb-2">
                        <Calendar size={12} strokeWidth={1.5} className="text-gold" />
                        {new Date(d).toLocaleDateString("ar", { weekday: "long", day: "numeric", month: "long" })}
                      </div>
                      <div className="space-y-2">
                        {groupedSlots[d].sort((a, b) => a.start_time.localeCompare(b.start_time)).map((s) => {
                          const isBooked = s.status === "booked";
                          const isBlocked = s.status === "blocked" || s.status === "unavailable";
                          const unavailable = isBooked || isBlocked;
                          const label = isBooked ? "محجوز" : isBlocked ? "غير متاح" : null;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              data-testid={`slot-${s.id}`}
                              disabled={unavailable}
                              onClick={() => !unavailable && setSelectedSlot(s)}
                              className={`w-full text-right p-3 rounded-lg border transition flex items-center justify-between ${
                                unavailable
                                  ? "bg-rose-50 border-rose-200 text-rose-700 cursor-not-allowed line-through opacity-80"
                                  : "bg-bone border-forest/10 hover:border-gold hover:bg-gold/5"
                              }`}
                            >
                              <div className="flex items-center gap-2 text-sm">
                                <Clock size={12} strokeWidth={1.5} className={unavailable ? "text-rose-500" : "text-gold"} />
                                <span dir="ltr">{formatTime12(s.start_time)} - {formatTime12(s.end_time)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {!isBlocked && (
                                  <span className={`font-heading ${unavailable ? "text-rose-700" : "text-forest"}`}>
                                    {s.price?.toLocaleString("ar")} <span className="text-xs text-gold">₪</span>
                                  </span>
                                )}
                                {label && (
                                  <span className="text-[10px] bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full font-semibold no-underline">
                                    {label}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>

      {/* Booking dialog */}
      <Dialog open={!!selectedSlot} onOpenChange={(o) => !o && setSelectedSlot(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-forest">تأكيد طلب الحجز</DialogTitle>
          </DialogHeader>
          {selectedSlot && (
            <div className="space-y-4">
              <div className="bg-bone rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-inkSoft">الشاليه</span>
                  <span className="font-medium">{chalet.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-inkSoft">التاريخ</span>
                  <span className="font-medium">{new Date(selectedSlot.date).toLocaleDateString("ar")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-inkSoft">الوقت</span>
                  <span className="font-medium" dir="ltr">{formatTime12(selectedSlot.start_time)} - {formatTime12(selectedSlot.end_time)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border/40 font-heading text-lg text-forest">
                  <span>الإجمالي</span>
                  <span>{selectedSlot.price?.toLocaleString("ar")} ₪</span>
                </div>
              </div>
              <div>
                <Label className="text-xs text-inkSoft">ملاحظات (اختياري)</Label>
                <Textarea
                  data-testid="booking-notes"
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  rows={3}
                  placeholder="أي تفاصيل تخص الحجز..."
                  className="bg-bone border-forest/10 mt-1"
                />
              </div>
              <p className="text-xs text-inkSoft">الدفع نقداً عند الوصول.</p>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              onClick={submitBooking}
              disabled={bookingLoading}
              data-testid="booking-submit-btn"
              className="bg-forest text-bone hover:bg-forest-dark"
            >
              {bookingLoading ? "..." : user ? "إرسال طلب الحجز" : "سجّل الدخول للحجز"}
            </Button>
            <Button variant="outline" onClick={() => setSelectedSlot(null)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function StatBlock({ icon, label, value }) {
  return (
    <div className="bg-card border border-border/40 rounded-xl p-5">
      <div className="w-9 h-9 rounded-full bg-gold/15 text-gold grid place-items-center mb-3">
        {icon}
      </div>
      <div className="text-xs text-inkSoft mb-0.5">{label}</div>
      <div className="font-heading text-lg text-forest">{value}</div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  MapPin,
  Users,
  BedDouble,
  Sparkles,
  Calendar,
  Check,
  QrCode,
  Download,
  Flag,
} from "lucide-react";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import api, { fileUrl } from "../lib/api";
import Layout from "../components/Layout";
import StarRating from "../components/StarRating";
import ShareButtons from "../components/ShareButtons";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { useAuth } from "../contexts/AuthContext";

export default function ChaletDetail() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [chalet, setChalet] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [active, setActive] = useState(0);
  const [showQR, setShowQR] = useState(false);

  // booking form
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [notes, setNotes] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);

  // review form
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  useEffect(() => {
    api.get(`/chalets/by-slug/${slug}`).then((r) => {
      setChalet(r.data);
      api.get(`/reviews/chalet/${r.data.id}`).then((rev) => setReviews(rev.data));
    }).catch(() => {});
  }, [slug]);

  if (!chalet) {
    return (
      <Layout>
        <div className="container-wide py-24 text-center text-inkSoft">جاري تحميل الشاليه...</div>
      </Layout>
    );
  }

  const nights = checkIn && checkOut
    ? Math.max(0, Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000))
    : 0;
  const total = nights * chalet.price_per_night;
  const publicUrl = `${window.location.origin}/chalets/${chalet.slug}`;

  const submitBooking = async (e) => {
    e.preventDefault();
    if (!user) {
      nav("/login?redirect=" + encodeURIComponent(`/chalets/${slug}`));
      return;
    }
    if (user.role !== "customer") {
      toast.error("الحجز متاح للعملاء فقط");
      return;
    }
    if (nights < 1) {
      toast.error("يرجى تحديد التواريخ");
      return;
    }
    setBookingLoading(true);
    try {
      await api.post("/bookings", {
        chalet_id: chalet.id,
        check_in: checkIn,
        check_out: checkOut,
        guests: Number(guests),
        notes,
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
      await api.post("/reviews", {
        chalet_id: chalet.id,
        rating,
        comment,
      });
      toast.success("شكراً لتقييمك");
      setComment("");
      const r = await api.get(`/reviews/chalet/${chalet.id}`);
      setReviews(r.data);
      const c = await api.get(`/chalets/by-slug/${slug}`);
      setChalet(c.data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "تعذر إضافة التقييم");
    }
  };

  const reportReview = async (id) => {
    try {
      await api.post(`/reviews/${id}/report`);
      toast.success("تم الإبلاغ، سيُراجع الفريق التقييم");
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

  const images = chalet.images?.length ? chalet.images : [];
  const heroImg = images[active]
    ? fileUrl(images[active])
    : "https://images.unsplash.com/photo-1673469110171-dbf5d19a8336?crop=entropy&cs=srgb&fm=jpg&w=2000&q=85";

  return (
    <Layout>
      {/* Image gallery */}
      <section className="container-wide pt-8 pb-12" data-testid="chalet-detail">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 max-h-[560px]">
          <div className="lg:col-span-8 aspect-[16/10] rounded-2xl overflow-hidden bg-muted">
            <img src={heroImg} alt={chalet.name} className="w-full h-full object-cover" />
          </div>
          <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 gap-4">
            {[1,2].map((idx) => {
              const img = images[idx];
              return (
                <button
                  key={idx}
                  onClick={() => img && setActive(idx)}
                  data-testid={`gallery-thumb-${idx}`}
                  className="aspect-[16/10] lg:aspect-auto lg:h-full rounded-2xl overflow-hidden bg-muted group"
                >
                  <img
                    src={img ? fileUrl(img) : `https://images.pexels.com/photos/${[32361209,29000312][idx-1]}/pexels-photo-${[32361209,29000312][idx-1]}.jpeg?w=940`}
                    alt={`${chalet.name} ${idx}`}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  />
                </button>
              );
            })}
          </div>
        </div>
        {images.length > 3 && (
          <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
            {images.slice(3).map((p, i) => (
              <button
                key={p}
                onClick={() => setActive(i + 3)}
                className="w-28 h-20 rounded-lg overflow-hidden flex-shrink-0 ring-2 ring-transparent hover:ring-gold"
              >
                <img src={fileUrl(p)} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Main */}
      <section className="container-wide pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8 space-y-10">
            {/* Header */}
            <div>
              {chalet.featured && (
                <div className="inline-flex items-center gap-1.5 bg-gold/15 text-gold text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                  <Sparkles size={12} strokeWidth={2} /> شاليه مميز
                </div>
              )}
              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl text-forest leading-tight">
                {chalet.name}
              </h1>
              <div className="flex items-center flex-wrap gap-4 mt-4 text-inkSoft">
                <div className="flex items-center gap-1.5">
                  <MapPin size={14} strokeWidth={1.5} className="text-gold" />
                  {chalet.location}
                </div>
                <div className="flex items-center gap-1.5">
                  <StarRating value={chalet.avg_rating || 0} size={14} testIdPrefix="detail-rating" />
                  <span className="text-sm">
                    {chalet.avg_rating?.toFixed?.(1) || "—"} ({chalet.reviews_count || 0} تقييم)
                  </span>
                </div>
              </div>
            </div>

            <div className="section-divider" />

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <StatBlock icon={<BedDouble size={20} strokeWidth={1.5} />} label="الغرف" value={chalet.rooms} />
              <StatBlock icon={<Users size={20} strokeWidth={1.5} />} label="السعة" value={`${chalet.capacity} ضيوف`} />
              <StatBlock icon={<Sparkles size={20} strokeWidth={1.5} />} label="المميزات" value={`${chalet.amenities?.length || 0}`} />
              <StatBlock icon={<MapPin size={20} strokeWidth={1.5} />} label="العنوان" value={chalet.address || chalet.location} />
            </div>

            {/* Description */}
            <div>
              <h2 className="font-heading text-2xl text-forest mb-4">عن الشاليه</h2>
              <p className="text-ink leading-loose whitespace-pre-line">{chalet.description}</p>
            </div>

            {chalet.amenities?.length > 0 && (
              <div>
                <h2 className="font-heading text-2xl text-forest mb-5">المميزات</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {chalet.amenities.map((a) => (
                    <div key={a} className="flex items-center gap-2 text-ink">
                      <Check size={16} strokeWidth={1.5} className="text-gold shrink-0" />
                      <span className="text-sm">{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="section-divider" />

            {/* Share & QR */}
            <div>
              <h2 className="font-heading text-2xl text-forest mb-5">شارك الشاليه</h2>
              <div className="bg-card border border-border/40 rounded-2xl p-6 space-y-5">
                <ShareButtons url={publicUrl} title={chalet.name} />
                <div className="flex flex-wrap items-center gap-3">
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
            </div>

            <div className="section-divider" />

            {/* Reviews */}
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

          {/* Booking sidebar */}
          <aside className="lg:col-span-4">
            <div className="sticky top-28 bg-card border border-border/40 rounded-2xl p-7 luxury-shadow">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <div className="text-xs text-inkSoft">السعر / ليلة</div>
                  <div className="font-heading text-3xl text-forest mt-1">
                    {chalet.price_per_night?.toLocaleString("ar")}
                    <span className="text-base text-gold font-body mr-1">ر.س</span>
                  </div>
                </div>
                <div className="text-xs text-gold font-medium">الدفع عند الوصول</div>
              </div>

              <form onSubmit={submitBooking} className="space-y-4" data-testid="booking-form">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-inkSoft">الوصول</Label>
                    <Input
                      data-testid="booking-checkin"
                      type="date" required
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="bg-bone border-forest/10 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-inkSoft">المغادرة</Label>
                    <Input
                      data-testid="booking-checkout"
                      type="date" required
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="bg-bone border-forest/10 mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-inkSoft">عدد الضيوف</Label>
                  <Input
                    data-testid="booking-guests"
                    type="number" min="1" max={chalet.capacity}
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                    className="bg-bone border-forest/10 mt-1"
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs text-inkSoft">ملاحظات (اختياري)</Label>
                  <Textarea
                    data-testid="booking-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="أي تفاصيل تخص إقامتك..."
                    className="bg-bone border-forest/10 mt-1"
                  />
                </div>

                {nights > 0 && (
                  <div className="bg-bone rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between text-ink">
                      <span>{chalet.price_per_night} × {nights} ليلة</span>
                      <span>{total.toLocaleString("ar")} ر.س</span>
                    </div>
                    <div className="pt-2 border-t border-border/40 flex justify-between font-heading text-lg text-forest">
                      <span>الإجمالي</span>
                      <span>{total.toLocaleString("ar")} ر.س</span>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={bookingLoading}
                  data-testid="booking-submit-btn"
                  className="w-full bg-forest text-bone hover:bg-forest-dark rounded-xl py-6 text-base font-semibold"
                >
                  {bookingLoading ? "..." : user ? "اطلب الحجز" : "سجّل الدخول للحجز"}
                </Button>
                <p className="text-xs text-inkSoft text-center">
                  لن يتم الخصم تلقائياً — الدفع نقداً عند الوصول
                </p>
              </form>
            </div>
          </aside>
        </div>
      </section>
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

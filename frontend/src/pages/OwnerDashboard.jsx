import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, BedDouble, Calendar as CalIcon, Star, Eye, Pencil, Trash2, Check, X, Sparkles, Clock } from "lucide-react";
import { toast } from "sonner";
import api, { fileUrl } from "../lib/api";
import Layout from "../components/Layout";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import StarRating from "../components/StarRating";

const CHALET_STATUS_BADGE = {
  pending: { label: "بانتظار المراجعة", color: "bg-gold/15 text-gold" },
  approved: { label: "معتمد · ظاهر للعملاء", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "مرفوض", color: "bg-destructive/10 text-destructive" },
  suspended: { label: "موقوف", color: "bg-muted text-inkSoft" },
};

export default function OwnerDashboard() {
  const [chalets, setChalets] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState("chalets");

  const load = async () => {
    try {
      const [c, b] = await Promise.all([
        api.get("/owner/chalets"),
        api.get("/bookings/owner"),
      ]);
      setChalets(c.data);
      setBookings(b.data);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const accept = async (id) => {
    try { await api.post(`/bookings/${id}/accept`); toast.success("تم قبول الحجز"); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || "تعذر القبول"); }
  };

  const reject = async (id) => {
    try { await api.post(`/bookings/${id}/reject`); toast.success("تم رفض الحجز"); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || "تعذر الرفض"); }
  };

  const del = async (id) => {
    if (!confirm("هل أنت متأكد من حذف هذا الشاليه؟")) return;
    try { await api.delete(`/chalets/${id}`); toast.success("تم الحذف"); load(); }
    catch { toast.error("تعذر الحذف"); }
  };

  const stats = {
    chalets: chalets.length,
    pending: chalets.filter((c) => c.status === "pending").length,
    bookings: bookings.length,
    pendingBookings: bookings.filter((b) => b.status === "pending").length,
    accepted: bookings.filter((b) => b.status === "accepted").length,
    revenue: bookings.filter((b) => b.status === "accepted").reduce((s, b) => s + (b.total_price || 0), 0),
  };

  return (
    <Layout>
      <div className="container-wide py-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10 gap-4">
          <div>
            <div className="text-xs tracking-[0.25em] text-gold mb-2">لوحة التحكم</div>
            <h1 className="font-heading text-4xl md:text-5xl text-forest">مرحباً بك في عالمك</h1>
            <p className="text-inkSoft mt-2">إدارة كاملة لشاليهاتك ومواعيدك وحجوزاتك</p>
          </div>
          <Link to="/owner/chalets/new">
            <Button data-testid="add-chalet-btn" className="bg-forest text-bone hover:bg-forest-dark rounded-full gap-2 px-6">
              <Plus size={16} /> أضف شاليه جديد
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-10">
          <StatCard label="الشاليهات" value={stats.chalets} icon={<BedDouble size={18} />} />
          <StatCard label="بانتظار الاعتماد" value={stats.pending} icon={<Sparkles size={18} />} highlight={stats.pending > 0} />
          <StatCard label="إجمالي الحجوزات" value={stats.bookings} icon={<CalIcon size={18} />} />
          <StatCard label="حجوزات معلّقة" value={stats.pendingBookings} icon={<Star size={18} />} highlight={stats.pendingBookings > 0} />
          <StatCard label="مقبولة" value={stats.accepted} icon={<Check size={18} />} />
          <StatCard label="الإيرادات (₪)" value={stats.revenue.toLocaleString("ar")} icon={<Star size={18} />} dark />
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-muted mb-6">
            <TabsTrigger value="chalets" data-testid="tab-chalets">شاليهاتي ({chalets.length})</TabsTrigger>
            <TabsTrigger value="bookings" data-testid="tab-bookings">
              الحجوزات ({bookings.length})
              {stats.pendingBookings > 0 && (
                <span className="mr-1.5 inline-flex items-center justify-center bg-gold text-forest text-[10px] font-bold rounded-full w-4 h-4">{stats.pendingBookings}</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chalets">
            {chalets.length === 0 ? (
              <div className="bg-card border border-border/40 rounded-2xl p-16 text-center">
                <div className="font-heading text-2xl text-forest mb-2">لا توجد شاليهات بعد</div>
                <p className="text-inkSoft mb-6">ابدأ بإضافة شاليهك الأول</p>
                <Link to="/owner/chalets/new">
                  <Button className="bg-forest text-bone">إضافة شاليه</Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {chalets.map((c) => {
                  const sb = CHALET_STATUS_BADGE[c.status] || CHALET_STATUS_BADGE.pending;
                  return (
                    <div key={c.id} data-testid={`owner-chalet-${c.id}`} className="bg-card rounded-xl overflow-hidden border border-border/40 luxury-shadow">
                      <div className="aspect-[4/3] bg-muted relative">
                        {c.images?.[0] && (
                          <img src={fileUrl(c.images[0])} alt="" className="w-full h-full object-cover" />
                        )}
                        {c.featured && (
                          <Badge className="absolute top-3 right-3 bg-gold text-forest">مميز</Badge>
                        )}
                        <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-medium ${sb.color}`}>
                          {sb.label}
                        </div>
                      </div>
                      <div className="p-5 space-y-3">
                        <h3 className="font-heading text-lg text-forest">{c.name}</h3>
                        <div className="flex items-center justify-between text-sm">
                          <StarRating value={c.avg_rating || 0} size={12} testIdPrefix={`owner-rating-${c.id}`} />
                          <span className="text-forest font-heading text-sm">
                            {c.starting_price > 0 ? `من ${c.starting_price} ₪` : "حدد المواعيد"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
                          <Link to={`/owner/chalets/${c.id}/slots`} className="col-span-2">
                            <Button size="sm" data-testid={`slots-${c.id}`} className="w-full bg-forest text-bone hover:bg-forest-dark gap-1.5">
                              <Clock size={12} /> إدارة المواعيد
                            </Button>
                          </Link>
                          <Link to={`/chalets/${c.slug}`}>
                            <Button size="sm" variant="outline" data-testid={`view-${c.id}`} className="w-full gap-1.5">
                              <Eye size={12} /> عرض
                            </Button>
                          </Link>
                          <Link to={`/owner/chalets/${c.id}/edit`}>
                            <Button size="sm" variant="outline" data-testid={`edit-${c.id}`} className="w-full gap-1.5">
                              <Pencil size={12} /> تعديل
                            </Button>
                          </Link>
                          <Button size="sm" variant="outline" data-testid={`delete-${c.id}`} onClick={() => del(c.id)} className="col-span-2 text-destructive border-destructive/30 gap-1.5">
                            <Trash2 size={12} /> حذف
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookings">
            <div className="bg-card border border-border/40 rounded-2xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-right">الشاليه</TableHead>
                    <TableHead className="text-right">الموعد</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-10 text-inkSoft">لا توجد حجوزات</TableCell></TableRow>
                  )}
                  {bookings.map((b) => (
                    <TableRow key={b.id} data-testid={`booking-row-${b.id}`}>
                      <TableCell>
                        <div className="font-medium">{b.customer_name}</div>
                        <div className="text-xs text-inkSoft" dir="ltr">{b.customer_phone}</div>
                      </TableCell>
                      <TableCell>{b.chalet_name}</TableCell>
                      <TableCell className="text-xs">
                        <div>{b.slot_date}</div>
                        <div className="text-inkSoft" dir="ltr">{b.slot_start} - {b.slot_end}</div>
                      </TableCell>
                      <TableCell>{b.total_price?.toLocaleString("ar")} ₪</TableCell>
                      <TableCell><BookingBadge status={b.status} /></TableCell>
                      <TableCell>
                        {b.status === "pending" ? (
                          <div className="flex gap-1.5">
                            <Button size="sm" data-testid={`accept-${b.id}`} onClick={() => accept(b.id)} className="bg-forest text-bone hover:bg-forest-dark h-8 gap-1">
                              <Check size={12} /> قبول
                            </Button>
                            <Button size="sm" variant="outline" data-testid={`reject-${b.id}`} onClick={() => reject(b.id)} className="h-8 gap-1 text-destructive border-destructive/30">
                              <X size={12} /> رفض
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-inkSoft">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function StatCard({ label, value, icon, highlight, dark }) {
  return (
    <div className={`rounded-2xl p-5 border ${dark ? "bg-forest text-bone border-forest" : highlight ? "bg-gold/10 border-gold/30" : "bg-card border-border/40"}`}>
      <div className={`w-9 h-9 rounded-full grid place-items-center mb-3 ${dark ? "bg-bone/10 text-gold" : "bg-gold/15 text-gold"}`}>
        {icon}
      </div>
      <div className={`text-xs ${dark ? "text-bone/70" : "text-inkSoft"} mb-1`}>{label}</div>
      <div className={`font-heading text-2xl ${dark ? "text-bone" : "text-forest"}`}>{value}</div>
    </div>
  );
}

function BookingBadge({ status }) {
  const map = {
    pending: { label: "بانتظار الرد", color: "bg-gold/15 text-gold" },
    accepted: { label: "مقبول", color: "bg-emerald-100 text-emerald-700" },
    rejected: { label: "مرفوض", color: "bg-destructive/10 text-destructive" },
    cancelled: { label: "ملغي", color: "bg-muted text-inkSoft" },
  };
  const c = map[status] || map.pending;
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${c.color}`}>{c.label}</span>;
}

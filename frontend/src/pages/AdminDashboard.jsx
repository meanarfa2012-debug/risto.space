import React, { useEffect, useState } from "react";
import {
  Users,
  BedDouble,
  Calendar,
  Star,
  Flag,
  Sparkles,
  Trash2,
  ShieldCheck,
  MapPin,
  ExternalLink,
  CheckCircle2,
  PauseCircle,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import api, { fileUrl } from "../lib/api";
import Layout from "../components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { formatTime12 } from "../lib/format";

const CHALET_STATUS = {
  pending: { label: "بانتظار المراجعة", color: "bg-gold/15 text-gold" },
  approved: { label: "معتمد", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "مرفوض", color: "bg-destructive/10 text-destructive" },
  suspended: { label: "موقوف", color: "bg-muted text-inkSoft" },
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({});
  const [chalets, setChalets] = useState([]);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [tab, setTab] = useState("overview");

  const load = async () => {
    try {
      const [s, c, u, b, r] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/chalets"),
        api.get("/admin/users"),
        api.get("/admin/bookings"),
        api.get("/admin/reviews"),
      ]);
      setStats(s.data);
      setChalets(c.data);
      setUsers(u.data);
      setBookings(b.data);
      setReviews(r.data);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const toggleFeature = async (id, current) => {
    try {
      await api.post(`/admin/chalets/${id}/feature?featured=${!current}`);
      toast.success(!current ? "تم تمييز الشاليه" : "تم إزالة التمييز");
      load();
    } catch { toast.error("تعذرت العملية"); }
  };

  const setStatus = async (id, status) => {
    try {
      await api.post(`/admin/chalets/${id}/status?status=${status}`);
      toast.success("تم تحديث الحالة");
      load();
    } catch { toast.error("تعذرت العملية"); }
  };

  const deleteChalet = async (id) => {
    if (!confirm("حذف هذا الشاليه نهائياً؟")) return;
    try {
      await api.delete(`/admin/chalets/${id}`);
      toast.success("تم الحذف");
      load();
    } catch { toast.error("تعذر الحذف"); }
  };

  const deleteReview = async (id) => {
    if (!confirm("هل أنت متأكد من حذف هذا التقييم؟")) return;
    try {
      await api.delete(`/reviews/${id}`);
      toast.success("تم الحذف");
      load();
    } catch { toast.error("تعذر الحذف"); }
  };

  return (
    <Layout>
      <div className="container-wide py-12">
        <div className="flex items-center gap-3 mb-3">
          <ShieldCheck size={20} strokeWidth={1.5} className="text-gold" />
          <div className="text-xs tracking-[0.25em] text-gold">لوحة الإدارة</div>
        </div>
        <h1 className="font-heading text-4xl md:text-5xl text-forest mb-10">مركز التحكم</h1>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-10">
          <Stat label="المستخدمون" value={stats.users || 0} icon={<Users size={18} />} />
          <Stat label="ملاك" value={stats.owners || 0} icon={<Users size={18} />} />
          <Stat label="عملاء" value={stats.customers || 0} icon={<Users size={18} />} />
          <Stat label="الشاليهات" value={stats.chalets || 0} icon={<BedDouble size={18} />} />
          <Stat label="بانتظار المراجعة" value={stats.pending_chalets || 0} icon={<Sparkles size={18} />} highlight={stats.pending_chalets > 0} />
          <Stat label="بلاغات تقييم" value={stats.reported_reviews || 0} icon={<Flag size={18} />} highlight={stats.reported_reviews > 0} />
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-muted mb-6 flex-wrap h-auto">
            <TabsTrigger value="overview" data-testid="admin-tab-overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="chalets" data-testid="admin-tab-chalets">
              الشاليهات
              {stats.pending_chalets > 0 && (
                <span className="mr-1.5 inline-flex items-center justify-center bg-gold text-forest text-[10px] font-bold rounded-full min-w-4 h-4 px-1">{stats.pending_chalets}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="admin-tab-users">المستخدمون</TabsTrigger>
            <TabsTrigger value="bookings" data-testid="admin-tab-bookings">الحجوزات</TabsTrigger>
            <TabsTrigger value="reviews" data-testid="admin-tab-reviews">التقييمات</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Panel title={`بانتظار المراجعة (${chalets.filter((c) => c.status === "pending").length})`}>
                {chalets.filter((c) => c.status === "pending").slice(0, 6).map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-3 border-b border-border/40 last:border-0 gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {c.images?.[0] && <img src={fileUrl(c.images[0])} className="w-10 h-10 rounded-lg object-cover" alt="" />}
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-ink truncate">{c.name}</div>
                        <div className="text-xs text-inkSoft truncate">{c.owner_name}</div>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" onClick={() => setStatus(c.id, "approved")} data-testid={`quick-approve-${c.id}`} className="h-7 px-2 text-xs bg-forest text-bone gap-1">
                        <CheckCircle2 size={11} /> اعتماد
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setStatus(c.id, "rejected")} className="h-7 px-2 text-xs text-destructive border-destructive/30">
                        رفض
                      </Button>
                    </div>
                  </div>
                ))}
                {chalets.filter((c) => c.status === "pending").length === 0 && (
                  <div className="text-center text-sm text-inkSoft py-6">لا توجد طلبات معلّقة</div>
                )}
              </Panel>
              <Panel title="تقييمات مُبلغ عنها">
                {reviews.filter((r) => r.reported).slice(0, 5).map((r) => (
                  <div key={r.id} className="py-3 border-b border-border/40 last:border-0">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-ink">{r.customer_name}</div>
                      <Button size="sm" variant="outline" onClick={() => deleteReview(r.id)} className="text-destructive border-destructive/30 h-7 text-xs">
                        حذف
                      </Button>
                    </div>
                    <div className="text-xs text-inkSoft mt-1">{r.chalet_name} · {r.rating}⭐</div>
                    <p className="text-xs text-ink/80 mt-1 line-clamp-2">{r.comment}</p>
                  </div>
                ))}
                {reviews.filter((r) => r.reported).length === 0 && (
                  <div className="text-center text-sm text-inkSoft py-6">لا توجد بلاغات</div>
                )}
              </Panel>
            </div>
          </TabsContent>

          <TabsContent value="chalets">
            <div className="bg-card border border-border/40 rounded-2xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الشاليه</TableHead>
                    <TableHead className="text-right">المالك</TableHead>
                    <TableHead className="text-right">الموقع</TableHead>
                    <TableHead className="text-right">السعر يبدأ من</TableHead>
                    <TableHead className="text-right">التقييم</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chalets.map((c) => {
                    const sb = CHALET_STATUS[c.status] || CHALET_STATUS.pending;
                    return (
                      <TableRow key={c.id} data-testid={`admin-chalet-${c.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {c.images?.[0] && <img src={fileUrl(c.images[0])} className="w-10 h-10 rounded-lg object-cover" alt="" />}
                            <div>
                              <div className="font-medium">{c.name}</div>
                              {c.featured && <Badge className="mt-1 bg-gold text-forest text-[10px]">مميز</Badge>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{c.owner_name}</TableCell>
                        <TableCell>
                          {c.google_maps_url ? (
                            <a
                              href={c.google_maps_url}
                              target="_blank"
                              rel="noreferrer"
                              data-testid={`admin-map-${c.id}`}
                              className="inline-flex items-center gap-1 text-gold hover:text-forest text-xs"
                              dir="ltr"
                            >
                              <MapPin size={12} strokeWidth={1.5} /> Maps <ExternalLink size={10} />
                            </a>
                          ) : (
                            <span className="text-xs text-inkSoft">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {c.starting_price > 0 ? `${c.starting_price} ₪` : <span className="text-xs text-inkSoft">حسب المواعيد</span>}
                        </TableCell>
                        <TableCell>{c.avg_rating?.toFixed(1) || "—"} ({c.reviews_count})</TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium ${sb.color}`}>
                            {sb.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {c.status === "pending" && (
                              <Button size="sm" onClick={() => setStatus(c.id, "approved")} data-testid={`approve-${c.id}`} className="h-8 px-2 bg-forest text-bone gap-1">
                                <CheckCircle2 size={12} /> اعتماد
                              </Button>
                            )}
                            {c.status === "approved" && (
                              <Button size="sm" variant="outline" onClick={() => setStatus(c.id, "suspended")} data-testid={`suspend-${c.id}`} className="h-8 px-2 gap-1">
                                <PauseCircle size={12} /> تعليق
                              </Button>
                            )}
                            {c.status === "suspended" && (
                              <Button size="sm" onClick={() => setStatus(c.id, "approved")} data-testid={`unsuspend-${c.id}`} className="h-8 px-2 bg-forest text-bone gap-1">
                                <CheckCircle2 size={12} /> إعادة تفعيل
                              </Button>
                            )}
                            <Button
                              size="sm"
                              data-testid={`feature-${c.id}`}
                              onClick={() => toggleFeature(c.id, c.featured)}
                              variant={c.featured ? "default" : "outline"}
                              className={c.featured ? "bg-gold text-forest hover:bg-gold-dark h-8 gap-1" : "h-8 gap-1"}
                            >
                              <Sparkles size={12} />
                              {c.featured ? "مميز" : "تمييز"}
                            </Button>
                            <Link to={`/chalets/${c.slug}`}>
                              <Button size="sm" variant="outline" className="h-8 px-2 gap-1">
                                <Eye size={12} />
                              </Button>
                            </Link>
                            <Button size="sm" variant="outline" onClick={() => deleteChalet(c.id)} data-testid={`admin-delete-${c.id}`} className="h-8 px-2 text-destructive border-destructive/30 gap-1">
                              <Trash2 size={12} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <div className="bg-card border border-border/40 rounded-2xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">الدور</TableHead>
                    <TableHead className="text-right">البريد/الهاتف</TableHead>
                    <TableHead className="text-right">تاريخ الانضمام</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === "admin" ? "default" : "outline"}>
                          {u.role === "admin" ? "مسؤول" : u.role === "owner" ? "مالك" : "عميل"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm" dir="ltr">{u.email || u.phone}</TableCell>
                      <TableCell className="text-xs text-inkSoft">{new Date(u.created_at).toLocaleDateString("ar")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="bookings">
            <div className="bg-card border border-border/40 rounded-2xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الشاليه</TableHead>
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-right">الموعد</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>{b.chalet_name}</TableCell>
                      <TableCell>
                        <div>{b.customer_name}</div>
                        <div className="text-xs text-inkSoft" dir="ltr">{b.customer_phone}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>{b.slot_date}</div>
                        <div className="text-inkSoft" dir="ltr">{formatTime12(b.slot_start)} - {formatTime12(b.slot_end)}</div>
                      </TableCell>
                      <TableCell>{b.total_price?.toLocaleString("ar")} ₪</TableCell>
                      <TableCell><Badge variant="outline">{b.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="reviews">
            <div className="bg-card border border-border/40 rounded-2xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-right">الشاليه</TableHead>
                    <TableHead className="text-right">التقييم</TableHead>
                    <TableHead className="text-right">التعليق</TableHead>
                    <TableHead className="text-right">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((r) => (
                    <TableRow key={r.id} data-testid={`admin-review-${r.id}`}>
                      <TableCell>{r.customer_name}</TableCell>
                      <TableCell>{r.chalet_name}</TableCell>
                      <TableCell>{r.rating}⭐</TableCell>
                      <TableCell className="max-w-md text-sm">{r.comment}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => deleteReview(r.id)} data-testid={`del-review-${r.id}`} className="text-destructive border-destructive/30 gap-1">
                          <Trash2 size={12} /> حذف
                        </Button>
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

function Stat({ label, value, icon, highlight }) {
  return (
    <div className={`rounded-2xl p-5 border ${highlight ? "bg-gold/10 border-gold/30" : "bg-card border-border/40"}`}>
      <div className="w-9 h-9 rounded-full bg-gold/15 text-gold grid place-items-center mb-3">
        {icon}
      </div>
      <div className="text-xs text-inkSoft mb-1">{label}</div>
      <div className="font-heading text-2xl text-forest">{value}</div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="bg-card border border-border/40 rounded-2xl p-6">
      <h3 className="font-heading text-lg text-forest mb-4">{title}</h3>
      <div>{children}</div>
    </div>
  );
}

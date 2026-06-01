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
} from "lucide-react";
import { toast } from "sonner";
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
    } catch {
      toast.error("تعذرت العملية");
    }
  };

  const setStatus = async (id, status) => {
    try {
      await api.post(`/admin/chalets/${id}/status?status=${status}`);
      toast.success("تم تحديث الحالة");
      load();
    } catch {
      toast.error("تعذرت العملية");
    }
  };

  const deleteReview = async (id) => {
    if (!confirm("هل أنت متأكد من حذف هذا التقييم؟")) return;
    try {
      await api.delete(`/reviews/${id}`);
      toast.success("تم الحذف");
      load();
    } catch {
      toast.error("تعذر الحذف");
    }
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
          <Stat label="الحجوزات" value={stats.bookings || 0} icon={<Calendar size={18} />} />
          <Stat label="تقييمات مُبلغ عنها" value={stats.reported_reviews || 0} icon={<Flag size={18} />} highlight />
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-muted mb-6">
            <TabsTrigger value="overview" data-testid="admin-tab-overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="chalets" data-testid="admin-tab-chalets">الشاليهات</TabsTrigger>
            <TabsTrigger value="users" data-testid="admin-tab-users">المستخدمون</TabsTrigger>
            <TabsTrigger value="bookings" data-testid="admin-tab-bookings">الحجوزات</TabsTrigger>
            <TabsTrigger value="reviews" data-testid="admin-tab-reviews">التقييمات</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Panel title="آخر الشاليهات">
                {chalets.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
                    <div className="flex items-center gap-3">
                      {c.images?.[0] && <img src={fileUrl(c.images[0])} className="w-10 h-10 rounded-lg object-cover" alt="" />}
                      <div>
                        <div className="text-sm font-medium text-ink">{c.name}</div>
                        <div className="text-xs text-inkSoft">{c.location}</div>
                      </div>
                    </div>
                    <Badge variant="outline">{c.status}</Badge>
                  </div>
                ))}
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
                    <TableHead className="text-right">السعر</TableHead>
                    <TableHead className="text-right">التقييم</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chalets.map((c) => (
                    <TableRow key={c.id} data-testid={`admin-chalet-${c.id}`}>
                      <TableCell>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-inkSoft">{c.location}</div>
                      </TableCell>
                      <TableCell className="text-sm">{c.owner_name}</TableCell>
                      <TableCell>{c.price_per_night} ر.س</TableCell>
                      <TableCell>{c.avg_rating?.toFixed(1) || "—"} ({c.reviews_count})</TableCell>
                      <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-2">
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
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
                    <TableHead className="text-right">التواريخ</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>{b.chalet_name}</TableCell>
                      <TableCell>{b.customer_name}</TableCell>
                      <TableCell className="text-xs">{b.check_in} → {b.check_out}</TableCell>
                      <TableCell>{b.total_price?.toLocaleString("ar")} ر.س</TableCell>
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
    <div className={`rounded-2xl p-5 border ${highlight ? "bg-gold/10 border-gold/20" : "bg-card border-border/40"}`}>
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

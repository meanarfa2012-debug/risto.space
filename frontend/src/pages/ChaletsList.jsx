import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Filter, Search } from "lucide-react";
import api from "../lib/api";
import Layout from "../components/Layout";
import ChaletCard from "../components/ChaletCard";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Slider } from "../components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

export default function ChaletsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [chalets, setChalets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState(searchParams.get("q") || "");
  const [location, setLocation] = useState(searchParams.get("location") || "");
  const [capacity, setCapacity] = useState(searchParams.get("capacity") || "");
  const [rooms, setRooms] = useState(searchParams.get("rooms") || "");
  const [price, setPrice] = useState([
    Number(searchParams.get("min_price") || 0),
    Number(searchParams.get("max_price") || 5000),
  ]);
  const [minRating, setMinRating] = useState(searchParams.get("min_rating") || "");
  const [checkIn, setCheckIn] = useState(searchParams.get("check_in") || "");
  const [checkOut, setCheckOut] = useState(searchParams.get("check_out") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "newest");
  const featured = searchParams.get("featured") === "true";

  const load = async () => {
    setLoading(true);
    const params = {};
    if (q) params.q = q;
    if (location) params.location = location;
    if (capacity) params.capacity = Number(capacity);
    if (rooms) params.rooms = Number(rooms);
    if (price[0] > 0) params.min_price = price[0];
    if (price[1] < 5000) params.max_price = price[1];
    if (minRating) params.min_rating = Number(minRating);
    if (checkIn) params.check_in = checkIn;
    if (checkOut) params.check_out = checkOut;
    if (sort) params.sort = sort;
    if (featured) params.featured = true;

    try {
      const { data } = await api.get("/chalets", { params });
      setChalets(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, sort]);

  const applyFilters = () => {
    const next = {};
    if (q) next.q = q;
    if (location) next.location = location;
    if (capacity) next.capacity = capacity;
    if (rooms) next.rooms = rooms;
    if (price[0] > 0) next.min_price = price[0];
    if (price[1] < 5000) next.max_price = price[1];
    if (minRating) next.min_rating = minRating;
    if (checkIn) next.check_in = checkIn;
    if (checkOut) next.check_out = checkOut;
    if (sort) next.sort = sort;
    if (featured) next.featured = "true";
    setSearchParams(next);
  };

  const reset = () => {
    setQ(""); setLocation(""); setCapacity(""); setRooms("");
    setPrice([0, 5000]); setMinRating(""); setCheckIn(""); setCheckOut("");
    setSort("newest");
    setSearchParams({});
  };

  return (
    <Layout>
      <div className="container-wide py-12">
        <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="text-xs tracking-[0.25em] text-gold mb-2">استكشف</div>
            <h1 className="font-heading text-4xl md:text-5xl text-forest">
              {featured ? "الشاليهات المميزة" : "جميع الشاليهات"}
            </h1>
            <p className="text-inkSoft mt-2">
              {loading ? "جاري التحميل..." : `${chalets.length} شاليه متاح`}
            </p>
          </div>
          <div className="w-full md:w-64">
            <Label className="text-xs text-inkSoft mb-1.5 block">ترتيب حسب</Label>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger data-testid="sort-select" className="bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="newest">الأحدث</SelectItem>
                <SelectItem value="top_rated">الأعلى تقييماً</SelectItem>
                <SelectItem value="price_asc">السعر: من الأقل</SelectItem>
                <SelectItem value="price_desc">السعر: من الأعلى</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Filters */}
          <aside data-testid="filters-panel" className="lg:col-span-3 space-y-6 bg-card rounded-2xl p-6 border border-border/40 luxury-shadow h-fit lg:sticky lg:top-28">
            <div className="flex items-center gap-2 pb-3 border-b border-border/40">
              <Filter size={16} strokeWidth={1.5} className="text-gold" />
              <span className="font-heading text-lg text-forest">تصفية</span>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-inkSoft">بحث</Label>
              <Input
                data-testid="filter-q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث..."
                className="bg-bone border-forest/10 focus:ring-gold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-inkSoft">الموقع</Label>
              <Input
                data-testid="filter-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="مثال: الرياض، جدة..."
                className="bg-bone border-forest/10"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-inkSoft">الغرف</Label>
                <Input
                  data-testid="filter-rooms"
                  type="number" min="0"
                  value={rooms}
                  onChange={(e) => setRooms(e.target.value)}
                  placeholder="2+"
                  className="bg-bone border-forest/10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-inkSoft">الضيوف</Label>
                <Input
                  data-testid="filter-capacity"
                  type="number" min="0"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="4+"
                  className="bg-bone border-forest/10"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs text-inkSoft flex justify-between">
                <span>السعر / ليلة</span>
                <span className="text-forest">{price[0]} - {price[1]} ر.س</span>
              </Label>
              <Slider
                data-testid="filter-price"
                value={price}
                onValueChange={setPrice}
                min={0} max={5000} step={50}
                dir="rtl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-inkSoft">أدنى تقييم</Label>
              <Select value={minRating} onValueChange={(v) => setMinRating(v === "any" ? "" : v)}>
                <SelectTrigger data-testid="filter-rating" className="bg-bone border-forest/10">
                  <SelectValue placeholder="أي تقييم" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="any">أي تقييم</SelectItem>
                  <SelectItem value="3">3 نجوم فأكثر</SelectItem>
                  <SelectItem value="4">4 نجوم فأكثر</SelectItem>
                  <SelectItem value="4.5">4.5 فأكثر</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-inkSoft">تاريخ الوصول</Label>
                <Input
                  data-testid="filter-checkin"
                  type="date" value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="bg-bone border-forest/10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-inkSoft">تاريخ المغادرة</Label>
                <Input
                  data-testid="filter-checkout"
                  type="date" value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="bg-bone border-forest/10"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={applyFilters} data-testid="apply-filters" className="flex-1 bg-forest text-bone hover:bg-forest-dark">
                <Search size={14} className="ml-1.5" />
                تطبيق
              </Button>
              <Button onClick={reset} variant="outline" data-testid="reset-filters">
                مسح
              </Button>
            </div>
          </aside>

          {/* Results */}
          <div className="lg:col-span-9">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="bg-card rounded-xl overflow-hidden animate-pulse">
                    <div className="aspect-[4/3] bg-muted" />
                    <div className="p-6 space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-3 bg-muted rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : chalets.length === 0 ? (
              <div className="text-center py-24 bg-card rounded-2xl border border-border/40">
                <div className="font-heading text-2xl text-forest mb-2">لا توجد نتائج</div>
                <p className="text-inkSoft">جرّب تعديل معايير البحث</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8" data-testid="chalets-grid">
                {chalets.map((c) => (
                  <ChaletCard key={c.id} chalet={c} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

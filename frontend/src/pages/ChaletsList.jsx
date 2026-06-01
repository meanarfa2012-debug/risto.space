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
  const [price, setPrice] = useState([
    Number(searchParams.get("min_price") || 0),
    Number(searchParams.get("max_price") || 2000),
  ]);
  const [sort, setSort] = useState(searchParams.get("sort") || "newest");
  const featured = searchParams.get("featured") === "true";

  const load = async () => {
    setLoading(true);
    const params = {};
    if (q) params.q = q;
    if (price[0] > 0) params.min_price = price[0];
    if (price[1] < 2000) params.max_price = price[1];
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
    if (price[0] > 0) next.min_price = price[0];
    if (price[1] < 2000) next.max_price = price[1];
    if (sort) next.sort = sort;
    if (featured) next.featured = "true";
    setSearchParams(next);
  };

  const reset = () => {
    setQ(""); setPrice([0, 2000]); setSort("newest");
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
          <aside data-testid="filters-panel" className="lg:col-span-3 space-y-5 bg-card rounded-2xl p-6 border border-border/40 luxury-shadow h-fit lg:sticky lg:top-28">
            <div className="flex items-center gap-2 pb-3 border-b border-border/40">
              <Filter size={16} strokeWidth={1.5} className="text-gold" />
              <span className="font-heading text-lg text-forest">تصفية</span>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-inkSoft">اسم الشاليه</Label>
              <Input
                data-testid="filter-q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث باسم الشاليه..."
                className="bg-bone border-forest/10"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-xs text-inkSoft flex justify-between">
                <span>نطاق السعر (₪)</span>
                <span className="text-forest">{price[0]} - {price[1]}</span>
              </Label>
              <Slider
                data-testid="filter-price"
                value={price}
                onValueChange={setPrice}
                min={0} max={2000} step={50}
                dir="rtl"
              />
              <p className="text-[10px] text-inkSoft">اختياري</p>
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

            <div className="text-[11px] text-inkSoft text-center pt-2 border-t border-border/40">
              أو تصفّح كل الشاليهات دون تصفية
            </div>
          </aside>

          <div className="lg:col-span-9">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="bg-card rounded-xl overflow-hidden animate-pulse">
                    <div className="aspect-[4/3] bg-muted" />
                    <div className="p-6 space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : chalets.length === 0 ? (
              <div className="text-center py-24 bg-card rounded-2xl border border-border/40">
                <div className="font-heading text-2xl text-forest mb-2">لا توجد نتائج</div>
                <p className="text-inkSoft">جرّب تعديل معايير البحث أو امسح التصفية</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8" data-testid="chalets-grid">
                {chalets.map((c) => <ChaletCard key={c.id} chalet={c} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

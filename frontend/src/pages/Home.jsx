import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ArrowLeft, Star } from "lucide-react";
import api from "../lib/api";
import Layout from "../components/Layout";
import ChaletCard from "../components/ChaletCard";
import { Button } from "../components/ui/button";

const HERO_IMG =
  "https://images.unsplash.com/photo-1673469110171-dbf5d19a8336?crop=entropy&cs=srgb&fm=jpg&w=2000&q=85";

export default function HomePage() {
  const [data, setData] = useState({ featured: [], new: [], top_rated: [] });
  const [q, setQ] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    api.get("/chalets/homepage").then((r) => setData(r.data)).catch(() => {});
  }, []);

  const goSearch = (e) => {
    e?.preventDefault?.();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    nav(`/chalets?${params.toString()}`);
  };

  return (
    <Layout>
      {/* HERO + SEARCH */}
      <section className="relative -mt-20 pt-20 min-h-[80vh] flex items-center" data-testid="hero-section">
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="" className="w-full h-full object-cover" />
          <div className="hero-overlay absolute inset-0" />
        </div>

        <div className="container-wide relative z-10 pt-12 pb-20">
          <div className="max-w-3xl text-bone animate-fade-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-bone/20 backdrop-blur-md bg-white/5 text-xs tracking-[0.2em] mb-6">
              <Star size={12} strokeWidth={1.5} className="fill-gold text-gold" />
              منصة الشاليهات والفلل في فلسطين
            </div>
            <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-semibold leading-[1.05] mb-5 text-balance">
              احجز شاليهك<br />
              <span className="text-gold">بأبسط الطرق</span>
            </h1>
            <p className="text-lg text-bone/85 leading-loose max-w-xl mb-8">
              اختر من بين أرقى الشاليهات والفلل، شاهد المواعيد المتاحة، واحجز مباشرة. الدفع نقداً عند الوصول.
            </p>

            <form
              onSubmit={goSearch}
              data-testid="hero-search-form"
              className="bg-bone/95 backdrop-blur-xl rounded-2xl p-2 grid grid-cols-1 sm:grid-cols-12 gap-2 max-w-2xl"
            >
              <div className="sm:col-span-9 flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-forest/5 transition">
                <Search size={18} strokeWidth={1.5} className="text-gold shrink-0" />
                <input
                  data-testid="search-input"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="ابحث باسم الشاليه أو ابدأ التصفح..."
                  className="bg-transparent outline-none w-full text-sm placeholder:text-inkSoft text-ink"
                />
              </div>
              <Button
                type="submit"
                data-testid="hero-search-submit"
                className="sm:col-span-3 h-auto bg-forest text-bone hover:bg-forest-dark rounded-xl px-6 py-3 text-base"
              >
                بحث
              </Button>
            </form>
            <button
              type="button"
              onClick={() => nav("/chalets")}
              data-testid="browse-all-btn"
              className="mt-4 text-sm text-bone/80 hover:text-gold transition underline-offset-4 hover:underline"
            >
              أو تصفّح جميع الشاليهات
            </button>
          </div>
        </div>
      </section>

      {/* FEATURED */}
      {data.featured.length > 0 && (
        <section className="container-wide py-20" data-testid="featured-section">
          <SectionHeading
            eyebrow="مختارات ريستو"
            title="الشاليهات المميزة"
            ctaLabel="عرض الكل"
            ctaTo="/chalets?featured=true"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-10">
            {data.featured.slice(0, 6).map((c) => <ChaletCard key={c.id} chalet={c} />)}
          </div>
        </section>
      )}

      {/* TOP RATED */}
      {data.top_rated.length > 0 && (
        <section className="bg-forest py-20 text-bone" data-testid="top-rated-section">
          <div className="container-wide">
            <SectionHeading
              dark
              eyebrow="الأعلى تقييماً"
              title="إعجاب الضيوف"
              ctaLabel="عرض الكل"
              ctaTo="/chalets?sort=top_rated"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-10">
              {data.top_rated.slice(0, 3).map((c) => <ChaletCard key={c.id} chalet={c} />)}
            </div>
          </div>
        </section>
      )}

      {/* LATEST */}
      <section className="container-wide py-20" data-testid="new-section">
        <SectionHeading
          eyebrow="أحدث الإضافات"
          title="الشاليهات الجديدة"
          ctaLabel="استكشف الكل"
          ctaTo="/chalets?sort=newest"
        />
        {data.new.length === 0 ? (
          <div className="text-center py-20 text-inkSoft">
            لا توجد شاليهات حالياً. كن أول من ينضم!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-10">
            {data.new.slice(0, 6).map((c) => <ChaletCard key={c.id} chalet={c} />)}
          </div>
        )}
      </section>

      {/* OWNER CTA */}
      <section className="container-wide pb-20" data-testid="owner-cta">
        <div className="relative rounded-3xl overflow-hidden bg-forest p-10 md:p-16">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `url(${HERO_IMG})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }} />
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="text-bone max-w-xl">
              <div className="text-xs tracking-[0.25em] text-gold mb-3">شريك ريستو</div>
              <h2 className="font-heading text-3xl md:text-4xl mb-3 leading-tight">
                هل تملك شاليهاً؟ <span className="text-gold">انضم إلينا.</span>
              </h2>
              <p className="text-bone/80 leading-loose">
                سجّل شاليهك، حدّد مواعيدك وأسعارك بحرية، واستقبل الحجوزات مباشرة.
              </p>
            </div>
            <Link to="/owner/register" data-testid="owner-cta-btn">
              <Button className="bg-gold text-forest hover:bg-gold-dark rounded-full px-8 py-6 text-base font-semibold">
                سجّل شاليهك الآن
                <ArrowLeft size={18} className="mr-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}

function SectionHeading({ eyebrow, title, ctaLabel, ctaTo, dark }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div>
        <div className="text-xs tracking-[0.25em] text-gold mb-2">{eyebrow}</div>
        <h2 className={`font-heading text-3xl md:text-4xl ${dark ? "text-bone" : "text-forest"}`}>
          {title}
        </h2>
      </div>
      {ctaLabel && ctaTo && (
        <Link
          to={ctaTo}
          className={`inline-flex items-center gap-2 text-sm font-medium ${dark ? "text-gold" : "text-forest"} hover:gap-3 transition-all`}
        >
          {ctaLabel}
          <ArrowLeft size={16} strokeWidth={1.5} />
        </Link>
      )}
    </div>
  );
}

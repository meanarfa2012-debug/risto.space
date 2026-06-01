import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, MapPin, Calendar, Users, Quote, ArrowLeft, Star } from "lucide-react";
import api from "../lib/api";
import Layout from "../components/Layout";
import ChaletCard from "../components/ChaletCard";
import StarRating from "../components/StarRating";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

const HERO_IMG =
  "https://images.unsplash.com/photo-1673469110171-dbf5d19a8336?crop=entropy&cs=srgb&fm=jpg&w=2000&q=85";

const COLLECTION_IMGS = [
  "https://images.pexels.com/photos/32361209/pexels-photo-32361209.jpeg?auto=compress&cs=tinysrgb&w=940",
  "https://images.pexels.com/photos/31299067/pexels-photo-31299067.jpeg?auto=compress&cs=tinysrgb&w=940",
  "https://images.pexels.com/photos/35418211/pexels-photo-35418211.jpeg?auto=compress&cs=tinysrgb&w=940",
];

export default function HomePage() {
  const [data, setData] = useState({ featured: [], new: [], top_rated: [], latest_reviews: [] });
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [guests, setGuests] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    api.get("/chalets/homepage").then((r) => setData(r.data)).catch(() => {});
  }, []);

  const goSearch = (e) => {
    e?.preventDefault?.();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (location) params.set("location", location);
    if (guests) params.set("capacity", guests);
    nav(`/chalets?${params.toString()}`);
  };

  return (
    <Layout>
      {/* HERO */}
      <section className="relative -mt-20 pt-20 min-h-[92vh] flex items-center" data-testid="hero-section">
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="Resto luxury chalet" className="w-full h-full object-cover" />
          <div className="hero-overlay absolute inset-0" />
        </div>

        <div className="container-wide relative z-10 pt-16 pb-24">
          <div className="max-w-3xl text-bone animate-fade-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-bone/20 backdrop-blur-md bg-white/5 text-xs tracking-[0.2em] mb-8">
              <Star size={12} strokeWidth={1.5} className="fill-gold text-gold" />
              منصة الشاليهات الفاخرة الأولى
            </div>
            <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-semibold leading-[1.05] mb-6 text-balance">
              فخامةٌ تليقُ <br />
              <span className="text-gold">بإقامتك</span>
            </h1>
            <p className="text-lg sm:text-xl text-bone/85 leading-loose max-w-2xl mb-10">
              اكتشف نخبة الشاليهات في أرقى الوجهات. تجربة حجز سلسة، شاليهات منتقاة بعناية، إقامة لا تُنسى.
            </p>

            {/* Search Bar */}
            <form
              onSubmit={goSearch}
              data-testid="hero-search-form"
              className="bg-bone/95 backdrop-blur-xl rounded-2xl p-2 grid grid-cols-1 sm:grid-cols-12 gap-2 max-w-3xl"
            >
              <div className="sm:col-span-5 flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-forest/5 transition">
                <Search size={18} strokeWidth={1.5} className="text-gold shrink-0" />
                <input
                  data-testid="search-input"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="ابحث عن شاليه..."
                  className="bg-transparent outline-none w-full text-sm placeholder:text-inkSoft text-ink"
                />
              </div>
              <div className="sm:col-span-3 flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-forest/5 transition border-r border-border/50">
                <MapPin size={18} strokeWidth={1.5} className="text-gold shrink-0" />
                <input
                  data-testid="search-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="الوجهة"
                  className="bg-transparent outline-none w-full text-sm placeholder:text-inkSoft text-ink"
                />
              </div>
              <div className="sm:col-span-2 flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-forest/5 transition border-r border-border/50">
                <Users size={18} strokeWidth={1.5} className="text-gold shrink-0" />
                <input
                  data-testid="search-guests"
                  type="number"
                  min="1"
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  placeholder="الضيوف"
                  className="bg-transparent outline-none w-full text-sm placeholder:text-inkSoft text-ink"
                />
              </div>
              <Button
                type="submit"
                data-testid="hero-search-submit"
                className="sm:col-span-2 h-auto bg-forest text-bone hover:bg-forest-dark rounded-xl px-6 py-3 text-base"
              >
                بحث
              </Button>
            </form>

            <div className="mt-10 flex items-center gap-8 text-bone/80">
              <div>
                <div className="font-heading text-3xl text-gold">+1000</div>
                <div className="text-xs tracking-widest text-bone/60">شاليه فاخر</div>
              </div>
              <div className="w-px h-10 bg-bone/20" />
              <div>
                <div className="font-heading text-3xl text-gold">98%</div>
                <div className="text-xs tracking-widest text-bone/60">رضا الضيوف</div>
              </div>
              <div className="w-px h-10 bg-bone/20" />
              <div>
                <div className="font-heading text-3xl text-gold">24/7</div>
                <div className="text-xs tracking-widest text-bone/60">دعم متواصل</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section className="container-wide py-24" data-testid="featured-section">
        <SectionHeading
          eyebrow="مختارات ريستو"
          title="الشاليهات المميزة"
          subtitle="مجموعة منتقاة من أرقى الشاليهات بمعايير الفخامة العالمية"
          ctaLabel="عرض الكل"
          ctaTo="/chalets?featured=true"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
          {(data.featured.length ? data.featured : data.new).slice(0, 6).map((c) => (
            <ChaletCard key={c.id} chalet={c} />
          ))}
          {data.featured.length === 0 && data.new.length === 0 && (
            <EmptyState />
          )}
        </div>
      </section>

      {/* COLLECTION BENTO */}
      <section className="container-wide pb-24" data-testid="collection-section">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-7 relative aspect-[4/3] md:aspect-auto md:h-[480px] rounded-2xl overflow-hidden group">
            <img src={COLLECTION_IMGS[0]} alt="" className="w-full h-full object-cover transition-transform duration-[1500ms] group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-forest/80 via-forest/20 to-transparent" />
            <div className="absolute bottom-8 right-8 left-8 text-bone">
              <div className="text-xs tracking-widest text-gold mb-3">مجموعة الجبل</div>
              <h3 className="font-heading text-3xl md:text-4xl mb-3">شاليهات بإطلالات خلابة</h3>
              <p className="text-bone/80 max-w-md">استيقظ على رؤية البحيرة، نمْ تحت قبة من النجوم</p>
            </div>
          </div>
          <div className="md:col-span-5 grid grid-rows-2 gap-6">
            <div className="relative aspect-[5/3] md:aspect-auto rounded-2xl overflow-hidden group">
              <img src={COLLECTION_IMGS[1]} alt="" className="w-full h-full object-cover transition-transform duration-[1500ms] group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-forest/70 to-transparent" />
              <div className="absolute bottom-6 right-6 left-6 text-bone">
                <div className="text-xs tracking-widest text-gold mb-2">مجموعة الواحة</div>
                <h3 className="font-heading text-xl">صفاء وهدوء وسط الطبيعة</h3>
              </div>
            </div>
            <div className="relative aspect-[5/3] md:aspect-auto rounded-2xl overflow-hidden group">
              <img src={COLLECTION_IMGS[2]} alt="" className="w-full h-full object-cover transition-transform duration-[1500ms] group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-forest/70 to-transparent" />
              <div className="absolute bottom-6 right-6 left-6 text-bone">
                <div className="text-xs tracking-widest text-gold mb-2">مسابح خاصة</div>
                <h3 className="font-heading text-xl">إقامة بحرية كاملة الخصوصية</h3>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TOP RATED */}
      <section className="bg-forest py-24 text-bone" data-testid="top-rated-section">
        <div className="container-wide">
          <SectionHeading
            dark
            eyebrow="الأعلى تقييماً"
            title="إعجاب الضيوف"
            subtitle="شاليهات حصلت على إشادة استثنائية من النزلاء"
            ctaLabel="عرض الكل"
            ctaTo="/chalets?sort=top_rated"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            {(data.top_rated.length ? data.top_rated : data.new).slice(0, 3).map((c) => (
              <ChaletCard key={c.id} chalet={c} />
            ))}
            {data.top_rated.length === 0 && data.new.length === 0 && <EmptyState dark />}
          </div>
        </div>
      </section>

      {/* NEW CHALETS */}
      <section className="container-wide py-24" data-testid="new-section">
        <SectionHeading
          eyebrow="إضافات جديدة"
          title="أحدث الشاليهات"
          subtitle="انضموا حديثاً إلى مجموعة ريستو"
          ctaLabel="استكشف الكل"
          ctaTo="/chalets?sort=newest"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
          {data.new.slice(0, 6).map((c) => (
            <ChaletCard key={c.id} chalet={c} />
          ))}
          {data.new.length === 0 && <EmptyState />}
        </div>
      </section>

      {/* REVIEWS */}
      {data.latest_reviews.length > 0 && (
        <section className="container-wide pb-24" data-testid="reviews-section">
          <SectionHeading
            eyebrow="شهادات الضيوف"
            title="ما يقولونه عن ريستو"
            subtitle="قصص حقيقية لإقامات استثنائية"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            {data.latest_reviews.slice(0, 3).map((r) => (
              <div
                key={r.id}
                data-testid={`home-review-${r.id}`}
                className="bg-card border border-border/40 rounded-2xl p-8 luxury-shadow"
              >
                <Quote size={32} strokeWidth={1} className="text-gold mb-4" />
                <p className="text-ink leading-loose mb-6 text-balance">{r.comment}</p>
                <div className="flex items-center justify-between pt-4 border-t border-border/40">
                  <div>
                    <div className="font-heading text-base text-forest">{r.customer_name}</div>
                    <div className="text-xs text-inkSoft">{r.chalet_name}</div>
                  </div>
                  <StarRating value={r.rating} size={14} testIdPrefix={`home-review-${r.id}-stars`} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* OWNER CTA */}
      <section className="container-wide pb-24" data-testid="owner-cta">
        <div className="relative rounded-3xl overflow-hidden bg-forest p-12 md:p-20">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `url(${COLLECTION_IMGS[0]})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }} />
          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            <div className="text-bone">
              <div className="text-xs tracking-[0.25em] text-gold mb-4">شريك ريستو</div>
              <h2 className="font-heading text-4xl md:text-5xl mb-6 leading-tight">
                هل تملك شاليهاً؟<br/>
                <span className="text-gold">انضم إلى ريستو</span>
              </h2>
              <p className="text-bone/80 leading-loose mb-8 max-w-md">
                سجّل شاليهك بكل سهولة، استقبل الحجوزات، احصل على رابط ورمز QR خاص بك، شارك على منصات التواصل، وحقق دخلاً مستداماً.
              </p>
              <Link to="/owner/register" data-testid="owner-cta-btn">
                <Button className="bg-gold text-forest hover:bg-gold-dark rounded-full px-8 py-6 text-base font-semibold">
                  سجّل شاليهك الآن
                  <ArrowLeft size={18} className="mr-2" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:gap-6">
              <FeaturePill label="رابط مخصص فريد" />
              <FeaturePill label="رمز QR قابل للتنزيل" />
              <FeaturePill label="مشاركة على فيسبوك" />
              <FeaturePill label="تنبيهات فورية" />
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}

function SectionHeading({ eyebrow, title, subtitle, ctaLabel, ctaTo, dark }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
      <div>
        <div className={`text-xs tracking-[0.25em] ${dark ? "text-gold" : "text-gold"} mb-3`}>
          {eyebrow}
        </div>
        <h2 className={`font-heading text-3xl md:text-4xl lg:text-5xl ${dark ? "text-bone" : "text-forest"} mb-3`}>
          {title}
        </h2>
        {subtitle && (
          <p className={`text-base max-w-2xl ${dark ? "text-bone/70" : "text-inkSoft"} leading-loose`}>
            {subtitle}
          </p>
        )}
      </div>
      {ctaLabel && ctaTo && (
        <Link
          to={ctaTo}
          className={`inline-flex items-center gap-2 text-sm font-medium ${
            dark ? "text-gold" : "text-forest"
          } hover:gap-3 transition-all`}
        >
          {ctaLabel}
          <ArrowLeft size={16} strokeWidth={1.5} />
        </Link>
      )}
    </div>
  );
}

function EmptyState({ dark }) {
  return (
    <div className={`col-span-full text-center py-16 ${dark ? "text-bone/60" : "text-inkSoft"}`}>
      لا توجد شاليهات بعد. كن أول من يسجل شاليهاً!
    </div>
  );
}

function FeaturePill({ label }) {
  return (
    <div className="bg-bone/5 backdrop-blur border border-bone/10 rounded-2xl p-5 text-bone hover:bg-gold/10 transition-colors">
      <div className="w-8 h-8 rounded-full bg-gold/20 grid place-items-center mb-3">
        <Star size={14} strokeWidth={1.5} className="text-gold fill-gold" />
      </div>
      <div className="font-medium text-sm">{label}</div>
    </div>
  );
}

import React from "react";
import { Link } from "react-router-dom";
import { MapPin, Users, BedDouble, Sparkles } from "lucide-react";
import { fileUrl } from "../lib/api";
import StarRating from "./StarRating";

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1673469110171-dbf5d19a8336?crop=entropy&cs=srgb&fm=jpg&w=940&q=80";

export default function ChaletCard({ chalet }) {
  const firstImg = chalet.images?.[0]
    ? fileUrl(chalet.images[0])
    : FALLBACK_IMG;

  return (
    <Link
      to={`/chalets/${chalet.slug}`}
      data-testid={`chalet-card-${chalet.id}`}
      className="group block bg-card rounded-xl overflow-hidden luxury-shadow hover:-translate-y-1 transition-all duration-500"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={firstImg}
          alt={chalet.name}
          className="w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-105"
          loading="lazy"
        />
        {chalet.featured && (
          <div className="absolute top-4 right-4 bg-gold text-forest text-xs font-semibold px-3 py-1.5 rounded-full inline-flex items-center gap-1.5">
            <Sparkles size={12} strokeWidth={2} />
            مميز
          </div>
        )}
        <div className="image-fade absolute inset-0 pointer-events-none" />
      </div>

      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-heading text-xl text-forest leading-tight group-hover:text-gold transition-colors">
            {chalet.name}
          </h3>
          <div className="flex items-center gap-1 shrink-0 text-sm">
            <StarRating value={chalet.avg_rating || 0} size={14} testIdPrefix={`card-${chalet.id}-rating`} />
            <span className="text-xs text-inkSoft mr-1">
              ({chalet.reviews_count || 0})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-sm text-inkSoft">
          <MapPin size={14} strokeWidth={1.5} className="text-gold" />
          <span>{chalet.location}</span>
        </div>

        <div className="flex items-center gap-5 text-sm text-inkSoft">
          <div className="flex items-center gap-1.5">
            <BedDouble size={14} strokeWidth={1.5} />
            {chalet.rooms} غرف
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={14} strokeWidth={1.5} />
            {chalet.capacity} ضيوف
          </div>
        </div>

        <div className="pt-4 border-t border-border/50 flex items-end justify-between">
          <div>
            <div className="text-xs text-inkSoft mb-1">الليلة من</div>
            <div className="font-heading text-2xl text-forest">
              {chalet.price_per_night?.toLocaleString("ar")} <span className="text-sm text-gold font-body">ر.س</span>
            </div>
          </div>
          <span className="text-sm font-medium text-gold group-hover:text-forest transition-colors">
            عرض ←
          </span>
        </div>
      </div>
    </Link>
  );
}

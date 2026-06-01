import React, { useState } from "react";
import { Copy, Facebook, Send, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";

export default function ShareButtons({ url, title = "شاليه فاخر" }) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(`اكتشف ${title} على ريستو`);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("تم نسخ الرابط");
    } catch {
      toast.error("تعذر النسخ");
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap" data-testid="share-buttons">
      <Button
        variant="outline"
        size="sm"
        onClick={copy}
        data-testid="share-copy-btn"
        className="gap-2 border-forest/20 text-forest hover:bg-forest hover:text-bone"
      >
        <Copy size={14} strokeWidth={1.5} /> نسخ الرابط
      </Button>
      <a
        data-testid="share-facebook"
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 border border-forest/20 text-forest rounded-md px-3 h-9 text-sm hover:bg-forest hover:text-bone transition"
      >
        <Facebook size={14} strokeWidth={1.5} /> فيسبوك
      </a>
      <a
        data-testid="share-whatsapp"
        href={`https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 border border-forest/20 text-forest rounded-md px-3 h-9 text-sm hover:bg-forest hover:text-bone transition"
      >
        <Send size={14} strokeWidth={1.5} /> واتساب
      </a>
      <a
        data-testid="share-tiktok"
        href={`https://www.tiktok.com/`}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => {
          e.preventDefault();
          copy();
          toast.info("تم نسخ الرابط — الصقه في تيك توك");
        }}
        className="inline-flex items-center gap-2 border border-forest/20 text-forest rounded-md px-3 h-9 text-sm hover:bg-forest hover:text-bone transition"
      >
        <Share2 size={14} strokeWidth={1.5} /> تيك توك
      </a>
      <a
        data-testid="share-instagram"
        href={`https://www.instagram.com/`}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => {
          e.preventDefault();
          copy();
          toast.info("تم نسخ الرابط — الصقه في إنستغرام");
        }}
        className="inline-flex items-center gap-2 border border-forest/20 text-forest rounded-md px-3 h-9 text-sm hover:bg-forest hover:text-bone transition"
      >
        <Share2 size={14} strokeWidth={1.5} /> إنستغرام
      </a>
    </div>
  );
}

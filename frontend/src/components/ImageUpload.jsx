import React, { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import api, { fileUrl } from "../lib/api";
import { toast } from "sonner";

export default function ImageUpload({ value = [], onChange, max = 12 }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files) => {
    const arr = Array.from(files);
    if (value.length + arr.length > max) {
      toast.error(`الحد الأقصى ${max} صور`);
      return;
    }
    setUploading(true);
    try {
      const newPaths = [];
      for (const f of arr) {
        const fd = new FormData();
        fd.append("file", f);
        const { data } = await api.post("/upload", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        newPaths.push(data.path);
      }
      onChange([...value, ...newPaths]);
      toast.success("تم رفع الصور");
    } catch (e) {
      toast.error("فشل رفع الصور");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = (idx) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div data-testid="image-upload" className="space-y-3">
      <button
        type="button"
        data-testid="upload-trigger"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-full border-2 border-dashed border-forest/20 rounded-lg py-8 px-4 hover:border-gold hover:bg-gold/5 transition-colors flex flex-col items-center gap-2 text-inkSoft"
      >
        <Upload size={24} strokeWidth={1.5} className="text-gold" />
        <span className="text-sm">
          {uploading ? "جاري الرفع..." : "اضغط لرفع صور الشاليه"}
        </span>
        <span className="text-xs text-inkSoft/70">PNG/JPG/WEBP — حد أقصى 10 ميجابايت</span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        data-testid="upload-input"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
      {value.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {value.map((p, i) => (
            <div key={p} className="relative aspect-square rounded-lg overflow-hidden group">
              <img src={fileUrl(p)} alt={`upload-${i}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => remove(i)}
                data-testid={`remove-image-${i}`}
                className="absolute top-1.5 left-1.5 w-7 h-7 rounded-full bg-black/60 text-white grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

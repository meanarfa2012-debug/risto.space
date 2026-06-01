import React, { useRef, useState } from "react";
import { Upload, X, Film, Image as ImageIcon } from "lucide-react";
import api, { fileUrl } from "../lib/api";
import { toast } from "sonner";

const IMG_EXT = ["jpg", "jpeg", "png", "webp", "gif"];
const VIDEO_EXT = ["mp4", "mov", "webm", "m4v"];

export default function MediaUpload({
  images = [],
  videos = [],
  onChangeImages,
  onChangeVideos,
  maxImages = 12,
  maxVideos = 4,
}) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files) => {
    const arr = Array.from(files);
    setUploading(true);
    const newImgs = [];
    const newVids = [];
    try {
      for (const f of arr) {
        const ext = (f.name.split(".").pop() || "").toLowerCase();
        const isImg = IMG_EXT.includes(ext);
        const isVid = VIDEO_EXT.includes(ext);
        if (!isImg && !isVid) {
          toast.error(`نوع غير مدعوم: ${f.name}`);
          continue;
        }
        if (isImg && images.length + newImgs.length >= maxImages) {
          toast.error(`الحد الأقصى ${maxImages} صور`);
          continue;
        }
        if (isVid && videos.length + newVids.length >= maxVideos) {
          toast.error(`الحد الأقصى ${maxVideos} فيديوهات`);
          continue;
        }
        const fd = new FormData();
        fd.append("file", f);
        const { data } = await api.post("/upload", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (data.kind === "video") newVids.push(data.path);
        else newImgs.push(data.path);
      }
      if (newImgs.length) onChangeImages([...images, ...newImgs]);
      if (newVids.length) onChangeVideos([...videos, ...newVids]);
      if (newImgs.length || newVids.length) toast.success("تم الرفع");
    } catch (e) {
      toast.error("فشل الرفع");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeImage = (i) => onChangeImages(images.filter((_, idx) => idx !== i));
  const removeVideo = (i) => onChangeVideos(videos.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4" data-testid="media-upload">
      <button
        type="button"
        data-testid="media-upload-trigger"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-full border-2 border-dashed border-forest/20 rounded-lg py-8 px-4 hover:border-gold hover:bg-gold/5 transition-colors flex flex-col items-center gap-2 text-inkSoft"
      >
        <Upload size={24} strokeWidth={1.5} className="text-gold" />
        <span className="text-sm">
          {uploading ? "جاري الرفع..." : "اضغط لرفع صور أو فيديوهات الشاليه"}
        </span>
        <span className="text-xs text-inkSoft/70">
          الصور: JPG/PNG/WEBP (حتى 10 ميجا) · الفيديو: MP4/MOV/WEBM (حتى 100 ميجا)
        </span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        data-testid="media-upload-input"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {images.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs text-inkSoft">
            <ImageIcon size={12} strokeWidth={1.5} /> الصور ({images.length})
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {images.map((p, i) => (
              <div key={p} className="relative aspect-square rounded-lg overflow-hidden group">
                <img src={fileUrl(p)} alt={`img-${i}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  data-testid={`remove-image-${i}`}
                  className="absolute top-1.5 left-1.5 w-7 h-7 rounded-full bg-black/60 text-white grid place-items-center opacity-0 group-hover:opacity-100 transition"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {videos.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs text-inkSoft">
            <Film size={12} strokeWidth={1.5} /> الفيديوهات ({videos.length})
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {videos.map((p, i) => (
              <div key={p} className="relative aspect-video rounded-lg overflow-hidden bg-ink group">
                <video src={fileUrl(p)} className="w-full h-full object-cover" controls />
                <button
                  type="button"
                  onClick={() => removeVideo(i)}
                  data-testid={`remove-video-${i}`}
                  className="absolute top-1.5 left-1.5 w-7 h-7 rounded-full bg-black/70 text-white grid place-items-center opacity-0 group-hover:opacity-100 transition z-10"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

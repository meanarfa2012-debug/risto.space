import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import api from "../lib/api";
import Layout from "../components/Layout";
import MediaUpload from "../components/MediaUpload";
import FeaturesInput from "../components/FeaturesInput";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";

export default function OwnerChaletForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const nav = useNavigate();

  const [form, setForm] = useState({
    name: "",
    description: "",
    phone: "",
    google_maps_url: "",
    rooms: 2,
    capacity: 4,
    features: [],
    images: [],
    videos: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api.get(`/chalets/${id}`).then((r) => setForm({
        name: r.data.name,
        description: r.data.description,
        phone: r.data.phone || "",
        google_maps_url: r.data.google_maps_url || "",
        rooms: r.data.rooms,
        capacity: r.data.capacity,
        features: r.data.features || [],
        images: r.data.images || [],
        videos: r.data.videos || [],
      })).catch(() => toast.error("تعذر تحميل البيانات"));
    }
  }, [id, isEdit]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.images.length === 0) {
      toast.error("أضف صورة واحدة على الأقل");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        rooms: Number(form.rooms),
        capacity: Number(form.capacity),
      };
      if (isEdit) {
        await api.put(`/chalets/${id}`, payload);
        toast.success("تم تحديث الشاليه");
        nav("/owner/dashboard");
      } else {
        const { data } = await api.post("/chalets", payload);
        toast.success("تم إضافة الشاليه. أضف المواعيد الآن.");
        nav(`/owner/chalets/${data.id}/slots`);
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || "تعذر الحفظ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container-wide py-12 max-w-4xl">
        <div className="mb-10">
          <div className="text-xs tracking-[0.25em] text-gold mb-2">شاليهاتي</div>
          <h1 className="font-heading text-4xl text-forest">
            {isEdit ? "تعديل الشاليه" : "إضافة شاليه جديد"}
          </h1>
          {!isEdit && (
            <p className="text-sm text-inkSoft mt-2">
              بعد الإضافة سيكون شاليهك بحالة "بانتظار المراجعة" حتى يعتمده المسؤول.
            </p>
          )}
        </div>

        <form onSubmit={submit} data-testid="chalet-form" className="space-y-8 bg-card border border-border/40 rounded-3xl p-8 luxury-shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label className="text-xs text-inkSoft mb-2 block">اسم الشاليه</Label>
              <Input
                data-testid="form-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
                placeholder="مثال: شاليه الواحة"
                className="h-12 bg-bone border-forest/10"
              />
            </div>
            <div>
              <Label className="text-xs text-inkSoft mb-2 block">رقم الهاتف للتواصل</Label>
              <Input
                data-testid="form-phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="مثال: 0599xxxxxx"
                className="h-12 bg-bone border-forest/10"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-inkSoft mb-2 block">رابط الموقع على خرائط جوجل</Label>
            <Input
              data-testid="form-maps-url"
              type="url"
              value={form.google_maps_url}
              onChange={(e) => set("google_maps_url", e.target.value)}
              placeholder="https://maps.app.goo.gl/..."
              className="h-12 bg-bone border-forest/10"
              dir="ltr"
            />
            <p className="text-xs text-inkSoft mt-1.5">
              الصق الرابط من تطبيق Google Maps حتى يصل الضيوف بسهولة.
            </p>
          </div>

          <div>
            <Label className="text-xs text-inkSoft mb-2 block">الوصف</Label>
            <Textarea
              data-testid="form-description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              required minLength={20} rows={5}
              placeholder="وصف تفصيلي يبرز ميزات الشاليه..."
              className="bg-bone border-forest/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <Label className="text-xs text-inkSoft mb-2 block">عدد الغرف</Label>
              <Input
                data-testid="form-rooms"
                type="number" min="1"
                value={form.rooms}
                onChange={(e) => set("rooms", e.target.value)}
                required className="h-12 bg-bone border-forest/10"
              />
            </div>
            <div>
              <Label className="text-xs text-inkSoft mb-2 block">السعة (ضيوف)</Label>
              <Input
                data-testid="form-capacity"
                type="number" min="1"
                value={form.capacity}
                onChange={(e) => set("capacity", e.target.value)}
                required className="h-12 bg-bone border-forest/10"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-inkSoft mb-3 block">المميزات (حر تماماً)</Label>
            <FeaturesInput value={form.features} onChange={(f) => set("features", f)} />
          </div>

          <div>
            <Label className="text-xs text-inkSoft mb-3 block">الصور والفيديوهات</Label>
            <MediaUpload
              images={form.images}
              videos={form.videos}
              onChangeImages={(imgs) => set("images", imgs)}
              onChangeVideos={(vids) => set("videos", vids)}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-border/40">
            <Button
              type="submit" disabled={loading}
              data-testid="form-submit"
              className="bg-forest text-bone hover:bg-forest-dark rounded-xl px-8 h-12"
            >
              {loading ? "..." : isEdit ? "حفظ التغييرات" : "حفظ ومتابعة لإضافة المواعيد"}
            </Button>
            <Button type="button" variant="outline" onClick={() => nav("/owner/dashboard")} className="h-12">
              إلغاء
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

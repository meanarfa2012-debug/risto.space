import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import api from "../lib/api";
import Layout from "../components/Layout";
import ImageUpload from "../components/ImageUpload";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";

const COMMON_AMENITIES = ["مسبح خاص", "واي فاي مجاني", "موقف سيارات", "مطبخ مجهز", "تكييف", "تدفئة", "ألعاب أطفال", "إطلالة جبلية", "إطلالة بحرية", "بربكيو", "تلفاز", "غسالة"];

export default function OwnerChaletForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const nav = useNavigate();

  const [form, setForm] = useState({
    name: "",
    description: "",
    location: "",
    address: "",
    price_per_night: 500,
    rooms: 2,
    capacity: 4,
    amenities: [],
    images: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api.get(`/chalets/${id}`).then((r) => setForm({
        name: r.data.name,
        description: r.data.description,
        location: r.data.location,
        address: r.data.address || "",
        price_per_night: r.data.price_per_night,
        rooms: r.data.rooms,
        capacity: r.data.capacity,
        amenities: r.data.amenities || [],
        images: r.data.images || [],
      })).catch(() => toast.error("تعذر تحميل البيانات"));
    }
  }, [id, isEdit]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleAmenity = (a) => {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(a)
        ? f.amenities.filter((x) => x !== a)
        : [...f.amenities, a],
    }));
  };

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
        price_per_night: Number(form.price_per_night),
        rooms: Number(form.rooms),
        capacity: Number(form.capacity),
      };
      if (isEdit) {
        await api.put(`/chalets/${id}`, payload);
        toast.success("تم تحديث الشاليه");
      } else {
        await api.post("/chalets", payload);
        toast.success("تم إضافة الشاليه");
      }
      nav("/owner/dashboard");
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
              <Label className="text-xs text-inkSoft mb-2 block">المدينة / المنطقة</Label>
              <Input
                data-testid="form-location"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                required
                placeholder="مثال: الرياض"
                className="h-12 bg-bone border-forest/10"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-inkSoft mb-2 block">العنوان التفصيلي</Label>
            <Input
              data-testid="form-address"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="عنوان دقيق للشاليه (يظهر بعد قبول الحجز)"
              className="h-12 bg-bone border-forest/10"
            />
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <Label className="text-xs text-inkSoft mb-2 block">السعر / ليلة (ر.س)</Label>
              <Input
                data-testid="form-price"
                type="number" min="0"
                value={form.price_per_night}
                onChange={(e) => set("price_per_night", e.target.value)}
                required className="h-12 bg-bone border-forest/10"
              />
            </div>
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
            <Label className="text-xs text-inkSoft mb-3 block">المميزات</Label>
            <div className="flex flex-wrap gap-2">
              {COMMON_AMENITIES.map((a) => {
                const active = form.amenities.includes(a);
                return (
                  <button
                    type="button"
                    key={a}
                    data-testid={`amenity-${a}`}
                    onClick={() => toggleAmenity(a)}
                    className={`px-4 py-2 rounded-full text-sm border transition-all ${
                      active
                        ? "bg-forest text-bone border-forest"
                        : "bg-bone text-ink border-forest/15 hover:border-gold"
                    }`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label className="text-xs text-inkSoft mb-3 block">صور الشاليه</Label>
            <ImageUpload value={form.images} onChange={(imgs) => set("images", imgs)} />
          </div>

          <div className="flex gap-3 pt-4 border-t border-border/40">
            <Button
              type="submit" disabled={loading}
              data-testid="form-submit"
              className="bg-forest text-bone hover:bg-forest-dark rounded-xl px-8 h-12"
            >
              {loading ? "..." : isEdit ? "حفظ التغييرات" : "إضافة الشاليه"}
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

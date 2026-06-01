import React from "react";
import { Phone, MessageCircle, Mail, MapPin, Clock } from "lucide-react";
import Layout from "../components/Layout";
import { SUPPORT_PHONE } from "../lib/format";
import { Button } from "../components/ui/button";

const WA_TEXT = encodeURIComponent("السلام عليكم، أحتاج إلى مساعدة بخصوص منصة ريستو.");

export default function SupportPage() {
  return (
    <Layout>
      <div className="container-wide py-16 max-w-4xl">
        <div className="text-center mb-14">
          <div className="text-xs tracking-[0.3em] text-gold mb-3">نحن هنا لمساعدتك</div>
          <h1 className="font-heading text-5xl md:text-6xl text-forest mb-4">الدعم والمساندة</h1>
          <p className="text-inkSoft leading-loose max-w-2xl mx-auto">
            هل تواجه مشكلة في الحجز؟ هل لديك سؤال عن شاليه؟ فريقنا متاح للرد على استفساراتك على مدار الأسبوع.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <ContactCard
            icon={<Phone size={22} strokeWidth={1.5} />}
            title="اتصل بنا مباشرة"
            description="تحدث مع فريق الدعم"
            testId="support-call-card"
          >
            <a
              href={`tel:${SUPPORT_PHONE}`}
              data-testid="support-call-link"
              dir="ltr"
              className="block font-heading text-3xl md:text-4xl text-forest hover:text-gold transition-colors text-center py-3"
            >
              {SUPPORT_PHONE}
            </a>
            <Button asChild className="w-full bg-forest text-bone hover:bg-forest-dark gap-2">
              <a href={`tel:${SUPPORT_PHONE}`} data-testid="support-call-btn">
                <Phone size={14} strokeWidth={1.5} /> اتصل الآن
              </a>
            </Button>
          </ContactCard>

          <ContactCard
            icon={<MessageCircle size={22} strokeWidth={1.5} />}
            title="واتساب"
            description="راسلنا برسالة نصية"
            testId="support-whatsapp-card"
          >
            <a
              href={`https://wa.me/${SUPPORT_PHONE.replace(/^0/, "972")}?text=${WA_TEXT}`}
              target="_blank"
              rel="noreferrer"
              dir="ltr"
              data-testid="support-whatsapp-link"
              className="block font-heading text-3xl md:text-4xl text-forest hover:text-gold transition-colors text-center py-3"
            >
              {SUPPORT_PHONE}
            </a>
            <Button asChild className="w-full bg-gold text-forest hover:bg-gold-dark gap-2">
              <a
                href={`https://wa.me/${SUPPORT_PHONE.replace(/^0/, "972")}?text=${WA_TEXT}`}
                target="_blank"
                rel="noreferrer"
                data-testid="support-whatsapp-btn"
              >
                <MessageCircle size={14} strokeWidth={1.5} /> فتح واتساب
              </a>
            </Button>
          </ContactCard>
        </div>

        <div className="bg-card border border-border/40 rounded-3xl p-8 md:p-12 luxury-shadow">
          <h2 className="font-heading text-2xl text-forest mb-6">الأسئلة الشائعة</h2>
          <div className="space-y-5">
            <FAQ
              q="كيف أحجز شاليهاً؟"
              a="ادخل برقم هاتفك من صفحة 'تسجيل دخول العميل'، اختر شاليهاً، حدد الموعد المناسب من قائمة المواعيد، ثم أرسل طلب الحجز. سيقوم المالك بقبول أو رفض الطلب."
            />
            <FAQ
              q="هل أحتاج إلى الدفع مسبقاً؟"
              a="لا. جميع الحجوزات على ريستو تتم بنظام الدفع نقداً عند الوصول. لا يوجد دفع إلكتروني."
            />
            <FAQ
              q="كيف أصبح شريكاً وأنشر شاليهي؟"
              a="سجّل من 'سجّل شاليهك' بإيميل وكلمة مرور. بعد إضافة شاليهك، تتم مراجعته من قبل الإدارة قبل ظهوره للعملاء."
            />
            <FAQ
              q="هل يمكنني إلغاء حجزي؟"
              a="نعم، يمكنك إلغاء الحجز قبل بدء موعده من صفحة 'حجوزاتي'. سيُعاد الموعد لقائمة المواعيد المتاحة فوراً."
            />
            <FAQ
              q="نسيت كلمة المرور كصاحب شاليه — ماذا أفعل؟"
              a={`تواصل معنا على ${SUPPORT_PHONE} وسنساعدك في استرداد حسابك بأمان.`}
            />
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoTile icon={<Clock size={16} />} title="ساعات الدعم" value="9 صباحاً - 9 مساءً" />
          <InfoTile icon={<MapPin size={16} />} title="نخدم" value="فلسطين بأكملها" />
          <InfoTile icon={<Mail size={16} />} title="استجابة عادة" value="خلال ساعتين" />
        </div>
      </div>
    </Layout>
  );
}

function ContactCard({ icon, title, description, children, testId }) {
  return (
    <div data-testid={testId} className="bg-card border border-border/40 rounded-3xl p-8 luxury-shadow space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-gold/15 text-gold grid place-items-center">
          {icon}
        </div>
        <div>
          <div className="font-heading text-lg text-forest">{title}</div>
          <div className="text-xs text-inkSoft">{description}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function FAQ({ q, a }) {
  return (
    <details className="border border-border/40 rounded-xl p-5 group">
      <summary className="cursor-pointer font-medium text-ink list-none flex items-center justify-between">
        <span>{q}</span>
        <span className="text-gold text-xl group-open:rotate-45 transition-transform">+</span>
      </summary>
      <p className="text-sm text-inkSoft leading-loose mt-3 pr-1">{a}</p>
    </details>
  );
}

function InfoTile({ icon, title, value }) {
  return (
    <div className="bg-bone border border-border/40 rounded-2xl p-5 text-center">
      <div className="w-9 h-9 rounded-full bg-gold/15 text-gold grid place-items-center mb-2 mx-auto">{icon}</div>
      <div className="text-xs text-inkSoft mb-1">{title}</div>
      <div className="font-heading text-base text-forest">{value}</div>
    </div>
  );
}

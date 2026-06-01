import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import Layout from "../components/Layout";
import { Bell } from "lucide-react";
import { Button } from "../components/ui/button";

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const nav = useNavigate();

  const load = async () => {
    const { data } = await api.get("/notifications");
    setItems(data.items || []);
    setUnread(data.unread || 0);
  };

  useEffect(() => { load(); }, []);

  const open = async (n) => {
    if (!n.read) await api.post(`/notifications/${n.id}/read`);
    if (n.link) nav(n.link);
    load();
  };

  const markAll = async () => {
    await api.post("/notifications/read-all");
    load();
  };

  return (
    <Layout>
      <div className="container-wide py-12 max-w-3xl">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <div className="text-xs tracking-[0.25em] text-gold mb-2">المراسلات</div>
            <h1 className="font-heading text-4xl text-forest">الإشعارات</h1>
            <p className="text-inkSoft mt-2">{unread > 0 ? `${unread} غير مقروء` : "كل شيء على ما يرام"}</p>
          </div>
          {unread > 0 && (
            <Button onClick={markAll} variant="outline" data-testid="mark-all-page">
              تعليم الكل كمقروء
            </Button>
          )}
        </div>

        <div className="bg-card border border-border/40 rounded-2xl overflow-hidden divide-y divide-border/40">
          {items.length === 0 && (
            <div className="p-16 text-center">
              <Bell size={32} strokeWidth={1.5} className="mx-auto text-gold mb-3" />
              <div className="text-inkSoft">لا توجد إشعارات</div>
            </div>
          )}
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => open(n)}
              data-testid={`notif-page-${n.id}`}
              className={`w-full text-right p-6 hover:bg-muted/40 transition-colors ${!n.read ? "bg-gold/5" : ""}`}
            >
              <div className="flex items-start gap-4">
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${!n.read ? "bg-gold" : "bg-transparent"}`} />
                <div className="flex-1">
                  <div className="font-heading text-base text-forest mb-1">{n.title}</div>
                  <div className="text-sm text-inkSoft leading-loose">{n.message}</div>
                  <div className="text-xs text-inkSoft/60 mt-2">
                    {new Date(n.created_at).toLocaleString("ar")}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Layout>
  );
}

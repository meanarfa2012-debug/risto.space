import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import api from "../lib/api";

export default function NotificationsBell() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const nav = useNavigate();

  const load = async () => {
    try {
      const { data } = await api.get("/notifications");
      setItems(data.items || []);
      setUnread(data.unread || 0);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    load();
    const i = setInterval(load, 30000);
    return () => clearInterval(i);
  }, []);

  const markAllRead = async () => {
    await api.post("/notifications/read-all");
    load();
  };

  const click = async (n) => {
    if (!n.read) await api.post(`/notifications/${n.id}/read`);
    setOpen(false);
    if (n.link) nav(n.link);
    load();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          data-testid="notifications-trigger"
          className="relative p-2 rounded-full hover:bg-forest/5 transition-colors"
          aria-label="الإشعارات"
        >
          <Bell size={20} strokeWidth={1.5} className="text-forest" />
          {unread > 0 && (
            <span
              data-testid="notifications-unread-count"
              className="absolute top-1 left-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-gold text-forest text-[10px] font-bold"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end" dir="rtl">
        <div className="flex items-center justify-between p-4 border-b">
          <span className="font-heading text-lg text-forest">الإشعارات</span>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              data-testid="mark-all-read-btn"
              className="text-xs text-gold hover:underline"
            >
              تعليم الكل كمقروء
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 && (
            <div className="p-8 text-center text-sm text-inkSoft">لا توجد إشعارات</div>
          )}
          {items.map((n) => (
            <button
              key={n.id}
              data-testid={`notification-${n.id}`}
              onClick={() => click(n)}
              className={`w-full text-right p-4 border-b border-border/40 hover:bg-muted/50 transition-colors ${
                !n.read ? "bg-gold/5" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${!n.read ? "bg-gold" : "bg-transparent"}`} />
                <div className="flex-1">
                  <div className="font-medium text-ink text-sm">{n.title}</div>
                  <div className="text-xs text-inkSoft mt-1 leading-relaxed">{n.message}</div>
                  <div className="text-[10px] text-inkSoft/70 mt-1.5">
                    {new Date(n.created_at).toLocaleString("ar")}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

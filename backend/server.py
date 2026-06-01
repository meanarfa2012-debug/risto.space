"""Resto - Premium Arabic chalet booking platform - Main FastAPI server."""
import logging
import os
import uuid
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import (
    APIRouter,
    Depends,
    FastAPI,
    File,
    HTTPException,
    Query,
    Response,
    UploadFile,
)
from starlette.middleware.cors import CORSMiddleware

from auth import (
    create_access_token,
    get_current_user,
    hash_password,
    require_role,
    verify_password,
)
from db import (
    bookings_col,
    chalets_col,
    files_col,
    notifications_col,
    reviews_col,
    slots_col,
    users_col,
    close_db,
)
from models import (
    AdminLogin,
    Booking,
    BookingCreate,
    Chalet,
    ChaletCreate,
    ChaletUpdate,
    CustomerLogin,
    OwnerLogin,
    OwnerRegister,
    Review,
    ReviewCreate,
    Slot,
    SlotBulkCreate,
    SlotCreate,
    SlotUpdate,
    User,
    utc_now_iso,
)
from notifications import push_admin_notification, push_notification
from storage import (
    ALL_MIME,
    APP_NAME,
    IMAGE_MIME,
    VIDEO_MIME,
    get_object,
    init_storage,
    put_object,
)
from utils import generate_unique_slug

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Resto API")
api = APIRouter(prefix="/api")


# =============== STARTUP ===============

@app.on_event("startup")
async def on_startup():
    admin_email = os.environ["ADMIN_EMAIL"]
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing = await users_col.find_one({"email": admin_email, "role": "admin"})
    if not existing:
        admin = User(
            role="admin",
            name="مدير المنصة",
            email=admin_email,
            password_hash=hash_password(admin_password),
        )
        await users_col.insert_one(admin.model_dump())
        logger.info("Admin user seeded: %s", admin_email)
    else:
        await users_col.update_one(
            {"id": existing["id"]},
            {"$set": {"password_hash": hash_password(admin_password)}},
        )

    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error("Storage init failed: %s", e)


@app.on_event("shutdown")
async def on_shutdown():
    close_db()


# =============== HEALTH ===============

@api.get("/")
async def root():
    return {"app": "Resto", "status": "ok"}


# =============== AUTH ===============

@api.post("/auth/customer/login")
async def customer_login(payload: CustomerLogin):
    phone = payload.phone.strip()
    if not phone:
        raise HTTPException(status_code=400, detail="رقم الهاتف مطلوب")
    user_doc = await users_col.find_one({"role": "customer", "phone": phone})
    if not user_doc:
        user = User(
            role="customer",
            name=payload.name or f"عميل {phone[-4:]}",
            phone=phone,
        )
        await users_col.insert_one(user.model_dump())
        user_doc = user.model_dump()
    else:
        if payload.name and payload.name != user_doc.get("name"):
            await users_col.update_one(
                {"id": user_doc["id"]}, {"$set": {"name": payload.name}}
            )
            user_doc["name"] = payload.name

    token = create_access_token(user_doc["id"], "customer", user_doc["name"])
    return {
        "token": token,
        "user": {
            "id": user_doc["id"],
            "role": "customer",
            "name": user_doc["name"],
            "phone": user_doc.get("phone"),
        },
    }


@api.post("/auth/owner/register")
async def owner_register(payload: OwnerRegister):
    email = payload.email.strip().lower()
    if await users_col.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="البريد الإلكتروني مسجل مسبقاً")
    user = User(
        role="owner",
        name=payload.name.strip(),
        email=email,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
    )
    await users_col.insert_one(user.model_dump())

    await push_admin_notification(
        type_="owner_registered",
        title="تسجيل مالك جديد",
        message=f"انضم مالك جديد إلى المنصة: {user.name}",
        link="/admin/dashboard",
    )

    token = create_access_token(user.id, "owner", user.name)
    return {
        "token": token,
        "user": {"id": user.id, "role": "owner", "name": user.name, "email": user.email},
    }


@api.post("/auth/owner/login")
async def owner_login(payload: OwnerLogin):
    email = payload.email.strip().lower()
    doc = await users_col.find_one({"role": "owner", "email": email})
    if not doc or not verify_password(payload.password, doc.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="بيانات الدخول غير صحيحة")
    token = create_access_token(doc["id"], "owner", doc["name"])
    return {
        "token": token,
        "user": {"id": doc["id"], "role": "owner", "name": doc["name"], "email": doc["email"]},
    }


@api.post("/auth/admin/login")
async def admin_login(payload: AdminLogin):
    email = payload.email.strip().lower()
    doc = await users_col.find_one({"role": "admin", "email": email})
    if not doc or not verify_password(payload.password, doc.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="بيانات المسؤول غير صحيحة")
    token = create_access_token(doc["id"], "admin", doc["name"])
    return {
        "token": token,
        "user": {"id": doc["id"], "role": "admin", "name": doc["name"], "email": doc["email"]},
    }


@api.get("/auth/me")
async def auth_me(user: dict = Depends(get_current_user)):
    doc = await users_col.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    return doc


# =============== UPLOAD ===============

@api.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    user: dict = Depends(require_role("owner", "admin")),
):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "bin"
    if ext not in ALL_MIME:
        raise HTTPException(status_code=400, detail="نوع الملف غير مدعوم")
    kind = "image" if ext in IMAGE_MIME else "video"
    path = f"{APP_NAME}/uploads/{user['id']}/{kind}/{uuid.uuid4().hex}.{ext}"
    data = await file.read()
    max_size = 100 * 1024 * 1024 if kind == "video" else 10 * 1024 * 1024
    if len(data) > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"الحجم يتجاوز {max_size // (1024 * 1024)} ميجابايت",
        )
    content_type = ALL_MIME.get(ext, "application/octet-stream")
    result = put_object(path, data, content_type)
    await files_col.insert_one({
        "id": str(uuid.uuid4()),
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "kind": kind,
        "size": result.get("size", len(data)),
        "owner_id": user["id"],
        "is_deleted": False,
        "created_at": utc_now_iso(),
    })
    return {"path": result["path"], "url": f"/api/files/{result['path']}", "kind": kind}


@api.get("/files/{path:path}")
async def serve_file(path: str):
    record = await files_col.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="الملف غير موجود")
    data, content_type = get_object(path)
    return Response(
        content=data,
        media_type=record.get("content_type", content_type),
        headers={"Cache-Control": "public, max-age=86400"},
    )


# =============== CHALETS ===============

@api.get("/chalets")
async def list_chalets(
    q: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    rooms: Optional[int] = None,
    capacity: Optional[int] = None,
    min_rating: Optional[float] = None,
    date: Optional[str] = None,  # filter by chalets having available slot on date
    featured: Optional[bool] = None,
    sort: str = "newest",
    limit: int = 50,
    skip: int = 0,
):
    query: dict = {"status": "approved"}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
        ]
    if rooms is not None:
        query["rooms"] = {"$gte": rooms}
    if capacity is not None:
        query["capacity"] = {"$gte": capacity}
    if min_rating is not None:
        query["avg_rating"] = {"$gte": min_rating}
    if featured is not None:
        query["featured"] = featured

    sort_map = {
        "newest": [("created_at", -1)],
        "top_rated": [("avg_rating", -1), ("reviews_count", -1)],
        "price_asc": [("starting_price", 1)],
        "price_desc": [("starting_price", -1)],
    }
    sort_spec = sort_map.get(sort, [("created_at", -1)])

    chalets = await chalets_col.find(query, {"_id": 0}).sort(sort_spec).skip(skip).limit(limit).to_list(length=limit)

    # Filter by available slots
    if date or min_price is not None or max_price is not None:
        chalet_ids = [c["id"] for c in chalets]
        slot_q: dict = {"chalet_id": {"$in": chalet_ids}, "status": "available"}
        if date:
            slot_q["date"] = date
        if min_price is not None:
            slot_q["price"] = slot_q.get("price", {})
            slot_q["price"]["$gte"] = min_price
        if max_price is not None:
            slot_q["price"] = slot_q.get("price", {})
            slot_q["price"]["$lte"] = max_price
        matching_slots = await slots_col.find(slot_q, {"chalet_id": 1, "_id": 0}).to_list(length=10000)
        ids_with_slots = {s["chalet_id"] for s in matching_slots}
        chalets = [c for c in chalets if c["id"] in ids_with_slots]

    return chalets


@api.get("/chalets/homepage")
async def homepage_data():
    base = {"status": "approved"}
    featured = await chalets_col.find({**base, "featured": True}, {"_id": 0}).sort([("avg_rating", -1)]).limit(8).to_list(length=8)
    new_chalets = await chalets_col.find(base, {"_id": 0}).sort([("created_at", -1)]).limit(8).to_list(length=8)
    top_rated = await chalets_col.find({**base, "reviews_count": {"$gt": 0}}, {"_id": 0}).sort([("avg_rating", -1), ("reviews_count", -1)]).limit(8).to_list(length=8)
    return {"featured": featured, "new": new_chalets, "top_rated": top_rated}


@api.get("/chalets/by-slug/{slug}")
async def get_chalet_by_slug(slug: str):
    doc = await chalets_col.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="الشاليه غير موجود")
    return doc


@api.get("/chalets/{chalet_id}")
async def get_chalet(chalet_id: str):
    doc = await chalets_col.find_one({"id": chalet_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="الشاليه غير موجود")
    return doc


@api.post("/chalets")
async def create_chalet(payload: ChaletCreate, user: dict = Depends(require_role("owner"))):
    slug = await generate_unique_slug(payload.name)
    chalet = Chalet(
        owner_id=user["id"],
        owner_name=user["name"],
        slug=slug,
        status="pending",
        **payload.model_dump(),
    )
    await chalets_col.insert_one(chalet.model_dump())

    await push_admin_notification(
        type_="chalet_registered",
        title="شاليه جديد بانتظار المراجعة",
        message=f"تم تسجيل شاليه جديد: {chalet.name} — بانتظار اعتماد المسؤول.",
        link="/admin/dashboard",
    )
    await push_notification(
        user["id"], "owner",
        "chalet_pending",
        "شاليهك قيد المراجعة",
        f"تم استلام شاليه {chalet.name}. سيظهر للعملاء بعد اعتماد المسؤول.",
        link="/owner/dashboard",
    )
    return chalet.model_dump()


@api.put("/chalets/{chalet_id}")
async def update_chalet(chalet_id: str, payload: ChaletUpdate, user: dict = Depends(require_role("owner", "admin"))):
    doc = await chalets_col.find_one({"id": chalet_id})
    if not doc:
        raise HTTPException(status_code=404, detail="الشاليه غير موجود")
    if user["role"] != "admin" and doc["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="ليس لديك الصلاحية")
    update = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    update["updated_at"] = utc_now_iso()
    await chalets_col.update_one({"id": chalet_id}, {"$set": update})
    return await chalets_col.find_one({"id": chalet_id}, {"_id": 0})


@api.delete("/chalets/{chalet_id}")
async def delete_chalet(chalet_id: str, user: dict = Depends(require_role("owner", "admin"))):
    doc = await chalets_col.find_one({"id": chalet_id})
    if not doc:
        raise HTTPException(status_code=404, detail="الشاليه غير موجود")
    if user["role"] != "admin" and doc["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="ليس لديك الصلاحية")
    await chalets_col.delete_one({"id": chalet_id})
    await slots_col.delete_many({"chalet_id": chalet_id})
    return {"ok": True}


@api.get("/owner/chalets")
async def owner_chalets(user: dict = Depends(require_role("owner"))):
    return await chalets_col.find({"owner_id": user["id"]}, {"_id": 0}).sort([("created_at", -1)]).to_list(length=200)


# =============== SLOTS ===============

async def _update_starting_price(chalet_id: str):
    """Recompute the starting (min) price for a chalet from its available slots."""
    pipeline = [
        {"$match": {"chalet_id": chalet_id, "status": "available"}},
        {"$group": {"_id": "$chalet_id", "min_price": {"$min": "$price"}}},
    ]
    res = await slots_col.aggregate(pipeline).to_list(length=1)
    starting = res[0]["min_price"] if res else 0.0
    await chalets_col.update_one({"id": chalet_id}, {"$set": {"starting_price": starting}})


@api.get("/chalets/{chalet_id}/slots")
async def list_slots(chalet_id: str, date: Optional[str] = None, status: Optional[str] = None):
    # Release slots whose bookings have expired so future viewers see them as available
    await _expire_past_bookings({"chalet_id": chalet_id})
    q = {"chalet_id": chalet_id}
    if date:
        q["date"] = date
    if status:
        q["status"] = status
    return await slots_col.find(q, {"_id": 0}).sort([("date", 1), ("start_time", 1)]).to_list(length=500)


@api.post("/chalets/{chalet_id}/slots")
async def create_slot(chalet_id: str, payload: SlotCreate, user: dict = Depends(require_role("owner"))):
    chalet = await chalets_col.find_one({"id": chalet_id})
    if not chalet:
        raise HTTPException(status_code=404, detail="الشاليه غير موجود")
    if chalet["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="ليس لديك الصلاحية")

    # Validate that slot is not in the past
    from datetime import datetime as _dt, timezone as _tz
    now = _dt.now(_tz.utc)
    today = now.strftime("%Y-%m-%d")
    hhmm_now = now.strftime("%H:%M")
    if payload.date < today:
        raise HTTPException(status_code=400, detail="لا يمكن إنشاء موعد في الماضي")
    if payload.date == today and payload.start_time <= hhmm_now:
        raise HTTPException(status_code=400, detail="لا يمكن إنشاء موعد في وقت قد مضى")
    if payload.start_time >= payload.end_time:
        raise HTTPException(status_code=400, detail="وقت الانتهاء يجب أن يكون بعد البداية")

    data = payload.model_dump()
    initial_status = "blocked" if data.get("block_reason") else "available"
    slot = Slot(
        chalet_id=chalet_id,
        owner_id=user["id"],
        status=initial_status,
        **data,
    )
    await slots_col.insert_one(slot.model_dump())
    await _update_starting_price(chalet_id)
    return slot.model_dump()


@api.post("/chalets/{chalet_id}/slots/bulk")
async def create_slots_bulk(chalet_id: str, payload: SlotBulkCreate, user: dict = Depends(require_role("owner"))):
    chalet = await chalets_col.find_one({"id": chalet_id})
    if not chalet or chalet["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="ليس لديك الصلاحية")
    docs = []
    for s in payload.slots:
        slot = Slot(chalet_id=chalet_id, owner_id=user["id"], **s.model_dump())
        docs.append(slot.model_dump())
    if docs:
        await slots_col.insert_many(docs)
    await _update_starting_price(chalet_id)
    return {"created": len(docs)}


@api.put("/slots/{slot_id}")
async def update_slot(slot_id: str, payload: SlotUpdate, user: dict = Depends(require_role("owner", "admin"))):
    doc = await slots_col.find_one({"id": slot_id})
    if not doc:
        raise HTTPException(status_code=404, detail="الموعد غير موجود")
    if user["role"] != "admin" and doc["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="ليس لديك الصلاحية")
    if doc.get("status") == "booked":
        raise HTTPException(status_code=400, detail="لا يمكن تعديل موعد محجوز")
    update = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    await slots_col.update_one({"id": slot_id}, {"$set": update})
    await _update_starting_price(doc["chalet_id"])
    return await slots_col.find_one({"id": slot_id}, {"_id": 0})


@api.delete("/slots/{slot_id}")
async def delete_slot(slot_id: str, user: dict = Depends(require_role("owner", "admin"))):
    doc = await slots_col.find_one({"id": slot_id})
    if not doc:
        raise HTTPException(status_code=404, detail="الموعد غير موجود")
    if user["role"] != "admin" and doc["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="ليس لديك الصلاحية")
    if doc.get("status") == "booked":
        raise HTTPException(status_code=400, detail="لا يمكن حذف موعد محجوز")
    await slots_col.delete_one({"id": slot_id})
    await _update_starting_price(doc["chalet_id"])
    return {"ok": True}


# =============== BOOKINGS ===============

@api.post("/bookings")
async def create_booking(payload: BookingCreate, user: dict = Depends(require_role("customer"))):
    slot = await slots_col.find_one({"id": payload.slot_id})
    if not slot:
        raise HTTPException(status_code=404, detail="الموعد غير موجود")
    if slot["status"] != "available":
        raise HTTPException(status_code=400, detail="هذا الموعد غير متاح")
    chalet = await chalets_col.find_one({"id": slot["chalet_id"]})
    if not chalet or chalet.get("status") != "approved":
        raise HTTPException(status_code=400, detail="الشاليه غير متاح للحجز")

    user_doc = await users_col.find_one({"id": user["id"]})
    customer_name = payload.customer_name or user_doc.get("name") or "عميل"
    customer_phone = payload.customer_phone or user_doc.get("phone") or ""

    booking = Booking(
        slot_id=slot["id"],
        chalet_id=chalet["id"],
        chalet_name=chalet["name"],
        chalet_slug=chalet["slug"],
        customer_id=user["id"],
        customer_name=customer_name,
        customer_phone=customer_phone,
        owner_id=chalet["owner_id"],
        slot_date=slot["date"],
        slot_start=slot["start_time"],
        slot_end=slot["end_time"],
        total_price=float(slot["price"]),
        notes=payload.notes or "",
    )
    # Atomically lock the slot
    lock_res = await slots_col.update_one(
        {"id": slot["id"], "status": "available"},
        {"$set": {"status": "booked", "booking_id": booking.id}},
    )
    if lock_res.modified_count == 0:
        raise HTTPException(status_code=409, detail="تم حجز هذا الموعد للتو، يُرجى اختيار موعد آخر")

    await bookings_col.insert_one(booking.model_dump())

    # Notifications: customer, owner, AND admin
    await push_notification(
        user["id"], "customer",
        "booking_submitted",
        "تم إرسال طلب الحجز",
        f"تم إرسال طلب حجزك لشاليه {chalet['name']} ({slot['date']} {slot['start_time']}-{slot['end_time']}). بانتظار موافقة المالك.",
        link="/my-bookings",
    )
    await push_notification(
        chalet["owner_id"], "owner",
        "new_booking",
        "طلب حجز جديد",
        f"تلقيت طلب حجز جديد لشاليه {chalet['name']} من {customer_name} ({slot['date']} {slot['start_time']}-{slot['end_time']}).",
        link="/owner/dashboard",
    )
    await push_admin_notification(
        type_="new_booking",
        title="حجز جديد على المنصة",
        message=f"حجز جديد لشاليه {chalet['name']} من {customer_name} ({slot['date']}).",
        link="/admin/dashboard",
    )
    return booking.model_dump()


@api.get("/bookings/me")
async def my_bookings(user: dict = Depends(require_role("customer"))):
    await _expire_past_bookings({"customer_id": user["id"]})
    return await bookings_col.find({"customer_id": user["id"]}, {"_id": 0}).sort([("created_at", -1)]).to_list(length=200)


@api.get("/bookings/owner")
async def owner_bookings(user: dict = Depends(require_role("owner"))):
    await _expire_past_bookings({"owner_id": user["id"]})
    return await bookings_col.find({"owner_id": user["id"]}, {"_id": 0}).sort([("created_at", -1)]).to_list(length=200)


async def _release_slot(slot_id: str):
    await slots_col.update_one(
        {"id": slot_id},
        {"$set": {"status": "available", "booking_id": None}},
    )


async def _expire_past_bookings(query: dict | None = None) -> None:
    """Auto-finalize bookings whose slot date+end_time is in the past.

    - Accepted bookings whose time has fully elapsed become 'completed'
      and their slot is released back to 'available'.
    - Pending bookings whose start time has passed (owner never responded)
      become 'expired' and the slot is released.

    This is idempotent and safe to call on every list request.
    """
    from datetime import datetime as _dt, timezone as _tz

    now = _dt.now(_tz.utc)
    today = now.strftime("%Y-%m-%d")
    hhmm_now = now.strftime("%H:%M")

    base = dict(query or {})

    # 1) Auto-complete past ACCEPTED bookings
    accepted_q = {
        **base,
        "status": "accepted",
        "$or": [
            {"slot_date": {"$lt": today}},
            {"slot_date": today, "slot_end": {"$lte": hhmm_now}},
        ],
    }
    async for b in bookings_col.find(accepted_q, {"id": 1, "slot_id": 1, "chalet_id": 1, "_id": 0}):
        await bookings_col.update_one({"id": b["id"]}, {"$set": {"status": "completed"}})
        await _release_slot(b["slot_id"])
        await _update_starting_price(b["chalet_id"])

    # 2) Auto-expire PENDING bookings whose start time has passed
    pending_q = {
        **base,
        "status": "pending",
        "$or": [
            {"slot_date": {"$lt": today}},
            {"slot_date": today, "slot_start": {"$lte": hhmm_now}},
        ],
    }
    async for b in bookings_col.find(pending_q, {"id": 1, "slot_id": 1, "chalet_id": 1, "_id": 0}):
        await bookings_col.update_one({"id": b["id"]}, {"$set": {"status": "expired"}})
        await _release_slot(b["slot_id"])
        await _update_starting_price(b["chalet_id"])


@api.post("/bookings/{booking_id}/accept")
async def accept_booking(booking_id: str, user: dict = Depends(require_role("owner"))):
    booking = await bookings_col.find_one({"id": booking_id})
    if not booking or booking["owner_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="الحجز غير موجود")
    if booking["status"] != "pending":
        raise HTTPException(status_code=400, detail="الحجز ليس قيد الانتظار")
    await bookings_col.update_one({"id": booking_id}, {"$set": {"status": "accepted"}})
    await push_notification(
        booking["customer_id"], "customer",
        "booking_accepted",
        "تم قبول حجزك",
        f"تم قبول حجزك لشاليه {booking['chalet_name']} ({booking['slot_date']}). الدفع عند الوصول.",
        link="/my-bookings",
    )
    return {"ok": True}


@api.post("/bookings/{booking_id}/reject")
async def reject_booking(booking_id: str, user: dict = Depends(require_role("owner"))):
    booking = await bookings_col.find_one({"id": booking_id})
    if not booking or booking["owner_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="الحجز غير موجود")
    if booking["status"] != "pending":
        raise HTTPException(status_code=400, detail="الحجز ليس قيد الانتظار")
    await bookings_col.update_one({"id": booking_id}, {"$set": {"status": "rejected"}})
    await _release_slot(booking["slot_id"])
    await _update_starting_price(booking["chalet_id"])
    await push_notification(
        booking["customer_id"], "customer",
        "booking_rejected",
        "تم رفض الحجز",
        f"تم رفض حجزك لشاليه {booking['chalet_name']}.",
        link="/my-bookings",
    )
    return {"ok": True}


@api.post("/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: str, user: dict = Depends(require_role("customer"))):
    booking = await bookings_col.find_one({"id": booking_id})
    if not booking or booking["customer_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="الحجز غير موجود")
    if booking["status"] not in ("pending", "accepted"):
        raise HTTPException(status_code=400, detail="لا يمكن إلغاء هذا الحجز")
    await bookings_col.update_one({"id": booking_id}, {"$set": {"status": "cancelled"}})
    await _release_slot(booking["slot_id"])
    await _update_starting_price(booking["chalet_id"])
    await push_notification(
        booking["owner_id"], "owner",
        "booking_cancelled",
        "تم إلغاء حجز",
        f"قام العميل {booking['customer_name']} بإلغاء حجز شاليه {booking['chalet_name']}.",
        link="/owner/dashboard",
    )
    return {"ok": True}


@api.post("/bookings/{booking_id}/owner-cancel")
async def owner_cancel_booking(booking_id: str, user: dict = Depends(require_role("owner"))):
    """Owner cancels an accepted or pending booking (e.g. emergency, double-booking offline)."""
    booking = await bookings_col.find_one({"id": booking_id})
    if not booking or booking["owner_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="الحجز غير موجود")
    if booking["status"] not in ("pending", "accepted"):
        raise HTTPException(status_code=400, detail="لا يمكن إلغاء هذا الحجز في حالته الحالية")
    await bookings_col.update_one({"id": booking_id}, {"$set": {"status": "cancelled"}})
    await _release_slot(booking["slot_id"])
    await _update_starting_price(booking["chalet_id"])
    await push_notification(
        booking["customer_id"], "customer",
        "booking_cancelled_by_owner",
        "تم إلغاء حجزك من قبل المالك",
        f"تم إلغاء حجزك لشاليه {booking['chalet_name']} ({booking['slot_date']}) من قبل المالك. نعتذر عن الإزعاج.",
        link="/my-bookings",
    )
    return {"ok": True}


@api.post("/bookings/{booking_id}/complete")
async def complete_booking(booking_id: str, user: dict = Depends(require_role("owner"))):
    """Owner marks an accepted booking as completed (the guest has finished their stay)."""
    booking = await bookings_col.find_one({"id": booking_id})
    if not booking or booking["owner_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="الحجز غير موجود")
    if booking["status"] != "accepted":
        raise HTTPException(status_code=400, detail="يمكن إنهاء الحجز المقبول فقط")
    await bookings_col.update_one({"id": booking_id}, {"$set": {"status": "completed"}})
    await _release_slot(booking["slot_id"])
    await _update_starting_price(booking["chalet_id"])
    await push_notification(
        booking["customer_id"], "customer",
        "booking_completed",
        "نتمنى لك إقامة سعيدة!",
        f"تم إنهاء حجزك لشاليه {booking['chalet_name']}. شاركنا تجربتك بتقييم!",
        link="/my-bookings",
    )
    return {"ok": True}


@api.delete("/bookings/{booking_id}")
async def delete_booking(booking_id: str, user: dict = Depends(get_current_user)):
    """Remove a booking record. Allowed only for terminal-state bookings
    (cancelled / rejected / completed / expired) and only by the owner or admin."""
    booking = await bookings_col.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="الحجز غير موجود")
    is_admin = user["role"] == "admin"
    is_owner = user["role"] == "owner" and booking["owner_id"] == user["id"]
    if not (is_admin or is_owner):
        raise HTTPException(status_code=403, detail="ليس لديك الصلاحية")
    if booking["status"] not in ("cancelled", "rejected", "completed", "expired"):
        raise HTTPException(status_code=400, detail="لا يمكن حذف حجز نشط — قم بإلغائه أولاً")
    await bookings_col.delete_one({"id": booking_id})
    return {"ok": True}


# =============== REVIEWS ===============

async def _recompute_rating(chalet_id: str):
    pipeline = [
        {"$match": {"chalet_id": chalet_id, "reported": False}},
        {"$group": {"_id": "$chalet_id", "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}},
    ]
    res = await reviews_col.aggregate(pipeline).to_list(length=1)
    if res:
        avg = round(res[0]["avg"], 2)
        count = res[0]["count"]
    else:
        avg, count = 0.0, 0
    await chalets_col.update_one(
        {"id": chalet_id},
        {"$set": {"avg_rating": avg, "reviews_count": count}},
    )


@api.post("/reviews")
async def create_review(payload: ReviewCreate, user: dict = Depends(require_role("customer"))):
    if payload.rating < 1 or payload.rating > 5:
        raise HTTPException(status_code=400, detail="التقييم بين 1 و 5")
    chalet = await chalets_col.find_one({"id": payload.chalet_id})
    if not chalet:
        raise HTTPException(status_code=404, detail="الشاليه غير موجود")
    has_booking = await bookings_col.find_one(
        {"chalet_id": payload.chalet_id, "customer_id": user["id"], "status": "accepted"}
    )
    if not has_booking:
        raise HTTPException(status_code=403, detail="يمكنك التقييم بعد قبول حجزك فقط")

    user_doc = await users_col.find_one({"id": user["id"]})
    review = Review(
        chalet_id=chalet["id"],
        chalet_name=chalet["name"],
        booking_id=payload.booking_id,
        customer_id=user["id"],
        customer_name=user_doc.get("name", "عميل"),
        rating=payload.rating,
        comment=payload.comment,
    )
    await reviews_col.insert_one(review.model_dump())
    await _recompute_rating(chalet["id"])

    await push_notification(
        chalet["owner_id"], "owner",
        "new_review",
        "تقييم جديد",
        f"تلقى شاليه {chalet['name']} تقييماً جديداً ({payload.rating} نجوم).",
        link="/owner/dashboard",
    )
    return review.model_dump()


@api.get("/reviews/chalet/{chalet_id}")
async def reviews_for_chalet(chalet_id: str):
    return await reviews_col.find({"chalet_id": chalet_id, "reported": False}, {"_id": 0}).sort([("created_at", -1)]).to_list(length=200)


@api.post("/reviews/{review_id}/report")
async def report_review(review_id: str, user: dict = Depends(get_current_user)):
    review = await reviews_col.find_one({"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="التقييم غير موجود")
    await push_admin_notification(
        type_="review_reported",
        title="تنبيه: تقييم تم الإبلاغ عنه",
        message=f"تم الإبلاغ عن تقييم على شاليه {review.get('chalet_name')}",
        link="/admin/dashboard",
    )
    await reviews_col.update_one({"id": review_id}, {"$set": {"reported": True}})
    return {"ok": True}


@api.delete("/reviews/{review_id}")
async def delete_review(review_id: str, user: dict = Depends(require_role("admin"))):
    review = await reviews_col.find_one({"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="التقييم غير موجود")
    await reviews_col.delete_one({"id": review_id})
    await _recompute_rating(review["chalet_id"])
    return {"ok": True}


# =============== NOTIFICATIONS ===============

@api.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user)):
    items = await notifications_col.find({"user_id": user["id"]}, {"_id": 0}).sort([("created_at", -1)]).limit(100).to_list(length=100)
    unread = await notifications_col.count_documents({"user_id": user["id"], "read": False})
    return {"items": items, "unread": unread}


@api.post("/notifications/{notif_id}/read")
async def mark_read(notif_id: str, user: dict = Depends(get_current_user)):
    await notifications_col.update_one({"id": notif_id, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


@api.post("/notifications/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    await notifications_col.update_many({"user_id": user["id"], "read": False}, {"$set": {"read": True}})
    return {"ok": True}


# =============== ADMIN ===============

@api.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_role("admin"))):
    return {
        "users": await users_col.count_documents({}),
        "owners": await users_col.count_documents({"role": "owner"}),
        "customers": await users_col.count_documents({"role": "customer"}),
        "chalets": await chalets_col.count_documents({}),
        "pending_chalets": await chalets_col.count_documents({"status": "pending"}),
        "bookings": await bookings_col.count_documents({}),
        "reviews": await reviews_col.count_documents({}),
        "reported_reviews": await reviews_col.count_documents({"reported": True}),
    }


@api.get("/admin/chalets")
async def admin_all_chalets(user: dict = Depends(require_role("admin"))):
    return await chalets_col.find({}, {"_id": 0}).sort([("created_at", -1)]).to_list(length=500)


@api.post("/admin/chalets/{chalet_id}/feature")
async def admin_feature_chalet(chalet_id: str, featured: bool = Query(...), user: dict = Depends(require_role("admin"))):
    res = await chalets_col.update_one({"id": chalet_id}, {"$set": {"featured": featured}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="الشاليه غير موجود")
    return {"ok": True, "featured": featured}


@api.post("/admin/chalets/{chalet_id}/status")
async def admin_set_status(chalet_id: str, status: str = Query(...), user: dict = Depends(require_role("admin"))):
    if status not in ("pending", "approved", "rejected", "suspended"):
        raise HTTPException(status_code=400, detail="حالة غير صحيحة")
    chalet = await chalets_col.find_one({"id": chalet_id})
    if not chalet:
        raise HTTPException(status_code=404, detail="الشاليه غير موجود")
    await chalets_col.update_one({"id": chalet_id}, {"$set": {"status": status}})

    # Notify owner of approval/rejection/suspension
    titles = {
        "approved": "تم اعتماد شاليهك",
        "rejected": "تم رفض الشاليه",
        "suspended": "تم تعليق الشاليه",
        "pending": "الشاليه قيد المراجعة",
    }
    msgs = {
        "approved": f"تهانينا! شاليه {chalet['name']} متاح الآن للعملاء.",
        "rejected": f"تم رفض شاليه {chalet['name']}. تواصل مع الإدارة للتفاصيل.",
        "suspended": f"تم تعليق شاليه {chalet['name']} مؤقتاً.",
        "pending": f"شاليه {chalet['name']} عاد إلى قائمة المراجعة.",
    }
    await push_notification(
        chalet["owner_id"], "owner",
        f"chalet_{status}",
        titles[status], msgs[status],
        link="/owner/dashboard",
    )
    return {"ok": True}


@api.delete("/admin/chalets/{chalet_id}")
async def admin_delete_chalet(chalet_id: str, user: dict = Depends(require_role("admin"))):
    doc = await chalets_col.find_one({"id": chalet_id})
    if not doc:
        raise HTTPException(status_code=404, detail="الشاليه غير موجود")
    await chalets_col.delete_one({"id": chalet_id})
    await slots_col.delete_many({"chalet_id": chalet_id})
    return {"ok": True}


@api.get("/admin/reviews")
async def admin_reviews(reported_only: bool = False, user: dict = Depends(require_role("admin"))):
    query = {"reported": True} if reported_only else {}
    return await reviews_col.find(query, {"_id": 0}).sort([("created_at", -1)]).to_list(length=500)


@api.get("/admin/users")
async def admin_users(user: dict = Depends(require_role("admin"))):
    return await users_col.find({}, {"_id": 0, "password_hash": 0}).sort([("created_at", -1)]).to_list(length=500)


@api.get("/admin/bookings")
async def admin_bookings(user: dict = Depends(require_role("admin"))):
    await _expire_past_bookings()
    return await bookings_col.find({}, {"_id": 0}).sort([("created_at", -1)]).to_list(length=500)


# Register router and middleware
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

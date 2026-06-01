"""Resto - Premium Arabic chalet booking platform - Main FastAPI server."""
import io
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import (
    APIRouter,
    FastAPI,
    File,
    Header,
    HTTPException,
    Query,
    Response,
    UploadFile,
    Depends,
)
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware

from auth import (
    create_access_token,
    get_current_user,
    get_optional_user,
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
    Notification,
    OwnerLogin,
    OwnerRegister,
    Review,
    ReviewCreate,
    User,
    utc_now_iso,
)
from notifications import push_admin_notification, push_notification
from storage import APP_NAME, MIME_TYPES, get_object, init_storage, put_object
from utils import count_nights, generate_unique_slug, is_valid_date

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
    # Seed admin
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
        # Update password to match the env (so admin pwd is always source of truth)
        await users_col.update_one(
            {"id": existing["id"]},
            {"$set": {"password_hash": hash_password(admin_password)}},
        )

    # Init storage
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
        # auto-register
        user = User(
            role="customer",
            name=payload.name or f"عميل {phone[-4:]}",
            phone=phone,
        )
        await users_col.insert_one(user.model_dump())
        user_doc = user.model_dump()
    else:
        # update name if provided
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

    # admin notification: new owner
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
    if ext not in MIME_TYPES:
        raise HTTPException(status_code=400, detail="نوع الملف غير مدعوم")
    path = f"{APP_NAME}/uploads/{user['id']}/{uuid.uuid4().hex}.{ext}"
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="حجم الملف يتجاوز 10 ميجابايت")
    content_type = MIME_TYPES.get(ext, "application/octet-stream")
    result = put_object(path, data, content_type)
    record = {
        "id": str(uuid.uuid4()),
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "owner_id": user["id"],
        "is_deleted": False,
        "created_at": utc_now_iso(),
    }
    await files_col.insert_one(record)
    return {"path": result["path"], "url": f"/api/files/{result['path']}"}


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

async def _enrich_chalet(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


@api.get("/chalets")
async def list_chalets(
    q: Optional[str] = None,
    location: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    rooms: Optional[int] = None,
    capacity: Optional[int] = None,
    min_rating: Optional[float] = None,
    check_in: Optional[str] = None,
    check_out: Optional[str] = None,
    featured: Optional[bool] = None,
    sort: str = "newest",  # newest | top_rated | price_asc | price_desc
    limit: int = 50,
    skip: int = 0,
):
    query: dict = {"status": "approved"}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"location": {"$regex": q, "$options": "i"}},
        ]
    if location:
        query["location"] = {"$regex": location, "$options": "i"}
    if min_price is not None or max_price is not None:
        pr = {}
        if min_price is not None:
            pr["$gte"] = min_price
        if max_price is not None:
            pr["$lte"] = max_price
        query["price_per_night"] = pr
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
        "price_asc": [("price_per_night", 1)],
        "price_desc": [("price_per_night", -1)],
    }
    sort_spec = sort_map.get(sort, [("created_at", -1)])

    cursor = chalets_col.find(query, {"_id": 0}).sort(sort_spec).skip(skip).limit(limit)
    chalets = await cursor.to_list(length=limit)

    # date availability filter
    if check_in and check_out and is_valid_date(check_in) and is_valid_date(check_out):
        chalet_ids = [c["id"] for c in chalets]
        conflicts = await bookings_col.find(
            {
                "chalet_id": {"$in": chalet_ids},
                "status": {"$in": ["pending", "accepted"]},
                "$or": [
                    {"check_in": {"$lt": check_out}, "check_out": {"$gt": check_in}},
                ],
            },
            {"chalet_id": 1, "_id": 0},
        ).to_list(length=1000)
        blocked = {b["chalet_id"] for b in conflicts}
        chalets = [c for c in chalets if c["id"] not in blocked]

    return chalets


@api.get("/chalets/homepage")
async def homepage_data():
    featured = await chalets_col.find(
        {"status": "approved", "featured": True}, {"_id": 0}
    ).sort([("avg_rating", -1)]).limit(6).to_list(length=6)
    new_chalets = await chalets_col.find(
        {"status": "approved"}, {"_id": 0}
    ).sort([("created_at", -1)]).limit(6).to_list(length=6)
    top_rated = await chalets_col.find(
        {"status": "approved", "reviews_count": {"$gt": 0}}, {"_id": 0}
    ).sort([("avg_rating", -1), ("reviews_count", -1)]).limit(6).to_list(length=6)
    latest_reviews = await reviews_col.find({"reported": False}, {"_id": 0}).sort(
        [("created_at", -1)]
    ).limit(6).to_list(length=6)
    return {
        "featured": featured,
        "new": new_chalets,
        "top_rated": top_rated,
        "latest_reviews": latest_reviews,
    }


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
async def create_chalet(
    payload: ChaletCreate,
    user: dict = Depends(require_role("owner")),
):
    slug = await generate_unique_slug(payload.name)
    chalet = Chalet(
        owner_id=user["id"],
        owner_name=user["name"],
        slug=slug,
        **payload.model_dump(),
    )
    await chalets_col.insert_one(chalet.model_dump())

    # Notify admin of new chalet
    await push_admin_notification(
        type_="chalet_registered",
        title="شاليه جديد مسجل",
        message=f"تم تسجيل شاليه جديد: {chalet.name}",
        link="/admin/dashboard",
    )
    return chalet.model_dump()


@api.put("/chalets/{chalet_id}")
async def update_chalet(
    chalet_id: str,
    payload: ChaletUpdate,
    user: dict = Depends(require_role("owner", "admin")),
):
    doc = await chalets_col.find_one({"id": chalet_id})
    if not doc:
        raise HTTPException(status_code=404, detail="الشاليه غير موجود")
    if user["role"] != "admin" and doc["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="ليس لديك الصلاحية")
    update = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    update["updated_at"] = utc_now_iso()
    await chalets_col.update_one({"id": chalet_id}, {"$set": update})
    new_doc = await chalets_col.find_one({"id": chalet_id}, {"_id": 0})
    return new_doc


@api.delete("/chalets/{chalet_id}")
async def delete_chalet(
    chalet_id: str,
    user: dict = Depends(require_role("owner", "admin")),
):
    doc = await chalets_col.find_one({"id": chalet_id})
    if not doc:
        raise HTTPException(status_code=404, detail="الشاليه غير موجود")
    if user["role"] != "admin" and doc["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="ليس لديك الصلاحية")
    await chalets_col.delete_one({"id": chalet_id})
    return {"ok": True}


@api.get("/owner/chalets")
async def owner_chalets(user: dict = Depends(require_role("owner"))):
    cursor = chalets_col.find({"owner_id": user["id"]}, {"_id": 0}).sort(
        [("created_at", -1)]
    )
    return await cursor.to_list(length=200)


# =============== BOOKINGS ===============

@api.post("/bookings")
async def create_booking(
    payload: BookingCreate,
    user: dict = Depends(require_role("customer")),
):
    chalet = await chalets_col.find_one({"id": payload.chalet_id})
    if not chalet:
        raise HTTPException(status_code=404, detail="الشاليه غير موجود")
    if not is_valid_date(payload.check_in) or not is_valid_date(payload.check_out):
        raise HTTPException(status_code=400, detail="تواريخ غير صالحة")
    nights = count_nights(payload.check_in, payload.check_out)
    if nights < 1:
        raise HTTPException(status_code=400, detail="يجب أن يكون تاريخ المغادرة بعد الوصول")

    # check conflicts
    conflict = await bookings_col.find_one(
        {
            "chalet_id": payload.chalet_id,
            "status": {"$in": ["pending", "accepted"]},
            "check_in": {"$lt": payload.check_out},
            "check_out": {"$gt": payload.check_in},
        }
    )
    if conflict:
        raise HTTPException(status_code=400, detail="التواريخ غير متاحة لهذا الشاليه")

    user_doc = await users_col.find_one({"id": user["id"]})
    customer_name = payload.customer_name or user_doc.get("name") or "عميل"
    customer_phone = payload.customer_phone or user_doc.get("phone") or ""

    total_price = nights * float(chalet["price_per_night"])
    booking = Booking(
        chalet_id=chalet["id"],
        chalet_name=chalet["name"],
        chalet_slug=chalet.get("slug"),
        customer_id=user["id"],
        customer_name=customer_name,
        customer_phone=customer_phone,
        owner_id=chalet["owner_id"],
        check_in=payload.check_in,
        check_out=payload.check_out,
        guests=payload.guests,
        nights=nights,
        total_price=total_price,
        notes=payload.notes or "",
    )
    await bookings_col.insert_one(booking.model_dump())

    # Notifications
    await push_notification(
        user["id"], "customer",
        "booking_submitted",
        "تم إرسال طلب الحجز",
        f"تم إرسال طلب حجزك لشاليه {chalet['name']} بانتظار موافقة المالك.",
        link="/my-bookings",
    )
    await push_notification(
        chalet["owner_id"], "owner",
        "new_booking",
        "طلب حجز جديد",
        f"تلقيت طلب حجز جديد لشاليه {chalet['name']} من {customer_name}.",
        link="/owner/dashboard",
    )
    return booking.model_dump()


@api.get("/bookings/me")
async def my_bookings(user: dict = Depends(require_role("customer"))):
    cursor = bookings_col.find({"customer_id": user["id"]}, {"_id": 0}).sort(
        [("created_at", -1)]
    )
    return await cursor.to_list(length=200)


@api.get("/bookings/owner")
async def owner_bookings(user: dict = Depends(require_role("owner"))):
    cursor = bookings_col.find({"owner_id": user["id"]}, {"_id": 0}).sort(
        [("created_at", -1)]
    )
    return await cursor.to_list(length=200)


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
        f"تم قبول حجزك لشاليه {booking['chalet_name']}. الدفع عند الوصول.",
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
    await push_notification(
        booking["owner_id"], "owner",
        "booking_cancelled",
        "تم إلغاء حجز",
        f"قام العميل {booking['customer_name']} بإلغاء حجز شاليه {booking['chalet_name']}.",
        link="/owner/dashboard",
    )
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
async def create_review(
    payload: ReviewCreate,
    user: dict = Depends(require_role("customer")),
):
    if payload.rating < 1 or payload.rating > 5:
        raise HTTPException(status_code=400, detail="التقييم بين 1 و 5")
    chalet = await chalets_col.find_one({"id": payload.chalet_id})
    if not chalet:
        raise HTTPException(status_code=404, detail="الشاليه غير موجود")

    # Optional: only allow if customer has an accepted booking
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
    cursor = reviews_col.find(
        {"chalet_id": chalet_id, "reported": False}, {"_id": 0}
    ).sort([("created_at", -1)])
    return await cursor.to_list(length=200)


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
    cursor = notifications_col.find({"user_id": user["id"]}, {"_id": 0}).sort(
        [("created_at", -1)]
    ).limit(100)
    items = await cursor.to_list(length=100)
    unread = await notifications_col.count_documents(
        {"user_id": user["id"], "read": False}
    )
    return {"items": items, "unread": unread}


@api.post("/notifications/{notif_id}/read")
async def mark_read(notif_id: str, user: dict = Depends(get_current_user)):
    await notifications_col.update_one(
        {"id": notif_id, "user_id": user["id"]}, {"$set": {"read": True}}
    )
    return {"ok": True}


@api.post("/notifications/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    await notifications_col.update_many(
        {"user_id": user["id"], "read": False}, {"$set": {"read": True}}
    )
    return {"ok": True}


# =============== ADMIN ===============

@api.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_role("admin"))):
    return {
        "users": await users_col.count_documents({}),
        "owners": await users_col.count_documents({"role": "owner"}),
        "customers": await users_col.count_documents({"role": "customer"}),
        "chalets": await chalets_col.count_documents({}),
        "bookings": await bookings_col.count_documents({}),
        "reviews": await reviews_col.count_documents({}),
        "reported_reviews": await reviews_col.count_documents({"reported": True}),
    }


@api.get("/admin/chalets")
async def admin_all_chalets(user: dict = Depends(require_role("admin"))):
    cursor = chalets_col.find({}, {"_id": 0}).sort([("created_at", -1)])
    return await cursor.to_list(length=500)


@api.post("/admin/chalets/{chalet_id}/feature")
async def admin_feature_chalet(
    chalet_id: str,
    featured: bool = Query(...),
    user: dict = Depends(require_role("admin")),
):
    res = await chalets_col.update_one(
        {"id": chalet_id}, {"$set": {"featured": featured}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="الشاليه غير موجود")
    return {"ok": True, "featured": featured}


@api.post("/admin/chalets/{chalet_id}/status")
async def admin_set_status(
    chalet_id: str,
    status: str = Query(...),
    user: dict = Depends(require_role("admin")),
):
    if status not in ("pending", "approved", "rejected"):
        raise HTTPException(status_code=400, detail="حالة غير صحيحة")
    await chalets_col.update_one({"id": chalet_id}, {"$set": {"status": status}})
    return {"ok": True}


@api.get("/admin/reviews")
async def admin_reviews(
    reported_only: bool = False,
    user: dict = Depends(require_role("admin")),
):
    query = {"reported": True} if reported_only else {}
    cursor = reviews_col.find(query, {"_id": 0}).sort([("created_at", -1)])
    return await cursor.to_list(length=500)


@api.get("/admin/users")
async def admin_users(user: dict = Depends(require_role("admin"))):
    cursor = users_col.find({}, {"_id": 0, "password_hash": 0}).sort(
        [("created_at", -1)]
    )
    return await cursor.to_list(length=500)


@api.get("/admin/bookings")
async def admin_bookings(user: dict = Depends(require_role("admin"))):
    cursor = bookings_col.find({}, {"_id": 0}).sort([("created_at", -1)])
    return await cursor.to_list(length=500)


# Register router and middleware
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

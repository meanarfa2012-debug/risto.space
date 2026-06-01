"""Pydantic models for Resto platform."""
from datetime import datetime, timezone
from typing import List, Optional
import uuid

from pydantic import BaseModel, Field, ConfigDict


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------- USER ----------------------

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: str  # customer | owner | admin
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    password_hash: Optional[str] = None
    created_at: str = Field(default_factory=utc_now_iso)


class CustomerLogin(BaseModel):
    phone: str
    name: Optional[str] = None


class OwnerRegister(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None


class OwnerLogin(BaseModel):
    email: str
    password: str


class AdminLogin(BaseModel):
    email: str
    password: str


# ---------------------- CHALET ----------------------

class Chalet(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_id: str
    owner_name: Optional[str] = None
    name: str
    slug: str
    description: str
    phone: Optional[str] = ""  # contact phone for chalet
    google_maps_url: Optional[str] = ""  # Google Maps link
    rooms: int = 1
    capacity: int = 2
    features: List[str] = []  # free-form features list
    images: List[str] = []  # storage paths (photos)
    videos: List[str] = []  # storage paths (videos)
    status: str = "pending"  # pending | approved | rejected | suspended
    featured: bool = False
    avg_rating: float = 0.0
    reviews_count: int = 0
    starting_price: float = 0.0  # min price across slots (computed)
    created_at: str = Field(default_factory=utc_now_iso)
    updated_at: str = Field(default_factory=utc_now_iso)


class ChaletCreate(BaseModel):
    name: str
    description: str
    phone: Optional[str] = ""
    google_maps_url: Optional[str] = ""
    rooms: int = 1
    capacity: int = 2
    features: List[str] = []
    images: List[str] = []
    videos: List[str] = []


class ChaletUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    phone: Optional[str] = None
    google_maps_url: Optional[str] = None
    rooms: Optional[int] = None
    capacity: Optional[int] = None
    features: Optional[List[str]] = None
    images: Optional[List[str]] = None
    videos: Optional[List[str]] = None


# ---------------------- SLOT ----------------------

class Slot(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    chalet_id: str
    owner_id: str
    date: str  # YYYY-MM-DD
    start_time: str  # HH:MM
    end_time: str    # HH:MM
    price: float
    status: str = "available"  # available | booked | unavailable
    booking_id: Optional[str] = None
    notes: Optional[str] = ""
    created_at: str = Field(default_factory=utc_now_iso)


class SlotCreate(BaseModel):
    date: str
    start_time: str
    end_time: str
    price: float
    notes: Optional[str] = ""


class SlotUpdate(BaseModel):
    date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    price: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class SlotBulkCreate(BaseModel):
    slots: List[SlotCreate]


# ---------------------- BOOKING ----------------------

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slot_id: str
    chalet_id: str
    chalet_name: Optional[str] = None
    chalet_slug: Optional[str] = None
    customer_id: str
    customer_name: str
    customer_phone: str
    owner_id: str
    slot_date: str
    slot_start: str
    slot_end: str
    total_price: float
    notes: Optional[str] = ""
    status: str = "pending"  # pending | accepted | rejected | cancelled
    created_at: str = Field(default_factory=utc_now_iso)


class BookingCreate(BaseModel):
    slot_id: str
    notes: Optional[str] = ""
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None


# ---------------------- REVIEW ----------------------

class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    chalet_id: str
    chalet_name: Optional[str] = None
    booking_id: Optional[str] = None
    customer_id: str
    customer_name: str
    rating: int
    comment: str
    reported: bool = False
    created_at: str = Field(default_factory=utc_now_iso)


class ReviewCreate(BaseModel):
    chalet_id: str
    booking_id: Optional[str] = None
    rating: int
    comment: str


# ---------------------- NOTIFICATION ----------------------

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    role: str
    type: str
    title: str
    message: str
    link: Optional[str] = None
    read: bool = False
    created_at: str = Field(default_factory=utc_now_iso)

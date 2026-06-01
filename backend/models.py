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
    location: str  # city/area
    address: Optional[str] = ""
    price_per_night: float
    rooms: int
    capacity: int
    amenities: List[str] = []
    images: List[str] = []  # storage paths
    status: str = "approved"  # pending | approved | rejected
    featured: bool = False
    avg_rating: float = 0.0
    reviews_count: int = 0
    created_at: str = Field(default_factory=utc_now_iso)
    updated_at: str = Field(default_factory=utc_now_iso)


class ChaletCreate(BaseModel):
    name: str
    description: str
    location: str
    address: Optional[str] = ""
    price_per_night: float
    rooms: int
    capacity: int
    amenities: List[str] = []
    images: List[str] = []


class ChaletUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    address: Optional[str] = None
    price_per_night: Optional[float] = None
    rooms: Optional[int] = None
    capacity: Optional[int] = None
    amenities: Optional[List[str]] = None
    images: Optional[List[str]] = None


# ---------------------- BOOKING ----------------------

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    chalet_id: str
    chalet_name: Optional[str] = None
    chalet_slug: Optional[str] = None
    customer_id: str
    customer_name: str
    customer_phone: str
    owner_id: str
    check_in: str  # YYYY-MM-DD
    check_out: str
    guests: int
    nights: int
    total_price: float
    notes: Optional[str] = ""
    status: str = "pending"  # pending | accepted | rejected | cancelled
    created_at: str = Field(default_factory=utc_now_iso)


class BookingCreate(BaseModel):
    chalet_id: str
    check_in: str
    check_out: str
    guests: int
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
    rating: int  # 1-5
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
    role: str  # customer | owner | admin
    type: str  # booking_submitted, booking_accepted, etc.
    title: str
    message: str
    link: Optional[str] = None
    read: bool = False
    created_at: str = Field(default_factory=utc_now_iso)

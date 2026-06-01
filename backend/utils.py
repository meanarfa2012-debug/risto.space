"""General utilities for Resto."""
import re
import uuid
from datetime import date, datetime
from typing import Optional

from db import chalets_col


_NON_SLUG_CHARS = re.compile(r"[^a-z0-9\u0600-\u06FF]+")


def slugify(text: str) -> str:
    """Slugify text, allowing Arabic + latin alphanumerics."""
    text = text.lower().strip()
    text = _NON_SLUG_CHARS.sub("-", text)
    text = text.strip("-")
    return text or "chalet"


async def generate_unique_slug(name: str) -> str:
    base = slugify(name)
    candidate = base
    suffix = 0
    while await chalets_col.find_one({"slug": candidate}, {"_id": 1}):
        suffix += 1
        candidate = f"{base}-{suffix}"
    if suffix == 0:
        # Append short uuid to avoid leakage of names entirely; keep readable.
        candidate = f"{base}-{uuid.uuid4().hex[:6]}"
        while await chalets_col.find_one({"slug": candidate}, {"_id": 1}):
            candidate = f"{base}-{uuid.uuid4().hex[:6]}"
    return candidate


def count_nights(check_in: str, check_out: str) -> int:
    """Compute number of nights between two ISO dates (YYYY-MM-DD)."""
    ci = datetime.fromisoformat(check_in).date() if "T" not in check_in else datetime.fromisoformat(check_in).date()
    co = datetime.fromisoformat(check_out).date() if "T" not in check_out else datetime.fromisoformat(check_out).date()
    return max((co - ci).days, 0)


def is_valid_date(s: str) -> bool:
    try:
        datetime.fromisoformat(s)
        return True
    except Exception:
        return False

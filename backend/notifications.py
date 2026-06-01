"""In-app notifications helper."""
import logging
from typing import Optional

from db import notifications_col
from models import Notification

logger = logging.getLogger(__name__)


async def push_notification(
    user_id: str,
    role: str,
    type_: str,
    title: str,
    message: str,
    link: Optional[str] = None,
) -> None:
    notif = Notification(
        user_id=user_id,
        role=role,
        type=type_,
        title=title,
        message=message,
        link=link,
    )
    await notifications_col.insert_one(notif.model_dump())


async def push_admin_notification(type_: str, title: str, message: str, link: Optional[str] = None):
    """Notify all admins."""
    from db import users_col
    async for admin in users_col.find({"role": "admin"}, {"id": 1}):
        await push_notification(admin["id"], "admin", type_, title, message, link)

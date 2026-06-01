"""Mongo DB connection."""
import os
from motor.motor_asyncio import AsyncIOMotorClient

_client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = _client[os.environ["DB_NAME"]]


def close_db():
    _client.close()


# Collections
users_col = db["users"]
chalets_col = db["chalets"]
bookings_col = db["bookings"]
reviews_col = db["reviews"]
notifications_col = db["notifications"]
files_col = db["files"]

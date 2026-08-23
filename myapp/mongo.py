import os
import logging

logger = logging.getLogger(__name__)

try:
    from pymongo import MongoClient
except ImportError:
    MongoClient = None

MONGODB_URI = os.getenv(
    "MONGODB_URI",
    "mongodb+srv://gaduharsha72:Pc2TJCiJPvs7A3Cm@cluster0.npekr7c.mongodb.net/"
)

_client = None
_db = None


def get_mongo_db():
    global _client, _db
    if MongoClient is None:
        return None
    if _db is not None:
        return _db
    try:
        if MONGODB_URI:
            _client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
            _db = _client.get_database("lowcode_forms_db")
            return _db
    except Exception as e:
        logger.warning(f"MongoDB connection warning: {e}")
    return None



def save_form_to_mongo(form_data):
    """
    Saves or updates a Form document in MongoDB Atlas collection 'forms'
    """
    try:
        db = get_mongo_db()
        if db is not None:
            db.forms.update_one(
                {"id": form_data.get("id")},
                {"$set": form_data},
                upsert=True
            )
    except Exception as e:
        logger.warning(f"Failed to save form to MongoDB: {e}")


def save_submission_to_mongo(submission_data):
    """
    Saves or updates a Form Submission document in MongoDB Atlas collection 'submissions'
    """
    try:
        db = get_mongo_db()
        if db is not None:
            db.submissions.update_one(
                {"id": submission_data.get("id")},
                {"$set": submission_data},
                upsert=True
            )
    except Exception as e:
        logger.warning(f"Failed to save submission to MongoDB: {e}")


def save_otp_to_mongo(otp_data):
    """
    Saves an OTP Verification log document in MongoDB Atlas collection 'otps'
    """
    try:
        db = get_mongo_db()
        if db is not None:
            db.otps.insert_one(otp_data)
    except Exception as e:
        logger.warning(f"Failed to save OTP to MongoDB: {e}")

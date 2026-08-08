from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime, timezone
import os
import certifi

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MONGODB_URI is read from the environment so the same code works locally
# (falls back to your local MongoDB) and on Render (set MONGODB_URI to your
# MongoDB Atlas connection string in the Render dashboard's Environment tab).
#
# tlsCAFile=certifi.where() explicitly gives pymongo a known-good CA bundle
# instead of relying on the container's system store — this fixes a common
# class of "SSL handshake failed" / TLSV1_ALERT_INTERNAL_ERROR seen when
# deploying to platforms like Render.
MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/")

if (
    MONGODB_URI.startswith("mongodb+srv://")
    or "ssl=true" in MONGODB_URI
    or "tls=true" in MONGODB_URI
):
    client = MongoClient(
        MONGODB_URI,
        tls=True,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=5000
    )
else:
    client = MongoClient(MONGODB_URI)

print(client.server_info())

db = client["college_project"]

# Two separate collections so "website logins" and "form submissions"
# never get mixed up with each other.
signups = db["signups"]              # people who created an account on index.html
registrations = db["registrations"]  # people who submitted the registration form


# ──────────────────────────────────────────────
# MODELS
# ──────────────────────────────────────────────
class Registration(BaseModel):
    fullName: str
    email: str
    phone: str
    institution: str
    designation: str
    city: str
    analysis: list
    sampleDetails: list = []
    xrdDetails: dict = {}


class Signup(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class StatusUpdate(BaseModel):
    status: str


def serialize(doc):
    doc["_id"] = str(doc["_id"])
    return doc


def to_object_id(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid id format")


# ──────────────────────────────────────────────
# HEALTH CHECK
# ──────────────────────────────────────────────
@app.get("/")
def home():
    return {"message": "FastAPI and MongoDB are connected!"}


# ──────────────────────────────────────────────
# REGISTRATION FORM (research service requests)
# ──────────────────────────────────────────────
@app.post("/register")
def register(data: Registration):
    doc = data.model_dump()
    doc["submittedAt"] = datetime.now(timezone.utc).isoformat()
    doc["status"] = "Pending"

    result = registrations.insert_one(doc)

    return {
        "message": "Registration Submitted Successfully",
        "id": str(result.inserted_id),
    }


@app.get("/registrations")
def get_registrations():
    return [serialize(doc) for doc in registrations.find().sort("_id", -1)]


@app.get("/registrations/{reg_id}")
def get_registration(reg_id: str):
    doc = registrations.find_one({"_id": to_object_id(reg_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Registration not found")
    return serialize(doc)


@app.patch("/registrations/{reg_id}/status")
def update_registration_status(reg_id: str, body: StatusUpdate):
    result = registrations.update_one(
        {"_id": to_object_id(reg_id)},
        {"$set": {"status": body.status}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Registration not found")
    return {"message": "Status updated"}


@app.delete("/registrations/{reg_id}")
def delete_registration(reg_id: str):
    result = registrations.delete_one({"_id": to_object_id(reg_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Registration not found")
    return {"message": "Registration deleted"}


# ──────────────────────────────────────────────
# WEBSITE SIGN-UP / LOGIN (admin "logged in users" view)
# ──────────────────────────────────────────────
@app.post("/signup")
def signup(data: Signup):
    if signups.find_one({"email": data.email.strip().lower()}):
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    doc = {
        "name": data.name.strip(),
        "email": data.email.strip().lower(),
        "password": data.password,  # NOTE: plain text for this project; hash in production
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    result = signups.insert_one(doc)

    return {
        "message": "Account created successfully",
        "id": str(result.inserted_id),
    }


@app.post("/login")
def login(data: LoginRequest):
    email = data.email.strip().lower()
    user = signups.find_one({"email": email, "password": data.password})

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    signups.update_one(
        {"_id": user["_id"]},
        {"$set": {"lastLoginAt": datetime.now(timezone.utc).isoformat()}},
    )

    return {
        "message": "Login successful",
        "name": user.get("name"),
        "email": user.get("email"),
    }


@app.get("/users")
def get_users():
    """All website accounts that have signed up, with their emails."""
    return [serialize(doc) for doc in signups.find().sort("_id", -1)]

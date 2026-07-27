from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017")

db = client["college_project"]

collection = db["users"]

result = collection.insert_one({
    "name": "Subiksha",
    "email": "test@gmail.com"
})

print("Inserted Successfully")
print("ID:", result.inserted_id)
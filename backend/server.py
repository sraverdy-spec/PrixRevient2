from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from io import BytesIO, StringIO
import csv
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER, TA_RIGHT

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

# ================= AUTH HELPERS =================

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=60), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Non authentifié")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Type de token invalide")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

# ================= MODELS =================

# User Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

# Category Model
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#002FA7"

class Category(CategoryBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Supplier Model
class SupplierBase(BaseModel):
    name: str
    contact: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class Supplier(SupplierBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Raw Material with freinte (waste/loss)
class RawMaterialBase(BaseModel):
    name: str
    unit: str
    unit_price: float
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = None
    category_id: Optional[str] = None
    description: Optional[str] = None
    freinte: float = 0.0  # Waste percentage (0-100)
    stock_quantity: float = 0.0
    stock_alert_threshold: float = 0.0

class RawMaterial(RawMaterialBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Recipe Ingredient with sub-recipe support
class RecipeIngredient(BaseModel):
    material_id: Optional[str] = None  # Raw material ID
    sub_recipe_id: Optional[str] = None  # OR Sub-recipe ID for BOM
    material_name: str
    quantity: float
    unit: str
    unit_price: float
    freinte: float = 0.0  # Inherited or overridden
    is_sub_recipe: bool = False

class LaborCost(BaseModel):
    description: str
    hours: float
    hourly_rate: float

class OverheadCostBase(BaseModel):
    name: str
    category: str
    monthly_amount: float
    allocation_method: str
    allocation_value: Optional[float] = 1.0

class OverheadCost(OverheadCostBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Recipe with category and margin
class RecipeBase(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: Optional[str] = None
    output_quantity: float = 1.0
    output_unit: str = "pièce"
    ingredients: List[RecipeIngredient] = []
    labor_costs: List[LaborCost] = []
    overhead_ids: List[str] = []
    target_margin: float = 30.0  # Target margin percentage
    is_intermediate: bool = False  # Can be used as sub-recipe

class RecipeCreate(RecipeBase):
    pass

class RecipeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    output_quantity: Optional[float] = None
    output_unit: Optional[str] = None
    ingredients: Optional[List[RecipeIngredient]] = None
    labor_costs: Optional[List[LaborCost]] = None
    overhead_ids: Optional[List[str]] = None
    target_margin: Optional[float] = None
    is_intermediate: Optional[bool] = None

class Recipe(RecipeBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Price History
class PriceHistory(BaseModel):
    recipe_id: str
    recipe_name: str
    cost_per_unit: float
    total_material_cost: float
    total_labor_cost: float
    total_overhead_cost: float
    total_cost: float
    recorded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Cost Breakdown Response
class CostBreakdown(BaseModel):
    recipe_id: str
    recipe_name: str
    category_id: Optional[str] = None
    total_material_cost: float
    total_labor_cost: float
    total_overhead_cost: float
    total_freinte_cost: float
    total_cost: float
    cost_per_unit: float
    output_quantity: float
    output_unit: str
    target_margin: float
    suggested_price: float
    material_details: List[dict]
    labor_details: List[dict]
    overhead_details: List[dict]
    sub_recipe_details: List[dict] = []

# Simulation
class SimulationRequest(BaseModel):
    recipe_id: str
    material_changes: Dict[str, float] = {}  # material_id: new_price
    labor_rate_change: Optional[float] = None  # percentage change

# ================= AUTH ENDPOINTS =================

@api_router.post("/auth/register")
async def register(input_data: UserRegister, response: Response):
    email = input_data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    password_hash = hash_password(input_data.password)
    user_doc = {"email": email, "password_hash": password_hash, "name": input_data.name, "role": "user", "created_at": datetime.now(timezone.utc)}
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    return {"_id": user_id, "email": email, "name": input_data.name, "role": "user"}

@api_router.post("/auth/login")
async def login(input_data: UserLogin, request: Request, response: Response):
    email = input_data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(input_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    return {"_id": user_id, "email": user["email"], "name": user["name"], "role": user["role"]}

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Déconnexion réussie"}

@api_router.get("/auth/me")
async def get_me(request: Request):
    return await get_current_user(request)

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Token de rafraîchissement manquant")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Type de token invalide")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
        access_token = create_access_token(str(user["_id"]), user["email"])
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
        return {"message": "Token rafraîchi"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

# ================= CATEGORIES ENDPOINTS =================

@api_router.get("/categories")
async def get_categories():
    categories = await db.categories.find({}, {"_id": 0}).to_list(1000)
    return categories

@api_router.post("/categories")
async def create_category(input_data: CategoryBase):
    category = Category(**input_data.model_dump())
    doc = category.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.categories.insert_one(doc)
    return category

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str):
    await db.categories.delete_one({"id": category_id})
    return {"message": "Catégorie supprimée"}

# ================= SUPPLIERS ENDPOINTS =================

@api_router.get("/suppliers")
async def get_suppliers():
    suppliers = await db.suppliers.find({}, {"_id": 0}).to_list(1000)
    return suppliers

@api_router.post("/suppliers")
async def create_supplier(input_data: SupplierBase):
    supplier = Supplier(**input_data.model_dump())
    doc = supplier.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.suppliers.insert_one(doc)
    return supplier

@api_router.put("/suppliers/{supplier_id}")
async def update_supplier(supplier_id: str, input_data: SupplierBase):
    await db.suppliers.update_one({"id": supplier_id}, {"$set": input_data.model_dump()})
    return await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})

@api_router.delete("/suppliers/{supplier_id}")
async def delete_supplier(supplier_id: str):
    await db.suppliers.delete_one({"id": supplier_id})
    return {"message": "Fournisseur supprimé"}

# ================= RAW MATERIALS ENDPOINTS =================

@api_router.get("/materials")
async def get_materials():
    materials = await db.raw_materials.find({}, {"_id": 0}).to_list(1000)
    for mat in materials:
        if isinstance(mat.get('created_at'), str):
            mat['created_at'] = datetime.fromisoformat(mat['created_at'])
        if isinstance(mat.get('updated_at'), str):
            mat['updated_at'] = datetime.fromisoformat(mat['updated_at'])
    return materials

@api_router.post("/materials")
async def create_material(input_data: RawMaterialBase):
    material = RawMaterial(**input_data.model_dump())
    doc = material.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.raw_materials.insert_one(doc)
    return material

@api_router.put("/materials/{material_id}")
async def update_material(material_id: str, input_data: RawMaterialBase):
    existing = await db.raw_materials.find_one({"id": material_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Matière première non trouvée")
    
    # Track price history if price changed
    old_price = existing.get('unit_price', 0)
    new_price = input_data.unit_price
    if old_price != new_price:
        await db.material_price_history.insert_one({
            "material_id": material_id,
            "old_price": old_price,
            "new_price": new_price,
            "changed_at": datetime.now(timezone.utc).isoformat()
        })
    
    updated_data = input_data.model_dump()
    updated_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.raw_materials.update_one({"id": material_id}, {"$set": updated_data})
    return await db.raw_materials.find_one({"id": material_id}, {"_id": 0})

@api_router.delete("/materials/{material_id}")
async def delete_material(material_id: str):
    await db.raw_materials.delete_one({"id": material_id})
    return {"message": "Matière première supprimée"}

# Import CSV for materials
@api_router.post("/materials/import-csv")
async def import_materials_csv(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Le fichier doit être au format CSV")
    
    content = await file.read()
    decoded = content.decode('utf-8-sig')
    reader = csv.DictReader(StringIO(decoded), delimiter=';')
    if not reader.fieldnames or len(reader.fieldnames) <= 1:
        reader = csv.DictReader(StringIO(decoded), delimiter=',')
    
    imported_count = 0
    errors = []
    
    for row_num, row in enumerate(reader, start=2):
        try:
            row = {k.strip().lower().replace('\ufeff', ''): v.strip() if v else '' for k, v in row.items() if k}
            name = row.get('name', row.get('nom', '')).strip()
            if not name:
                continue
            
            unit = row.get('unit', row.get('unite', 'unité')).strip() or 'unité'
            unit_price = float(row.get('unit_price', row.get('prix_unitaire', row.get('prix', '0'))).replace(',', '.') or 0)
            supplier = row.get('supplier', row.get('fournisseur', '')).strip()
            freinte = float(row.get('freinte', row.get('perte', '0')).replace(',', '.') or 0)
            stock = float(row.get('stock', row.get('stock_quantity', '0')).replace(',', '.') or 0)
            
            material = RawMaterial(
                name=name, unit=unit, unit_price=unit_price,
                supplier_name=supplier, freinte=freinte, stock_quantity=stock
            )
            doc = material.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            doc['updated_at'] = doc['updated_at'].isoformat()
            await db.raw_materials.insert_one(doc)
            imported_count += 1
        except Exception as e:
            errors.append(f"Ligne {row_num}: {str(e)}")
    
    return {"success": imported_count > 0, "imported_count": imported_count, "errors": errors}

@api_router.get("/materials/csv-template")
async def get_materials_csv_template():
    template = """name;unit;unit_price;supplier;freinte;stock
Farine de blé T55;kg;1.20;Moulin du Lac;2;50
Beurre AOP;kg;8.50;Laiterie Centrale;0;20
Sucre en poudre;kg;1.50;Sucre SA;1;30
"""
    return StreamingResponse(
        BytesIO(template.encode('utf-8-sig')),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=template_matieres.csv"}
    )

# Stock alerts
@api_router.get("/materials/stock-alerts")
async def get_stock_alerts():
    materials = await db.raw_materials.find({}, {"_id": 0}).to_list(1000)
    alerts = [m for m in materials if m.get('stock_quantity', 0) <= m.get('stock_alert_threshold', 0) and m.get('stock_alert_threshold', 0) > 0]
    return alerts

# ================= OVERHEAD COSTS ENDPOINTS =================

@api_router.get("/overheads")
async def get_overheads():
    overheads = await db.overheads.find({}, {"_id": 0}).to_list(1000)
    return overheads

@api_router.post("/overheads")
async def create_overhead(input_data: OverheadCostBase):
    overhead = OverheadCost(**input_data.model_dump())
    doc = overhead.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.overheads.insert_one(doc)
    return overhead

@api_router.put("/overheads/{overhead_id}")
async def update_overhead(overhead_id: str, input_data: OverheadCostBase):
    await db.overheads.update_one({"id": overhead_id}, {"$set": input_data.model_dump()})
    return await db.overheads.find_one({"id": overhead_id}, {"_id": 0})

@api_router.delete("/overheads/{overhead_id}")
async def delete_overhead(overhead_id: str):
    await db.overheads.delete_one({"id": overhead_id})
    return {"message": "Frais général supprimé"}

# ================= RECIPES ENDPOINTS =================

@api_router.get("/recipes")
async def get_recipes():
    recipes = await db.recipes.find({}, {"_id": 0}).to_list(1000)
    return recipes

@api_router.get("/recipes/intermediate")
async def get_intermediate_recipes():
    """Get recipes that can be used as sub-recipes (BOM)"""
    recipes = await db.recipes.find({"is_intermediate": True}, {"_id": 0}).to_list(1000)
    return recipes

@api_router.get("/recipes/{recipe_id}")
async def get_recipe(recipe_id: str):
    recipe = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recette non trouvée")
    return recipe

@api_router.post("/recipes")
async def create_recipe(input_data: RecipeCreate):
    recipe = Recipe(**input_data.model_dump())
    doc = recipe.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.recipes.insert_one(doc)
    return recipe

@api_router.put("/recipes/{recipe_id}")
async def update_recipe(recipe_id: str, input_data: RecipeUpdate):
    existing = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Recette non trouvée")
    
    update_data = {k: v for k, v in input_data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.recipes.update_one({"id": recipe_id}, {"$set": update_data})
    return await db.recipes.find_one({"id": recipe_id}, {"_id": 0})

@api_router.delete("/recipes/{recipe_id}")
async def delete_recipe(recipe_id: str):
    await db.recipes.delete_one({"id": recipe_id})
    return {"message": "Recette supprimée"}

# ================= COST CALCULATION =================

async def calculate_sub_recipe_cost(recipe_id: str, depth: int = 0) -> dict:
    """Recursively calculate cost for sub-recipes (BOM)"""
    if depth > 10:  # Prevent infinite recursion
        return {"cost": 0, "details": []}
    
    recipe = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not recipe:
        return {"cost": 0, "details": []}
    
    total_cost = 0
    material_cost = 0
    labor_cost = 0
    freinte_cost = 0
    
    # Calculate material costs including freinte
    for ing in recipe.get('ingredients', []):
        if ing.get('is_sub_recipe') and ing.get('sub_recipe_id'):
            # Recursive call for sub-recipe
            sub_cost = await calculate_sub_recipe_cost(ing['sub_recipe_id'], depth + 1)
            cost = ing['quantity'] * sub_cost['cost']
        else:
            base_cost = ing['quantity'] * ing['unit_price']
            freinte_pct = ing.get('freinte', 0) / 100
            freinte_add = base_cost * freinte_pct
            cost = base_cost + freinte_add
            freinte_cost += freinte_add
        material_cost += cost
    
    # Calculate labor costs
    for labor in recipe.get('labor_costs', []):
        labor_cost += labor['hours'] * labor['hourly_rate']
    
    total_cost = material_cost + labor_cost
    output_qty = recipe.get('output_quantity', 1) or 1
    
    return {
        "cost": total_cost / output_qty,
        "material_cost": material_cost,
        "labor_cost": labor_cost,
        "freinte_cost": freinte_cost
    }

async def calculate_cost(recipe_id: str) -> CostBreakdown:
    recipe = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recette non trouvée")
    
    # Calculate material costs with freinte
    material_details = []
    sub_recipe_details = []
    total_material_cost = 0.0
    total_freinte_cost = 0.0
    
    for ing in recipe.get('ingredients', []):
        if ing.get('is_sub_recipe') and ing.get('sub_recipe_id'):
            # Sub-recipe cost
            sub_cost_data = await calculate_sub_recipe_cost(ing['sub_recipe_id'])
            cost = ing['quantity'] * sub_cost_data['cost']
            total_material_cost += cost
            sub_recipe_details.append({
                "name": ing['material_name'],
                "quantity": ing['quantity'],
                "unit": ing['unit'],
                "unit_cost": sub_cost_data['cost'],
                "total_cost": round(cost, 2)
            })
        else:
            base_cost = ing['quantity'] * ing['unit_price']
            freinte_pct = ing.get('freinte', 0) / 100
            freinte_add = base_cost * freinte_pct
            cost = base_cost + freinte_add
            total_material_cost += cost
            total_freinte_cost += freinte_add
            material_details.append({
                "name": ing['material_name'],
                "quantity": ing['quantity'],
                "unit": ing['unit'],
                "unit_price": ing['unit_price'],
                "freinte": ing.get('freinte', 0),
                "freinte_cost": round(freinte_add, 2),
                "total_cost": round(cost, 2)
            })
    
    # Calculate labor costs
    labor_details = []
    total_labor_cost = 0.0
    for labor in recipe.get('labor_costs', []):
        cost = labor['hours'] * labor['hourly_rate']
        total_labor_cost += cost
        labor_details.append({
            "description": labor['description'],
            "hours": labor['hours'],
            "hourly_rate": labor['hourly_rate'],
            "total_cost": round(cost, 2)
        })
    
    # Calculate overhead costs
    overhead_details = []
    total_overhead_cost = 0.0
    total_labor_hours = sum(l['hours'] for l in recipe.get('labor_costs', []))
    
    for oh_id in recipe.get('overhead_ids', []):
        overhead = await db.overheads.find_one({"id": oh_id}, {"_id": 0})
        if overhead:
            if overhead['allocation_method'] == 'per_unit':
                cost = overhead['monthly_amount'] / max(overhead.get('allocation_value', 1), 1)
            elif overhead['allocation_method'] == 'per_hour':
                cost = (overhead['monthly_amount'] / max(overhead.get('allocation_value', 1), 1)) * total_labor_hours
            else:
                cost = overhead['monthly_amount'] / max(overhead.get('allocation_value', 1), 1)
            
            total_overhead_cost += cost
            overhead_details.append({
                "name": overhead['name'],
                "category": overhead['category'],
                "allocation_method": overhead['allocation_method'],
                "total_cost": round(cost, 2)
            })
    
    total_cost = total_material_cost + total_labor_cost + total_overhead_cost
    output_qty = recipe.get('output_quantity', 1) or 1
    cost_per_unit = total_cost / output_qty
    target_margin = recipe.get('target_margin', 30)
    suggested_price = cost_per_unit / (1 - target_margin / 100) if target_margin < 100 else cost_per_unit * 2
    
    return CostBreakdown(
        recipe_id=recipe_id,
        recipe_name=recipe['name'],
        category_id=recipe.get('category_id'),
        total_material_cost=round(total_material_cost, 2),
        total_labor_cost=round(total_labor_cost, 2),
        total_overhead_cost=round(total_overhead_cost, 2),
        total_freinte_cost=round(total_freinte_cost, 2),
        total_cost=round(total_cost, 2),
        cost_per_unit=round(cost_per_unit, 2),
        output_quantity=output_qty,
        output_unit=recipe.get('output_unit', 'pièce'),
        target_margin=target_margin,
        suggested_price=round(suggested_price, 2),
        material_details=material_details,
        labor_details=labor_details,
        overhead_details=overhead_details,
        sub_recipe_details=sub_recipe_details
    )

@api_router.get("/recipes/{recipe_id}/cost")
async def get_recipe_cost(recipe_id: str):
    return await calculate_cost(recipe_id)

# Save price history
@api_router.post("/recipes/{recipe_id}/save-history")
async def save_price_history(recipe_id: str):
    cost = await calculate_cost(recipe_id)
    history = PriceHistory(
        recipe_id=recipe_id,
        recipe_name=cost.recipe_name,
        cost_per_unit=cost.cost_per_unit,
        total_material_cost=cost.total_material_cost,
        total_labor_cost=cost.total_labor_cost,
        total_overhead_cost=cost.total_overhead_cost,
        total_cost=cost.total_cost
    )
    doc = history.model_dump()
    doc['recorded_at'] = doc['recorded_at'].isoformat()
    await db.price_history.insert_one(doc)
    return {"message": "Historique enregistré"}

@api_router.get("/recipes/{recipe_id}/history")
async def get_price_history(recipe_id: str):
    history = await db.price_history.find({"recipe_id": recipe_id}, {"_id": 0}).sort("recorded_at", -1).to_list(100)
    return history

# ================= SIMULATION (What-if) =================

@api_router.post("/recipes/{recipe_id}/simulate")
async def simulate_cost(recipe_id: str, simulation: SimulationRequest):
    recipe = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recette non trouvée")
    
    # Calculate with modified prices
    total_material_cost = 0.0
    for ing in recipe.get('ingredients', []):
        material_id = ing.get('material_id')
        unit_price = simulation.material_changes.get(material_id, ing['unit_price'])
        base_cost = ing['quantity'] * unit_price
        freinte_pct = ing.get('freinte', 0) / 100
        total_material_cost += base_cost * (1 + freinte_pct)
    
    total_labor_cost = 0.0
    rate_multiplier = 1 + (simulation.labor_rate_change or 0) / 100
    for labor in recipe.get('labor_costs', []):
        total_labor_cost += labor['hours'] * labor['hourly_rate'] * rate_multiplier
    
    # Overhead costs (unchanged)
    total_overhead_cost = 0.0
    total_labor_hours = sum(l['hours'] for l in recipe.get('labor_costs', []))
    for oh_id in recipe.get('overhead_ids', []):
        overhead = await db.overheads.find_one({"id": oh_id}, {"_id": 0})
        if overhead:
            if overhead['allocation_method'] == 'per_unit':
                total_overhead_cost += overhead['monthly_amount'] / max(overhead.get('allocation_value', 1), 1)
            elif overhead['allocation_method'] == 'per_hour':
                total_overhead_cost += (overhead['monthly_amount'] / max(overhead.get('allocation_value', 1), 1)) * total_labor_hours
            else:
                total_overhead_cost += overhead['monthly_amount'] / max(overhead.get('allocation_value', 1), 1)
    
    total_cost = total_material_cost + total_labor_cost + total_overhead_cost
    output_qty = recipe.get('output_quantity', 1) or 1
    simulated_cost_per_unit = total_cost / output_qty
    
    # Get original cost for comparison
    original_cost = await calculate_cost(recipe_id)
    
    return {
        "original_cost_per_unit": original_cost.cost_per_unit,
        "simulated_cost_per_unit": round(simulated_cost_per_unit, 2),
        "difference": round(simulated_cost_per_unit - original_cost.cost_per_unit, 2),
        "difference_percentage": round((simulated_cost_per_unit - original_cost.cost_per_unit) / original_cost.cost_per_unit * 100, 2) if original_cost.cost_per_unit > 0 else 0,
        "simulated_material_cost": round(total_material_cost, 2),
        "simulated_labor_cost": round(total_labor_cost, 2),
        "simulated_overhead_cost": round(total_overhead_cost, 2)
    }

# ================= COMPARISON =================

@api_router.post("/recipes/compare")
async def compare_recipes(recipe_ids: List[str]):
    results = []
    for rid in recipe_ids:
        try:
            cost = await calculate_cost(rid)
            results.append({
                "recipe_id": rid,
                "recipe_name": cost.recipe_name,
                "cost_per_unit": cost.cost_per_unit,
                "total_cost": cost.total_cost,
                "material_cost": cost.total_material_cost,
                "labor_cost": cost.total_labor_cost,
                "overhead_cost": cost.total_overhead_cost,
                "suggested_price": cost.suggested_price,
                "output_quantity": cost.output_quantity,
                "output_unit": cost.output_unit
            })
        except:
            continue
    return results

# ================= GLOBAL COSTS TABLE =================

@api_router.get("/reports/all-costs")
async def get_all_costs():
    """Get a comprehensive table of all costs for all recipes"""
    recipes = await db.recipes.find({}, {"_id": 0}).to_list(1000)
    results = []
    
    for recipe in recipes:
        try:
            cost = await calculate_cost(recipe['id'])
            results.append({
                "recipe_id": recipe['id'],
                "recipe_name": recipe['name'],
                "category_id": recipe.get('category_id'),
                "output_quantity": recipe.get('output_quantity', 1),
                "output_unit": recipe.get('output_unit', 'pièce'),
                "material_cost": cost.total_material_cost,
                "labor_cost": cost.total_labor_cost,
                "overhead_cost": cost.total_overhead_cost,
                "freinte_cost": cost.total_freinte_cost,
                "total_cost": cost.total_cost,
                "cost_per_unit": cost.cost_per_unit,
                "target_margin": cost.target_margin,
                "suggested_price": cost.suggested_price
            })
        except Exception as e:
            logging.error(f"Error calculating cost for recipe {recipe['id']}: {e}")
            continue
    
    return results

# ================= CSV IMPORT FOR RECIPES =================

@api_router.post("/recipes/import-csv")
async def import_recipes_csv(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Le fichier doit être au format CSV")
    
    content = await file.read()
    decoded = content.decode('utf-8-sig')
    reader = csv.DictReader(StringIO(decoded), delimiter=';')
    if not reader.fieldnames or len(reader.fieldnames) <= 1:
        reader = csv.DictReader(StringIO(decoded), delimiter=',')
    
    recipes_dict = {}
    errors = []
    
    for row_num, row in enumerate(reader, start=2):
        try:
            row = {k.strip().lower().replace('\ufeff', ''): v.strip() if v else '' for k, v in row.items() if k}
            recipe_name = row.get('name', row.get('nom', '')).strip()
            if not recipe_name:
                continue
            
            if recipe_name not in recipes_dict:
                recipes_dict[recipe_name] = {
                    'name': recipe_name,
                    'description': row.get('description', ''),
                    'output_quantity': float(row.get('output_quantity', row.get('quantite_produite', '1')) or 1),
                    'output_unit': row.get('output_unit', row.get('unite_sortie', 'pièce')) or 'pièce',
                    'target_margin': float(row.get('margin', row.get('marge', '30')) or 30),
                    'ingredients': [],
                    'labor_costs': [],
                    'overhead_ids': []
                }
            
            recipe = recipes_dict[recipe_name]
            
            # Add ingredient
            ing_name = row.get('ingredient_name', row.get('matiere', row.get('ingredient', ''))).strip()
            ing_qty = row.get('ingredient_quantity', row.get('quantite', row.get('qte', ''))).strip()
            
            if ing_name and ing_qty:
                ing_unit = row.get('ingredient_unit', row.get('unite', 'unité')).strip() or 'unité'
                ing_price = row.get('ingredient_price', row.get('prix_unitaire', row.get('prix', '0'))).strip()
                freinte = row.get('freinte', row.get('perte', '0')).strip()
                
                # Check if material exists
                existing_mat = await db.raw_materials.find_one({"name": ing_name}, {"_id": 0})
                if not existing_mat:
                    new_mat = RawMaterial(name=ing_name, unit=ing_unit, unit_price=float(ing_price.replace(',', '.')) if ing_price else 0)
                    mat_doc = new_mat.model_dump()
                    mat_doc['created_at'] = mat_doc['created_at'].isoformat()
                    mat_doc['updated_at'] = mat_doc['updated_at'].isoformat()
                    await db.raw_materials.insert_one(mat_doc)
                    existing_mat = mat_doc
                
                recipe['ingredients'].append({
                    'material_id': existing_mat['id'],
                    'material_name': ing_name,
                    'quantity': float(ing_qty.replace(',', '.')),
                    'unit': existing_mat.get('unit', ing_unit),
                    'unit_price': existing_mat.get('unit_price', float(ing_price.replace(',', '.')) if ing_price else 0),
                    'freinte': float(freinte.replace(',', '.')) if freinte else existing_mat.get('freinte', 0),
                    'is_sub_recipe': False
                })
            
            # Add labor
            labor_desc = row.get('labor_description', row.get('travail', row.get('main_oeuvre', ''))).strip()
            labor_hours = row.get('labor_hours', row.get('heures', '')).strip()
            labor_rate = row.get('labor_rate', row.get('taux_horaire', row.get('taux', ''))).strip()
            
            if labor_desc and labor_hours:
                recipe['labor_costs'].append({
                    'description': labor_desc,
                    'hours': float(labor_hours.replace(',', '.')),
                    'hourly_rate': float(labor_rate.replace(',', '.')) if labor_rate else 15.0
                })
                
        except Exception as e:
            errors.append(f"Ligne {row_num}: {str(e)}")
    
    # Save recipes
    imported_recipes = []
    for recipe_data in recipes_dict.values():
        recipe = Recipe(**recipe_data)
        doc = recipe.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.recipes.insert_one(doc)
        imported_recipes.append({'id': recipe.id, 'name': recipe.name})
    
    return {"success": len(imported_recipes) > 0, "imported_count": len(imported_recipes), "errors": errors, "recipes": imported_recipes}

@api_router.get("/recipes/csv-template")
async def get_recipes_csv_template():
    template = """name;description;output_quantity;output_unit;margin;ingredient_name;ingredient_quantity;ingredient_unit;ingredient_price;freinte;labor_description;labor_hours;labor_rate
Pain de campagne;Pain traditionnel;10;pièce;35;Farine de blé;5;kg;1.20;2;Pétrissage;1;15
Pain de campagne;Pain traditionnel;10;pièce;35;Levure;0.1;kg;8.00;0;Cuisson;0.5;15
Croissant;Viennoiserie;20;pièce;40;Farine;2;kg;1.20;2;Préparation;2;18
Croissant;Viennoiserie;20;pièce;40;Beurre;1;kg;8.50;0;Cuisson;0.5;18
"""
    return StreamingResponse(
        BytesIO(template.encode('utf-8-sig')),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=template_recettes.csv"}
    )

# ================= PDF EXPORT =================

@api_router.get("/recipes/{recipe_id}/pdf")
async def export_recipe_pdf(recipe_id: str):
    cost = await calculate_cost(recipe_id)
    recipe = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontSize=24, textColor=colors.HexColor('#002FA7'), alignment=TA_CENTER, spaceAfter=20)
    heading_style = ParagraphStyle('CustomHeading', parent=styles['Heading2'], fontSize=14, textColor=colors.HexColor('#09090B'), spaceBefore=20, spaceAfter=10)
    
    elements = []
    elements.append(Paragraph("FICHE DE PRIX DE REVIENT", title_style))
    elements.append(Spacer(1, 10))
    elements.append(Paragraph(f"<b>Produit:</b> {cost.recipe_name}", styles['Normal']))
    elements.append(Paragraph(f"<b>Quantité produite:</b> {cost.output_quantity} {cost.output_unit}", styles['Normal']))
    elements.append(Paragraph(f"<b>Date:</b> {datetime.now().strftime('%d/%m/%Y %H:%M')}", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Materials Table
    if cost.material_details:
        elements.append(Paragraph("1. MATIÈRES PREMIÈRES", heading_style))
        mat_data = [["Matière", "Quantité", "Prix/u", "Freinte", "Total"]]
        for mat in cost.material_details:
            mat_data.append([mat['name'], f"{mat['quantity']} {mat['unit']}", f"{mat['unit_price']:.2f} €", f"{mat.get('freinte', 0)}%", f"{mat['total_cost']:.2f} €"])
        mat_data.append(["", "", "", "Sous-total:", f"{cost.total_material_cost:.2f} €"])
        mat_table = Table(mat_data, colWidths=[5*cm, 3*cm, 2.5*cm, 2*cm, 3*cm])
        mat_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#002FA7')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E4E4E7')),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#F4F4F5')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ]))
        elements.append(mat_table)
    
    # Labor Table
    if cost.labor_details:
        elements.append(Paragraph("2. MAIN D'ŒUVRE", heading_style))
        labor_data = [["Description", "Heures", "Taux horaire", "Total"]]
        for labor in cost.labor_details:
            labor_data.append([labor['description'], f"{labor['hours']} h", f"{labor['hourly_rate']:.2f} €/h", f"{labor['total_cost']:.2f} €"])
        labor_data.append(["", "", "Sous-total:", f"{cost.total_labor_cost:.2f} €"])
        labor_table = Table(labor_data, colWidths=[7*cm, 3*cm, 3*cm, 3*cm])
        labor_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#10B981')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E4E4E7')),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#F4F4F5')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ]))
        elements.append(labor_table)
    
    # Overheads
    if cost.overhead_details:
        elements.append(Paragraph("3. FRAIS GÉNÉRAUX", heading_style))
        oh_data = [["Frais", "Catégorie", "Méthode", "Total"]]
        for oh in cost.overhead_details:
            oh_data.append([oh['name'], oh['category'], oh['allocation_method'], f"{oh['total_cost']:.2f} €"])
        oh_data.append(["", "", "Sous-total:", f"{cost.total_overhead_cost:.2f} €"])
        oh_table = Table(oh_data, colWidths=[5*cm, 4*cm, 4*cm, 3*cm])
        oh_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F59E0B')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (-1, 0), (-1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E4E4E7')),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#F4F4F5')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ]))
        elements.append(oh_table)
    
    # Summary with margin
    elements.append(Spacer(1, 30))
    elements.append(Paragraph("RÉCAPITULATIF ET MARGE", heading_style))
    summary_data = [
        ["Coût matières (dont freinte)", f"{cost.total_material_cost:.2f} €"],
        ["Coût de main d'œuvre", f"{cost.total_labor_cost:.2f} €"],
        ["Frais généraux", f"{cost.total_overhead_cost:.2f} €"],
        ["COÛT TOTAL", f"{cost.total_cost:.2f} €"],
        [f"PRIX DE REVIENT / {cost.output_unit}", f"{cost.cost_per_unit:.2f} €"],
        [f"Marge cible ({cost.target_margin}%)", ""],
        ["PRIX DE VENTE CONSEILLÉ", f"{cost.suggested_price:.2f} €"],
    ]
    summary_table = Table(summary_data, colWidths=[10*cm, 5*cm])
    summary_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E4E4E7')),
        ('BACKGROUND', (0, 3), (-1, 3), colors.HexColor('#002FA7')),
        ('TEXTCOLOR', (0, 3), (-1, 3), colors.white),
        ('FONTNAME', (0, 3), (-1, 3), 'Helvetica-Bold'),
        ('BACKGROUND', (0, 4), (-1, 4), colors.HexColor('#09090B')),
        ('TEXTCOLOR', (0, 4), (-1, 4), colors.white),
        ('FONTNAME', (0, 4), (-1, 4), 'Helvetica-Bold'),
        ('BACKGROUND', (0, 6), (-1, 6), colors.HexColor('#10B981')),
        ('TEXTCOLOR', (0, 6), (-1, 6), colors.white),
        ('FONTNAME', (0, 6), (-1, 6), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 6), (-1, 6), 14),
    ]))
    elements.append(summary_table)
    
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"prix_revient_{cost.recipe_name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})

# ================= EXCEL EXPORT =================

@api_router.get("/reports/export-excel")
async def export_all_costs_excel():
    """Export all costs as CSV (Excel compatible)"""
    recipes = await db.recipes.find({}, {"_id": 0}).to_list(1000)
    
    output = StringIO()
    writer = csv.writer(output, delimiter=';')
    writer.writerow(['Recette', 'Catégorie', 'Quantité', 'Unité', 'Coût Matières', 'Coût Main d\'œuvre', 'Coût Frais Généraux', 'Coût Freinte', 'Coût Total', 'Prix/Unité', 'Marge %', 'Prix Conseillé'])
    
    for recipe in recipes:
        try:
            cost = await calculate_cost(recipe['id'])
            writer.writerow([
                recipe['name'],
                recipe.get('category_id', ''),
                recipe.get('output_quantity', 1),
                recipe.get('output_unit', 'pièce'),
                f"{cost.total_material_cost:.2f}".replace('.', ','),
                f"{cost.total_labor_cost:.2f}".replace('.', ','),
                f"{cost.total_overhead_cost:.2f}".replace('.', ','),
                f"{cost.total_freinte_cost:.2f}".replace('.', ','),
                f"{cost.total_cost:.2f}".replace('.', ','),
                f"{cost.cost_per_unit:.2f}".replace('.', ','),
                f"{cost.target_margin:.1f}".replace('.', ','),
                f"{cost.suggested_price:.2f}".replace('.', ',')
            ])
        except:
            continue
    
    output.seek(0)
    return StreamingResponse(
        BytesIO(output.getvalue().encode('utf-8-sig')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=rapport_couts_{datetime.now().strftime('%Y%m%d')}.csv"}
    )

# ================= DASHBOARD STATS =================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats():
    total_materials = await db.raw_materials.count_documents({})
    total_recipes = await db.recipes.count_documents({})
    total_overheads = await db.overheads.count_documents({})
    total_suppliers = await db.suppliers.count_documents({})
    
    recipes = await db.recipes.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    recent_recipes = []
    total_cost_sum = 0.0
    count = 0
    
    for recipe in recipes:
        try:
            cost = await calculate_cost(recipe['id'])
            recent_recipes.append({
                "id": recipe['id'],
                "name": recipe['name'],
                "cost_per_unit": cost.cost_per_unit,
                "suggested_price": cost.suggested_price,
                "output_unit": recipe.get('output_unit', 'pièce')
            })
            total_cost_sum += cost.cost_per_unit
            count += 1
        except:
            continue
    
    avg_cost = total_cost_sum / count if count > 0 else 0.0
    
    # Stock alerts count
    stock_alerts = await db.raw_materials.count_documents({
        "$expr": {"$lte": ["$stock_quantity", "$stock_alert_threshold"]},
        "stock_alert_threshold": {"$gt": 0}
    })
    
    return {
        "total_materials": total_materials,
        "total_recipes": total_recipes,
        "total_overheads": total_overheads,
        "total_suppliers": total_suppliers,
        "avg_cost_per_unit": round(avg_cost, 2),
        "recent_recipes": recent_recipes,
        "stock_alerts": stock_alerts
    }

# ================= ROOT =================

@api_router.get("/")
async def root():
    return {"message": "API Calculateur de Prix de Revient v2.0"}

app.include_router(api_router)

frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await db.users.create_index("email", unique=True)
    
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin123!")
    
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        hashed = hash_password(admin_password)
        await db.users.insert_one({"email": admin_email, "password_hash": hashed, "name": "Admin", "role": "admin", "created_at": datetime.now(timezone.utc)})
        logger.info(f"Admin user created: {admin_email}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

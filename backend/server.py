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
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import secrets
from io import BytesIO, StringIO
import csv
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_RIGHT

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# JWT Configuration
JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

# ================= AUTH HELPERS =================

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id, 
        "email": email, 
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15), 
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id, 
        "exp": datetime.now(timezone.utc) + timedelta(days=7), 
        "type": "refresh"
    }
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

async def get_optional_user(request: Request) -> Optional[dict]:
    try:
        return await get_current_user(request)
    except HTTPException:
        return None

# ================= AUTH MODELS =================

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str = Field(alias="_id")
    email: str
    name: str
    role: str
    
    model_config = ConfigDict(populate_by_name=True)

class ForgotPassword(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    token: str
    new_password: str

# ================= EXISTING MODELS =================

class RawMaterialBase(BaseModel):
    name: str
    unit: str
    unit_price: float
    supplier: Optional[str] = None
    description: Optional[str] = None

class RawMaterialCreate(RawMaterialBase):
    pass

class RawMaterial(RawMaterialBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RecipeIngredient(BaseModel):
    material_id: str
    material_name: str
    quantity: float
    unit: str
    unit_price: float

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

class OverheadCostCreate(OverheadCostBase):
    pass

class OverheadCost(OverheadCostBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RecipeBase(BaseModel):
    name: str
    description: Optional[str] = None
    output_quantity: float = 1.0
    output_unit: str = "pièce"
    ingredients: List[RecipeIngredient] = []
    labor_costs: List[LaborCost] = []
    overhead_ids: List[str] = []

class RecipeCreate(RecipeBase):
    pass

class RecipeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    output_quantity: Optional[float] = None
    output_unit: Optional[str] = None
    ingredients: Optional[List[RecipeIngredient]] = None
    labor_costs: Optional[List[LaborCost]] = None
    overhead_ids: Optional[List[str]] = None

class Recipe(RecipeBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CostBreakdown(BaseModel):
    recipe_id: str
    recipe_name: str
    total_material_cost: float
    total_labor_cost: float
    total_overhead_cost: float
    total_cost: float
    cost_per_unit: float
    output_quantity: float
    output_unit: str
    material_details: List[dict]
    labor_details: List[dict]
    overhead_details: List[dict]

class DashboardStats(BaseModel):
    total_materials: int
    total_recipes: int
    total_overheads: int
    avg_cost_per_unit: float
    recent_recipes: List[dict]

# ================= AUTH ENDPOINTS =================

@api_router.post("/auth/register")
async def register(input_data: UserRegister, response: Response):
    email = input_data.email.lower()
    
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    password_hash = hash_password(input_data.password)
    user_doc = {
        "email": email,
        "password_hash": password_hash,
        "name": input_data.name,
        "role": "user",
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {"_id": user_id, "email": email, "name": input_data.name, "role": "user"}

@api_router.post("/auth/login")
async def login(input_data: UserLogin, request: Request, response: Response):
    email = input_data.email.lower()
    client_ip = request.client.host if request.client else "unknown"
    identifier = f"{client_ip}:{email}"
    
    # Check brute force
    attempts = await db.login_attempts.find_one({"identifier": identifier})
    if attempts and attempts.get("count", 0) >= 5:
        lockout_until = attempts.get("lockout_until")
        if lockout_until and datetime.now(timezone.utc) < lockout_until:
            raise HTTPException(status_code=429, detail="Compte temporairement bloqué. Réessayez dans 15 minutes.")
    
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(input_data.password, user["password_hash"]):
        # Increment failed attempts
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {
                "$inc": {"count": 1},
                "$set": {"lockout_until": datetime.now(timezone.utc) + timedelta(minutes=15)}
            },
            upsert=True
        )
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    # Clear failed attempts on success
    await db.login_attempts.delete_one({"identifier": identifier})
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {"_id": user_id, "email": user["email"], "name": user["name"], "role": user["role"]}

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Déconnexion réussie"}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user

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
        
        user_id = str(user["_id"])
        access_token = create_access_token(user_id, user["email"])
        
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
        
        return {"message": "Token rafraîchi"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

# ================= RAW MATERIALS ENDPOINTS =================

@api_router.get("/materials", response_model=List[RawMaterial])
async def get_materials():
    materials = await db.raw_materials.find({}, {"_id": 0}).to_list(1000)
    for mat in materials:
        if isinstance(mat.get('created_at'), str):
            mat['created_at'] = datetime.fromisoformat(mat['created_at'])
        if isinstance(mat.get('updated_at'), str):
            mat['updated_at'] = datetime.fromisoformat(mat['updated_at'])
    return materials

@api_router.post("/materials", response_model=RawMaterial)
async def create_material(input_data: RawMaterialCreate):
    material = RawMaterial(**input_data.model_dump())
    doc = material.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.raw_materials.insert_one(doc)
    return material

@api_router.put("/materials/{material_id}", response_model=RawMaterial)
async def update_material(material_id: str, input_data: RawMaterialCreate):
    existing = await db.raw_materials.find_one({"id": material_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Matière première non trouvée")
    
    updated_data = input_data.model_dump()
    updated_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.raw_materials.update_one({"id": material_id}, {"$set": updated_data})
    
    result = await db.raw_materials.find_one({"id": material_id}, {"_id": 0})
    if isinstance(result.get('created_at'), str):
        result['created_at'] = datetime.fromisoformat(result['created_at'])
    if isinstance(result.get('updated_at'), str):
        result['updated_at'] = datetime.fromisoformat(result['updated_at'])
    return result

@api_router.delete("/materials/{material_id}")
async def delete_material(material_id: str):
    result = await db.raw_materials.delete_one({"id": material_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Matière première non trouvée")
    return {"message": "Matière première supprimée"}

# ================= OVERHEAD COSTS ENDPOINTS =================

@api_router.get("/overheads", response_model=List[OverheadCost])
async def get_overheads():
    overheads = await db.overheads.find({}, {"_id": 0}).to_list(1000)
    for oh in overheads:
        if isinstance(oh.get('created_at'), str):
            oh['created_at'] = datetime.fromisoformat(oh['created_at'])
    return overheads

@api_router.post("/overheads", response_model=OverheadCost)
async def create_overhead(input_data: OverheadCostCreate):
    overhead = OverheadCost(**input_data.model_dump())
    doc = overhead.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.overheads.insert_one(doc)
    return overhead

@api_router.put("/overheads/{overhead_id}", response_model=OverheadCost)
async def update_overhead(overhead_id: str, input_data: OverheadCostCreate):
    existing = await db.overheads.find_one({"id": overhead_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Frais général non trouvé")
    
    await db.overheads.update_one({"id": overhead_id}, {"$set": input_data.model_dump()})
    
    result = await db.overheads.find_one({"id": overhead_id}, {"_id": 0})
    if isinstance(result.get('created_at'), str):
        result['created_at'] = datetime.fromisoformat(result['created_at'])
    return result

@api_router.delete("/overheads/{overhead_id}")
async def delete_overhead(overhead_id: str):
    result = await db.overheads.delete_one({"id": overhead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Frais général non trouvé")
    return {"message": "Frais général supprimé"}

# ================= RECIPES ENDPOINTS =================

@api_router.get("/recipes", response_model=List[Recipe])
async def get_recipes():
    recipes = await db.recipes.find({}, {"_id": 0}).to_list(1000)
    for recipe in recipes:
        if isinstance(recipe.get('created_at'), str):
            recipe['created_at'] = datetime.fromisoformat(recipe['created_at'])
        if isinstance(recipe.get('updated_at'), str):
            recipe['updated_at'] = datetime.fromisoformat(recipe['updated_at'])
    return recipes

@api_router.get("/recipes/{recipe_id}", response_model=Recipe)
async def get_recipe(recipe_id: str):
    recipe = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recette non trouvée")
    if isinstance(recipe.get('created_at'), str):
        recipe['created_at'] = datetime.fromisoformat(recipe['created_at'])
    if isinstance(recipe.get('updated_at'), str):
        recipe['updated_at'] = datetime.fromisoformat(recipe['updated_at'])
    return recipe

@api_router.post("/recipes", response_model=Recipe)
async def create_recipe(input_data: RecipeCreate):
    recipe = Recipe(**input_data.model_dump())
    doc = recipe.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.recipes.insert_one(doc)
    return recipe

@api_router.put("/recipes/{recipe_id}", response_model=Recipe)
async def update_recipe(recipe_id: str, input_data: RecipeUpdate):
    existing = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Recette non trouvée")
    
    update_data = {k: v for k, v in input_data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.recipes.update_one({"id": recipe_id}, {"$set": update_data})
    
    result = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if isinstance(result.get('created_at'), str):
        result['created_at'] = datetime.fromisoformat(result['created_at'])
    if isinstance(result.get('updated_at'), str):
        result['updated_at'] = datetime.fromisoformat(result['updated_at'])
    return result

@api_router.delete("/recipes/{recipe_id}")
async def delete_recipe(recipe_id: str):
    result = await db.recipes.delete_one({"id": recipe_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recette non trouvée")
    return {"message": "Recette supprimée"}

# ================= CSV IMPORT ENDPOINTS =================

class CSVImportResult(BaseModel):
    success: bool
    imported_count: int
    errors: List[str]
    recipes: List[dict]

@api_router.post("/recipes/import-csv", response_model=CSVImportResult)
async def import_recipes_csv(file: UploadFile = File(...)):
    """
    Import recipes from CSV file.
    Expected CSV format:
    name,description,output_quantity,output_unit,ingredient_name,ingredient_quantity,ingredient_unit,ingredient_price,labor_description,labor_hours,labor_rate
    
    Each row can represent a recipe or an ingredient/labor for an existing recipe (same name).
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Le fichier doit être au format CSV")
    
    try:
        content = await file.read()
        decoded = content.decode('utf-8-sig')  # Handle BOM
        reader = csv.DictReader(StringIO(decoded), delimiter=';')
        
        # Try comma if semicolon doesn't work
        if not reader.fieldnames or len(reader.fieldnames) <= 1:
            decoded = content.decode('utf-8-sig')
            reader = csv.DictReader(StringIO(decoded), delimiter=',')
        
        recipes_dict = {}
        errors = []
        row_num = 1
        
        for row in reader:
            row_num += 1
            try:
                # Clean row keys (remove BOM and whitespace)
                row = {k.strip().lower().replace('\ufeff', ''): v.strip() if v else '' for k, v in row.items() if k}
                
                recipe_name = row.get('name', row.get('nom', '')).strip()
                if not recipe_name:
                    continue
                
                # Get or create recipe
                if recipe_name not in recipes_dict:
                    recipes_dict[recipe_name] = {
                        'name': recipe_name,
                        'description': row.get('description', ''),
                        'output_quantity': float(row.get('output_quantity', row.get('quantite_produite', '1')) or 1),
                        'output_unit': row.get('output_unit', row.get('unite_sortie', 'pièce')) or 'pièce',
                        'ingredients': [],
                        'labor_costs': [],
                        'overhead_ids': []
                    }
                
                recipe = recipes_dict[recipe_name]
                
                # Add ingredient if present
                ing_name = row.get('ingredient_name', row.get('matiere', row.get('ingredient', ''))).strip()
                ing_qty = row.get('ingredient_quantity', row.get('quantite', row.get('qte', ''))).strip()
                ing_unit = row.get('ingredient_unit', row.get('unite', '')).strip()
                ing_price = row.get('ingredient_price', row.get('prix_unitaire', row.get('prix', ''))).strip()
                
                if ing_name and ing_qty:
                    # Check if material exists, if not create it
                    existing_mat = await db.raw_materials.find_one({"name": ing_name}, {"_id": 0})
                    if not existing_mat:
                        # Create the material
                        new_mat = RawMaterial(
                            name=ing_name,
                            unit=ing_unit or 'unité',
                            unit_price=float(ing_price) if ing_price else 0.0
                        )
                        mat_doc = new_mat.model_dump()
                        mat_doc['created_at'] = mat_doc['created_at'].isoformat()
                        mat_doc['updated_at'] = mat_doc['updated_at'].isoformat()
                        await db.raw_materials.insert_one(mat_doc)
                        existing_mat = mat_doc
                    
                    recipe['ingredients'].append({
                        'material_id': existing_mat['id'],
                        'material_name': ing_name,
                        'quantity': float(ing_qty.replace(',', '.')),
                        'unit': existing_mat.get('unit', ing_unit or 'unité'),
                        'unit_price': existing_mat.get('unit_price', float(ing_price.replace(',', '.')) if ing_price else 0.0)
                    })
                
                # Add labor cost if present
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
        
        # Save recipes to database
        imported_recipes = []
        for recipe_data in recipes_dict.values():
            recipe = Recipe(**recipe_data)
            doc = recipe.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            doc['updated_at'] = doc['updated_at'].isoformat()
            await db.recipes.insert_one(doc)
            imported_recipes.append({
                'id': recipe.id,
                'name': recipe.name,
                'ingredients_count': len(recipe.ingredients),
                'labor_count': len(recipe.labor_costs)
            })
        
        return CSVImportResult(
            success=len(imported_recipes) > 0,
            imported_count=len(imported_recipes),
            errors=errors,
            recipes=imported_recipes
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de l'import: {str(e)}")

@api_router.get("/recipes/csv-template")
async def get_csv_template():
    """Download a CSV template for recipe import"""
    template = """name;description;output_quantity;output_unit;ingredient_name;ingredient_quantity;ingredient_unit;ingredient_price;labor_description;labor_hours;labor_rate
Pain de campagne;Pain traditionnel;10;pièce;Farine de blé;5;kg;1.20;Pétrissage;1;15
Pain de campagne;Pain traditionnel;10;pièce;Levure;0.1;kg;8.00;Cuisson;0.5;15
Pain de campagne;Pain traditionnel;10;pièce;Sel;0.05;kg;0.50;;;
Croissant;Viennoiserie;20;pièce;Farine;2;kg;1.20;Préparation;2;15
Croissant;Viennoiserie;20;pièce;Beurre;1;kg;8.50;Cuisson;0.5;15
"""
    
    buffer = BytesIO(template.encode('utf-8-sig'))
    
    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=template_recettes.csv"}
    )

# ================= COST CALCULATION ENDPOINTS =================

async def calculate_cost(recipe_id: str) -> CostBreakdown:
    recipe = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recette non trouvée")
    
    # Calculate material costs
    material_details = []
    total_material_cost = 0.0
    for ing in recipe.get('ingredients', []):
        cost = ing['quantity'] * ing['unit_price']
        total_material_cost += cost
        material_details.append({
            "name": ing['material_name'],
            "quantity": ing['quantity'],
            "unit": ing['unit'],
            "unit_price": ing['unit_price'],
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
    total_labor_hours = sum(labor_item['hours'] for labor_item in recipe.get('labor_costs', []))
    
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
    
    return CostBreakdown(
        recipe_id=recipe_id,
        recipe_name=recipe['name'],
        total_material_cost=round(total_material_cost, 2),
        total_labor_cost=round(total_labor_cost, 2),
        total_overhead_cost=round(total_overhead_cost, 2),
        total_cost=round(total_cost, 2),
        cost_per_unit=round(cost_per_unit, 2),
        output_quantity=output_qty,
        output_unit=recipe.get('output_unit', 'pièce'),
        material_details=material_details,
        labor_details=labor_details,
        overhead_details=overhead_details
    )

@api_router.get("/recipes/{recipe_id}/cost", response_model=CostBreakdown)
async def get_recipe_cost(recipe_id: str):
    return await calculate_cost(recipe_id)

# ================= PDF EXPORT ENDPOINT =================

@api_router.get("/recipes/{recipe_id}/pdf")
async def export_recipe_pdf(recipe_id: str):
    cost = await calculate_cost(recipe_id)
    recipe = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontSize=24, textColor=colors.HexColor('#002FA7'), alignment=TA_CENTER, spaceAfter=20)
    heading_style = ParagraphStyle('CustomHeading', parent=styles['Heading2'], fontSize=14, textColor=colors.HexColor('#09090B'), spaceBefore=20, spaceAfter=10)
    normal_style = styles['Normal']
    
    elements = []
    
    # Title
    elements.append(Paragraph("FICHE DE PRIX DE REVIENT", title_style))
    elements.append(Spacer(1, 10))
    
    # Recipe Info
    elements.append(Paragraph(f"<b>Produit:</b> {cost.recipe_name}", normal_style))
    elements.append(Paragraph(f"<b>Quantité produite:</b> {cost.output_quantity} {cost.output_unit}", normal_style))
    if recipe.get('description'):
        elements.append(Paragraph(f"<b>Description:</b> {recipe['description']}", normal_style))
    elements.append(Paragraph(f"<b>Date:</b> {datetime.now().strftime('%d/%m/%Y %H:%M')}", normal_style))
    elements.append(Spacer(1, 20))
    
    # Materials Table
    if cost.material_details:
        elements.append(Paragraph("1. MATIÈRES PREMIÈRES", heading_style))
        mat_data = [["Matière", "Quantité", "Prix unitaire", "Total"]]
        for mat in cost.material_details:
            mat_data.append([
                mat['name'],
                f"{mat['quantity']} {mat['unit']}",
                f"{mat['unit_price']:.2f} €",
                f"{mat['total_cost']:.2f} €"
            ])
        mat_data.append(["", "", "Sous-total:", f"{cost.total_material_cost:.2f} €"])
        
        mat_table = Table(mat_data, colWidths=[7*cm, 3*cm, 3*cm, 3*cm])
        mat_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#002FA7')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
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
            labor_data.append([
                labor['description'],
                f"{labor['hours']} h",
                f"{labor['hourly_rate']:.2f} €/h",
                f"{labor['total_cost']:.2f} €"
            ])
        labor_data.append(["", "", "Sous-total:", f"{cost.total_labor_cost:.2f} €"])
        
        labor_table = Table(labor_data, colWidths=[7*cm, 3*cm, 3*cm, 3*cm])
        labor_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#10B981')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E4E4E7')),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#F4F4F5')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ]))
        elements.append(labor_table)
    
    # Overheads Table
    if cost.overhead_details:
        elements.append(Paragraph("3. FRAIS GÉNÉRAUX", heading_style))
        oh_data = [["Frais", "Catégorie", "Méthode", "Total"]]
        for oh in cost.overhead_details:
            oh_data.append([
                oh['name'],
                oh['category'],
                oh['allocation_method'],
                f"{oh['total_cost']:.2f} €"
            ])
        oh_data.append(["", "", "Sous-total:", f"{cost.total_overhead_cost:.2f} €"])
        
        oh_table = Table(oh_data, colWidths=[5*cm, 4*cm, 4*cm, 3*cm])
        oh_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F59E0B')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (-1, 0), (-1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E4E4E7')),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#F4F4F5')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ]))
        elements.append(oh_table)
    
    # Summary
    elements.append(Spacer(1, 30))
    elements.append(Paragraph("RÉCAPITULATIF", heading_style))
    
    summary_data = [
        ["Coût des matières premières", f"{cost.total_material_cost:.2f} €"],
        ["Coût de main d'œuvre", f"{cost.total_labor_cost:.2f} €"],
        ["Frais généraux", f"{cost.total_overhead_cost:.2f} €"],
        ["COÛT TOTAL", f"{cost.total_cost:.2f} €"],
        [f"PRIX DE REVIENT / {cost.output_unit}", f"{cost.cost_per_unit:.2f} €"],
    ]
    
    summary_table = Table(summary_data, colWidths=[10*cm, 5*cm])
    summary_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E4E4E7')),
        ('BACKGROUND', (0, -2), (-1, -2), colors.HexColor('#002FA7')),
        ('TEXTCOLOR', (0, -2), (-1, -2), colors.white),
        ('FONTNAME', (0, -2), (-1, -2), 'Helvetica-Bold'),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#09090B')),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.white),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -1), (-1, -1), 14),
    ]))
    elements.append(summary_table)
    
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"prix_revient_{cost.recipe_name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ================= DASHBOARD STATS =================

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    total_materials = await db.raw_materials.count_documents({})
    total_recipes = await db.recipes.count_documents({})
    total_overheads = await db.overheads.count_documents({})
    
    recipes = await db.recipes.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    recent_recipes = []
    total_cost_sum = 0.0
    count = 0
    
    for recipe in recipes:
        total_material_cost = sum(
            ing['quantity'] * ing['unit_price'] 
            for ing in recipe.get('ingredients', [])
        )
        total_labor_cost = sum(
            labor['hours'] * labor['hourly_rate'] 
            for labor in recipe.get('labor_costs', [])
        )
        
        total_overhead_cost = 0.0
        total_labor_hours = sum(labor_item['hours'] for labor_item in recipe.get('labor_costs', []))
        
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
        cost_per_unit = total_cost / output_qty
        
        total_cost_sum += cost_per_unit
        count += 1
        
        recent_recipes.append({
            "id": recipe['id'],
            "name": recipe['name'],
            "cost_per_unit": round(cost_per_unit, 2),
            "output_unit": recipe.get('output_unit', 'pièce')
        })
    
    avg_cost = total_cost_sum / count if count > 0 else 0.0
    
    return DashboardStats(
        total_materials=total_materials,
        total_recipes=total_recipes,
        total_overheads=total_overheads,
        avg_cost_per_unit=round(avg_cost, 2),
        recent_recipes=recent_recipes
    )

# ================= ROOT ENDPOINT =================

@api_router.get("/")
async def root():
    return {"message": "API Calculateur de Prix de Revient"}

# Include the router in the main app
app.include_router(api_router)

# CORS Configuration
frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Startup event
@app.on_event("startup")
async def startup_event():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    
    # Seed admin user
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc)
        })
        logger.info(f"Admin user created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
        logger.info(f"Admin password updated: {admin_email}")
    
    # Write test credentials
    import os as os_module
    os_module.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"# Test Credentials\n\n")
        f.write(f"## Admin Account\n")
        f.write(f"- Email: {admin_email}\n")
        f.write(f"- Password: {admin_password}\n")
        f.write(f"- Role: admin\n\n")
        f.write(f"## Auth Endpoints\n")
        f.write(f"- POST /api/auth/register\n")
        f.write(f"- POST /api/auth/login\n")
        f.write(f"- POST /api/auth/logout\n")
        f.write(f"- GET /api/auth/me\n")
        f.write(f"- POST /api/auth/refresh\n")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

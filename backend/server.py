from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ================= MODELS =================

# Raw Material Models
class RawMaterialBase(BaseModel):
    name: str
    unit: str  # kg, L, pièce, etc.
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

# Recipe Ingredient
class RecipeIngredient(BaseModel):
    material_id: str
    material_name: str
    quantity: float
    unit: str
    unit_price: float

# Labor Cost
class LaborCost(BaseModel):
    description: str
    hours: float
    hourly_rate: float

# Overhead Cost
class OverheadCostBase(BaseModel):
    name: str
    category: str  # electricity, rent, depreciation, etc.
    monthly_amount: float
    allocation_method: str  # per_unit, per_hour, fixed
    allocation_value: Optional[float] = 1.0  # units per month or hours

class OverheadCostCreate(OverheadCostBase):
    pass

class OverheadCost(OverheadCostBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Recipe Models
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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Cost Breakdown Response
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

# Dashboard Stats
class DashboardStats(BaseModel):
    total_materials: int
    total_recipes: int
    total_overheads: int
    avg_cost_per_unit: float
    recent_recipes: List[dict]

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
    
    await db.raw_materials.update_one(
        {"id": material_id},
        {"$set": updated_data}
    )
    
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
    
    await db.overheads.update_one(
        {"id": overhead_id},
        {"$set": input_data.model_dump()}
    )
    
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
    
    await db.recipes.update_one(
        {"id": recipe_id},
        {"$set": update_data}
    )
    
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

# ================= COST CALCULATION ENDPOINTS =================

@api_router.get("/recipes/{recipe_id}/cost", response_model=CostBreakdown)
async def calculate_recipe_cost(recipe_id: str):
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
            else:  # fixed
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

# ================= DASHBOARD STATS =================

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    total_materials = await db.raw_materials.count_documents({})
    total_recipes = await db.recipes.count_documents({})
    total_overheads = await db.overheads.count_documents({})
    
    # Get recent recipes with their costs
    recipes = await db.recipes.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    recent_recipes = []
    total_cost_sum = 0.0
    count = 0
    
    for recipe in recipes:
        # Calculate cost for each recipe
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

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

import json
import os
import re
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine, get_db
from .models import Dish

BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"
DATA_JSON_PATH = BASE_DIR / "data" / "menu.json"
MAX_GLB_SIZE = 5 * 1024 * 1024  # 5 МБ
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "admin123")

MODELS_DIR.mkdir(parents=True, exist_ok=True)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AR-Menu Microservice API", version="1.0.0")


def seed_initial_dishes():
    """При первом старте переносит базовые блюда из data/menu.json в SQL-таблицу dishes."""
    db = SessionLocal()
    try:
        if db.query(Dish).count() == 0 and DATA_JSON_PATH.exists():
            with open(DATA_JSON_PATH, "r", encoding="utf-8") as f:
                initial_data = json.load(f)
            for slug, item in initial_data.items():
                dish = Dish(
                    slug=slug,
                    name=item["name"],
                    calories=int(item["calories"]),
                    protein=float(item["protein"]),
                    fat=float(item["fat"]),
                    carbs=float(item["carbs"]),
                    composition=item.get("composition", ""),
                    model_whole=item.get("model_whole", item.get("model", "./dish.glb")),
                    model_cut=item.get("model_cut", item.get("model_whole", "./dish.glb")),
                )
                db.add(dish)
            db.commit()
    finally:
        db.close()


seed_initial_dishes()


def sync_json_snapshot(db: Session):
    """Синхронизирует SQL-базу с резервным файлом data/menu.json."""
    dishes = db.query(Dish).all()
    snapshot = {}
    for d in dishes:
        snapshot[d.slug] = {
            "name": d.name,
            "calories": d.calories,
            "protein": d.protein,
            "fat": d.fat,
            "carbs": d.carbs,
            "composition": d.composition,
            "model_whole": d.model_whole,
            "model_cut": d.model_cut or d.model_whole,
        }
    DATA_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(DATA_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, ensure_ascii=False, indent=2)


@app.get("/api/dishes")
def get_all_dishes(db: Session = Depends(get_db)):
    dishes = db.query(Dish).all()
    return {
        d.slug: {
            "name": d.name,
            "calories": d.calories,
            "protein": d.protein,
            "fat": d.fat,
            "carbs": d.carbs,
            "composition": d.composition,
            "model_whole": d.model_whole,
            "model_cut": d.model_cut or d.model_whole,
        }
        for d in dishes
    }


@app.get("/api/dishes/{slug}")
def get_dish(slug: str, db: Session = Depends(get_db)):
    dish = db.query(Dish).filter(Dish.slug == slug).first()
    if not dish:
        raise HTTPException(status_code=404, detail="Блюдо не найдено")
    return {
        "slug": dish.slug,
        "name": dish.name,
        "calories": dish.calories,
        "protein": dish.protein,
        "fat": dish.fat,
        "carbs": dish.carbs,
        "composition": dish.composition,
        "model_whole": dish.model_whole,
        "model_cut": dish.model_cut or dish.model_whole,
    }


async def save_validated_glb(upload: UploadFile, filename_prefix: str) -> str:
    if not upload.filename or not upload.filename.lower().endswith(".glb"):
        raise HTTPException(status_code=400, detail="Допускаются только 3D-модели в формате .glb")
    content = await upload.read()
    if len(content) > MAX_GLB_SIZE:
        raise HTTPException(status_code=400, detail="Размер файла превышает лимит 5 МБ. Оптимизируйте модель.")
    target_name = f"{filename_prefix}.glb"
    target_path = MODELS_DIR / target_name
    with open(target_path, "wb") as f:
        f.write(content)
    return f"./models/{target_name}"


@app.post("/api/dishes")
async def create_or_update_dish(
    admin_token: str = Form(...),
    slug: str = Form(...),
    name: str = Form(...),
    calories: int = Form(...),
    protein: float = Form(...),
    fat: float = Form(...),
    carbs: float = Form(...),
    composition: str = Form(...),
    file_whole: UploadFile = File(...),
    file_cut: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    if admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="Неверный пароль администратора")

    if not re.match(r"^[a-z0-9_-]{2,50}$", slug):
        raise HTTPException(status_code=400, detail="Некорректный slug (используйте латиницу и цифры)")

    if calories < 0 or protein < 0 or fat < 0 or carbs < 0:
        raise HTTPException(status_code=400, detail="Показатели КБЖУ не могут быть отрицательными")

    if len(composition.strip()) < 5 or len(composition) > 600:
        raise HTTPException(status_code=400, detail="Длина состава должна быть от 5 до 600 символов")

    whole_path = await save_validated_glb(file_whole, slug)
    cut_path = whole_path
    if file_cut and file_cut.filename:
        cut_path = await save_validated_glb(file_cut, f"{slug}_cut")

    existing = db.query(Dish).filter(Dish.slug == slug).first()
    if existing:
        existing.name = name
        existing.calories = calories
        existing.protein = protein
        existing.fat = fat
        existing.carbs = carbs
        existing.composition = composition
        existing.model_whole = whole_path
        existing.model_cut = cut_path
    else:
        new_dish = Dish(
            slug=slug,
            name=name,
            calories=calories,
            protein=protein,
            fat=fat,
            carbs=carbs,
            composition=composition,
            model_whole=whole_path,
            model_cut=cut_path,
        )
        db.add(new_dish)

    db.commit()
    sync_json_snapshot(db)

    return {"status": "ok", "slug": slug, "name": name, "model_whole": whole_path, "model_cut": cut_path}


# Маршруты страниц и статики
@app.get("/")
def serve_index():
    return FileResponse(BASE_DIR / "index.html")


@app.get("/admin")
def serve_admin():
    return FileResponse(BASE_DIR / "admin.html")


@app.get("/dish.glb")
def serve_root_dish():
    return FileResponse(BASE_DIR / "dish.glb")


app.mount("/css", StaticFiles(directory=BASE_DIR / "css"), name="css")
app.mount("/js", StaticFiles(directory=BASE_DIR / "js"), name="js")
app.mount("/data", StaticFiles(directory=BASE_DIR / "data"), name="data")
app.mount("/models", StaticFiles(directory=MODELS_DIR), name="models")

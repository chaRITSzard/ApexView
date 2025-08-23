"""
FastAPI backend for ApexView F1 data API with optimized caching
"""
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import fastf1
import pandas as pd
import os
import logging
import time
import asyncio
from functools import lru_cache

from backend_v2.config import get_settings
from backend_v2.cache import disk_cache

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("apexview-api")

# Initialize settings
settings = get_settings()

# Create and setup cache directories
os.makedirs(settings.CACHE_DIR, exist_ok=True)
races_cache_dir = os.path.join(settings.CACHE_DIR, "races")
os.makedirs(races_cache_dir, exist_ok=True)
sessions_cache_dir = os.path.join(settings.CACHE_DIR, "sessions")
os.makedirs(sessions_cache_dir, exist_ok=True)
drivers_cache_dir = os.path.join(settings.CACHE_DIR, "drivers")
os.makedirs(drivers_cache_dir, exist_ok=True)
telemetry_cache_dir = os.path.join(settings.CACHE_DIR, "telemetry")
os.makedirs(telemetry_cache_dir, exist_ok=True)
standings_cache_dir = os.path.join(settings.CACHE_DIR, "standings")
os.makedirs(standings_cache_dir, exist_ok=True)

# Enable FastF1 cache
fastf1.Cache.enable_cache(settings.CACHE_DIR)

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=settings.CORS_METHODS,
    allow_headers=["*"],
)

# Performance middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add processing time to response headers"""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    
    # Log request info
    logger.info(f"Request: {request.method} {request.url.path} - Completed in {process_time:.4f}s")
    
    return response

# Global error handler
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Global exception handler for better error responses"""
    logger.error(f"Error processing request: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"error": str(exc), "path": request.url.path},
    )

# API Routes

@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/api/docs",
    }

@lru_cache(maxsize=settings.IN_MEMORY_CACHE_SIZE)
def get_cached_schedule(year: int):
    """Cache race schedule data in memory"""
    logger.info(f"Fetching schedule for year {year} (not from cache)")
    schedule = fastf1.get_event_schedule(year)
    events = []
    for _, event in schedule.iterrows():
        events.append({
            "name": event["EventName"],
            "location": event["Location"],
            "country": event["Country"],
            "date": event["EventDate"].strftime("%Y-%m-%d"),
            "round": int(event["RoundNumber"])
        })
    return events

@app.get(f"{settings.API_PREFIX}/races/{{year}}")
@disk_cache(races_cache_dir, settings.RACE_CACHE_TTL)
async def get_races(year: int):
    """
    Get all races for a specified year
    
    Args:
        year: The F1 season year
    
    Returns:
        JSON with events list
    """
    try:
        logger.info(f"API request: Get races for year {year}")
        events = get_cached_schedule(year)
        return {"events": events}
    except Exception as e:
        logger.error(f"Error fetching races for {year}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@lru_cache(maxsize=settings.IN_MEMORY_CACHE_SIZE)
def get_cached_sessions(year: int, event: str):
    """Cache session data in memory"""
    logger.info(f"Fetching sessions for {year} {event} (not from cache)")
    session_types = ["FP1", "FP2", "FP3", "Q", "R"]
    available_sessions = []
    
    for s_type in session_types:
        try:
            s = fastf1.get_session(year, event, s_type)
            s.load(telemetry=False, weather=False, laps=False)
            available_sessions.append(str(s_type))
        except Exception:
            continue
    
    return [str(session) for session in available_sessions]

@app.get(f"{settings.API_PREFIX}/sessions/{{year}}/{{event}}")
@disk_cache(sessions_cache_dir, settings.SESSION_CACHE_TTL)
async def get_sessions(year: int, event: str):
    """
    Get all available sessions for a race
    
    Args:
        year: The F1 season year
        event: The event name
    
    Returns:
        JSON with sessions list
    """
    try:
        logger.info(f"API request: Get sessions for {year} {event}")
        sessions = get_cached_sessions(year, event)
        return {"Sessions": sessions}
    except Exception as e:
        logger.error(f"Error fetching sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@lru_cache(maxsize=settings.IN_MEMORY_CACHE_SIZE)
def get_cached_driver_details(year: int, event: str, session: str):
    """Cache driver details data"""
    logger.info(f"Fetching driver details for {year} {event} {session} (not from cache)")
    f1_session = fastf1.get_session(year, event, session)
    f1_session.load(telemetry=False, laps=True, weather=False)
    
    driver_codes = sorted(set(f1_session.laps['Driver']))
    drivers_info = []
    
    for code in driver_codes:
        try:
            driver = f1_session.get_driver(code)
            if 'FullName' in driver:
                name = str(driver['FullName'])
            elif 'FirstName' in driver and 'LastName' in driver:
                name = f"{driver['FirstName']} {driver['LastName']}"
            else:
                name = str(code)
            
            team = None
            if 'Team' in driver and driver['Team']:
                team = driver['Team']
            if not team:
                laps = f1_session.laps
                driver_laps = laps[laps['Driver'] == code]
                if not driver_laps.empty and 'Team' in driver_laps.columns:
                    team = driver_laps.iloc[0]['Team']
        except Exception:
            name = str(code)
            team = 'Unknown'
        
        drivers_info.append({
            "code": str(code),
            "name": name,
            "team": team
        })
    
    return drivers_info

@app.get(f"{settings.API_PREFIX}/drivers/details/{{year}}/{{event}}/{{session}}")
@disk_cache(drivers_cache_dir, settings.DRIVER_CACHE_TTL)
async def get_drivers_details(year: int, event: str, session: str):
    """
    Get detailed driver information for a session
    
    Args:
        year: The F1 season year
        event: The event name
        session: The session type (FP1, FP2, FP3, Q, R)
    
    Returns:
        JSON with driver details
    """
    try:
        logger.info(f"API request: Get driver details for {year} {event} {session}")
        drivers_info = get_cached_driver_details(year, event, session)
        return {"drivers": drivers_info}
    except Exception as e:
        logger.error(f"Error fetching driver details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get(f"{settings.API_PREFIX}/telemetry/{{year}}/{{event}}/{{session}}/{{driver}}")
@disk_cache(telemetry_cache_dir, settings.DRIVER_CACHE_TTL)
async def get_telemetry_data(year: int, event: str, session: str, driver: str):
    """
    Get telemetry data for a driver's fastest lap
    
    Args:
        year: The F1 season year
        event: The event name
        session: The session type (FP1, FP2, FP3, Q, R)
        driver: The driver code (e.g. HAM, VER)
    
    Returns:
        JSON with telemetry data
    """
    try:
        logger.info(f"API request: Get telemetry for {year} {event} {session} {driver}")
        f1_session = fastf1.get_session(year, event, session)
        f1_session.load()

        driver_lap = f1_session.laps.pick_drivers(driver.upper()).pick_fastest()
        car_data = driver_lap.get_telemetry().add_distance()

        # Optimize data by limiting to important telemetry points
        telemetry_data = car_data[['Time', 'Speed', 'Throttle', 'Brake', 'Distance']].to_dict('records')
        
        # Smart sampling to reduce data size while preserving important points
        if len(telemetry_data) > settings.TELEMETRY_DATA_LIMIT:
            sample_rate = max(1, len(telemetry_data) // settings.TELEMETRY_DATA_LIMIT)
            telemetry_data = telemetry_data[::sample_rate]
        
        return {
            "driver": driver,
            "session": f"{year} {event} {session}",
            "lap_time": str(driver_lap['LapTime']),
            "telemetry": telemetry_data
        }
    except Exception as e:
        logger.error(f"Error fetching telemetry: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch data: {str(e)}")

@lru_cache(maxsize=64)
def get_cached_race_standings(year: int, event: str, session: str):
    """Cache race standings data"""
    logger.info(f"Fetching race standings for {year} {event} {session} (not from cache)")
    f1_session = fastf1.get_session(year, event, session)
    f1_session.load()
    return f1_session.results.loc[:, ['Abbreviation', 'TeamName', 'ClassifiedPosition', 'Points']].to_dict('records')

@app.get(f"{settings.API_PREFIX}/races/{{year}}/{{event}}/{{session}}")
@disk_cache(standings_cache_dir, settings.RACE_CACHE_TTL)
async def get_race_standings(year: int, event: str, session: str):
    """
    Get race results/standings
    
    Args:
        year: The F1 season year
        event: The event name
        session: The session type (typically 'R' for race)
    
    Returns:
        JSON with race standings
    """
    try:
        logger.info(f"API request: Get race standings for {year} {event} {session}")
        standings = get_cached_race_standings(year, event, session)
        return standings
    except Exception as e:
        logger.error(f"Error fetching race standings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@lru_cache(maxsize=64)
def get_cached_driver_standings(year: int):
    """Cache driver championship standings"""
    logger.info(f"Fetching driver standings for {year} (not from cache)")
    schedule = fastf1.get_event_schedule(year)
    final_round = schedule['RoundNumber'].max()
    final_race = fastf1.get_session(year, final_round, 'R')
    final_race.load()

    standings = final_race.results[['Abbreviation', 'TeamName', 'Points']].copy()
    return standings.sort_values('Points', ascending=False).reset_index(drop=True).to_dict('records')

@app.get(f"{settings.API_PREFIX}/seasons/driver/{{year}}")
@disk_cache(standings_cache_dir, settings.RACE_CACHE_TTL)
async def get_season_driver_standings(year: int):
    """
    Get driver championship standings for a season
    
    Args:
        year: The F1 season year
    
    Returns:
        JSON with driver standings
    """
    try:
        logger.info(f"API request: Get driver standings for {year}")
        standings = get_cached_driver_standings(year)
        return standings
    except Exception as e:
        logger.error(f"Error fetching driver standings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@lru_cache(maxsize=64)
def get_cached_constructor_standings(year: int):
    """Cache constructor championship standings"""
    logger.info(f"Fetching constructor standings for {year} (not from cache)")
    schedule = fastf1.get_event_schedule(year)
    final_round = schedule['RoundNumber'].max()
    final_race = fastf1.get_session(year, final_round, 'R')
    final_race.load()

    standings = final_race.results[['Abbreviation', 'TeamName', 'Points']].copy()
    standings = standings.sort_values('Points', ascending=False).reset_index(drop=True)
    
    constructors = (standings.groupby('TeamName')['Points']
                  .max()
                  .sort_values(ascending=False)
                  .reset_index())
    return constructors.to_dict('records')

@app.get(f"{settings.API_PREFIX}/seasons/constructor/{{year}}")
@disk_cache(standings_cache_dir, settings.RACE_CACHE_TTL)
async def get_season_constructor_standings(year: int):
    """
    Get constructor championship standings for a season
    
    Args:
        year: The F1 season year
    
    Returns:
        JSON with constructor standings
    """
    try:
        logger.info(f"API request: Get constructor standings for {year}")
        constructors = get_cached_constructor_standings(year)
        return constructors
    except Exception as e:
        logger.error(f"Error fetching constructor standings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Add extra API endpoints for news and profiles

@app.get(f"{settings.API_PREFIX}/drivers/profile/{{driver_id}}")
async def get_driver_profile(driver_id: str):
    """
    Get detailed driver profile with career statistics
    
    Args:
        driver_id: Driver code/ID
    
    Returns:
        JSON with driver profile
    """
    # Example static data - in a real scenario, this would come from a database
    drivers_db = {
        "HAM": {
            "name": "Lewis Hamilton",
            "team": "Mercedes",
            "number": 44,
            "championships": 7,
            "country": "United Kingdom",
            "podiums": 195,
            "wins": 103,
            "bio": "One of the most successful F1 drivers of all time, holding numerous records."
        },
        "VER": {
            "name": "Max Verstappen",
            "team": "Red Bull Racing",
            "number": 1,
            "championships": 4,
            "country": "Netherlands",
            "podiums": 97,
            "wins": 59,
            "bio": "Known for his aggressive driving style and exceptional race craft."
        }
    }
    
    if driver_id.upper() in drivers_db:
        return drivers_db[driver_id.upper()]
    else:
        return {"name": driver_id, "team": "Unknown", "bio": "Profile data not available"}

@app.get(f"{settings.API_PREFIX}/news")
async def get_f1_news():
    """
    Get latest F1 news
    
    Returns:
        JSON with news items
    """
    # Example static data - would be updated from a news API/database
    current_date = "2025-08-22"
    news = [
        {
            "id": 1,
            "title": "Hamilton announces retirement after 2026 season",
            "date": current_date,
            "summary": "Seven-time world champion Lewis Hamilton has announced he will retire from F1 after the 2026 season.",
            "image_url": "https://example.com/hamilton.jpg"
        },
        {
            "id": 2,
            "title": "F1 confirms new USA Grand Prix venue for 2026",
            "date": current_date,
            "summary": "Formula 1 has confirmed a new USA Grand Prix venue starting from the 2026 season.",
            "image_url": "https://example.com/usa-gp.jpg"
        },
        {
            "id": 3, 
            "title": "Red Bull unveils radical new aerodynamic concept",
            "date": current_date,
            "summary": "Red Bull Racing has revealed a radical new aerodynamic package ahead of the next race.",
            "image_url": "https://example.com/redbull.jpg"
        }
    ]
    return {"news": news}

# Startup event for prefetching data
@app.on_event("startup")
async def startup_event():
    """Prefetch commonly accessed data on startup"""
    logger.info("Starting API server and prefetching data...")
    
    async def prefetch_data():
        """Prefetch common data to warm the cache"""
        try:
            current_year = 2024  # Current season
            
            # Prefetch schedules for recent years
            for year in settings.PREFETCH_YEARS:
                try:
                    await get_races(year)
                    logger.info(f"Prefetched schedule for {year}")
                    await asyncio.sleep(1)  # Don't overload on startup
                except Exception as e:
                    logger.error(f"Failed to prefetch schedule for {year}: {e}")
            
            # Prefetch current season standings
            try:
                await get_season_driver_standings(current_year)
                await get_season_constructor_standings(current_year)
                logger.info(f"Prefetched standings for {current_year}")
            except Exception as e:
                logger.error(f"Failed to prefetch standings: {e}")
                
        except Exception as e:
            logger.error(f"Error during prefetch: {e}")
    
    # Run prefetching in background
    asyncio.create_task(prefetch_data())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

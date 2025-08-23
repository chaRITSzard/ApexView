from fastapi import FastAPI, HTTPException
import asyncio
import fastf1
import pandas as pd
from fastapi.middleware.cors import CORSMiddleware
from functools import lru_cache
import os
import logging

# Enable FastF1 cache globally
cache_dir = os.path.join(os.getcwd(), 'f1_cache')
os.makedirs(cache_dir, exist_ok=True)
fastf1.Cache.enable_cache(cache_dir)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ApexView F1 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], #only for dev purpose, can't allow when published
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@lru_cache(maxsize=128)
def get_cached_schedule(year: int):
    """Cache race schedule data"""
    schedule = fastf1.get_event_schedule(year)
    events = []
    for _, event in schedule.iterrows():
        events.append({
            "name": event["EventName"],
            "location": event["Location"],
            "country": event["Country"],
            "date": event["EventDate"].strftime("%Y-%m-%d")
        })
    return events

@app.get("/api/races/{year}")
async def get_races(year: int):
    try:
        logger.info(f"Fetching races for year {year}")
        events = get_cached_schedule(year)
        return {"events": events}
    except Exception as e:
        logger.error(f"Error fetching races for {year}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@lru_cache(maxsize=256)
def get_cached_sessions(year: int, event: str):
    """Cache session data"""
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

@app.get("/api/sessions/{year}/{event}")
async def get_sessions(year:int, event:str):
    try:
        logger.info(f"Fetching sessions for {year} {event}")
        sessions = get_cached_sessions(year, event)
        return {"Sessions": sessions}
    except Exception as e:
        logger.error(f"Error fetching sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@lru_cache(maxsize=256)
def get_cached_drivers(year: int, event: str, session: str):
    """Cache driver data"""
    f1_session = fastf1.get_session(year, event, session)
    f1_session.load(telemetry=False, weather=False, laps=True)
    return sorted(list(set(f1_session.laps['Driver'])))

@app.get("/api/drivers/{year}/{event}/{session}")
async def get_drivers(year:int, event:str, session:str):
    try:
        logger.info(f"Fetching drivers for {year} {event} {session}")
        driver_list = get_cached_drivers(year, event, session)
        return {"drivers": driver_list}
    except Exception as e:
        logger.error(f"Error fetching drivers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@lru_cache(maxsize=512)
def get_cached_driver_details(year: int, event: str, session: str):
    """Cache driver details data"""
    import numpy as np
    
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

@app.get("/api/drivers/details/{year}/{event}/{session}")
async def get_drivers_details(year: int, event: str, session: str):
    try:
        logger.info(f"Fetching driver details for {year} {event} {session}")
        drivers_info = get_cached_driver_details(year, event, session)
        return {"drivers": drivers_info}
    except Exception as e:
        logger.error(f"Error fetching driver details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/telemetry/{year}/{event}/{session}/{driver}")
async def get_telemetry_data(year: int, event: str, session: str, driver: str):
    try:
        logger.info(f"Fetching telemetry for {year} {event} {session} {driver}")
        f1_session = fastf1.get_session(year, event, session)
        f1_session.load()

        driver_lap = f1_session.laps.pick_drivers(driver.upper()).pick_fastest()
        car_data = driver_lap.get_telemetry().add_distance()

        # Limit telemetry data to prevent large payloads
        telemetry_data = car_data[['Time', 'Speed', 'Throttle', 'Brake', 'Distance']].to_dict('records')[:200]
        
        return {
            "driver": driver,
            "session": f"{year} {event} {session}",
            "lap_time": str(driver_lap['LapTime']),
            "telemetry": telemetry_data
        }
    except Exception as e:
        logger.error(f"Error fetching telemetry: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch data: {str(e)}")

@lru_cache(maxsize=128)
def get_cached_race_standings(year: int, event: str, session: str):
    """Cache race standings data"""
    f1_session = fastf1.get_session(year, event, session)
    f1_session.load()
    return f1_session.results.loc[:, ['Abbreviation', 'TeamName', 'ClassifiedPosition', 'Points']].to_dict('records')

@app.get("/api/races/{year}/{event}/{session}")
async def get_race_standings(year:int, event:str, session:str):
    try:
        logger.info(f"Fetching race standings for {year} {event} {session}")
        standings = get_cached_race_standings(year, event, session)
        return standings
    except Exception as e:
        logger.error(f"Error fetching race standings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@lru_cache(maxsize=64)
def get_cached_driver_standings(year: int):
    """Cache driver championship standings"""
    schedule = fastf1.get_event_schedule(year)
    final_round = schedule['RoundNumber'].max()
    final_race = fastf1.get_session(year, final_round, 'R')
    final_race.load()

    standings = final_race.results[['Abbreviation', 'TeamName', 'Points']].copy()
    return standings.sort_values('Points', ascending=False).reset_index(drop=True).to_dict('records')

@app.get("/api/seasons/driver/{year}")
async def get_season_driver_standings(year:int):
    try:
        logger.info(f"Fetching driver standings for {year}")
        standings = get_cached_driver_standings(year)
        return standings
    except Exception as e:
        logger.error(f"Error fetching driver standings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@lru_cache(maxsize=64)
def get_cached_constructor_standings(year: int):
    """Cache constructor championship standings"""
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

@app.get("/api/seasons/constructor/{year}")
async def get_season_constructor_standings(year:int):
    try:
        logger.info(f"Fetching constructor standings for {year}")
        constructors = get_cached_constructor_standings(year)
        return constructors
    except Exception as e:
        logger.error(f"Error fetching constructor standings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
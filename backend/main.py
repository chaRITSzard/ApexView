from fastapi import FastAPI
import asyncio
import fastf1
import pandas as pd
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], #only for dev purpose, can;t allow when published
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/api/sessions/{year}/{event}")
async def get_sessions(year:int, event:str):
    try:
        session_types = ["FP1", "FP2", "FP3", "Q", "R"]
        available_sessions = []
        for s_type in session_types:
            try:
                s = fastf1.get_session(year, event, s_type)
                s.load(telemetry=False, weather=False, laps=False)
                available_sessions.append(str(s_type))
            except Exception:
                continue
        clean_sessions = [str(session) for session in available_sessions]
        return {"Sessions": clean_sessions}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/drivers/{year}/{event}/{session}")
async def get_drivers(year:int, event:str, session:str):
    try:
        f1_session = fastf1.get_session(year, event, session)
        f1_session.load(telemetry=False, weather=False, laps=True)
        driver_list = sorted(list(set(f1_session.laps['Driver'])))
        driver_name = sorted(list(set(f1_session.laps['Driver'])))
        return {"drivers": driver_list}
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/telemetry/{year}/{event}/{session}/{driver}")
async def get_telemetry_data(year: int, event: str, session: str, driver: str):
    try:
        f1_session = fastf1.get_session(year, event, session)
        f1_session.load()

        driver_lap = f1_session.laps.pick_drivers(driver.upper()).pick_fastest()
        car_data = driver_lap.get_telemetry().add_distance()

        telemetry_data = car_data[['Time', 'Speed', 'Throttle', 'Brake', 'Distance']].to_dict('records')
        return {
            "driver": driver,
            "session": f"{year} {event} {session}",
            "lap_time": str(driver_lap['LapTime']),
            "telemetry": telemetry_data[:100]
        }
    except Exception as e:
        return {"error": f"Failed to fetch data: {str(e)}"}
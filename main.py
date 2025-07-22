import fastf1

session = fastf1.get_session(2025, 'Silverstone', 4)
session.load(telemetry=False, laps=False, weather=False)
ver = session.get_driver('VER')
print(ver['Position'])
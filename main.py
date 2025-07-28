import fastf1
from matplotlib import pyplot as plt
import fastf1.plotting

fastf1.plotting.setup_mpl()

session = fastf1.get_session(2025, 'Silverstone', 'R')
session.load()

fast_verstppen = session.laps.pick_drivers('LEC').pick_fastest()
fast_leclerc = session.laps.pick_drivers('VER').pick_fastest()

ver_pos = fast_verstppen.get_pos_data()
lec_pos = fast_leclerc.get_pos_data()

fig, axs = plt.subplots(1, 2, figsize=(12, 6))
axs[0].plot(ver_pos['X'], ver_pos['Y'], color='blue')
axs[0].set_title('Verstappen')
axs[0].axis('equal')
axs[1].plot(lec_pos['X'], lec_pos['Y'], color='red')
axs[1].set_title('Leclerc')
axs[1].axis('equal')
plt.show()
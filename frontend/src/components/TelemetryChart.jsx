import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
    LineElement,
    CategoryScale,
    LinearScale,
    PointElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';


ChartJS.register(
    CategoryScale,
    LinearScale,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend
);
export default function TelemetryChart({ telemetry }) {
  if (!telemetry || telemetry.length === 0) return <p>No data yet...</p>;

  const data = {
    labels: telemetry.map(pt => pt.Time),
    datasets: [
      {
        label: 'Speed (kph)',
        data: telemetry.map(pt => pt.Speed),
        borderColor: '#8000ff',
        backgroundColor: 'rgba(128,0,255,0.1)',
        pointRadius: 0,
        yAxisID: 'y',
      },
      {
        label: 'Throttle(%)',
        data: telemetry.map(pt => pt.Throttle),
        borderColor: '#23FF5D',
        backgroundColor: 'rgba(35,255,93,0.1)',
        borderDash: [5,5],
        pointRadius: 0,
        yAxisID: 'y2',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: { legend: { display: true } },
    scales: {
      x: { title: { display: true, text: 'Time (s)' } },
      y: { title: { display: true, text: 'Speed (kph)' } },
      y2: {position: 'right',
        title: {display:true, text: 'Throttle(%)'},
        min:0,
        max:100,
        grid: { drawOnChartArea: false}
      }
    }
  };

  return (
    <div className="p-4 bg-black rounded-md">
      <Line data={data} options={options} key={'abc3453'} />
    </div>
  );
}

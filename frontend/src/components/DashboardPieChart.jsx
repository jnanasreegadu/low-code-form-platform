import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

import { Doughnut } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
);

function DashboardPieChart({ published, draft }) {

  const data = {
    labels: ["Published", "Draft"],

    datasets: [
      {
        data: [published, draft],

        backgroundColor: [
          "#00D4FF",
          "#64748B",
        ],

        borderColor: "#162532",
        borderWidth: 3,
        hoverOffset: 8,
        borderRadius: 8,
      },
    ],
  };

  const options = {
    responsive: true,

    maintainAspectRatio: false,

    plugins: {
      legend: {
        position: "bottom",

        labels: {
          color: "#D8F3FF",

          font: {
            size: 13,
            weight: "bold",
          },

          padding: 12,
        },
      },

      tooltip: {
        enabled: true,
      },
    },
  };

  return (
    <div className="dashboard-pie-chart">

      <h2>Form Distribution</h2>

      <div className="doughnut-wrapper">
      <Doughnut
        data={data}
        options={options}
        width={280}
        height={280}
        cutout="72%"
      />
      </div>

    </div>
  );
}

export default DashboardPieChart;
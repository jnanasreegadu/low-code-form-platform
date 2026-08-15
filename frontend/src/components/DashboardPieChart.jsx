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
  
  function DashboardPieChart({
    published,
    draft,
  }) {
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
      
            hoverOffset: 12,
      
            borderRadius: 8,
          },
        ],
      };
  
      const options = {
        responsive: true,
      
        plugins: {
          legend: {
            position: "bottom",
      
            labels: {
              color: "#D8F3FF",
      
              font: {
                size: 13,
                weight: "bold",
              },
      
              padding: 20,
            },
          },
        },
      };
  
    return (
      <div className="chart-card">
        <h2>Form Distribution</h2>
  
        <Doughnut
          data={data}
          options={options}
          width={220}
          height={220}
          cutout="72%"
        />
      </div>
    );
  }
  
  export default DashboardPieChart;
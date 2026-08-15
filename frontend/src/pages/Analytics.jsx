import { useEffect, useState } from "react";
import api from "../services/api";
import "./Analytics.css";

function Analytics() {

  const [forms, setForms] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState("");
  const [showFormDropdown, setShowFormDropdown] = useState(false);

  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState("");
  const [trend, setTrend] = useState([]);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState("");
  const [viewMode, setViewMode] = useState("overall");


  // ==========================================================
  // LOAD FORMS
  // ==========================================================
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
  
    return new Date(year, month + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (date) => {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      1
    ).getDay();
  };
  
  const formatDate = (year, month, day) => {
  
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
  
    return `${year}-${m}-${d}`;
  };
  
  const previousMonth = () => {
  
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() - 1,
        1
      )
    );
  
  };
  
  const nextMonth = () => {
  
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        1
      )
    );
  
  };
  useEffect(() => {

    api.get("forms/")
      .then((res) => {

        console.log("FORMS:", res.data);

        setForms(res.data);

        if (res.data.length > 0) {
          setSelectedFormId(res.data[0].id);
        }

      })
      .catch((err) => {

        console.log("FORMS ERROR:", err);

        setError("Failed to load forms");

      });

  }, []);


  // ==========================================================
  // LOAD ANALYTICS
  // ==========================================================

  useEffect(() => {

    if (!selectedFormId) {
      return;
    }

    setAnalytics(null);
    setError("");

    let url = `forms/${selectedFormId}/analytics/`;

    // Date-wise analytics
    if (viewMode === "date" && selectedDate) {
      url += `?date=${selectedDate}`;
    }
    api.get(`forms/${selectedFormId}/analytics/trend/`)
      .then((res) => {
        console.log("TREND:", res.data);
        setTrend(res.data.trend || []);
      })
      .catch((err) => {
        console.log("TREND ERROR:", err);
      });

    api.get(url)

      .then((res) => {

        console.log("ANALYTICS:", res.data);

        setAnalytics(res.data);

      })

      .catch((err) => {

        console.log("ANALYTICS ERROR:", err);
        console.log(err.response?.data);

        setError(
          err.response?.data?.error ||
          "Failed to load analytics"
        );

      });

  }, [
    selectedFormId,
    viewMode,
    selectedDate
  ]);


  // ==========================================================
  // ERROR
  // ==========================================================

  if (error) {
    return (
      <div className="analytics-message">
        {error}
      </div>
    );
  }
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysInMonth =
    getDaysInMonth(currentMonth);

  const firstDay =
    getFirstDayOfMonth(currentMonth);

  const monthName =
    currentMonth.toLocaleString("default", {
      month: "long"
    });


  // ==========================================================
  // UI
  // ==========================================================

  return (
    
    <div className="analytics-page">

      <h1 className="analytics-title">
        Response Analytics
      </h1>


      {/* ======================================================
          FORM SELECTOR
          ====================================================== */}

      <div className="form-selector">

        <label>
          Select Form:
        </label>

        <div className="custom-select">

          <button
            className="custom-select-button"
            onClick={() =>
              setShowFormDropdown(!showFormDropdown)
            }
          >
            <span>
              {forms.find(
                (form) => String(form.id) === String(selectedFormId)
              )?.title || "Select Form"}
            </span>

            <span className="select-arrow">
              {showFormDropdown ? "⌃" : "⌄"}
            </span>
          </button>

          {showFormDropdown && (
            <div className="custom-select-menu">

              {forms.map((form) => (
                <div
                  key={form.id}
                  className={`custom-select-option ${
                    String(form.id) === String(selectedFormId)
                      ? "selected"
                      : ""
                  }`}
                  onClick={() => {
                    setSelectedFormId(form.id);
                    setShowFormDropdown(false);
                  }}
                >
                  {form.title}
                </div>
              ))}

            </div>
          )}

</div>

      </div>


      {/* ======================================================
          OVERALL / DATE-WISE
          ====================================================== */}

      <div className="analytics-tabs">

        <button
          className={
            viewMode === "overall"
              ? "analytics-tab active"
              : "analytics-tab"
          }
          onClick={() => {
            setViewMode("overall");
          }}
        >
          Overall Analytics
        </button>


        <button
          className={
            viewMode === "date"
              ? "analytics-tab active"
              : "analytics-tab"
          }
          onClick={() => {
            setViewMode("date");

            if (!selectedDate) {

              const today =
                new Date()
                  .toISOString()
                  .split("T")[0];

              setSelectedDate(today);
            }
          }}
        >
          Date-wise Analytics
        </button>

      </div>


      {/* ======================================================
          DATE PICKER
          ====================================================== */}

      {viewMode === "date" && (

        <div className="date-selector">

          <label>
            Select Date
          </label>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
            }}
          />

        </div>

      )}


      {/* ======================================================
          LOADING
          ====================================================== */}

      {!analytics && (

        <div className="analytics-message">
          Loading Analytics...
        </div>

      )}


      {analytics && (

        <>

          {/* ==================================================
              SELECTED FORM
              ================================================== */}

          <h2 className="selected-form">
            {analytics.form_name}
          </h2>


          {viewMode === "date" && (

            <p className="selected-date">

              Analytics for:
              <strong> {selectedDate}</strong>

            </p>

          )}
          <div className="analytics-top-grid">

            {/* Response Trend */}
            <div className="trend-card">
              <h3>Response Trend</h3>

              <div className="trend-chart">

  {trend.length === 0 ? (
    <p className="no-trend">
      No submissions yet
    </p>
  ) : (
    trend.map((item) => {

      const maxCount = Math.max(
        ...trend.map((t) => t.count),
        1
      );

      const height =
        (item.count / maxCount) * 180;

      return (
        <div
          className="trend-column"
          key={item.date}
        >

          <span className="trend-count">
            {item.count}
          </span>

          <div
            className="trend-bar"
            style={{
              height: `${Math.max(height, 8)}px`
            }}
          />

          <span className="trend-date">
            {item.date.slice(5)}
          </span>

        </div>
      );
    })
  )}

</div>
            </div>


            {/* Calendar */}
            <div className="calendar-card">

              <div className="calendar-header">

                <button onClick={previousMonth}>
                  ‹
                </button>

                <h3>
                  {monthName}, {year}
                </h3>

                <button onClick={nextMonth}>
                  ›
                </button>

              </div>

              <div className="calendar-weekdays">
                {[
                  "Sun",
                  "Mon",
                  "Tue",
                  "Wed",
                  "Thu",
                  "Fri",
                  "Sat"
                ].map((day) => (
                  <span key={day}>
                    {day}
                  </span>
                ))}
              </div>

              <div className="calendar-grid">

                {Array.from({
                  length: firstDay
                }).map((_, index) => (
                  <div
                    key={`empty-${index}`}
                    className="calendar-empty"
                  />
                ))}

                {Array.from({
                  length: daysInMonth
                }).map((_, index) => {

                  const day = index + 1;

                  const date = formatDate(
                    year,
                    month,
                    day
                  );

                  return (
                    <button
                      key={day}
                      className={
                        selectedDate === date
                          ? "calendar-day selected"
                          : "calendar-day"
                      }
                      onClick={() => {
                        setSelectedDate(date);
                        setViewMode("date");
                      }}
                    >
                      {day}
                    </button>
                  );

                })}

              </div>

            </div>

            </div>


          {/* ==================================================
              ANALYTICS CARDS
              ================================================== */}

          <div className="analytics-cards">


            {/* TOTAL STARTED */}

            <div className="analytics-card">

              <h3>
                Total Started
              </h3>

              <p>
                {analytics.total_started}
              </p>

            </div>


            {/* TOTAL SUBMISSIONS */}

            <div className="analytics-card">

              <h3>
                Total Submissions
              </h3>

              <p>
                {analytics.total_submissions}
              </p>

            </div>


            {/* COMPLETION RATE */}

            <div className="analytics-card">

              <h3>
                Completion Rate
              </h3>

              <p>
                {analytics.completion_rate}%
              </p>

            </div>


            {/* AVERAGE TIME */}

            <div className="analytics-card">

              <h3>
                Average Time
              </h3>

              <p>
                {analytics.average_time_to_complete}
                {" "}sec
              </p>

            </div>

          </div>


          {/* ==================================================
              FIELD DISTRIBUTION
              ================================================== */}

          <div className="distribution-section">

            <h2>
              Per-Field Distribution
            </h2>


            {Object.entries(
              analytics.field_distribution || {}
            ).map(([field, answers]) => (

              <div
                className="field-card"
                key={field}
              >

                <h3>
                  {field}
                </h3>


                {Object.entries(answers).map(
                  ([answer, count]) => (

                    <div
                      className="answer-row"
                      key={answer}
                    >

                      <span>
                        {answer}
                      </span>

                      <span className="answer-count">
                        {count}
                      </span>

                    </div>

                  )
                )}

              </div>

            ))}


            {Object.keys(
              analytics.field_distribution || {}
            ).length === 0 && (

              <p className="no-data">
                No response data available for
                this selection.
              </p>

            )}

          </div>

        </>

      )}

    </div>

  );
}

export default Analytics;
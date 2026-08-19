import { useEffect, useState } from "react";
import api from "../services/api";
import "../styles/Responses.css";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download } from "lucide-react";

function Responses() {
  const navigate = useNavigate();
  const [responses, setResponses] = useState([]);
  const [forms, setForms] = useState([]);
  const [versions, setVersions] = useState([]);

  const [selectedForm, setSelectedForm] = useState("");
  const [selectedVersion, setSelectedVersion] = useState("");

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [submittedFrom, setSubmittedFrom] = useState("");
  const [submittedTo, setSubmittedTo] = useState("");
  const [status, setStatus] = useState("");
  const [fieldName, setFieldName] = useState("");
  const [fieldValue, setFieldValue] = useState("");
  const [formDropdownOpen, setFormDropdownOpen] = useState(false);
  const [versionDropdownOpen, setVersionDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  useEffect(() => {

    api
      .get("submissions/responses/")
      .then((response) => {
        setResponses(response.data.results);
      })
      .catch((err) => console.log(err));
  
    api
      .get("forms/")
      .then((response) => {
        setForms(response.data);
      })
      .catch((err) => console.log(err));
  
  }, []);
  const handleFormChange = async (formId) => {

    setSelectedForm(formId);
    setSelectedVersion("");
    setVersions([]);
    setFormDropdownOpen(false);
  
    if (!formId) return;
  
    try {
  
      const response = await api.get(
        `forms/${formId}/versions/`
      );
  
      setVersions(response.data);
  
    } catch (err) {
  
      console.log(err);
  
    }
  };
  const searchResponses = async () => {

    try {
  
      setSearchLoading(true);
  
      const response = await api.get(
        `submissions/responses/?search=${encodeURIComponent(search)}`
      );
  
      setResponses(response.data.results);
  
    } catch (err) {
  
      console.log(err);
      alert("Search failed");
  
    } finally {
  
      setSearchLoading(false);
  
    }
  };
  const filterResponses = async () => {

    try {
  
      setSearchLoading(true);
  
      const params = [];
  
      if (submittedFrom) {
        params.push(
          `submitted_from=${submittedFrom}`
        );
      }
  
      if (submittedTo) {
        params.push(
          `submitted_to=${submittedTo}`
        );
      }
  
      if (status) {
        params.push(
          `status=${status}`
        );
      }
  
      if (fieldName && fieldValue) {
        params.push(
          `field=${encodeURIComponent(fieldName)}`
        );
  
        params.push(
          `value=${encodeURIComponent(fieldValue)}`
        );
      }
  
      const response = await api.get(
        `submissions/responses/?${params.join("&")}`
      );
  
      setResponses(
        response.data.results
      );
  
    } catch (err) {
  
      console.log(err);
      alert("Filter failed");
  
    } finally {
  
      setSearchLoading(false);
  
    }
  };
  const exportResponses = async (format) => {

    if (!selectedVersion) {
      alert("Please select a form version");
      return;
    }
  
    try {
  
      setLoading(true);
  
      const response = await api.get(
        `submissions/export/?form_version=${selectedVersion}&export=${format}`,
        {
          responseType: "blob"
        }
      );
  
      const blob = new Blob(
        [response.data],
        {
          type:
            format === "csv"
              ? "text/csv"
              : "application/json"
        }
      );
  
      const url = window.URL.createObjectURL(blob);
  
      const link = document.createElement("a");
  
      link.href = url;
  
      link.download =
        format === "csv"
          ? "responses.csv"
          : "responses.json";
  
      document.body.appendChild(link);
  
      link.click();
  
      link.remove();
  
      window.URL.revokeObjectURL(url);
  
    } catch (err) {
  
      console.log(err);
      alert("Export failed");
  
    } finally {
  
      setLoading(false);
  
    }
  };
  return (
    <div className="responses-page">
      <button
  className="back-btn"
  onClick={() => navigate("/")}
>
  <ArrowLeft size={18} />
  Back
</button>
      <h1>Form Responses</h1>
      <div className="export-section">

  <h2>Export Responses</h2>
 
  <div className="export-controls">
     
  <div className="export-field">
  <label>Form</label>

  <div className="custom-dropdown">

  <button
    type="button"
    className={`custom-dropdown-button ${
      formDropdownOpen ? "open" : ""
    }`}
    onClick={() =>
      setFormDropdownOpen(!formDropdownOpen)
    }
  >
    <span>
      {selectedForm
        ? forms.find(
            (form) => String(form.id) === String(selectedForm)
          )?.title
        : "Select Form"}
    </span>

    <span className="dropdown-arrow">
      {formDropdownOpen ? "⌃" : "⌄"}
    </span>
  </button>

  {formDropdownOpen && (
    <div className="custom-dropdown-menu">

      <div
        className={`custom-dropdown-option ${
          !selectedForm ? "selected" : ""
        }`}
        onClick={() => handleFormChange("")}
      >
        Select Form
      </div>

      {forms.map((form) => (
        <div
          key={form.id}
          className={`custom-dropdown-option ${
            String(selectedForm) === String(form.id)
              ? "selected"
              : ""
          }`}
          onClick={() =>
            handleFormChange(form.id)
          }
        >
          {form.title}
        </div>
      ))}

    </div>
  )}

</div>
</div>
<div className="export-field">
  <label>Form Version</label>

  <div className="custom-dropdown">

    <button
      type="button"
      className={`custom-dropdown-button ${
        versionDropdownOpen ? "open" : ""
      }`}
      onClick={() => {
        if (selectedForm) {
          setVersionDropdownOpen(!versionDropdownOpen);
        }
      }}
      disabled={!selectedForm}
    >
      <span>
        {selectedVersion
          ? (() => {
              const version = versions.find(
                (v) =>
                  String(v.id) === String(selectedVersion)
              );

              return version
                ? `Version ${version.version}${
                    version.is_published
                      ? " (Published)"
                      : ""
                  }`
                : "Select Version";
            })()
          : "Select Version"}
      </span>

      <span className="dropdown-arrow">
        {versionDropdownOpen ? "⌃" : "⌄"}
      </span>
    </button>

    {versionDropdownOpen && (
      <div className="custom-dropdown-menu">

        <div
          className={`custom-dropdown-option ${
            !selectedVersion ? "selected" : ""
          }`}
          onClick={() => {
            setSelectedVersion("");
            setVersionDropdownOpen(false);
          }}
        >
          Select Version
        </div>

        {versions.map((version) => (
          <div
            key={version.id}
            className={`custom-dropdown-option ${
              String(selectedVersion) ===
              String(version.id)
                ? "selected"
                : ""
            }`}
            onClick={() => {
              setSelectedVersion(version.id);
              setVersionDropdownOpen(false);
            }}
          >
            Version {version.version}
            {version.is_published
              ? " (Published)"
              : ""}
          </div>
        ))}

      </div>
    )}

  </div>
</div>

    <button
      className="export-btn csv-btn"
      onClick={() =>
        exportResponses("csv")
      }
      disabled={!selectedVersion || loading}
    >
      <Download size={17} />
      Export CSV
    </button>

    <button
      className="export-btn json-btn"
      onClick={() =>
        exportResponses("json")
      }
      disabled={!selectedVersion || loading}
    >
      <Download size={17} />
      Export JSON
    </button>

  </div>

</div>
  <div className="response-search-section">

  <h2>Search Responses</h2>

  <div className="response-search-controls">

    <input
      type="text"
      placeholder="Search by Response ID, name, email..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />

    <button
      onClick={searchResponses}
      disabled={searchLoading}
    >
      {searchLoading ? "Searching..." : "Search"}
    </button>

    <button
      onClick={() => {
        setSearch("");

        api
          .get("submissions/responses/")
          .then((response) => {
            setResponses(response.data.results);
          })
          .catch((err) => console.log(err));
      }}
    >
      Clear
    </button>

  </div>


  {/* DATE FILTER */}

  <div className="date-filter-controls">

    <div className="date-filter-field">

      <label>Submitted From</label>

      <input
        type="date"
        value={submittedFrom}
        onChange={(e) =>
          setSubmittedFrom(e.target.value)
        }
      />

    </div>


    <div className="date-filter-field">

      <label>Submitted To</label>

      <input
        type="date"
        value={submittedTo}
        onChange={(e) =>
          setSubmittedTo(e.target.value)
        }
      />

    </div>
    <div className="date-filter-field">

      <label>Field Name</label>

      <input
        type="text"
        placeholder="e.g. Department"
        value={fieldName}
        onChange={(e) =>
          setFieldName(e.target.value)
        }
      />

    </div>


  <div className="date-filter-field">

    <label>Field Value</label>

    <input
      type="text"
      placeholder="e.g. IT"
      value={fieldValue}
      onChange={(e) =>
        setFieldValue(e.target.value)
      }
    />

  </div>
  <div className="date-filter-field">

<label>Status</label>

<div className="custom-dropdown status-dropdown">

  <button
    type="button"
    className={`custom-dropdown-button ${
      statusDropdownOpen ? "open" : ""
    }`}
    onClick={() =>
      setStatusDropdownOpen(!statusDropdownOpen)
    }
  >
    <span>
      {status === ""
        ? "All Status"
        : status === "completed"
        ? "Completed"
        : "In Progress"}
    </span>

    <span className="dropdown-arrow">
      {statusDropdownOpen ? "⌃" : "⌄"}
    </span>
  </button>

  {statusDropdownOpen && (
    <div className="custom-dropdown-menu">

      <div
        className={`custom-dropdown-option ${
          status === "" ? "selected" : ""
        }`}
        onClick={() => {
          setStatus("");
          setStatusDropdownOpen(false);
        }}
      >
        All Status
      </div>

      <div
        className={`custom-dropdown-option ${
          status === "completed"
            ? "selected"
            : ""
        }`}
        onClick={() => {
          setStatus("completed");
          setStatusDropdownOpen(false);
        }}
      >
        Completed
      </div>

      <div
        className={`custom-dropdown-option ${
          status === "in_progress"
            ? "selected"
            : ""
        }`}
        onClick={() => {
          setStatus("in_progress");
          setStatusDropdownOpen(false);
        }}
      >
        In Progress
      </div>

    </div>
  )}

</div>

</div>
    <button
    className="date-filter-btn"
    onClick={filterResponses}
    disabled={
      !submittedFrom &&
      !submittedTo &&
      !status
    }
  >
    Apply Filters
  </button>


    

  </div>

</div>

      {responses.length === 0 ? (
        <h3>No Responses Yet</h3>
      ) : (
        responses.map((item) => (
          <div
            className="response-card"
            key={item.submission_id}
          >
            <h3>
              Submission #{item.submission_id}
            </h3>

            <p>
              <strong>Version :</strong>{" "}
              {item.form_version}
            </p>

            <p>
              <strong>Submitted :</strong>{" "}
              {item.submitted_at}
            </p>

            <table>
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Answer</th>
                </tr>
              </thead>

              <tbody>
                {item.responses.map((res, index) => (
                  <tr key={index}>
                    <td>{res.field}</td>

                    <td>
                      {res.file_url ? (
                        <a
                          href={res.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {res.value}
                        </a>
                      ) : (
                        res.value
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}

export default Responses;
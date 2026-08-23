import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import "../styles/PublicForm.css";
import IdentitySelector from "../components/IdentitySelector";


function PublicForm() {

  const { uuid } = useParams();
  const [respondentEmail, setRespondentEmail] = useState(null);
  const [respondentVerified, setRespondentVerified] = useState(false);

  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState({});
  const [rules, setRules] = useState([]);
  const [startedAt, setStartedAt] = useState(null);
  const [submissionId, setSubmissionId] = useState(null);
  const [emailSent, setEmailSent] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [formExpired, setFormExpired] = useState(false);
  // NEW
  const [submitted, setSubmitted] = useState(false);
  const [formScheduled, setFormScheduled] = useState(false);
  const [scheduledMessage, setScheduledMessage] = useState("");

const pollIntervalRef = useRef(null);

  const startCalled = useRef(false);

  const handleChange = (fieldId, value) => {
    setResponses((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const isFieldHidden = (fieldId) => {

    const fieldRules = rules.filter((rule) => {

      const targetId =
        rule.target_field ??
        rule.target_field_id ??
        rule.targetField;

      return Number(targetId) === Number(fieldId);
    });

    if (fieldRules.length === 0) {
      return false;
    }

    for (const rule of fieldRules) {

      const sourceId =
        rule.source_field ??
        rule.source_field_id ??
        rule.sourceField;

      const sourceValue = responses[sourceId];

      const actualValue = String(
        sourceValue ?? ""
      ).trim().toLowerCase();

      const expectedValue = String(
        rule.expected_value ??
        rule.expectedValue ??
        ""
      ).trim().toLowerCase();

      const operator = rule.operator;

      let conditionMet = false;

      if (operator === "equals") {
        conditionMet = actualValue === expectedValue;
      }

      else if (operator === "not_equals") {
        conditionMet = actualValue !== expectedValue;
      }

      else if (operator === "contains") {
        conditionMet = actualValue.includes(expectedValue);
      }

      else if (operator === "is_empty") {
        conditionMet = actualValue === "";
      }

      else if (operator === "greater_than") {
        conditionMet =
          Number(actualValue) > Number(expectedValue);
      }

      else if (operator === "less_than") {
        conditionMet =
          Number(actualValue) < Number(expectedValue);
      }

      const action = rule.action;

      if (action === "show") {
        return !conditionMet;
      }

      if (action === "hide") {
        return conditionMet;
      }
    }

    return false;
  };


  // ==========================================================
  // SUBMIT FORM
  // ==========================================================

  const handleSubmit = async () => {

    if (!submissionId) {
      alert("Submission not started. Please refresh the form.");
      return;
    }

    setSubmitError("");

    const formData = new FormData();

    const responseData = Object.keys(responses).map((id) => ({
      field_id: Number(id),
      value:
        responses[id] instanceof File
          ? ""
          : responses[id],
    }));

    formData.append(
      "responses",
      JSON.stringify(responseData)
    );

    formData.append(
      "submission_id",
      submissionId
    );

    // File uploads
    Object.keys(responses).forEach((id) => {

      if (responses[id] instanceof File) {

        formData.append(
          id,
          responses[id]
        );

      }

    });

    try {

      const res = await api.post(
        `submissions/${uuid}/submit/`,
        formData
      );

      setEmailSent(
        res.data?.email_sent ?? null
      );

      // Instead of alert
      setSubmitted(true);

    } catch (err) {

      console.log(err);
      console.log(err.response?.data);

      setSubmitError(
        err.response?.data?.error ||
        "Submission Failed"
      );
    }
  };

  // ==========================================================
  // LOAD FORM
  // ==========================================================

  useEffect(() => {

    api.get(`public/${uuid}/`)
      .then((res) => {

        console.log(
          "PUBLIC FORM:",
          res.data
        );

        setForm(res.data);

        setRules(
          res.data.rules ||
          res.data.conditional_rules ||
          []
        );

        if (!startCalled.current) {

          startCalled.current = true;

          api.post(`public/${uuid}/start/`)
            .then((startRes) => {

              console.log(
                "SUBMISSION STARTED:",
                startRes.data
              );

              setSubmissionId(
                startRes.data.submission_id
              );

              setStartedAt(
                startRes.data.started_at
              );

            })
            .catch((err) => {

              console.log(
                "START SUBMISSION ERROR:",
                err
              );

            });

        }

      })
      .catch((err) => {

        console.log("PUBLIC FORM ERROR:", err);
        console.log("SERVER RESPONSE:", err.response?.data);
      
        if (err.response?.status === 410) {
          setFormExpired(true);
          return;
        }
      
        alert(
          err.response?.data?.error ||
          "Failed to load form."
        );
      
      });

  }, [uuid]);


  // ==========================================================
  // DOWNLOAD / PRINT PDF
  // ==========================================================

  const downloadPDF = () => {

    window.print();

  };

  if (formExpired) {
    return (
      <div className="expired-page">
  
        <div className="expired-card">
  
          <div className="expired-icon">
            ⏳
          </div>
  
          <h1>Form Expired</h1>
  
          <p>
            This form is no longer available.
          </p>
  
          <p className="expired-subtext">
            The form has expired and is no longer
            accepting responses.
          </p>
  
        </div>
  
      </div>
    );
  }
  if (formScheduled) {
    return (
      <div className="expired-page">
        <div className="expired-card">
          <div className="expired-icon">
            ⏳
          </div>
  
          <h1>Form Not Yet Available</h1>
  
          <p>{scheduledMessage}</p>
  
          <p className="expired-subtext">
            This page will update automatically once the form opens.
          </p>
        </div>
      </div>
    );
  }
  
  if (!form) {
    return <h2>Loading...</h2>;
  }



  // ==========================================================
  // RESPONSE PREVIEW
  // ==========================================================

  if (submitted) {

    return (

      <div className="public-page">

        <div className="success-header">

          <div className="success-icon">
            ✓
          </div>

          <h1>
            Form Submitted Successfully!
          </h1>

          <p>
            Your response has been recorded successfully.
          </p>

          <div className="response-id">
            Response ID:{" "}
            <strong>
              RESP-{submissionId}
            </strong>
          </div>

          {emailSent === true && (
            <div className="email-status-note email-sent">
              📧 Confirmation email sent to your email address.
            </div>
          )}

          {emailSent === false && (
            <div className="email-status-note email-failed">
              ⚠️ Your response was submitted successfully, but
              we could not send the confirmation email.
            </div>
          )}

        </div>


        <div
          className="response-preview"
          id="response-preview"
        >

          <div className="preview-title">

            <h2>
              {form.form_name}
            </h2>

            <p>
              Submitted Response
            </p>

          </div>


          {form.fields.map((field) => {

            if (isFieldHidden(field.id)) {
              return null;
            }

            const value =
              responses[field.id];


            return (

              <div
                className="response-row"
                key={field.id}
              >

                <div className="response-label">
                  {field.label}
                </div>


                <div className="response-value">

                  {value instanceof File ? (

                    <span>
                      📎 {value.name}
                    </span>

                  ) : field.field_type === "checkbox" ? (

                    value
                      ? "Yes"
                      : "No"

                  ) : (

                    value || "—"

                  )}

                </div>

              </div>

            );

          })}


          <div className="preview-footer">

            <span>
              Version {form.version}
            </span>

            {startedAt && (
              <span>
                Submitted successfully
              </span>
            )}

          </div>

        </div>


        <div className="preview-actions">

          <button
            className="download-btn"
            onClick={downloadPDF}
          >
            ⬇ Download PDF
          </button>

        </div>

      </div>

    );

  }


  // ==========================================================
  // ORIGINAL FORM
  // ==========================================================

  return (

    <div className="public-page">

      <div className="public-header">

        <h1>
          {form.form_name}
        </h1>

        <p>
          {form.description}
        </p>

        <span>
          Version {form.version}
        </span>

      </div>


      <div className="public-container">

        {submitError && (
          <div className="submit-error-banner">
            ⚠️ {submitError}
          </div>
        )}

        {submissionId && (
          <IdentitySelector
            submissionId={submissionId}
            onVerified={(email) => {
              setRespondentEmail(email);
              setRespondentVerified(true);
            }}
          />
        )}

        {form.fields.map((field) => {

          if (isFieldHidden(field.id)) {
            return null;
          }

          return (

            <div
              className="field-card"
              key={field.id}
            >

              <label>
                {field.label}
              </label>


              {field.field_type === "text" && (

                <input
                  type="text"
                  placeholder={field.placeholder}
                  onChange={(e) =>
                    handleChange(
                      field.id,
                      e.target.value
                    )
                  }
                />

              )}


              {field.field_type === "email" && (

                <input
                  type="email"
                  placeholder={field.placeholder}
                  onChange={(e) =>
                    handleChange(
                      field.id,
                      e.target.value
                    )
                  }
                />

              )}


              {field.field_type === "number" && (

                <input
                  type="number"
                  placeholder={field.placeholder}
                  onChange={(e) =>
                    handleChange(
                      field.id,
                      e.target.value
                    )
                  }
                />

              )}


              {field.field_type === "dropdown" && (

                <select
                  onChange={(e) =>
                    handleChange(
                      field.id,
                      e.target.value
                    )
                  }
                >

                  <option value="">
                    {field.placeholder ||
                      "Select an option"}
                  </option>

                  {field.options
                    ?.filter(
                      (option) => option !== ""
                    )
                    .map((option, index) => (

                      <option
                        key={index}
                        value={option}
                      >
                        {option}
                      </option>

                    ))}

                </select>

              )}


              {field.field_type === "date" && (

                <input
                  type="date"
                  onChange={(e) =>
                    handleChange(
                      field.id,
                      e.target.value
                    )
                  }
                />

              )}


              {(field.field_type === "file" ||
                field.field_type === "file upload") && (

                <input
                  type="file"
                  onChange={(e) =>
                    handleChange(
                      field.id,
                      e.target.files[0]
                    )
                  }
                />

              )}


              {field.field_type === "checkbox" && (

                <div>

                  <input
                    type="checkbox"
                    onChange={(e) =>
                      handleChange(
                        field.id,
                        e.target.checked
                      )
                    }
                  />

                  <span>
                    {" "}
                    Accept Terms
                  </span>

                </div>

              )}

            </div>

          );

        })}


        <button
          className="submit-btn"
          onClick={handleSubmit}
          disabled={!respondentVerified}
        >
          Submit Form
        </button>

      </div>

    </div>

  );

}

export default PublicForm;
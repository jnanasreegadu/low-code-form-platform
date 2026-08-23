import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import "../styles/PublicForm.css";
import IdentitySelector from "../components/IdentitySelector";

function OneTimeForm() {
  const { token } = useParams();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState({});
  const [submissionId, setSubmissionId] = useState(null);
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(null);
  const [respondentVerified, setRespondentVerified] = useState(false);

  // ==========================================================
  // GET ONE-TIME FORM
  // ==========================================================

  useEffect(() => {
    api
      .get(`one-time/${token}/`)
      .then((res) => {
        console.log("ONE TIME FORM:", res.data);
        setForm(res.data);
      })
      .catch((err) => {
        console.log("ONE TIME FORM ERROR:", err);

        setError(
          err.response?.data?.error ||
            "This one-time link is invalid or already used."
        );
      });
  }, [token]);

  // ==========================================================
  // HANDLE CHANGE
  // ==========================================================

  const handleChange = (fieldId, value) => {
    setResponses((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  // ==========================================================
  // CONDITIONAL RULE LOGIC
  // ==========================================================

  const isFieldHidden = (fieldId) => {
    const rules = form?.rules || [];

    const fieldRules = rules.filter((rule) => {
      const targetId =
        rule.target_field ??
        rule.target_field_id ??
        rule.targetField;

      return Number(targetId) === Number(fieldId);
    });

    // No rules → show field
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
      )
        .trim()
        .toLowerCase();

      const expectedValue = String(
        rule.expected_value ??
          rule.expectedValue ??
          ""
      )
        .trim()
        .toLowerCase();

      const operator = rule.operator;

      let conditionMet = false;

      // EQUALS
      if (operator === "equals") {
        conditionMet =
          actualValue === expectedValue;
      }

      // NOT EQUALS
      else if (operator === "not_equals") {
        conditionMet =
          actualValue !== expectedValue;
      }

      // CONTAINS
      else if (operator === "contains") {
        conditionMet =
          actualValue.includes(expectedValue);
      }

      // IS EMPTY
      else if (operator === "is_empty") {
        conditionMet =
          actualValue === "";
      }

      // GREATER THAN
      else if (operator === "greater_than") {
        conditionMet =
          Number(actualValue) >
          Number(expectedValue);
      }

      // LESS THAN
      else if (operator === "less_than") {
        conditionMet =
          Number(actualValue) <
          Number(expectedValue);
      }

      // SHOW RULE
      if (rule.action === "show") {
        return !conditionMet;
      }

      // HIDE RULE
      if (rule.action === "hide") {
        return conditionMet;
      }
    }

    return false;
  };

  // ==========================================================
  // START SUBMISSION
  // ==========================================================

  const startSubmission = async () => {
    try {
      const res = await api.post(
        `one-time/${token}/start/`
      );

      console.log(
        "ONE TIME SUBMISSION:",
        res.data
      );

      setSubmissionId(
        res.data.submission_id
      );
    } catch (err) {
      console.log(err);

      setError(
        err.response?.data?.error ||
          "Unable to start this submission."
      );
    }
  };

  // ==========================================================
  // SUBMIT FORM
  // ==========================================================

  const handleSubmit = async () => {
    if (!submissionId) {
      setError("Submission not started.");
      return;
    }
  
    try {
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
  
      Object.keys(responses).forEach((id) => {
        if (responses[id] instanceof File) {
          formData.append(id, responses[id]);
        }
      });
  
      const res = await api.post(
        `one-time/${token}/submit/`,
        formData
      );

      setEmailSent(
        res.data?.email_sent ?? null
      );
  
      // IMPORTANT
      setSubmitted(true);
  
    } catch (err) {
      console.error("SUBMIT ERROR:", err);
      console.error("SERVER RESPONSE:", err.response?.data);
  
      setError(
        err.response?.data?.error ||
        "Submission failed."
      );
    }
  };

  // ==========================================================
  // ERROR
  // ==========================================================

  if (error) {
    return (
      <div className="public-page">
        <div className="public-container">
          <h2>{error}</h2>
        </div>
      </div>
    );
  }
  if (submitted) {
    return (
      <div className="public-page">
  
        <div className="public-container">
  
          <div className="success-card">
  
            <div className="success-icon">
              ✓
            </div>
  
            <h1>
              Form Submitted Successfully!
            </h1>
  
            <p>
              Your response has been recorded successfully.
            </p>
  
            <div className="one-time-success">
              🔒 This was a one-time submission.
              <br />
              This link cannot be used again.
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
  
        </div>
  
      </div>
    );
  }
  // ==========================================================
  // LOADING
  // ==========================================================

  if (!form) {
    return <h2>Loading...</h2>;
  }

  // ==========================================================
  // UI
  // ==========================================================

  // ==========================================================
// UI
// ==========================================================

return (
    <div className="public-page">
  
      {/* HEADER */}
      <div className="public-header">
  
  
        <h1>{form.form_name}</h1>
  
        <p>{form.description}</p>

  
      </div>
  
      {/* FORM CONTAINER */}
      <div className="public-container">
  
        {/* START BUTTON */}
        {!submissionId && (
          <>
            <div className="one-time-info">
              <strong>🔒 One-Time Submission</strong>
  
              <p>
                Please review your answers carefully before submitting.
                You will not be able to submit this form again using this link.
              </p>
            </div>
  
            <button
              className="submit-btn"
              onClick={startSubmission}
            >
              Start Form
            </button>
          </>
        )}
  
         {/* FORM */}
         {submissionId && (
          <>
            <IdentitySelector
              submissionId={submissionId}
              onVerified={() => setRespondentVerified(true)}
            />

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
  
                  {/* TEXT */}
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
  
                  {/* EMAIL */}
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
  
                  {/* NUMBER */}
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
  
                  {/* DROPDOWN */}
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
                        {field.placeholder || "Select an option"}
                      </option>
  
                      {field.options
                        ?.filter((option) => option !== "")
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
  
                  {/* DATE */}
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
  
                  {/* FILE */}
                  {(field.field_type === "file" ||
                    field.field_type === "file upload") && (
                    <input
                      type="file"
                      onChange={(e) =>
                        handleChange(
                          field.id,
                          e.target.files?.[0] || null
                        )
                      }
                    />
                  )}
  
                  {/* CHECKBOX */}
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
  
                      <span> Accept Terms</span>
                    </div>
                  )}
  
                </div>
              );
            })}
  
            {/* WARNING */}
            <div className="submit-warning">
              ⚠️ This is a one-time submission.
              Please check your answers before submitting.
            </div>
  
            {/* SUBMIT */}
            <button
              className="submit-btn"
              onClick={handleSubmit}
              disabled={!respondentVerified}
            >
              Submit Form
            </button>
  
          </>
        )}
  
      </div>
  
    </div>
  );
}

export default OneTimeForm;
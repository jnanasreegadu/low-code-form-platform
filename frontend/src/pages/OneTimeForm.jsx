import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Globe, Sparkles, Download, AlertTriangle, CheckCircle, Lock, Mail, Paperclip } from "lucide-react";
import api from "../services/api";
import "../styles/PublicForm.css";
import IdentitySelector from "../components/IdentitySelector";
import Loader from "../components/Loader";


function OneTimeForm() {

  const { token } = useParams();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState(null);
  const [displayForm, setDisplayForm] = useState(null);
  const [currentLang, setCurrentLang] = useState("English");
  const [translating, setTranslating] = useState(false);
  const [autofilling, setAutofilling] = useState(false);

  const [responses, setResponses] = useState({});
  const [submissionId, setSubmissionId] = useState(null);
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(null);
  const [respondentVerified, setRespondentVerified] = useState(false);

  const languages = [
    "English",
    "Spanish",
    "French",
    "German",
    "Hindi",
    "Telugu",
    "Tamil",
    "Arabic"
  ];

  const handleLanguageChange = async (targetLang) => {
    setCurrentLang(targetLang);
    if (!form) return;
    if (targetLang === "English") {
      setDisplayForm(form);
      return;
    }
    setTranslating(true);
    try {
      const res = await api.post("ai/translate-form/", {
        target_language: targetLang,
        title: form.form_name,
        description: form.description,
        fields: form.fields,
      });
      setDisplayForm({
        ...form,
        form_name: res.data.title || form.form_name,
        description: res.data.description || form.description,
        fields: res.data.fields || form.fields,
      });
    } catch (err) {
      console.error("Translation error:", err);
      alert("Translation failed. Reverting to original language.");
      setCurrentLang("English");
      setDisplayForm(form);
    } finally {
      setTranslating(false);
    }
  };

  const handleAiAutofill = async () => {
    if (!form?.fields) return;
    setAutofilling(true);
    try {
      const res = await api.post("ai/autofill-form/", {
        fields: form.fields,
      });
      if (res.data?.values) {
        setResponses((prev) => ({
          ...prev,
          ...res.data.values,
        }));
      }
    } catch (err) {
      console.error("AI Autofill error:", err);
      alert("AI Auto-fill failed. Please try again.");
    } finally {
      setAutofilling(false);
    }
  };

  const downloadPDF = () => {
    window.print();
  };

  useEffect(() => {
    api
      .get(`one-time/${token}/`)
      .then((res) => {
        console.log("ONE TIME FORM:", res.data);
        setForm(res.data);
        setDisplayForm(res.data);
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

    setError("");

    // Validate visible required fields & validation rules
    if (form && form.fields) {
      for (const field of form.fields) {
        if (isFieldHidden(field.id)) continue;
        const val = responses[field.id];
        const valStr = val === undefined || val === null ? "" : String(val).trim();
        const fType = (field.type || field.field_type || "").toLowerCase();

        // 1. Required Validation
        if ((field.required || field.is_required) && (!val || valStr === "" || (fType === "checkbox" && val !== true))) {
          setError(`"${field.label || "Field"}" is required.`);
          return;
        }

        // 2. Email Validation
        if (fType === "email" && valStr !== "") {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(valStr)) {
            setError(`Please enter a valid email address for "${field.label}".`);
            return;
          }
        }

        // 3. Min Length Validation
        const minLen = field.min_length ?? field.minLength;
        if (minLen && valStr !== "" && valStr.length < Number(minLen)) {
          setError(`"${field.label}" must be at least ${minLen} characters long.`);
          return;
        }

        // 4. Max Length Validation
        const maxLen = field.max_length ?? field.maxLength;
        if (maxLen && valStr !== "" && valStr.length > Number(maxLen)) {
          setError(`"${field.label}" cannot exceed ${maxLen} characters.`);
          return;
        }

        // 5. Min Value Validation
        const minVal = field.min_value ?? field.minValue;
        if (minVal !== undefined && minVal !== null && minVal !== "" && valStr !== "") {
          if (Number(valStr) < Number(minVal)) {
            setError(`"${field.label}" must be at least ${minVal}.`);
            return;
          }
        }

        // 6. Max Value Validation
        const maxVal = field.max_value ?? field.maxValue;
        if (maxVal !== undefined && maxVal !== null && maxVal !== "" && valStr !== "") {
          if (Number(valStr) > Number(maxVal)) {
            setError(`"${field.label}" cannot exceed ${maxVal}.`);
            return;
          }
        }

        // 7. Min Date Validation
        const minDt = field.min_date ?? field.minDate;
        if (minDt && valStr !== "" && valStr < minDt) {
          setError(`"${field.label}" date cannot be earlier than ${minDt}.`);
          return;
        }

        // 8. Max Date Validation
        const maxDt = field.max_date ?? field.maxDate;
        if (maxDt && valStr !== "" && valStr > maxDt) {
          setError(`"${field.label}" date cannot be later than ${maxDt}.`);
          return;
        }

        // 9. Custom Regex Pattern Validation
        const pat = field.pattern ?? field.regex;
        if (pat && valStr !== "") {
          try {
            const regex = new RegExp(pat);
            if (!regex.test(valStr)) {
              setError(`"${field.label}" format is invalid (pattern: ${pat}).`);
              return;
            }
          } catch (e) {
            console.warn("Invalid regex pattern:", pat);
          }
        }
      }
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
            <div className="success-icon"><CheckCircle size={48} /></div>
            <h1>Form Submitted Successfully!</h1>
            <p>Your response has been recorded successfully.</p>
            <div className="one-time-success">
              <Lock size={15} /> This was a one-time submission.
              <br />
              This link cannot be used again.
            </div>
          </div>

          <div className="response-preview" id="response-preview">
            <div className="preview-title">
              <h2>{form.form_name}</h2>
              <p>Submitted Response Summary</p>
            </div>

            {form.fields.map((field) => {
              if (isFieldHidden(field.id)) return null;
              const value = responses[field.id];

              return (
                <div className="response-row" key={field.id}>
                  <div className="response-label">{field.label}</div>
                  <div className="response-value">
                    {value instanceof File ? (
                      <span><Paperclip size={14} /> {value.name}</span>
                    ) : field.field_type === "checkbox" ? (
                      value ? "Yes" : "No"
                    ) : (
                      value || "—"
                    )}
                  </div>
                </div>
              );
            })}

            <div className="preview-footer">
              <span>One-Time Submission Token</span>
              <span>Submitted successfully</span>
            </div>
          </div>

          <div className="preview-actions">
            <button className="download-btn" onClick={downloadPDF}>
              <Download size={16} /> Download PDF Receipt
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!form) {
    return <Loader text="Loading one-time form..." />;
  }


  const activeForm = displayForm || form;

  return (
    <div className="public-page">
      <div className="public-header">
        <h1>{activeForm.form_name}</h1>
        <p>{activeForm.description}</p>
      </div>

      <div className="public-container">
        {/* RESPONDENT TOOLBAR */}
        <div className="respondent-toolbar">
          <div className="toolbar-group">
            <span className="toolbar-label"><Globe size={15} /> Language:</span>
            <select
              className="lang-select"
              value={currentLang}
              onChange={(e) => handleLanguageChange(e.target.value)}
              disabled={translating}
            >
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
            {translating && <span className="toolbar-banner">Translating form into {currentLang}...</span>}
          </div>

          <div className="toolbar-group">
            <button
              type="button"
              className="ai-autofill-btn"
              onClick={handleAiAutofill}
              disabled={autofilling}
            >
              <Sparkles size={15} /> {autofilling ? "Generating AI Answers..." : "AI Auto-Fill Form"}
            </button>
          </div>
        </div>

        {!submissionId && (
          <>
            <div className="one-time-info">
              <strong><Lock size={15} /> One-Time Submission</strong>
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

        {submissionId && (
          <>
            <IdentitySelector
              submissionId={submissionId}
              onVerified={() => setRespondentVerified(true)}
            />

            {activeForm.fields.map((field) => {
              if (isFieldHidden(field.id)) {
                return null;
              }

              const rawType = (field.field_type || "").toLowerCase();
              const isDropdown = rawType === "dropdown" || rawType === "select" || rawType === "multicheckbox";
              const isEmail = rawType === "email";
              const isNumber = rawType === "number";
              const isDate = rawType === "date";
              const isFile = rawType === "file" || rawType === "file upload" || rawType === "upload";
              const isCheckbox = rawType === "checkbox";
              const isRating = rawType === "rating";

              let optionsList = [];
              if (field.options) {
                if (Array.isArray(field.options)) {
                  optionsList = field.options;
                } else if (typeof field.options === "string") {
                  try {
                    const parsed = JSON.parse(field.options);
                    if (Array.isArray(parsed)) optionsList = parsed;
                  } catch (e) {
                    optionsList = field.options.split(",").map((s) => s.trim());
                  }
                }
              }

              return (
                <div className="field-card" key={field.id}>
                  <label>{field.label}</label>

                  {isEmail && (
                    <input
                      type="email"
                      placeholder={field.placeholder || "example@email.com"}
                      value={responses[field.id] || ""}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                    />
                  )}

                  {isNumber && (
                    <input
                      type="number"
                      placeholder={field.placeholder || "Enter a number"}
                      value={responses[field.id] || ""}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                    />
                  )}

                  {isDropdown && (
                    <select
                      value={responses[field.id] || ""}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                    >
                      <option value="">
                        {field.placeholder || "-- Select an option --"}
                      </option>
                      {optionsList.map((opt, index) => {
                        const val = typeof opt === "object" ? opt.option_text || opt.value || String(opt) : String(opt);
                        return (
                          <option key={index} value={val}>
                            {val}
                          </option>
                        );
                      })}
                    </select>
                  )}

                  {isDate && (
                    <input
                      type="date"
                      value={responses[field.id] || ""}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                    />
                  )}

                  {isFile && (
                    <input
                      type="file"
                      onChange={(e) =>
                        handleChange(field.id, e.target.files?.[0] || null)
                      }
                    />
                  )}

                  {isCheckbox && (
                    <label className="checkbox-row" htmlFor={`onetime-checkbox-${field.id}`}>
                      <input
                        id={`onetime-checkbox-${field.id}`}
                        type="checkbox"
                        checked={!!responses[field.id]}
                        onChange={(e) => handleChange(field.id, e.target.checked)}
                      />
                      <span>{field.placeholder || "Confirm / Accept"}</span>
                    </label>
                  )}


                  {isRating && (
                    <select
                      value={responses[field.id] || ""}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                    >
                      <option value="">Select Rating (1-5)</option>
                      <option value="1">1 - Poor</option>
                      <option value="2">2 - Fair</option>
                      <option value="3">3 - Average</option>
                      <option value="4">4 - Good</option>
                      <option value="5">5 - Excellent</option>
                    </select>
                  )}

                  {!isEmail && !isNumber && !isDropdown && !isDate && !isFile && !isCheckbox && !isRating && (
                    <input
                      type="text"
                      placeholder={field.placeholder || "Enter response"}
                      value={responses[field.id] || ""}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                    />
                  )}
                </div>
              );
            })}


            <div className="submit-warning">
              <AlertTriangle size={15} /> This is a one-time submission.
              Please check your answers before submitting.
            </div>


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
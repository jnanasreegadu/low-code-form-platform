import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { Globe, Download, AlertTriangle, CheckCircle, ShieldCheck, Lock } from "lucide-react";
import api from "../services/api";
import "../styles/PublicForm.css";
import IdentitySelector from "../components/IdentitySelector";
import Loader from "../components/Loader";


function PublicForm() {
  const { uuid } = useParams();
  const [respondentEmail, setRespondentEmail] = useState(null);
  const [respondentVerified, setRespondentVerified] = useState(false);

  const [form, setForm] = useState(null);
  const [displayForm, setDisplayForm] = useState(null);
  const [currentLang, setCurrentLang] = useState("English");
  const [translating, setTranslating] = useState(false);

  const [responses, setResponses] = useState({});
  const [rules, setRules] = useState([]);
  const [startedAt, setStartedAt] = useState(null);
  const [submissionId, setSubmissionId] = useState(null);
  const [emailSent, setEmailSent] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [formExpired, setFormExpired] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formScheduled, setFormScheduled] = useState(false);
  const [scheduledMessage, setScheduledMessage] = useState("");

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
        setDisplayForm(res.data);

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
            <Download size={16} /> Download PDF Receipt
          </button>
        </div>
      </div>
    );
  }

  const activeForm = displayForm || form;

  if (!activeForm && !formExpired && !formScheduled) {
    return <Loader text="Loading form..." />;
  }

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
        </div>

        {submitError && (
          <div className="submit-error-banner">
            <AlertTriangle size={16} /> {submitError}
          </div>
        )}

        {/* IDENTITY VERIFICATION GATE */}
        {submissionId && (
          <IdentitySelector
            submissionId={submissionId}
            onVerified={(email) => {
              setRespondentEmail(email);
              setRespondentVerified(true);
            }}
          />
        )}

        {!respondentVerified && (
          <div className="verification-gate-banner">
            <Lock size={18} />
            <div>
              <strong>Sign in with Google & Verify Email Required</strong>
              <p>Please complete Google Sign-In or Email OTP verification above to unlock the form fields.</p>
            </div>
          </div>
        )}

        {respondentVerified && (
          <div className="verification-success-badge">
            <ShieldCheck size={18} />
            <span>Verified Respondent: <strong>{respondentEmail}</strong></span>
          </div>
        )}

        <div className={`form-fields-container ${!respondentVerified ? "fields-locked" : ""}`}>
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
                <label>
                  {field.label}
                  {field.required && <span className="required-star"> *</span>}
                </label>

                {isEmail && (
                  <input
                    type="email"
                    disabled={!respondentVerified}
                    placeholder={field.placeholder || "example@email.com"}
                    value={responses[field.id] || ""}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                  />
                )}

                {isNumber && (
                  <input
                    type="number"
                    disabled={!respondentVerified}
                    placeholder={field.placeholder || "Enter a number"}
                    value={responses[field.id] || ""}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                  />
                )}

                {isDropdown && (
                  <select
                    disabled={!respondentVerified}
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
                    disabled={!respondentVerified}
                    value={responses[field.id] || ""}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                  />
                )}

                {isFile && (
                  <input
                    type="file"
                    disabled={!respondentVerified}
                    onChange={(e) => handleChange(field.id, e.target.files[0])}
                  />
                )}

                {isCheckbox && (
                  <div className="checkbox-row">
                    <input
                      type="checkbox"
                      disabled={!respondentVerified}
                      checked={!!responses[field.id]}
                      onChange={(e) => handleChange(field.id, e.target.checked)}
                    />
                    <span> Accept Terms & Conditions</span>
                  </div>
                )}

                {isRating && (
                  <select
                    disabled={!respondentVerified}
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
                    disabled={!respondentVerified}
                    placeholder={field.placeholder || "Enter response"}
                    value={responses[field.id] || ""}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                  />
                )}
              </div>
            );
          })}


          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={!respondentVerified}
          >
            {respondentVerified ? "Submit Form" : <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><Lock size={15} /> Verify Email To Unlock Submit</span>}
          </button>

        </div>
      </div>


    </div>

  );

}

export default PublicForm;
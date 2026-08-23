import { useState } from "react";
import { ArrowLeft, Save, Send, Zap, Calendar, Sparkles, AlertTriangle } from "lucide-react";
import "../styles/CreateForm.css";
import FieldLibrary from "../components/FieldLibrary";
import PreviewPanel from "../components/PreviewPanel";
import { arrayMove } from "@dnd-kit/sortable";
import FieldSettings from "../components/FieldSettings";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

function CreateForm() {


  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiDraft, setAiDraft] = useState(null); // { title, description, fields }
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState([]);
  const [selectedField, setSelectedField] = useState(null);
  const [rules, setRules] = useState([]);
  const [limitOneResponsePerEmail, setLimitOneResponsePerEmail] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [publicationMode, setPublicationMode] = useState("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const addField = (type) => {

    const newField = {
      id: Date.now(),
      type:
        type === "Text"
          ? "text"
          : type === "Email"
          ? "email"
          : type === "Number"
          ? "number"
          : type === "Dropdown"
          ? "Dropdown"
          :type === "Checkbox"
          ? "checkbox"
          : type === "Date"
          ? "Date"
          : type === "File Upload"
          ? "File"
          : "text",
    
      label:
        type === "Text"
          ? "Full Name"
          : type === "Email"
          ? "Email Address"
          : type === "Number"
          ? "Phone Number"
          : type === "Dropdown"
          ? "Add your Question"
          :type === "Checkbox"
          ? "Accept Terms"
          : type === "Date"
          ? "Date of Birth"
          : type === "File Upload"
          ? "File Upload"
          : "text",
  required: false,
  placeholder:
  type === "Text"
    ? "Enter your full name"
    : type === "Email"
    ? "example@gmail.com"
    : type === "Number"
    ? "Enter your phone number"
    : type === "Dropdown"
    ? "option placeholder"
    : type === "Checkbox"
    ? ""
    : "",
    options:
    type === "Dropdown"
      ? ["Option 1", "Option 2", "Option3"]
      : [],

      minLength: "",
      maxLength: "",
      minValue: "",
      maxValue: "",
      minDate: "",
      maxDate: "",
    };
  
    setFields((prev) => [...prev, newField]);
  };
  const deleteField = (id) => {
    const updatedFields = fields.filter(
      (field) => field.id !== id
    );
  
    setFields(updatedFields);
  
    if (selectedField?.id === id) {
      setSelectedField(null);
    }
  };
  const updateOptions = (fieldId, optionIndex, value) => {
    setFields((prevFields) =>
      prevFields.map((field) => {
        if (field.id === fieldId) {
          const newOptions = [...field.options];
          newOptions[optionIndex] = value;
  
          return {
            ...field,
            options: newOptions,
          };
        }
  
        return field;
      })
    );
  };
  // Maps backend field types -> the exact type strings your builder
// already uses internally (see addField above). Keeping this mapping
// means AI-generated fields render through the SAME field editor UI
// as manually added ones, with no separate code path.
const AI_TYPE_TO_FRONTEND_TYPE = {
  text: "text",
  email: "email",
  number: "number",
  dropdown: "Dropdown",
  checkbox: "checkbox",
  date: "Date",
  file: "File",
  multicheckbox: "multicheckbox",
  rating: "rating",
};

const generateFormWithAI = async () => {
  const trimmedPrompt = aiPrompt.trim();

  if (!trimmedPrompt) {
    setAiError("Please describe the form you want first.");
    return;
  }

  setAiLoading(true);
  setAiError("");

  try {
    const res = await api.post("ai/generate-form/", {
      prompt: trimmedPrompt,
    });

    const data = res.data;

    const convertedFields = (data.fields || []).map((field, index) => ({
      id: Date.now() + index,
      type: AI_TYPE_TO_FRONTEND_TYPE[field.type] || field.type,
      label: field.label,
      required: !!field.required,
      placeholder: field.placeholder || "",
      options: field.options || [],
      minLength: "",
      maxLength: "",
      minValue: "",
      maxValue: "",
      minDate: "",
      maxDate: "",
    }));

    setAiDraft({
      title: data.title,
      description: data.description,
      fields: convertedFields,
    });

  } catch (error) {
    console.error("AI GENERATE ERROR:", error);

    // IMPORTANT: never touch title/description/fields here -
    // the user's existing manually-entered form stays untouched.
    setAiError(
      error.response?.data?.error ||
      "Unable to generate the form. Please try again."
    );
  } finally {
    setAiLoading(false);
  }
};

const useAiDraft = () => {
  if (!aiDraft) return;

  // Reuses the SAME state setters as the rest of the builder -
  // no separate save/publish path for AI-generated forms.
  setTitle(aiDraft.title || "");
  setDescription(aiDraft.description || "");
  setFields(aiDraft.fields || []);

  setAiDraft(null);
  setAiPrompt("");
  setShowAiPanel(false);
};
  
const addOption = (fieldId) => {
  setFields((prevFields) =>
    prevFields.map((field) => {
      if (field.id === fieldId) {
          return {
            ...field,
            options: [...(field.options || []), ""],
          };
        }
  
        return field;
      })
    );
};
  const updateLabel = (id, value) => {
    const updatedFields = fields.map((field) =>
      field.id === id
        ? { ...field, label: value }
        : field
    );
  
    setFields(updatedFields);
  
    if (selectedField && selectedField.id === id) {
      setSelectedField(
        updatedFields.find((field) => field.id === id)
      );
    }
  };
  const updatePlaceholder = (id, value) => {
    const updatedFields = fields.map((field) =>
      field.id === id
        ? { ...field, placeholder: value }
        : field
    );
  
    setFields(updatedFields);
  
    if (selectedField && selectedField.id === id) {
      setSelectedField(
        updatedFields.find((field) => field.id === id)
      );
    }
  };
  const updateValidation = (id, key, value) => {

    const updatedFields = fields.map((field)=>
  
      field.id===id
  
        ? { ...field, [key]: value }
  
        : field
  
    );
  
    setFields(updatedFields);
  
    if(selectedField?.id===id){
  
      setSelectedField(
  
        updatedFields.find(field=>field.id===id)
  
      );
  
    }
  
  };
  const publishForm = async () => {
    const formTitle = (title || "").trim();
    if (!formTitle) {
      alert("Please enter a Form Title before publishing.");
      return;
    }
    if (!fields || fields.length === 0) {
      alert("Please add at least one field to your form before publishing.");
      return;
    }

    try {
      console.log("RULES BEING SENT:", rules);

      const data = {
        title: formTitle,
        description: (description || "").trim(),
        fields,
        status: "draft",
        limit_one_response_per_email: limitOneResponsePerEmail,

        conditional_rules: rules.map((rule) => ({
          source_field_id: rule.sourceField,
          operator: rule.operator,
          expected_value: rule.expectedValue,
          target_field_id: rule.targetField,
          action: rule.action,
        })),
      };

      // 1. Create the form
      const response = await api.post("forms/", data);

      const formId = response.data.id;

      // 2. Prepare scheduled time
      let scheduled_publish_at = null;

      if (publicationMode === "schedule") {
        if (!scheduledDate || !scheduledTime) {
          alert("Please select scheduled date and time");
          return;
        }

        const selectedDateTime = new Date(
          `${scheduledDate}T${scheduledTime}`
        );

        if (selectedDateTime <= new Date()) {
          alert("Please select a future date and time");
          return;
        }

        scheduled_publish_at = selectedDateTime.toISOString();
      }

      // 3. Publish now OR schedule
      await api.post(
        `forms/${formId}/publish/`,
        scheduled_publish_at
          ? { scheduled_publish_at }
          : {}
      );

      if (publicationMode === "schedule") {
        alert("Form Scheduled Successfully!");
      } else {
        alert("Form Published Successfully!");
      }

      navigate("/forms");

    } catch (error) {
      console.error(error);
      console.error("PUBLISH ERROR:", error.response?.data);

      alert(
        error.response?.data?.error ||
        error.response?.data?.detail ||
        "Failed to Publish Form"
      );
    }
  };

  const saveDraft = async () => {
    const formTitle = (title || "").trim() || "Untitled Draft Form";
    try {
      const data = {
        title: formTitle,
        description: (description || "").trim(),
        fields,
        status: "draft",
        limit_one_response_per_email: limitOneResponsePerEmail,

        conditional_rules: rules.map((rule) => ({
          source_field_id: rule.sourceField,
          operator: rule.operator,
          expected_value: rule.expectedValue,
          target_field_id: rule.targetField,
          action: rule.action,
        })),
      };

      await api.post("forms/", data);

      alert("Draft Saved Successfully!");

      navigate("/forms");
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || error.response?.data?.detail || "Failed to Save Draft");
    }
  };

  const toggleRequired = (id) => {
    const updatedFields = fields.map((field) =>
      field.id === id
        ? {
            ...field,
            required: !field.required,
          }
        : field
    );
  
    setFields(updatedFields);
  
    if (selectedField && selectedField.id === id) {
      setSelectedField(
        updatedFields.find((field) => field.id === id)
      );
    }
  };
  const selectField = (id) => {
    const field = fields.find((item) => item.id === id);
    setSelectedField(field);
  };
  const handleDragEnd = (event) => {

    const { active, over } = event;
  
    if (!over || active.id === over.id) return;
  
    const oldIndex = fields.findIndex(
      (item) => item.id === active.id
    );
  
    const newIndex = fields.findIndex(
      (item) => item.id === over.id
    );
  
    setFields(arrayMove(fields, oldIndex, newIndex));
  };

  return (
    <>
      <Sidebar />
  
      <div className="create-page">
        {/* TOP FLOATING STUDIO NAVBAR */}
        <header className="create-navbar">
          <button
            className="back-btn"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft size={16} />
            Dashboard
          </button>

          <div className="nav-publication-bar">
            <div className="publication-radios">
              <label className={`pub-radio-pill ${publicationMode === "now" ? "active" : ""}`}>
                <input
                  type="radio"
                  name="pubMode"
                  checked={publicationMode === "now"}
                  onChange={() => setPublicationMode("now")}
                />
                <Zap size={14} /> Publish Immediately
              </label>

              <label className={`pub-radio-pill ${publicationMode === "schedule" ? "active" : ""}`}>
                <input
                  type="radio"
                  name="pubMode"
                  checked={publicationMode === "schedule"}
                  onChange={() => setPublicationMode("schedule")}
                />
                <Calendar size={14} /> Schedule Launch
              </label>
            </div>

            {publicationMode === "schedule" && (
              <div className="schedule-inputs-inline">
                <input
                  type="date"
                  required
                  min={new Date().toISOString().slice(0, 10)}
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
                <input
                  type="time"
                  required
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="nav-actions">
            <button
              className="draft-btn"
              onClick={saveDraft}
            >
              <Save size={16} />
              Save Draft
            </button>

            <button
              className="publish-btn"
              onClick={publishForm}
            >
              <Send size={16} />
              {publicationMode === "schedule" ? "Schedule Launch" : "Publish Form"}
            </button>
          </div>
        </header>

        {/* STUDIO HEADER */}
        <div className="create-heading">
          <h1 className="page-title">Create Form</h1>
          <p>Draft dynamic form workflows, configure AI generator, and define conditional rules</p>


          <div className="studio-stats-bar">
            <span className="studio-stat-chip">
              <strong>{fields.length}</strong> Fields Active
            </span>
            <span className="studio-stat-chip">
              Mode: <strong>{publicationMode === "now" ? "Instant Publish" : "Scheduled Launch"}</strong>
            </span>
            {limitOneResponsePerEmail && (
              <span className="studio-stat-chip cyan">
                1 Response / Email Enforced
              </span>
            )}
          </div>
        </div>

        {/* 3-COLUMN STUDIO LAYOUT */}
        <div className="builder-layout">

          {/* =================================
              COLUMN 1: AI ASSISTANT & FORM DETAILS
          ================================= */}
          <div className="builder-left">

            {/* AI GENERATE FORM */}
            <div className="glass-card ai-generate-card">
              <div className="library-heading">
                <div>
                  <span className="section-eyebrow"><Sparkles size={12} /> AI ASSISTANT</span>
                  <h2>AI Form Generator</h2>
                  <p>Describe your form intent or select a quick template prompt</p>
                </div>

                <button
                  type="button"
                  className="ai-toggle-btn"
                  onClick={() => setShowAiPanel((prev) => !prev)}
                >
                  {showAiPanel ? "Close" : "Open AI Studio"}
                </button>
              </div>

              {showAiPanel && (
                <div className="ai-generate-panel">
                  <label>Form Generation Prompt</label>

                  <textarea
                    placeholder="e.g. Create an event registration form for a tech conference with full name, email, dietary preferences dropdown, and experience rating."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    disabled={aiLoading}
                  />

                  {/* QUICK PROMPT CHIPS */}
                  <div className="prompt-chips">
                    <button
                      type="button"
                      className="prompt-chip"
                      onClick={() => setAiPrompt("Create a customer feedback form with name, email, rating from 1 to 5, feedback comments, and recommendation checkbox.")}
                    >
                      + Feedback Form
                    </button>
                    <button
                      type="button"
                      className="prompt-chip"
                      onClick={() => setAiPrompt("Create an event registration form with full name, email, session dropdown, date of attendance, and dietary preferences.")}
                    >
                      + Event Registration
                    </button>
                    <button
                      type="button"
                      className="prompt-chip"
                      onClick={() => setAiPrompt("Create an employee onboarding form with full name, email, department dropdown, start date, and emergency contact.")}
                    >
                      + Employee Onboarding
                    </button>
                  </div>

                  {aiError && (
                    <div className="ai-error-banner">
                      <AlertTriangle size={15} /> {aiError}
                    </div>
                  )}

                  <button
                    type="button"
                    className="ai-generate-btn"
                    onClick={generateFormWithAI}
                    disabled={aiLoading}
                  >
                    <Sparkles size={16} />
                    {aiLoading ? "Generating AI Form Draft..." : "Generate AI Form"}
                  </button>

                  {aiDraft && (
                    <div className="ai-draft-preview">
                      <p className="ai-draft-note">AI generated a draft form ready to apply.</p>

                      <div className="ai-draft-summary">
                        <strong>{aiDraft.title}</strong>
                        <p>{aiDraft.description}</p>
                        <span>
                          {aiDraft.fields.length} field
                          {aiDraft.fields.length !== 1 ? "s" : ""} generated
                        </span>
                      </div>

                      <div className="ai-draft-actions">
                        <button
                          type="button"
                          className="ai-use-btn"
                          onClick={useAiDraft}
                        >
                          Apply To Canvas
                        </button>

                        <button
                          type="button"
                          className="ai-regenerate-btn"
                          onClick={generateFormWithAI}
                          disabled={aiLoading}
                        >
                          Regenerate
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* FORM DETAILS */}
            <div className="glass-card form-details-card">
              <div className="section-heading">
                <div>
                  <span className="section-eyebrow">CONFIGURATION</span>
                  <h2>Form Details</h2>
                </div>
              </div>

              <label>Form Title</label>
              <input
                type="text"
                placeholder="e.g. Annual Customer Satisfaction Survey"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <label>Description</label>
              <textarea
                placeholder="Provide clear instructions or background context for respondents..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <label className="limit-response-toggle">
                <input
                  type="checkbox"
                  checked={limitOneResponsePerEmail}
                  onChange={(e) => setLimitOneResponsePerEmail(e.target.checked)}
                />
                Limit to 1 submission per verified email
              </label>
            </div>

            {/* FIELD LIBRARY */}
            <FieldLibrary addField={addField} />

          </div>

          {/* =================================
              COLUMN 2: LIVE CANVAS PREVIEW
          ================================= */}
          <div className="builder-right">

            {/* LIVE PREVIEW CANVAS */}
            <div className="preview-container">

              <div className="preview-container-header">
                <div>
                  <span className="section-eyebrow">LIVE CANVAS</span>
                  <h2>Interactive Form Canvas</h2>
                  <p>Drag to reorder fields or click Edit to configure validation rules</p>
                </div>

                <span className="field-count">
                  {fields.length} field{fields.length !== 1 ? "s" : ""} on canvas
                </span>
              </div>

              <PreviewPanel
                fields={fields}
                addField={addField}
                handleDragEnd={handleDragEnd}
                updateLabel={updateLabel}
                deleteField={deleteField}
                toggleRequired={toggleRequired}
                selectedField={selectedField}
                selectField={selectField}
                editingField={editingField}
                setEditingField={setEditingField}
              />


              <FieldSettings
                editingField={editingField}
                setEditingField={setEditingField}
                fields={fields}
                updateLabel={updateLabel}
                updatePlaceholder={updatePlaceholder}
                updateValidation={updateValidation}
                toggleRequired={toggleRequired}
                deleteField={deleteField}
                updateOptions={updateOptions}
                addOption={addOption}
                rules={rules}
                setRules={setRules}
              />
            </div>

          </div>

        </div>

  
      </div>
    </>
  );
}

export default CreateForm;
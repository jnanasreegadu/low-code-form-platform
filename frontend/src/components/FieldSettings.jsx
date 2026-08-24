import { useEffect, useState } from "react";

function FieldSettings({
  editingField,
  setEditingField,
  selectedField,
  setSelectedField,
  updateLabel,
  updatePlaceholder,
  updateValidation,
  toggleRequired,
  deleteField,
  updateOptions,
  addOption,
  removeOption,
  rules = [],
  setRules,
  fields = [],
}) {
  const [step, setStep] = useState(1);

  // Active target ID
  const activeId = editingField?.id ?? selectedField?.id;

  // Dynamically resolve current live field from fields array
  const currentField =
    (fields || []).find((f) => f.id === activeId) || editingField || selectedField;

  useEffect(() => {
    if (activeId) {
      setStep(1);
    }
  }, [activeId]);

  if (!currentField) {
    return null;
  }

  const handleClose = () => {
    if (setEditingField) setEditingField(null);
    if (setSelectedField) setSelectedField(null);
    setStep(1);
  };

  const handleDelete = () => {
    deleteField(currentField.id);
    handleClose();
  };

  const currentRule = rules.find(
    (rule) => rule.targetField === currentField.id
  );

  const fieldType = (currentField.type || "text").toLowerCase();
  const isDropdownType = ["dropdown", "select", "multicheckbox"].includes(fieldType);
  const isTextType = ["text", "email", "textarea"].includes(fieldType);
  const isNumberType = ["number", "rating"].includes(fieldType);
  const isDateType = ["date"].includes(fieldType);

  return (
    <div className="field-editor-overlay">
      <div className="field-editor-modal">
        {/* HEADER */}
        <div className="field-editor-header">
          <div>
            <span className="editor-eyebrow">FIELD EDITOR</span>
            <h2>Edit Field</h2>
            <p>Customize your field settings</p>
          </div>

          <button
            type="button"
            className="editor-close-btn"
            onClick={handleClose}
          >
            ×
          </button>
        </div>

        {/* STEP INDICATOR */}
        <div className="editor-steps">
          <div
            className={`editor-step ${
              step === 1 ? "active" : step > 1 ? "completed" : ""
            }`}
            onClick={() => setStep(1)}
            style={{ cursor: "pointer" }}
          >
            <span>1</span>
            <small>Details</small>
          </div>

          <div className="step-line" />

          <div
            className={`editor-step ${
              step === 2 ? "active" : step > 2 ? "completed" : ""
            }`}
            onClick={() => setStep(2)}
            style={{ cursor: "pointer" }}
          >
            <span>2</span>
            <small>Validation</small>
          </div>

          <div className="step-line" />

          <div
            className={`editor-step ${step === 3 ? "active" : ""}`}
            onClick={() => setStep(3)}
            style={{ cursor: "pointer" }}
          >
            <span>3</span>
            <small>Conditional Logic</small>
          </div>
        </div>

        {/* STEP 1: DETAILS */}
        {step === 1 && (
          <div className="editor-step-content">
            <div className="editor-section-title">
              <h3>Field Details</h3>
              <p>Edit the field title and placeholder.</p>
            </div>

            <label>Title</label>
            <input
              type="text"
              value={currentField.label || ""}
              onChange={(e) => updateLabel(currentField.id, e.target.value)}
              placeholder="e.g. Enter field title"
            />

            <label>Placeholder</label>
            <input
              type="text"
              value={currentField.placeholder || ""}
              onChange={(e) => updatePlaceholder(currentField.id, e.target.value)}
              placeholder="e.g. Enter input placeholder text"
            />

            {/* DROPDOWN / MULTICHECKBOX OPTIONS */}
            {isDropdownType && (
              <div className="editor-options-section">
                <label>Options</label>
                {(currentField.options || []).map((option, index) => (
                  <div
                    className="editor-option-row"
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "8px",
                    }}
                  >
                    <span style={{ color: "#94a3b8", fontSize: "14px", minWidth: "22px" }}>
                      {index + 1}.
                    </span>
                    <input
                      type="text"
                      value={option || ""}
                      placeholder={`Option ${index + 1}`}
                      onChange={(e) =>
                        updateOptions(currentField.id, index, e.target.value)
                      }
                      style={{ flex: 1 }}
                    />
                    {(currentField.options || []).length > 1 && (
                      <button
                        type="button"
                        className="delete-option-btn"
                        onClick={() =>
                          removeOption && removeOption(currentField.id, index)
                        }
                        title="Remove option"
                        style={{
                          background: "rgba(239, 68, 68, 0.15)",
                          color: "#ef4444",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          borderRadius: "6px",
                          width: "32px",
                          height: "36px",
                          cursor: "pointer",
                          fontSize: "18px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  className="add-option-btn"
                  onClick={() => addOption(currentField.id)}
                >
                  + Add Option
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: VALIDATION */}
        {step === 2 && (
          <div className="editor-step-content">
            <div className="editor-section-title">
              <h3>Validation</h3>
              <p>Configure validation rules for this field.</p>
            </div>

            {/* TEXT VALIDATION */}
            {isTextType && (
              <>
                <label>Minimum Length</label>
                <input
                  type="number"
                  placeholder="e.g. 2"
                  value={currentField.minLength ?? ""}
                  onChange={(e) =>
                    updateValidation(
                      currentField.id,
                      "minLength",
                      e.target.value
                    )
                  }
                />

                <label>Maximum Length</label>
                <input
                  type="number"
                  placeholder="e.g. 100"
                  value={currentField.maxLength ?? ""}
                  onChange={(e) =>
                    updateValidation(
                      currentField.id,
                      "maxLength",
                      e.target.value
                    )
                  }
                />

                <label>Custom Regex Pattern (Regex Validation)</label>
                <input
                  type="text"
                  placeholder="e.g. ^[0-9]{10}$ for 10-digit phone or ^[A-Z0-9]+$"
                  value={currentField.pattern ?? currentField.regex ?? ""}
                  onChange={(e) =>
                    updateValidation(
                      currentField.id,
                      "pattern",
                      e.target.value
                    )
                  }
                />
              </>
            )}

            {/* NUMBER VALIDATION */}
            {isNumberType && (
              <>
                <label>Minimum Value</label>
                <input
                  type="number"
                  placeholder="e.g. 1"
                  value={currentField.minValue ?? ""}
                  onChange={(e) =>
                    updateValidation(
                      currentField.id,
                      "minValue",
                      e.target.value
                    )
                  }
                />

                <label>Maximum Value</label>
                <input
                  type="number"
                  placeholder="e.g. 100"
                  value={currentField.maxValue ?? ""}
                  onChange={(e) =>
                    updateValidation(
                      currentField.id,
                      "maxValue",
                      e.target.value
                    )
                  }
                />
              </>
            )}

            {/* DATE VALIDATION */}
            {isDateType && (
              <>
                <label>Minimum Date</label>
                <input
                  type="date"
                  value={currentField.minDate ?? ""}
                  onChange={(e) =>
                    updateValidation(
                      currentField.id,
                      "minDate",
                      e.target.value
                    )
                  }
                />

                <label>Maximum Date</label>
                <input
                  type="date"
                  value={currentField.maxDate ?? ""}
                  onChange={(e) =>
                    updateValidation(
                      currentField.id,
                      "maxDate",
                      e.target.value
                    )
                  }
                />
              </>
            )}

            <label className="editor-required" style={{ marginTop: "16px", display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={!!currentField.required}
                onChange={() => toggleRequired(currentField.id)}
              />
              Required Field
            </label>
          </div>
        )}

        {/* STEP 3: CONDITIONAL LOGIC */}
        {step === 3 && (
          <div className="editor-step-content">
            <div className="editor-section-title">
              <h3>Conditional Logic</h3>
              <p>Decide when this field should appear.</p>
            </div>

            <label>IF Field</label>
            <select
              value={currentRule?.sourceField || ""}
              onChange={(e) => {
                const sourceField = Number(e.target.value);
                setRules((prev) => {
                  const existing = prev.find(
                    (rule) => rule.targetField === currentField.id
                  );

                  if (existing) {
                    return prev.map((rule) =>
                      rule.targetField === currentField.id
                        ? { ...rule, sourceField }
                        : rule
                    );
                  }

                  return [
                    ...prev,
                    {
                      sourceField,
                      operator: "equals",
                      expectedValue: "",
                      targetField: currentField.id,
                      action: "show",
                    },
                  ];
                });
              }}
            >
              <option value="">Select Field</option>
              {fields
                .filter((field) => field.id !== currentField.id)
                .map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.label}
                  </option>
                ))}
            </select>

            <label>Condition</label>
            <select
              value={currentRule?.operator || "equals"}
              onChange={(e) => {
                setRules((prev) =>
                  prev.map((rule) =>
                    rule.targetField === currentField.id
                      ? { ...rule, operator: e.target.value }
                      : rule
                  )
                );
              }}
            >
              <option value="equals">Equals</option>
              <option value="not_equals">Not Equals</option>
              <option value="contains">Contains</option>
              <option value="greater_than">Greater Than</option>
              <option value="less_than">Less Than</option>
            </select>

            <label>Value</label>
            <input
              type="text"
              placeholder="Example: Yes"
              value={currentRule?.expectedValue || ""}
              onChange={(e) => {
                setRules((prev) =>
                  prev.map((rule) =>
                    rule.targetField === currentField.id
                      ? { ...rule, expectedValue: e.target.value }
                      : rule
                  )
                );
              }}
            />

            <label>Action</label>
            <select
              value={currentRule?.action || "show"}
              onChange={(e) => {
                setRules((prev) =>
                  prev.map((rule) =>
                    rule.targetField === currentField.id
                      ? { ...rule, action: e.target.value }
                      : rule
                  )
                );
              }}
            >
              <option value="show">Show</option>
              <option value="hide">Hide</option>
            </select>
          </div>
        )}

        {/* FOOTER */}
        <div className="editor-footer">
          {step > 1 ? (
            <button
              type="button"
              className="editor-prev-btn"
              onClick={() => setStep(step - 1)}
            >
              ← Previous
            </button>
          ) : (
            <button
              type="button"
              className="editor-delete-btn"
              onClick={handleDelete}
            >
              Delete Field
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              className="editor-next-btn"
              onClick={() => setStep(step + 1)}
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              className="editor-done-btn"
              onClick={handleClose}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default FieldSettings;
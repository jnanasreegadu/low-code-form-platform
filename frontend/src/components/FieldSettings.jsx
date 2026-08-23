import { useEffect, useState } from "react";

function FieldSettings({
  editingField,
  setEditingField,
  updateLabel,
  updatePlaceholder,
  updateValidation,
  toggleRequired,
  deleteField,
  updateOptions,
  addOption,
  rules,
  setRules,
  fields,
}) {
  const [step, setStep] = useState(1);
  const [localOptions, setLocalOptions] = useState([]);

  useEffect(() => {
    if (editingField) {
      setStep(1);
      setLocalOptions(editingField.options || []);
    }
  }, [editingField]);

  if (!editingField) {
    return null;
  }

  const currentRule = rules.find(
    (rule) => rule.targetField === editingField.id
  );

  const handleDone = () => {
    setEditingField(null);
    setStep(1);
  };

  const handleDelete = () => {
    deleteField(editingField.id);
    setEditingField(null);
    setStep(1);
  };

  return (
    <div className="field-editor-overlay">

      <div className="field-editor-modal">

        {/* HEADER */}

        <div className="field-editor-header">

          <div>
            <span className="editor-eyebrow">
              FIELD EDITOR
            </span>

            <h2>Edit Field</h2>

            <p>
              Customize your field settings
            </p>
          </div>

          <button
            type="button"
            className="editor-close-btn"
            onClick={() => setEditingField(null)}
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
          >
            <span>1</span>
            <small>Details</small>
          </div>

          <div className="step-line" />

          <div
            className={`editor-step ${
              step === 2 ? "active" : step > 2 ? "completed" : ""
            }`}
          >
            <span>2</span>
            <small>Validation</small>
          </div>

          <div className="step-line" />

          <div
            className={`editor-step ${
              step === 3 ? "active" : ""
            }`}
          >
            <span>3</span>
            <small>Conditional Logic</small>
          </div>


        </div>


        {/* ============================
            STEP 1
        ============================ */}

        {step === 1 && (

          <div className="editor-step-content">

            <div className="editor-section-title">
              <h3>Field Details</h3>

              <p>
                Edit the field title and placeholder.
              </p>
            </div>


            <label>Title</label>

            <input
              type="text"
              value={editingField.label}
              onChange={(e) =>
                updateLabel(
                  editingField.id,
                  e.target.value
                )
              }
            />


            <label>Placeholder</label>

            <input
              type="text"
              value={editingField.placeholder || ""}
              onChange={(e) =>
                updatePlaceholder(
                  editingField.id,
                  e.target.value
                )
              }
            />


            {/* DROPDOWN OPTIONS */}

            {editingField.type?.toLowerCase() === "dropdown" && (

              <div className="editor-options-section">

                <label>Options</label>

                {localOptions.map((option, index) => (

                  <div
                    className="editor-option-row"
                    key={index}
                  >

                    <span>
                      {index + 1}
                    </span>

                    <input
                      type="text"
                      value={option}
                      placeholder={`Option ${index + 1}`}
                      onChange={(e) => {

                        const newOptions = [
                          ...localOptions
                        ];

                        newOptions[index] =
                          e.target.value;

                        setLocalOptions(newOptions);
                      }}
                      onBlur={(e) => {

                        updateOptions(
                          editingField.id,
                          index,
                          e.target.value
                        );

                      }}
                    />

                  </div>

                ))}


                <button
                  type="button"
                  className="add-option-btn"
                  onClick={() => {

                    setLocalOptions((prev) => [
                      ...prev,
                      ""
                    ]);

                    addOption(editingField.id);

                  }}
                >
                  + Add Option
                </button>

              </div>

            )}

          </div>

        )}


        {/* ============================
            STEP 2
        ============================ */}

        {step === 2 && (

          <div className="editor-step-content">

            <div className="editor-section-title">

              <h3>Validation</h3>

              <p>
                Configure validation rules for this field.
              </p>

            </div>


            {/* TEXT */}

            {editingField.type?.toLowerCase() === "text" && (

              <>

                <label>Minimum Length</label>

                <input
                  type="number"
                  value={editingField.minLength || ""}
                  onChange={(e) =>
                    updateValidation(
                      editingField.id,
                      "minLength",
                      e.target.value
                    )
                  }
                />


                <label>Maximum Length</label>

                <input
                  type="number"
                  value={editingField.maxLength || ""}
                  onChange={(e) =>
                    updateValidation(
                      editingField.id,
                      "maxLength",
                      e.target.value
                    )
                  }
                />

              </>

            )}
            


            {/* NUMBER */}

            {editingField.type?.toLowerCase() === "number" && (

              <>

                <label>Minimum Value</label>

                <input
                  type="number"
                  value={editingField.minValue || ""}
                  onChange={(e) =>
                    updateValidation(
                      editingField.id,
                      "minValue",
                      e.target.value
                    )
                  }
                />


                <label>Maximum Value</label>

                <input
                  type="number"
                  value={editingField.maxValue || ""}
                  onChange={(e) =>
                    updateValidation(
                      editingField.id,
                      "maxValue",
                      e.target.value
                    )
                  }
                />

              </>

            )}


            {/* DATE */}

            {editingField.type?.toLowerCase() === "date" && (

              <>

                <label>Minimum Date</label>

                <input
                  type="date"
                  value={editingField.minDate || ""}
                  onChange={(e) =>
                    updateValidation(
                      editingField.id,
                      "minDate",
                      e.target.value
                    )
                  }
                />


                <label>Maximum Date</label>

                <input
                  type="date"
                  value={editingField.maxDate || ""}
                  onChange={(e) =>
                    updateValidation(
                      editingField.id,
                      "maxDate",
                      e.target.value
                    )
                  }
                />
                

              </>
              

            )}
            <label className="editor-required">
              <input
                type="checkbox"
                checked={editingField.required}
                onChange={() =>
                  toggleRequired(editingField.id)
                }
              />
              Required
            </label>

          </div>

        )}


        {/* ============================
            STEP 3
        ============================ */}

        {step === 3 && (

          <div className="editor-step-content">

            <div className="editor-section-title">

              <h3>Conditional Logic</h3>

              <p>
                Decide when this field should appear.
              </p>

            </div>


            <label>IF Field</label>

            <select
              value={
                currentRule?.sourceField || ""
              }
              onChange={(e) => {

                const sourceField =
                  Number(e.target.value);

                setRules((prev) => {

                  const existing = prev.find(
                    (rule) =>
                      rule.targetField ===
                      editingField.id
                  );

                  if (existing) {

                    return prev.map((rule) =>
                      rule.targetField ===
                      editingField.id
                        ? {
                            ...rule,
                            sourceField
                          }
                        : rule
                    );

                  }

                  return [
                    ...prev,
                    {
                      sourceField,
                      operator: "equals",
                      expectedValue: "",
                      targetField:
                        editingField.id,
                      action: "show",
                    },
                  ];

                });

              }}
            >

              <option value="">
                Select Field
              </option>

              {fields
                .filter(
                  (field) =>
                    field.id !== editingField.id
                )
                .map((field) => (

                  <option
                    key={field.id}
                    value={field.id}
                  >
                    {field.label}
                  </option>

                ))}

            </select>


            <label>Condition</label>

            <select
              value={
                currentRule?.operator ||
                "equals"
              }
              onChange={(e) => {

                setRules((prev) =>
                  prev.map((rule) =>
                    rule.targetField ===
                    editingField.id
                      ? {
                          ...rule,
                          operator:
                            e.target.value
                        }
                      : rule
                  )
                );

              }}
            >

              <option value="equals">
                Equals
              </option>

              <option value="not_equals">
                Not Equals
              </option>

              <option value="contains">
                Contains
              </option>

              <option value="greater_than">
                Greater Than
              </option>

              <option value="less_than">
                Less Than
              </option>

            </select>


            <label>Value</label>

            <input
              type="text"
              placeholder="Example: Yes"
              value={
                currentRule?.expectedValue || ""
              }
              onChange={(e) => {

                setRules((prev) =>
                  prev.map((rule) =>
                    rule.targetField ===
                    editingField.id
                      ? {
                          ...rule,
                          expectedValue:
                            e.target.value
                        }
                      : rule
                  )
                );

              }}
            />


            <label>Action</label>

            <select
              value={
                currentRule?.action || "show"
              }
              onChange={(e) => {

                setRules((prev) =>
                  prev.map((rule) =>
                    rule.targetField ===
                    editingField.id
                      ? {
                          ...rule,
                          action:
                            e.target.value
                        }
                      : rule
                  )
                );

              }}
            >

              <option value="show">
                Show
              </option>

              <option value="hide">
                Hide
              </option>

            </select>

          </div>

        )}


        {/* FOOTER */}

        <div className="editor-footer">

          {step > 1 ? (

            <button
              type="button"
              className="editor-prev-btn"
              onClick={() =>
                setStep(step - 1)
              }
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
              onClick={() =>
                setStep(step + 1)
              }
            >
              Next →
            </button>

          ) : (

            <button
              type="button"
              className="editor-done-btn"
              onClick={handleDone}
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
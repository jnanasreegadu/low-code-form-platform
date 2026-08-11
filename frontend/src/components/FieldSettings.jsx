import { useEffect, useState } from "react";
function FieldSettings({
    selectedField,
    updateLabel,
    updatePlaceholder,
    toggleRequired,
    deleteField,
    updateOptions,
    addOption,
    rules,
    setRules,
    fields,
  }) {
    const [localOptions, setLocalOptions] = useState([]);

useEffect(() => {
  setLocalOptions(selectedField?.options || []);
}, [selectedField?.id]);
    if (!selectedField) {
      return (
        <div className="field-settings-card">
          <h2>Field Settings</h2>
  
          <p className="no-selection">
            Select a field from Live Preview.
          </p>
        </div>
      );
    }
    console.log(selectedField);
  
    return (
      <div className="field-settings-card">
  
        <h2>Field Settings</h2>
  
        <label>Label</label>
  
        <input
          type="text"
          value={selectedField.label}
          onChange={(e) =>
            updateLabel(selectedField.id, e.target.value)
          }
        />
  
        <label>Placeholder</label>
  
        <input
          type="text"
          value={selectedField.placeholder || ""}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) =>
            updatePlaceholder(selectedField.id, e.target.value)
          }
        />
        {selectedField.type === "Text" && (
        <>
          <label>Minimum Length</label>

          <input
            type="number"
            value={selectedField.minLength || ""}
            onChange={(e) =>
              updateValidation(
                selectedField.id,
                "minLength",
                e.target.value
              )
            }
          />

          <label>Maximum Length</label>

          <input
            type="number"
            value={selectedField.maxLength || ""}
            onChange={(e) =>
              updateValidation(
                selectedField.id,
                "maxLength",
                e.target.value
              )
            }
          />
        </>
      )}
      {selectedField.type==="Number" && (
<>
<label>Minimum Value</label>

<input
type="number"
value={selectedField.minValue || ""}
onChange={(e)=>
updateValidation(
selectedField.id,
"minValue",
e.target.value
)
}
/>

<label>Maximum Value</label>

<input
type="number"
value={selectedField.maxValue || ""}
onChange={(e)=>
updateValidation(
selectedField.id,
"maxValue",
e.target.value
)
}
/>

</>
)}
{selectedField.type==="Date" && (
<>
<label>Minimum Date</label>

<input
type="date"
value={selectedField.minDate || ""}
onChange={(e)=>
updateValidation(
selectedField.id,
"minDate",
e.target.value
)
}
/>

<label>Maximum Date</label>

<input
type="date"
value={selectedField.maxDate || ""}
onChange={(e)=>
updateValidation(
selectedField.id,
"maxDate",
e.target.value
)
}
/>

</>
)}



  
        <label className="settings-checkbox">
  
          <input
            type="checkbox"
            checked={selectedField.required}
            onChange={() =>
              toggleRequired(selectedField.id)
            }
          />
  
          Required
  
        </label>
        {selectedField.type === "Dropdown" && (
  <>
    <label>Options</label>

    {localOptions.map((option, index) => (
  <input
    key={index}
    type="text"
    value={option}
    onChange={(e) => {
      const newOptions = [...localOptions];
      newOptions[index] = e.target.value;
      setLocalOptions(newOptions);
    }}
    onBlur={(e) => {
      updateOptions(
        selectedField.id,
        index,
        e.target.value
      );
    }}
  />
))}

    <button
      type="button"
      onClick={() => addOption(selectedField.id)}
    >
      + Add Option
    </button>
  </>
)}
{/* Conditional Logic */}
<div className="conditional-section">
  <h3>Conditional Logic</h3>

  <label>IF Field</label>

  <select
    value={
      rules.find(
        (rule) => rule.targetField === selectedField.id
      )?.sourceField || ""
    }
    onChange={(e) => {
      const sourceField = Number(e.target.value);

      setRules((prev) => {
        const existing = prev.find(
          (rule) => rule.targetField === selectedField.id
        );

        if (existing) {
          return prev.map((rule) =>
            rule.targetField === selectedField.id
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
            targetField: selectedField.id,
            action: "show",
          },
        ];
      });
    }}
  >
    <option value="">Select Field</option>

    {fields
      .filter((field) => field.id !== selectedField.id)
      .map((field) => (
        <option key={field.id} value={field.id}>
          {field.label}
        </option>
      ))}
  </select>

  <label>Condition</label>

  <select
    value={
      rules.find(
        (rule) => rule.targetField === selectedField.id
      )?.operator || "equals"
    }
    onChange={(e) => {
      setRules((prev) =>
        prev.map((rule) =>
          rule.targetField === selectedField.id
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
    value={
      rules.find(
        (rule) => rule.targetField === selectedField.id
      )?.expectedValue || ""
    }
    onChange={(e) => {
      setRules((prev) =>
        prev.map((rule) =>
          rule.targetField === selectedField.id
            ? {
                ...rule,
                expectedValue: e.target.value,
              }
            : rule
        )
      );
    }}
  />

  <label>Action</label>

  <select
    value={
      rules.find(
        (rule) => rule.targetField === selectedField.id
      )?.action || "show"
    }
    onChange={(e) => {
      setRules((prev) =>
        prev.map((rule) =>
          rule.targetField === selectedField.id
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

        <button
          className="delete-setting-btn"
          onClick={() =>
            deleteField(selectedField.id)
          }
        >
          Delete Field
        </button>
  
      </div>
    );
  }
  
  export default FieldSettings;
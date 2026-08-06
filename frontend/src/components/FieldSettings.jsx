function FieldSettings({
    selectedField,
    updateLabel,
    updatePlaceholder,
    toggleRequired,
    deleteField,
    updateOptions,
    addOption,
  }) {
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

    {selectedField.options?.map((option, index) => (
      <input
        key={index}
        type="text"
        value={option}
        onChange={(e) =>
          updateOptions(
            selectedField.id,
            index,
            e.target.value
          )
        }
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
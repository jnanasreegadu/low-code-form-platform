import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Trash2,
} from "lucide-react";
function SortableField({
  field,
  updateLabel,
  deleteField,
  toggleRequired,
  selectedField,
  selectField,
}) {
  const {
    attributes,
    
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
  ref={setNodeRef}
  style={style}
  className={`preview-field ${
    selectedField?.id === field.id ? "active-field" : ""
  }`}

  onClick={() => selectField(field.id)}
>

      <div className="field-header">
      <div
  className="drag-handle"
  {...attributes}
  {...listeners}
>
  <GripVertical size={20} />
</div>

<div className="field-title">
  <input
    className="label-input"
    value={field.label}
    onChange={(e) =>
      updateLabel(field.id, e.target.value)
    }
  />

  {field.required && (
    <span className="required-badge">
      Required
    </span>
  )}
</div>

<button
  className="delete-btn"
  onClick={() => deleteField(field.id)}
>
  <Trash2 size={18}/>
</button>

      </div>

      <div className="field-body">
        <label className="required-row">
          <input
            type="checkbox"
            checked={field.required}
            onChange={() => toggleRequired(field.id)}
          />
          Required
        </label>

        {field.type === "Text" && (
  <input
  className="preview-input"
  placeholder={field.placeholder}
  disabled
/>
)}

{field.type === "Email" && (
  <input
    className="preview-input"
    type="email"
    placeholder={field.placeholder}
    disabled
  />
)}

{field.type === "Number" && (
  <input
    className="preview-input"
    type="number"
    placeholder={field.placeholder}
    disabled
  />
)}

{field.type === "Dropdown" && (
 <select
 className="preview-input"
 style={{
   color: "black",
   background: "white",
 }}
>
 <option>{field.placeholder}</option>

 {field.options?.map((option, index) => (
   <option
     key={index}
     style={{
       color: "black",
       background: "white",
     }}
   >
     {option}
   </option>
 ))}
</select>
)}

{field.type === "Checkbox" && (
  <label className="checkbox-preview">
  <input
    type="checkbox"
    disabled
  />

  {field.label}
</label>
)}

{field.type === "Date" && (
  <input
    className="preview-input"
    type="date"
    disabled
  />
)}
      </div>
    </div>
  );
}

export default SortableField;
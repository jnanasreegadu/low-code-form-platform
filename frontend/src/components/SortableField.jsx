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
  setEditingField,
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
        <div className="drag-handle" {...attributes} {...listeners}>
          <GripVertical size={20} />
        </div>

        <div className="field-title">
          <input
            className="label-input"
            value={field.label}
            onChange={(e) => updateLabel(field.id, e.target.value)}
          />

          <button
            type="button"
            className={`required-toggle-badge ${field.required ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleRequired(field.id);
            }}
          >
            {field.required ? "✓ Required" : "+ Optional"}
          </button>
        </div>

        <div className="field-header-actions">
          {setEditingField && (
            <button
              type="button"
              className="preview-edit-btn-inline"
              onClick={(e) => {
                e.stopPropagation();
                setEditingField(field);
              }}
            >
              ✏ Edit
            </button>
          )}

          <button
            type="button"
            className="delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              deleteField(field.id);
            }}
            title="Delete field"
          >
            <Trash2 size={16}/>
          </button>
        </div>
      </div>


      <div className="field-body">
        {(() => {
          const type = (field.type || "text").toLowerCase();

          if (type === "email") {
            return (
              <input
                className="preview-input"
                type="email"
                placeholder={field.placeholder || "Enter email address"}
                disabled
              />
            );
          }
          if (type === "number" || type === "rating") {
            return (
              <input
                className="preview-input"
                type="number"
                placeholder={field.placeholder || "Enter number or rating"}
                disabled
              />
            );
          }
          if (type === "dropdown" || type === "multicheckbox") {
            return (
              <select className="preview-input">
                <option value="">{field.placeholder || "-- Select an option --"}</option>
                {field.options?.map((opt, i) => (
                  <option key={i} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            );
          }
          if (type === "checkbox") {
            return (
              <label className="checkbox-preview">
                <input type="checkbox" disabled />
                {field.label}
              </label>
            );
          }
          if (type === "date") {
            return (
              <input className="preview-input" type="date" disabled />
            );
          }
          if (type === "file" || type === "upload") {
            return (
              <input className="preview-input" type="file" disabled />
            );
          }
          // Default for "text" or unknown types
          return (
            <input
              className="preview-input"
              type="text"
              placeholder={field.placeholder || "Enter response"}
              disabled
            />
          );
        })()}
      </div>

    </div>
  );
}

export default SortableField;
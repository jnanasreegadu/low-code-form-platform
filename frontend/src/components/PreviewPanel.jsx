import {
  DndContext,
  closestCenter,
} from "@dnd-kit/core";

import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import SortableField from "./SortableField";

function PreviewPanel({
  fields,
  handleDragEnd,
  updateLabel,
  deleteField,
  toggleRequired,
  selectedField,
  selectField,
  editingField,
  setEditingField
}) {
  return (
    <section className="form-preview-card">

      <div className="preview-header">

        <span>
          {fields.length} Field
          {fields.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="preview-form">

        {fields.length === 0 ? (

          <div className="empty-preview">

            <h3>No Fields Added</h3>

            <p>
              Click a field from the library to start
              building your form.
            </p>

          </div>

        ) : (

          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >

            <SortableContext
              items={fields.map((field) => field.id)}
              strategy={verticalListSortingStrategy}
            >

              {fields.map((field) => (

                <div
                  className="preview-field-wrapper"
                  key={field.id}
                >

                  <SortableField
                    field={field}
                    updateLabel={updateLabel}
                    deleteField={deleteField}
                    toggleRequired={toggleRequired}
                    selectedField={selectedField}
                    selectField={selectField}
                  />

                  {/* EDIT BUTTON */}
                  <button
                    type="button"
                    className="preview-edit-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingField(field);
                    }}
                  >
                    ✎ Edit
                  </button>

                </div>

              ))}

            </SortableContext>

          </DndContext>

        )}

      </div>

    </section>
  );
}

export default PreviewPanel;
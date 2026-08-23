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
  addField,
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
          <div className="empty-preview-studio">
            <div className="empty-studio-icon">✨</div>
            <h3>Your Form Canvas is Empty</h3>
            <p>Select field elements from the palette on the left or use AI Assistant to draft a complete form in seconds.</p>

            <div className="empty-canvas-actions">
              <button
                type="button"
                className="canvas-quick-btn"
                onClick={() => addField && addField("Text")}
              >
                + Add Text Field
              </button>
              <button
                type="button"
                className="canvas-quick-btn"
                onClick={() => addField && addField("Email")}
              >
                + Add Email Field
              </button>
              <button
                type="button"
                className="canvas-quick-btn"
                onClick={() => addField && addField("Dropdown")}
              >
                + Add Dropdown
              </button>
            </div>
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
                <SortableField
                  key={field.id}
                  field={field}
                  updateLabel={updateLabel}
                  deleteField={deleteField}
                  toggleRequired={toggleRequired}
                  selectedField={selectedField}
                  selectField={selectField}
                  setEditingField={setEditingField}
                />
              ))}


            </SortableContext>

          </DndContext>

        )}

      </div>

    </section>
  );
}

export default PreviewPanel;
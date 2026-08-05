import { useState,useEffect } from "react";
import { ArrowLeft, Save, Send } from "lucide-react";
import "../styles/CreateForm.css";
import FieldLibrary from "../components/FieldLibrary";
import PreviewPanel from "../components/PreviewPanel";
import { arrayMove } from "@dnd-kit/sortable";
import FieldSettings from "../components/FieldSettings";
import api from "../services/api";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";




function EditForm() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState([]);
  const { id } = useParams();
  useEffect(() => {
    api
      .get(`forms/${id}/`)
      .then((response) => {
        const data = response.data;
  
        setTitle(data.title);
        setDescription(data.description);
        setFields(data.Fields);
      })
      .catch((err) => {
        console.log(err);
      });
  }, [id]);
  const [selectedField, setSelectedField] = useState(null);
  const addField = (type) => {

    const newField = {
      id: Date.now(),
      type,
    
      label:
        type === "Text"
          ? "Full Name"
          : type === "Email"
          ? "Email Address"
          : type === "Number"
          ? "Phone Number"
          : type === "Dropdown"
          ? "Department"
          : type === "Checkbox"
          ? "Accept Terms"
          : "Date of Birth",
  required: false,
  placeholder:
  type === "Text"
    ? "Enter your full name"
    : type === "Email"
    ? "example@gmail.com"
    : type === "Number"
    ? "Enter your phone number"
    : type === "Dropdown"
    ? "Select Department"
    : type === "Checkbox"
    ? ""
    : "",
    options:
    type === "Dropdown"
      ? ["CSE", "ECE", "EEE", "CIVIL", "IT/DS", "AIML", "Others"]
      : [],
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
    const updatedFields = fields.map((field) => {
      if (field.id === fieldId) {
        const newOptions = [...(field.options || [])];
        newOptions[optionIndex] = value;
  
        return {
          ...field,
          options: newOptions,
        };
      }
  
      return field;
    });
  
    setFields(updatedFields);
  
    if (selectedField?.id === fieldId) {
      setSelectedField(
        updatedFields.find((field) => field.id === fieldId)
      );
    }
  };
  const addOption = (fieldId) => {
    const updatedFields = fields.map((field) => {
      if (field.id === fieldId) {
        return {
          ...field,
          options: [...(field.options || []), ""],
        };
      }
  
      return field;
    });
  
    setFields(updatedFields);
  
    if (selectedField?.id === fieldId) {
      setSelectedField(
        updatedFields.find((field) => field.id === fieldId)
      );
    }
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
  const publishForm = async () => {
    try {
      const response = await api.put(`forms/${id}/`, {
        title,
        description,
        Fields: fields,
      });
  
      alert("Form Updated Successfully!");
  
      console.log(response.data);
    } catch (error) {
      console.error(error);
      alert("Failed to Update Form");
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
    <div className="create-page">

      <header className="create-navbar">

      <button
  className="back-btn"
  onClick={() => navigate("/")}
>
  <ArrowLeft size={18} />
  Back
</button>

        <div className="nav-actions">
          <button className="draft-btn">
            <Save size={18} />
            Save Draft
          </button>

          <button
  className="publish-btn"
  onClick={publishForm}
>
  <Send size={18} />
  Update Form
</button>
        </div>

      </header>

      <h1 className="page-title">
        Edit Form
      </h1>

      <div className="builder-layout">


{/* Form Details */}
<div className="glass-card">
  <h2>Form Details</h2>

  <label>Form Title</label>

  <input
    type="text"
    placeholder="Student Registration Form"
    value={title}
    onChange={(e) => setTitle(e.target.value)}
  />

  <label>Description</label>

  <textarea
    placeholder="Enter description..."
    value={description}
    onChange={(e) => setDescription(e.target.value)}
  />
</div>

{/* Field Library */}
<FieldLibrary addField={addField} />
<FieldSettings
  selectedField={selectedField}
  updateLabel={updateLabel}
  updatePlaceholder={updatePlaceholder}
  toggleRequired={toggleRequired}
  deleteField={deleteField}
  updateOptions={updateOptions}
  addOption={addOption}
/>   

</div>
      <PreviewPanel
  fields={fields}
  handleDragEnd={handleDragEnd}
  updateLabel={updateLabel}
  deleteField={deleteField}
  toggleRequired={toggleRequired}
  selectedField={selectedField}
  selectField={selectField}
/>

    </div>
  );
}

export default EditForm;
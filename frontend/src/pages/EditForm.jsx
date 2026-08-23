import { useState, useEffect } from "react";
import { ArrowLeft, Save, Send } from "lucide-react";
import "../styles/CreateForm.css";

import FieldLibrary from "../components/FieldLibrary";
import PreviewPanel from "../components/PreviewPanel";
import FieldSettings from "../components/FieldSettings";

import { arrayMove } from "@dnd-kit/sortable";
import api from "../services/api";
import Sidebar from "../components/Sidebar";
import { useNavigate, useParams } from "react-router-dom";


function EditForm() {

  const navigate = useNavigate();
  const { id } = useParams();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState([]);
  const [selectedField, setSelectedField] = useState(null);
  const [rules, setRules] = useState([]);
  const [limitOneResponsePerEmail, setLimitOneResponsePerEmail] = useState(false);


  // ==============================
  // LOAD EXISTING FORM
  // ==============================

  useEffect(() => {
    api
      .get(`forms/${id}/`)
      .then((response) => {
        const data = response.data;
        console.log("FORM DATA:", data);
        console.log("RULES FROM BACKEND:", data.conditional_rules);
  
        setTitle(data.title);
        setDescription(data.description);
        setFields(data.Fields);
        setLimitOneResponsePerEmail(
          data.limit_one_response_per_email || false
        );
  
        // Load existing conditional rules
        const existingRules = (data.conditional_rules || []).map((rule) => ({
          sourceField: rule.source_field_id,
          operator: rule.operator,
          expectedValue: rule.expected_value,
          targetField: rule.target_field_id,
          action: rule.action,
        }));
  
        setRules(existingRules);
      })
      .catch((err) => {
        console.log("EDIT FORM LOAD ERROR:", err);
      });
  }, [id]);


  // ==============================
  // ADD FIELD
  // ==============================

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
          : type === "Checkbox"
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
          : type === "Checkbox"
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
          : "",

      options:
        type === "Dropdown"
          ? ["Option 1", "Option 2", "Option 3"]
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


  // ==============================
  // DELETE FIELD
  // ==============================

  const deleteField = (fieldId) => {

    const updatedFields = fields.filter(
      (field) => field.id !== fieldId
    );

    setFields(updatedFields);

    if (selectedField?.id === fieldId) {
      setSelectedField(null);
    }

  };


  // ==============================
  // UPDATE OPTIONS
  // ==============================

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
        updatedFields.find(
          (field) => field.id === fieldId
        )
      );

    }

  };


  // ==============================
  // ADD OPTION
  // ==============================

  const addOption = (fieldId) => {

    const updatedFields = fields.map((field) => {

      if (field.id === fieldId) {

        return {
          ...field,
          options: [
            ...(field.options || []),
            ""
          ],
        };

      }

      return field;

    });


    setFields(updatedFields);


    if (selectedField?.id === fieldId) {

      setSelectedField(
        updatedFields.find(
          (field) => field.id === fieldId
        )
      );

    }

  };


  // ==============================
  // UPDATE LABEL
  // ==============================

  const updateLabel = (fieldId, value) => {

    const updatedFields = fields.map((field) =>
      field.id === fieldId
        ? {
            ...field,
            label: value,
          }
        : field
    );


    setFields(updatedFields);


    if (selectedField?.id === fieldId) {

      setSelectedField(
        updatedFields.find(
          (field) => field.id === fieldId
        )
      );

    }

  };


  // ==============================
  // UPDATE PLACEHOLDER
  // ==============================

  const updatePlaceholder = (fieldId, value) => {

    const updatedFields = fields.map((field) =>
      field.id === fieldId
        ? {
            ...field,
            placeholder: value,
          }
        : field
    );


    setFields(updatedFields);


    if (selectedField?.id === fieldId) {

      setSelectedField(
        updatedFields.find(
          (field) => field.id === fieldId
        )
      );

    }

  };


  // ==============================
  // UPDATE VALIDATION
  // ==============================

  const updateValidation = (fieldId, key, value) => {

    const updatedFields = fields.map((field) =>
      field.id === fieldId
        ? {
            ...field,
            [key]: value,
          }
        : field
    );


    setFields(updatedFields);


    if (selectedField?.id === fieldId) {

      setSelectedField(
        updatedFields.find(
          (field) => field.id === fieldId
        )
      );

    }

  };


  // ==============================
  // REQUIRED
  // ==============================

  const toggleRequired = (fieldId) => {

    const updatedFields = fields.map((field) =>
      field.id === fieldId
        ? {
            ...field,
            required: !field.required,
          }
        : field
    );


    setFields(updatedFields);


    if (selectedField?.id === fieldId) {

      setSelectedField(
        updatedFields.find(
          (field) => field.id === fieldId
        )
      );

    }

  };


  // ==============================
  // SELECT FIELD
  // ==============================

  const selectField = (fieldId) => {

    const field = fields.find(
      (item) => item.id === fieldId
    );

    setSelectedField(field);

  };


  // ==============================
  // DRAG & DROP
  // ==============================

  const handleDragEnd = (event) => {

    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }


    const oldIndex = fields.findIndex(
      (item) => item.id === active.id
    );

    const newIndex = fields.findIndex(
      (item) => item.id === over.id
    );


    setFields(
      arrayMove(
        fields,
        oldIndex,
        newIndex
      )
    );

  };


  // ==============================
  // UPDATE FORM
  // ==============================

  const updateForm = async () => {
    try {
      const data = {
        title,
        description,
        limit_one_response_per_email: limitOneResponsePerEmail,
      
        fields: fields,
      
        conditional_rules: rules.map((rule) => ({
          source_field_id: rule.sourceField,
          operator: rule.operator,
          expected_value: rule.expectedValue,
          target_field_id: rule.targetField,
          action: rule.action,
        })),
      };
  
      console.log("UPDATE DATA:", data);
  
      await api.put(`forms/${id}/`, data);
  
      alert("Form Updated Successfully!");
  
      navigate("/dashboard");
  
    } catch (error) {
      console.error("UPDATE ERROR:", error);
      console.error("SERVER RESPONSE:", error.response?.data);
  
      alert("Failed to Update Form");
    }
  };


  // ==============================
  // SAVE DRAFT
  // ==============================

  const saveDraft = async () => {

    try {

      const data = {

        title,
        description,
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


      await api.put(
        `forms/${id}/`,
        data
      );


      alert("Draft Saved Successfully!");

      navigate("/dashboard");

    } catch (error) {

      console.error(error);

      alert("Failed to Save Draft");

    }

  };


  return (
    <>
      <Sidebar />

    <div className="create-page">


      {/* ================= NAVBAR ================= */}

      <header className="create-navbar">

        <button
          className="back-btn"
          onClick={() => navigate("/dashboard")}
        >

          <ArrowLeft size={18} />

          Back

        </button>


        <div className="nav-actions">

          <button
            className="draft-btn"
            onClick={saveDraft}
          >

            <Save size={18} />

            Save Draft

          </button>


          <button
            className="publish-btn"
            onClick={updateForm}
          >

            <Send size={18} />

            Update Form

          </button>

        </div>

      </header>



      {/* ================= TITLE ================= */}

      <h1 className="page-title">
        Edit Form
      </h1>



      {/* ================= BUILDER ================= */}

      <div className="builder-layout">


        {/* LEFT SIDE */}

        <div className="main-builder-column">


          {/* FORM DETAILS */}

          <div className="glass-card form-details-card">

            <h2>
              Form Details
            </h2>


            <label>
              Form Title
            </label>


            <input
              type="text"
              placeholder="Student Registration Form"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
            />


            <label>
              Description
            </label>


            <textarea
              placeholder="Enter description..."
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
            />

          </div>



          {/* FIELD SETTINGS */}

          <div className="field-settings-horizontal">

            <FieldSettings

              selectedField={selectedField}

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



        {/* RIGHT SIDE FIELD LIBRARY */}

        <div className="field-library-side">

          <FieldLibrary
            addField={addField}
          />

        </div>


      </div>



      {/* ================= LIVE PREVIEW ================= */}

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
  </>

  );

}

export default EditForm;
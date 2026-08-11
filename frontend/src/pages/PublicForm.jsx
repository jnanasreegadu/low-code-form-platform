import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import "../styles/PublicForm.css";

function PublicForm() {

    const { uuid } = useParams();

    const [form,setForm]=useState(null);
    const [responses, setResponses] = useState({});
    const [rules, setRules] = useState([]);
    const handleChange = (fieldId, value) => {
        setResponses({
          ...responses,
          [fieldId]: value,
        });
      };
    const isFieldHidden = (fieldId) => {
        const fieldRules = rules.filter(
          (rule) => rule.target_field === fieldId
        );
      
        // No rules for this field → show normally
        if (fieldRules.length === 0) {
          return false;
        }
      
        let shouldHide = false;
        let hasShowRule = false;
        let showConditionMet = false;
      
        for (const rule of fieldRules) {
          const sourceValue = responses[rule.source_field];
      
          // Convert values to strings so checkbox true/false
          // can match expected_value "true"/"false"
          const actualValue =
            sourceValue === true
              ? "true"
              : sourceValue === false
              ? "false"
              : String(sourceValue ?? "");
      
          const expectedValue = String(rule.expected_value ?? "");
      
          let conditionMet = false;
      
          if (rule.operator === "equals") {
            conditionMet = actualValue === expectedValue;
          }
      
          else if (rule.operator === "not_equals") {
            conditionMet = actualValue !== expectedValue;
          }
      
          else if (rule.operator === "contains") {
            conditionMet = actualValue.includes(expectedValue);
          }
      
          else if (rule.operator === "is_empty") {
            conditionMet = actualValue.trim() === "";
          }
      
          else if (rule.operator === "greater_than") {
            conditionMet =
              Number(actualValue) > Number(expectedValue);
          }
      
          // SHOW rule
          if (rule.action === "show") {
            hasShowRule = true;
      
            if (conditionMet) {
              showConditionMet = true;
            }
          }
      
          // HIDE rule
          if (rule.action === "hide" && conditionMet) {
            shouldHide = true;
          }
        }
      
        // Hide rule has priority
        if (shouldHide) {
          return true;
        }
      
        // If a show rule exists, hide until its condition becomes true
        if (hasShowRule && !showConditionMet) {
          return true;
        }
      
        return false;
      };
      
      const handleSubmit = async () => {

        const formData = new FormData();
      
        const responseData = Object.keys(responses).map((id) => ({
          field_id: Number(id),
          value:
            responses[id] instanceof File
              ? ""
              : responses[id],
        }));
      
        // Normal field responses
        formData.append("responses", JSON.stringify(responseData));
      
        // File uploads
        Object.keys(responses).forEach((id) => {
          if (responses[id] instanceof File) {
            formData.append(id, responses[id]);
          }
        });
      
        try {
          await api.post(
            `submissions/${uuid}/submit/`,
            formData
          );
      
          alert("Form Submitted Successfully");
      
        } catch (err) {
          console.log(err);
          console.log(err.response?.data);
      
          alert(
            err.response?.data?.error || "Submission Failed"
          );
        }
      };

      useEffect(() => {
        api.get(`public/${uuid}/`)
          .then((res) => {
            console.log(res.data);
            setForm(res.data);
            setRules(res.data.rules || []);
          })
          .catch((err) => {
            console.log(err);
          });
      
      
      }, [uuid]);

    if(!form)
        return <h2>Loading...</h2>

    return (
        <div className="public-page">
      
          <div className="public-header">
            <h1>{form.form_name}</h1>
            <p>{form.description}</p>
            <span>Version {form.version}</span>
          </div>
      
          <div className="public-container">
      
          {form.fields.map((field) => {

            if (isFieldHidden(field.id)) {
              return null;
            }

            return (
              <div className="field-card" key={field.id}>
                  
                  <label>{field.label}</label>

{field.field_type === "text" && (
  <input
    type="text"
    placeholder={field.placeholder}
    onChange={(e) => handleChange(field.id, e.target.value)}
  />
)}

{field.field_type === "email" && (
  <input
    type="email"
    placeholder={field.placeholder}
    onChange={(e) => handleChange(field.id, e.target.value)}
  />
)}

{field.field_type === "number" && (
  <input
    type="number"
    placeholder={field.placeholder}
    onChange={(e) => handleChange(field.id, e.target.value)}
  />
)}

{field.field_type === "dropdown" && (
  <select
    onChange={(e) => handleChange(field.id, e.target.value)}
  >
    <option value="">
      {field.placeholder || "Select an option"}
    </option>

    {field.options
      ?.filter((option) => option !== "")
      .map((option, index) => (
        <option key={index} value={option}>
          {option}
        </option>
      ))}
  </select>
)}

{field.field_type === "date" && (
  <input
    type="date"
    onChange={(e) => handleChange(field.id, e.target.value)}
  />
)}
{(field.field_type === "file" || field.field_type === "file upload") && (
  <input
    type="file"
    onChange={(e) =>
      handleChange(field.id, e.target.files[0])
    }
  />
)}

{field.field_type === "checkbox" && (
  <div>
    <input
      type="checkbox"
      onChange={(e) => handleChange(field.id, e.target.checked)}
    />
    <span> Accept Terms</span>
  </div>
)}
                                    
              </div>
            );
      
            })}
      
            <button
              className="submit-btn"
              onClick={handleSubmit}
            >
              Submit Form
            </button>
      
          </div>
      
        </div>
      );
}

export default PublicForm;
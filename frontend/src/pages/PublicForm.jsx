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
      
        let shouldHide = false;
      
        for (const rule of fieldRules) {
          const sourceValue = responses[rule.source_field] || "";
      
          const conditionMet =
            (rule.operator === "equals" &&
              sourceValue === rule.expected_value) ||
      
            (rule.operator === "not_equals" &&
              sourceValue !== rule.expected_value) ||
      
            (rule.operator === "contains" &&
              sourceValue.includes(rule.expected_value)) ||
      
            (rule.operator === "is_empty" &&
              sourceValue.trim() === "") ||
      
            (rule.operator === "greater_than" &&
              Number(sourceValue) > Number(rule.expected_value));
      
          if (conditionMet && rule.action === "hide") {
            shouldHide = true;
          }
        }
      
        return shouldHide;
      };
      
      const handleSubmit = async () => {

        const formData = new FormData();
      
        const responseData = Object.keys(responses).map((id) => {
          const field = form.fields.find(
            (f) => f.id === Number(id)
          );
        
          return {
            field_id: Number(id),
            value:
              field?.field_type === "file"
                ? ""
                : responses[id],
          };
        });
      
        // Normal field responses
        formData.append("responses", JSON.stringify(responseData));
      
        // File uploads
        Object.keys(responses).forEach((id) => {
          const field = form.fields.find(
            (f) => f.id === Number(id)
          );
        
          if (
            field?.field_type === "file" &&
            responses[id]
          ) {
            formData.append(
              id,
              responses[id]
            );
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
          })
          .catch((err) => {
            console.log(err);
          });
      
        api.get("conditional-rules/")
          .then((res) => {
            console.log("CONDITIONAL RULES:", res.data);
            setRules(res.data);
          })
          .catch((err) => {
            console.log("RULE ERROR:", err);
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
    <option>Select Department</option>

    {field.options?.map((option, index) => (
      <option key={index}>{option}</option>
    ))}
  </select>
)}

{field.field_type === "date" && (
  <input
    type="date"
    onChange={(e) => handleChange(field.id, e.target.value)}
  />
)}
{field.field_type === "file" && (
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
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import "../styles/PublicForm.css";

function PublicForm() {

    const { id } = useParams();

    const [form,setForm]=useState(null);
    const [responses, setResponses] = useState({});
    const handleChange = (fieldId, value) => {
        setResponses({
          ...responses,
          [fieldId]: value,
        });
      };
      
      const handleSubmit = async () => {
        const payload = {
          responses: Object.keys(responses).map((id) => ({
            field_id: Number(id),
            value: responses[id],
          })),
        };
      
        try {
          await api.post(`forms/${id}/submit/`, payload);
          alert("Form Submitted Successfully");
        } catch (err) {
          console.log(err);
          alert("Submission Failed");
        }
      };

    useEffect(() => {
        api.get(`forms/${id}/public/`)
          .then((res) => {
            console.log(res.data);
            setForm(res.data);
          });
      }, []);

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
      
            {form.fields.map((field) => (
      
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
      
            ))}
      
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
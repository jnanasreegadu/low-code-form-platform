import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import "../styles/ViewForm.css";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

function ViewForm() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [form, setForm] = useState(null);

  useEffect(() => {
    api.get(`forms/${id}/`)
      .then((res) => {
        setForm(res.data);
      })
      .catch((err) => console.log(err));
  }, [id]);

  if (!form) return <h2>Loading...</h2>;

  return (
    <div className="view-page">
      <h1 className="view-title">
  {form.title}
</h1>

<p className="view-description">
  {form.description}
</p>

<h2 className="view-heading">
  Form Fields
</h2>

{form.Fields.map((field) => (
    <div className="view-field" key={field.id}>

    <label>{field.label}</label>
  
    {field.type === "Text" && (
      <input
        className="view-input"
        type="text"
        placeholder={field.placeholder}
        disabled
      />
    )}
  
    {field.type === "Email" && (
      <input
        className="view-input"
        type="email"
        placeholder={field.placeholder}
        disabled
      />
    )}
  
    {field.type === "Number" && (
      <input
        className="view-input"
        type="number"
        placeholder={field.placeholder}
        disabled
      />
    )}
  
    {field.type === "Dropdown" && (
      <select
        className="view-select"
        disabled
      >
        <option>{field.placeholder}</option>
        <option>CSE</option>
        <option>ECE</option>
        <option>AIML</option>
      </select>
    )}
  
    {field.type === "Checkbox" && (
      <label className="view-checkbox">
        <input
          type="checkbox"
          disabled
        />
        {field.label}
      </label>
    )}
  
    {field.type === "Date" && (
      <input
        className="view-input"
        type="date"
        disabled
      />
    )}
  
  </div>
  
))}
  <button
  className="back-btn"
  onClick={() => navigate("/dashboard")}
>

  <ArrowLeft size={18} />
  Back
</button>
  
    </div>
  );
}

export default ViewForm;
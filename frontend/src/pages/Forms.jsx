import { useEffect, useState } from "react";
import api from "../services/api";
import "../styles/Forms.css";
import { Link, useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
function Forms() {
  const [forms, setForms] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("forms/")
      .then((response) => {
        setForms(response.data);
      })
      .catch((error) => console.error(error));
  }, []);

  return (
    <div className="forms-page">

      <div className="forms-header">
        <h1>Forms</h1>

        <button
  className="create-btn"
  onClick={() => navigate("/create")}
>
  + Create Form
</button>
      </div>

      <div className="forms-table-container">

        <table className="forms-table">

          <thead>
            <tr>
              <th>ID</th>
              <th>Form Name</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>

            {forms.map((form) => (

              <tr key={form.id}>

                <td>{form.id}</td>

                <td>{form.title}</td>

                <td>
                  <span className={`status ${form.status}`}>
                    {form.status}
                  </span>
                </td>

                <td>
                <Link to={`/view/${form.id}`}>
  <button className="view-btn">
    <Eye size={18} />
  </button>
</Link>
       </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}

export default Forms;
import { useEffect, useState } from "react";
import api from "../services/api";
import "../styles/Responses.css";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

function Responses() {
  const navigate = useNavigate();
  const [responses, setResponses] = useState([]);

  useEffect(() => {
    api
      .get("submissions/responses/")
      .then((response) => {
        setResponses(response.data);
      })
      .catch((err) => console.log(err));
  }, []);

  return (
    <div className="responses-page">
      <button
  className="back-btn"
  onClick={() => navigate("/")}
>
  <ArrowLeft size={18} />
  Back
</button>
      <h1>Form Responses</h1>

      {responses.length === 0 ? (
        <h3>No Responses Yet</h3>
      ) : (
        responses.map((item) => (
          <div
            className="response-card"
            key={item.submission_id}
          >
            <h3>
              Submission #{item.submission_id}
            </h3>

            <p>
              <strong>Version :</strong>{" "}
              {item.form_version}
            </p>

            <p>
              <strong>Submitted :</strong>{" "}
              {item.submitted_at}
            </p>

            <table>
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Answer</th>
                </tr>
              </thead>

              <tbody>
                {item.responses.map((res, index) => (
                  <tr key={index}>
                    <td>{res.field}</td>
                    <td>
                      {res.file_url ? (
                        <a
                          href={res.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {res.value}
                        </a>
                      ) : (
                        res.value
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}

export default Responses;
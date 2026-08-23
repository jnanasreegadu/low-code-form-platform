import {
  Type,
  Mail,
  Hash,
  ChevronDown,
  CheckSquare,
  Calendar,
  Upload,
} from "lucide-react";

function FieldLibrary({ addField }) {
  const fieldTypes = [
    {
      icon: <Type size={22} />,
      name: "Text",
      description: "Single line input",
    },
    {
      icon: <Mail size={22} />,
      name: "Email",
      description: "Email address",
    },
    {
      icon: <Hash size={22} />,
      name: "Number",
      description: "Numeric input",
    },
    {
      icon: <ChevronDown size={22} />,
      name: "Dropdown",
      description: "Choose one option",
    },
    {
      icon: <CheckSquare size={22} />,
      name: "Checkbox",
      description: "True / False",
    },
    {
      icon: <Calendar size={22} />,
      name: "Date",
      description: "Pick a date",
    },
    {
      icon: <Upload size={22} />,
      name: "File Upload",
      description: "Upload a file",
    },
  ];

  return (
    <div className="glass-card field-library-card">
      <span className="section-eyebrow">BUILD</span>
      <h2>Field Library</h2>
      <p style={{ color: "#94a3b8", fontSize: "13px", margin: "4px 0 16px" }}>
        Click a field to add it to your form
      </p>

      <div className="field-grid">

        {fieldTypes.map((field) => (
          <button
            key={field.name}
            className="field-item"
            onClick={() => addField(field.name)}
          >
            <div className="field-icon">
              {field.icon}
            </div>

            <div className="field-info">
              <h4>{field.name}</h4>
              <p>{field.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default FieldLibrary;
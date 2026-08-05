import {
  Type,
  Mail,
  Hash,
  ChevronDown,
  CheckSquare,
  Calendar,
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
  ];

  return (
    <div className="glass-card">
      <h2>Field Library</h2>

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
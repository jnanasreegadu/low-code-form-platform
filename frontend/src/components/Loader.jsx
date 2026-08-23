import "./Loader.css";
import infinity from "../assets/infinity.svg";

function Loader({ text = "Loading FormFlow..." }) {
  return (
    <div className="loader-overlay">
      <div className="loader-card">
        <div className="loader-spinner-wrap">
          <img src={infinity} alt="Loading..." className="loader-gif" />
          <div className="loader-glow-ring"></div>
        </div>
        <h2>FormFlow</h2>
        <p>{text}</p>
      </div>
    </div>
  );
}



export default Loader;
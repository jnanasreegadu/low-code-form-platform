import "./Loader.css";
import infinity from "../assets/infinity.svg";

function Loader() {
  return (
    <div className="loader-container">
      <img src={infinity} alt="Loading..." className="loader-gif" />

      <h2>FormFlow</h2>

      <p>Loading...</p>
    </div>
  );
}

export default Loader;
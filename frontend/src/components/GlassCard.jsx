import "../styles/GlassCard.css";
import { motion } from "framer-motion";

function GlassCard({ title, value, className = "" }) {
  return (
    <motion.div
      className={`dashboard-glass-card ${className}`}
      whileHover={{
        scale: 1.05,
        y: -8,
      }}
      transition={{
        type: "spring",
        stiffness: 250,
      }}
    >
      <h3>{title}</h3>
      <h1>{value}</h1>
    </motion.div>
  );
}

export default GlassCard;
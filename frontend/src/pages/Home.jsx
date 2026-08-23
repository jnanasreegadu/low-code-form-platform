import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileText,
  GitBranch,
  MessageSquare,
  Share2,
  Sparkles,
  Zap,
} from "lucide-react";
import "../styles/Home.css";

function Home() {
  const navigate = useNavigate();

  const isLoggedIn = !!localStorage.getItem("token");

  const handleGetStarted = () => {
    if (isLoggedIn) {
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  };

  const features = [
    {
      icon: FileText,
      title: "Smart Form Builder",
      description:
        "Create beautiful and powerful forms with an easy-to-use form building experience.",
    },
    {
      icon: GitBranch,
      title: "Conditional Logic",
      description:
        "Create dynamic forms that respond intelligently to the answers given by users.",
    },
    {
      icon: MessageSquare,
      title: "Response Management",
      description:
        "Collect, organize and manage all your form responses in one place.",
    },
    {
      icon: BarChart3,
      title: "Response Analytics",
      description:
        "Turn your collected responses into meaningful insights and performance data.",
    },
    {
      icon: Share2,
      title: "Easy Sharing",
      description:
        "Publish your forms and share them instantly using a unique form link.",
    },
    {
      icon: Zap,
      title: "Powerful Management",
      description:
        "Edit, publish, archive and manage all your forms from a single workspace.",
    },
  ];

  return (
    <div className="home-page">

      {/* BACKGROUND GLOW */}
      <div className="home-bg-glow home-glow-one"></div>
      <div className="home-bg-glow home-glow-two"></div>
      <div className="home-bg-grid"></div>

      {/* NAVBAR */}
      <nav className="home-navbar">

        <div className="home-brand">
          <div className="home-logo">F</div>

          <div>
            <h2>FormFlow</h2>
            <span>Form management platform</span>
          </div>
        </div>

        <div className="home-nav-links">
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <a href="#about">About</a>
        </div>

        <div className="home-nav-actions">
          {isLoggedIn ? (
            <button
              className="nav-dashboard-btn"
              onClick={() => navigate("/dashboard")}
            >
              Dashboard
            </button>
          ) : (
            <>
              <button
                className="nav-login-btn"
                onClick={() => navigate("/login")}
              >
                Login
              </button>

              <button
                className="nav-signup-btn"
                onClick={() => navigate("/login")}
              >
                Get Started
              </button>
            </>
          )}
        </div>

      </nav>

      {/* HERO */}
      <main id="home">

        <section className="home-hero">

          {/* LEFT */}
          <motion.div
            className="hero-content"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
          >

            <div className="hero-badge">
              <Sparkles size={15} />
              BUILD • SHARE • ANALYZE
            </div>

            <h1>
              Forms made simple.
              <br />
              <span>Insights made powerful.</span>
            </h1>

            <p>
              FormFlow helps you create intelligent forms, collect responses
              and understand your data — all from one powerful workspace.
            </p>

            <div className="hero-buttons">

              <button
                className="hero-primary-btn"
                onClick={handleGetStarted}
              >
                {isLoggedIn ? "Go to Dashboard" : "Get Started"}
                <ArrowRight size={18} />
              </button>

              <a href="#features" className="hero-secondary-btn">
                Explore Features
              </a>

            </div>

            <div className="hero-trust">
              <CheckCircle2 size={16} />
              Simple • Powerful • Built for productivity
            </div>

          </motion.div>


          {/* RIGHT VISUAL */}
          <motion.div
            className="hero-visual"
            initial={{ opacity: 0, scale: 0.9, x: 40 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
          >

            {/* MAIN FORM CARD */}
            <motion.div
              className="floating-form-card"
              animate={{ y: [0, -10, 0] }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >

              <div className="mini-card-top">
                <div>
                  <span>FORM BUILDER</span>
                  <h3>Customer Feedback</h3>
                </div>

                <div className="mini-icon">
                  <FileText size={18} />
                </div>
              </div>

              <div className="fake-input">
                <span>Full Name</span>
                <div></div>
              </div>

              <div className="fake-input">
                <span>Email Address</span>
                <div></div>
              </div>

              <div className="fake-question">
                <span>How would you rate us?</span>

                <div className="stars">
                  ★ ★ ★ ★ ★
                </div>
              </div>

              <div className="mini-submit">
                Publish Form
                <ArrowRight size={14} />
              </div>

            </motion.div>


            {/* ANALYTICS CARD */}
            <motion.div
              className="floating-analytics-card"
              animate={{ y: [0, 8, 0] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <div className="analytics-icon">
                <BarChart3 size={19} />
              </div>

              <div>
                <span>Responses</span>
                <strong>1,284</strong>
              </div>

              <div className="analytics-growth">
                +24%
              </div>
            </motion.div>


            {/* PUBLISHED CARD */}
            <motion.div
              className="floating-published-card"
              animate={{ y: [0, -7, 0] }}
              transition={{
                duration: 4.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <CheckCircle2 size={18} />
              <div>
                <span>Form Status</span>
                <strong>Published</strong>
              </div>
            </motion.div>


            {/* DECORATION */}
            <div className="visual-orb orb-one"></div>
            <div className="visual-orb orb-two"></div>

          </motion.div>

        </section>


        {/* FEATURES */}
        <section id="features" className="features-section">

          <motion.div
            className="section-title"
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span>POWERFUL FEATURES</span>

            <h2>
              Everything you need to
              <br />
              <strong>build better forms.</strong>
            </h2>

            <p>
              From creating forms to understanding responses, FormFlow keeps
              everything simple and organized.
            </p>
          </motion.div>


          <div className="features-grid">

            {features.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <motion.div
                  className="feature-card"
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.45,
                    delay: index * 0.08,
                  }}
                  whileHover={{ y: -8 }}
                >

                  <div className="feature-icon">
                    <Icon size={22} />
                  </div>

                  <h3>{feature.title}</h3>

                  <p>{feature.description}</p>

                  <div className="feature-arrow">
                    Explore
                    <ArrowRight size={15} />
                  </div>

                </motion.div>
              );
            })}

          </div>

        </section>


        {/* ABOUT */}
        <section id="about" className="home-about">

          <div className="about-card">

            <div className="about-icon">
              <Sparkles size={25} />
            </div>

            <div>
              <span>WHY FORMFLOW?</span>

              <h2>
                One workspace.
                <br />
                Everything under control.
              </h2>

              <p>
                FormFlow brings form creation, publishing, responses,
                conditional logic and analytics together into one simple
                workspace.
              </p>
            </div>

          </div>

        </section>

      </main>


      {/* FOOTER */}
      <footer className="home-footer">
        <div className="home-brand">
          <div className="home-logo">F</div>

          <div>
            <h2>FormFlow</h2>
            <span>Build smarter forms.</span>
          </div>
        </div>

        <p>
          © {new Date().getFullYear()} FormFlow. All rights reserved.
        </p>
      </footer>

    </div>
  );
}

export default Home;
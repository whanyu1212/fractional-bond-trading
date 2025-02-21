import React from "react";
import { useNavigate } from "react-router-dom";
import "./Homepage.css"; // Import CSS file

const Homepage: React.FC = () => {
  const navigate = useNavigate(); // Initialize navigation

  return (
    <div className="homepage-container">
      {/* Hero Section */}
      <header className="hero-section">
        <h1>BondChain</h1>
        <p>A Blockchain-Based Platform for Fractional Bond Trading</p>
        <div className="hero-buttons">
          <button className="primary-button" onClick={() => navigate("/signin")}>
            <i className="fas fa-play-circle"></i> Start Investing
          </button>
          <button className="secondary-button">
            <i className="fas fa-info-circle"></i> Learn More
          </button>
        </div>
      </header>

      {/* Why BondChain? */}
      <section className="section">
        <h2>Why BondChain?</h2>
        <div className="grid-container single-line">
          {[
            { title: "Lowering Barriers", icon: "fas fa-unlock" },
            { title: "Market Efficiency", icon: "fas fa-chart-line" },
            { title: "Transparency & Trust", icon: "fas fa-eye" },
            { title: "Regulatory Compliance", icon: "fas fa-balance-scale" },
            { title: "Digital Asset Adoption", icon: "fas fa-coins" },
          ].map((item, index) => (
            <div key={index} className="grid-item">
              <i className={`${item.icon} fa-2x`}></i>
              <h3>{item.title}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* Investment Process */}
      <section className="section light-bg">
        <h2>Investment Process</h2>
        <div className="grid-container">
          {[
            { step: "Register", icon: "fas fa-user-plus" },
            { step: "Fund Account", icon: "fas fa-wallet" },
            { step: "Choose Bonds", icon: "fas fa-hand-holding-usd" },
            { step: "Complete Trade", icon: "fas fa-check-circle" },
          ].map((item, index) => (
            <div key={index} className="grid-item">
              <i className={`${item.icon} fa-2x`}></i>
              <h3>{item.step}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* Call to Action */}
      <section className="section">
        <h2>Start Your Investment Journey</h2>
        <p>Join us and experience safe, efficient tokenized bond investment with as little as $100.</p>
        <button className="cta-button" onClick={() => navigate("/signup")}>
          <i className="fas fa-user-edit"></i> Register Now
        </button>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>&copy; 2025 Tokenized Bond Trading Platform. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Homepage;

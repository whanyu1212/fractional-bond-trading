"use client"; // 使用 Next.js 的前端导航必须加

import { useRouter } from "next/navigation";
import styles from "./Homepage.module.css";

const Homepage = () => {
  const router = useRouter();

  return (
    <div className={styles["homepage-container"]}>
      <header className={styles["hero-section"]}>
        <h1>BondChain</h1>
        <p>
          Invest in fractional bonds through blockchain technology. Join our
          community to access institutional-grade bonds with as little as $100.
        </p>
        <div className={styles["hero-buttons"]}>
          <button className={styles["primary-button"]} onClick={() => router.push("/account")}>
            Start Investing
          </button>
          <button className={styles["secondary-button"]} onClick={() => router.push("/about")}>
            Learn More
          </button>
        </div>
      </header>

      <section className={styles.section}>
        <h2>Why BondChain?</h2>
        <div className={`${styles["grid-container"]} ${styles["single-line"]}`}>
          {[
            { title: "Lowering Barriers", icon: "🔓" },
            { title: "Market Efficiency", icon: "📈" },
            { title: "Transparency & Trust", icon: "👁️" },
            { title: "Regulatory Compliance", icon: "⚖️" },
            { title: "Digital Asset Adoption", icon: "🪙" },
          ].map((item, index) => (
            <div key={index} className={styles["grid-item"]}>
              <div style={{ fontSize: 32 }}>{item.icon}</div>
              <h3>{item.title}</h3>
            </div>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles["light-bg"]}`}>
        <h2>Investment Process</h2>
        <div className={styles["grid-container"]}>
          {[
            { step: "Register", icon: "📝" },
            { step: "Fund Account", icon: "👛" },
            { step: "Choose Bonds", icon: "💵" },
            { step: "Complete Trade", icon: "✅" },
          ].map((item, index) => (
            <div key={index} className={styles["grid-item"]}>
              <div style={{ fontSize: 32 }}>{item.icon}</div>
              <h3>{item.step}</h3>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2>Start Your Investment Journey</h2>
        <p>Join us and experience safe, efficient tokenized bond investment with as little as $100.</p>
        <button className={styles["cta-button"]} onClick={() => router.push("/account")}>
          Register Now
        </button>
      </section>

      <footer className={styles.footer}>
        <p>&copy; 2025 Tokenized Bond Trading Platform. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Homepage;

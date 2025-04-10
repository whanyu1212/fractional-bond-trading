"use client";

import { useRouter } from "next/navigation";
import styles from "./LearnMore.module.css";

const LearnMore = () => {
  const router = useRouter();

  return (
    <div className={styles["learnmore-container"]}>
      <header className={styles["hero-section"]}>
        <h1>Learn More About BondChain</h1>
        <p>Discover how we’re revolutionizing bond trading with blockchain technology.</p>
      </header>

      <section className={styles.section}>
        <h2>Why BondChain?</h2>
        <p>
          Traditional bond markets are inaccessible to most investors due to high capital requirements, slow transactions, and intermediary fees.
          BondChain introduces fractionalized digital bonds, allowing retail investors to access institutional-grade assets with ease.
        </p>
      </section>

      <section className={`${styles.section} ${styles["light-bg"]}`}>
        <h2>Core Features</h2>
        <ul>
          <li><strong>Tokenization:</strong> Bonds are converted into secure, tradeable digital assets.</li>
          <li><strong>Stablecoin Integration:</strong> Seamless bond payments using USDC and other stablecoins.</li>
          <li><strong>Regulatory Compliance:</strong> On-chain KYC/AML ensures legal and secure transactions.</li>
          <li><strong>Smart Contracts:</strong> Automated interest payouts and bond redemptions.</li>
          <li><strong>Instant Settlement:</strong> 24/7 trading without delays or intermediaries.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>Meet the Team</h2>
        <div className={styles["team-container"]}>
          {[
            { name: "Chen Ju", role: "Blockchain Developer" },
            { name: "Chen Yihui", role: "Product Manager & UI Designer" },
            { name: "Tan Min Shuang", role: "Project Manager" },
            { name: "Xu Yi", role: "Frontend Developer" },
            { name: "Wu Hanyu", role: "Blockchain Developer" },
            { name: "Zhou Runbing", role: "Frontend Developer" },
          ].map((member, index) => (
            <div key={index} className={styles["team-member"]}>
              <h3>{member.name}</h3>
              <p>{member.role}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles["light-bg"]}`}>
        <h2>Technical Overview</h2>
        <p>
          BondChain runs on a blockchain-based infrastructure utilizing smart contracts for automated settlements and compliance.
          Our architecture ensures secure, efficient, and transparent trading, enabling investors to manage their bond portfolios effortlessly.
        </p>
      </section>

      <section className={styles.section}>
        <h2>Regulatory Compliance</h2>
        <p>
          BondChain integrates built-in KYC/AML compliance mechanisms to ensure all transactions are legally compliant and secure.
          We leverage blockchain’s transparency to enhance trust and auditability in bond trading.
        </p>
      </section>

      <div className={styles["cta-container"]}>
        <button className={styles["cta-button"]} onClick={() => router.push("/")}>
          Back to Homepage
        </button>
      </div>

      <footer className={styles.footer}>
        <p>&copy; 2025 Tokenized Bond Trading Platform. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LearnMore;

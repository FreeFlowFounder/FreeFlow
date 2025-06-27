import { Link } from "react-router-dom";
import PageContainer from "../components/PageContainer";

function Home() {
  return (
    <PageContainer>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "50vh",
          width: "100%",
        }}
      >
        <img
          src="/FreeFlow_Logo.png"
          alt="FreeFlow Logo"
          style={{ width: "200px", marginBottom: "2rem" }}
        />

        <h2 style={{ fontSize: "2rem", color: "#081c3b" }}>
          Borderless Giving. Built on Crypto.
        </h2>

        <p
          style={{
            maxWidth: "600px",
            margin: "1rem auto",
            fontSize: "1.1rem",
            textAlign: "center",
          }}
        >
          FreeFlow is a censorship-resistant crowdfunding platform for
          principled, freedom-focused causes. Donate across chains. Stake FLW.
          Fund what matters.
        </p>

        <div
          style={{
            marginTop: "2rem",
            display: "flex",
            justifyContent: "center",
            gap: "2rem",
          }}
        >
          <Link to="/campaigns">
            <button style={buttonStyle}>Browse Campaigns</button>
          </Link>
          <Link to="/create">
            <button style={buttonStyle}>Start a Campaign</button>
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}

const buttonStyle = {
  padding: "0.75rem 1.5rem",
  fontSize: "1rem",
  backgroundColor: "#081c3b",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};

export default Home;


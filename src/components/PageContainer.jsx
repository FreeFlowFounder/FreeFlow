function PageContainer({ children }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "900px",        // ✅ match NavBar and App
        margin: "0 auto",         // ✅ centers horizontally
        padding: "1.5rem 1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        //backgroundColor: "white", // optional for contrast
      }}
    >
      {children}
    </div>
  );
}

export default PageContainer;



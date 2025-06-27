import React, { useState } from "react";
import axios from "axios";

function ImageUploader({ onUpload }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");

  const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
  const PINATA_API_SECRET = import.meta.env.VITE_PINATA_SECRET;


  function handleFileChange(e) {
  const selected = e.target.files[0];

  if (selected && selected.size > 5 * 1024 * 1024) {
    alert("Image too large (max 5MB). Please choose a smaller file.");
    return;
  }

  setFile(selected);
}

  async function handleUpload() {
    if (!file) return;

    setStatus("Uploading...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
        maxContentLength: "Infinity",
        headers: {
          "Content-Type": "multipart/form-data",
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_API_SECRET,
        },
      });

      const ipfsHash = res.data.IpfsHash;
      const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      setStatus("Upload successful!");
      onUpload(ipfsUrl);  // send to parent
    } catch (err) {
      console.error(err);
      setStatus("Upload failed");
    }
  }

  return (
    <div>
      <label>Upload Campaign Image:</label>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload} style={{ marginLeft: "1rem" }}>Upload</button>
      {status && <p>{status}</p>}
    </div>
  );
}

export default ImageUploader;

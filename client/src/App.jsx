import React, { useState, useRef } from 'react';
import { Shield, Server, Zap, Lock, Unlock, ShieldCheck, Download, UploadCloud } from 'lucide-react';
import './App.css';

const API_URL = "http://localhost:8000";

function App() {
  const [activeSystem, setActiveSystem] = useState("aegis"); // "aegis" or "cypher"
  const [selectedFile, setSelectedFile] = useState(null);
  const [vaultData, setVaultData] = useState(null);
  const [attackResult, setAttackResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleToggle = (system) => {
    setActiveSystem(system);
    setVaultData(null);
    setAttackResult(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleEncrypt = async () => {
    if (!selectedFile) return;
    setLoading(true);
    try {
      const endpoint = activeSystem === "aegis" ? "/aegis/upload" : "/cypher/upload";
      const formData = new FormData();
      formData.append("file", selectedFile);
      
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      setVaultData(data);
      setAttackResult(null);
    } catch (err) {
      console.error("Encryption Error:", err);
      alert("Failed to upload and encrypt. See console.");
    }
    setLoading(false);
  };

  const handleDownload = async () => {
    if (!vaultData) return;
    setLoading(true);
    try {
      const endpoint = activeSystem === "aegis" ? "/aegis/download" : "/cypher/download";
      const formData = new FormData();
      formData.append("file_id", vaultData.file_id);
      
      if (activeSystem === "aegis") {
        formData.append("private_key", vaultData.private_key);
        formData.append("public_key", vaultData.public_key);
      } else {
        formData.append("shared_secret", vaultData.shared_secret_simulate);
      }
      
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        body: formData
      });
      
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText);
      }
      
      const disposition = res.headers.get('Content-Disposition');
      let filename = 'decrypted_file';
      if (disposition && disposition.includes('filename="')) {
        filename = disposition.split('filename="')[1].split('"')[0];
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download Error:", err);
      alert(`Download/Decryption failed: ${err.message}`);
    }
    setLoading(false);
  };

  const handleAttack = async () => {
    if (!vaultData || !vaultData.public_key) return;
    setLoading(true);
    setAttackResult({ logs: ["Initializing Quantum Registers..."], success: null, message: "Standby...", cracked_key_snippet: "" });
    try {
      const endpoint = activeSystem === "aegis" ? "/aegis/crack" : "/cypher/crack";
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_key: vaultData.public_key })
      });
      const data = await res.json();
      
      for (let i = 0; i < data.logs.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 600));
        setAttackResult(prev => ({
          ...prev,
          logs: data.logs.slice(0, i + 1)
        }));
      }
      
      setAttackResult(data);
    } catch (err) {
      console.error("Attack Error:", err);
    }
    setLoading(false);
  };

  const isSecured = attackResult ? !attackResult.success : true;

  return (
    <div className="app-container">
      <header className="header">
        <h1>{activeSystem === 'aegis' ? 'Aegis Prime (Legacy)' : 'Cypher-Shield (Next-Gen)'}</h1>
        <p>Quantum Architecture Simulation & Penetration Testing</p>
      </header>

      <div className="system-toggle">
        <button 
          className={`toggle-btn ${activeSystem === 'aegis' ? 'active' : ''}`}
          onClick={() => handleToggle('aegis')}
        >
          Aegis Prime (RSA)
        </button>
        <button 
          className={`toggle-btn ${activeSystem === 'cypher' ? 'active' : ''}`}
          onClick={() => handleToggle('cypher')}
        >
          Cypher-Shield (PQC)
        </button>
      </div>

      <div className="dashboard-grid">
        
        {/* 1. User System */}
        <div className="panel user-system" style={{ borderColor: isSecured ? 'var(--border-color)' : 'rgba(255,8,68,0.5)'}}>
          <div className="panel-header">
            <div className="panel-icon"><Shield color="var(--neon-blue)" /></div>
            <h2 className="panel-title">Client System</h2>
          </div>
          <p className="control-label" style={{marginBottom: "1rem"}}>Holds Private Keys locally. Uploads encrypted files.</p>
          
          <div className="control-group">
            <label className="control-label">Select File to Upload:</label>
            <div className="file-input-wrapper">
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{display: 'none'}}
              />
              <button className="btn" onClick={() => fileInputRef.current && fileInputRef.current.click()} style={{width: '100%'}}>
                 <UploadCloud size={18} style={{marginRight: '8px'}} /> {selectedFile ? selectedFile.name : "Choose File..."}
              </button>
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleEncrypt} disabled={loading || !selectedFile}>
            <Lock size={18} /> {loading ? 'Processing...' : `Sign, Encrypt & Upload`}
          </button>
          
          {vaultData && (
             <div className="control-group" style={{marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(255,255,255,0.1)"}}>
                <label className="control-label">File Available in Vault:</label>
                <button className="btn" onClick={handleDownload} disabled={loading} style={{background: 'rgba(0, 255, 135, 0.1)', color: 'var(--neon-green)', borderColor: 'var(--neon-green)'}}>
                  <Download size={18} /> Fetch & Decrypt File
                </button>
             </div>
          )}

          {attackResult && attackResult.success && (
            <div className="data-box alert" style={{marginTop: "2rem"}}>
               <p style={{color: "var(--neon-red)", fontWeight: "bold", marginBottom: "0.5rem"}}>⚠️ ALERT: System Compromised</p>
               <pre>The Quantum Attack successfully derived your private key via the server's public key interaction.</pre>
            </div>
          )}
        </div>

        {/* 2. Server Vault */}
        <div className="panel vault-server">
          {vaultData ? (
             <div className={`status-badge ${isSecured ? 'secure' : 'danger'}`}>
               {isSecured ? 'ENCRYPTED' : 'BREACHED'}
             </div>
          ) : null}
          
          <div className="panel-header">
            <div className="panel-icon"><Server color="var(--neon-purple)" /></div>
            <h2 className="panel-title">Server Vault</h2>
          </div>
          <p className="control-label" style={{marginBottom: "1rem"}}>Does not possess Private Keys. Stores encrypted files and metadata in SQLite.</p>

          <div className="data-box info">
            <div className="control-label">Digital Signature (SQLite DB):</div>
            <pre style={{color: 'var(--neon-blue)'}}>{vaultData ? vaultData.digital_signature.substring(0, 150) + "..." : "No Signature Yet"}</pre>
          </div>

          <div className="data-box info" style={{marginTop: "1rem"}}>
            <div className="control-label">Stored Public Key Format:</div>
            <pre>{vaultData ? vaultData.public_key.substring(0, 150) + "..." : "No Data"}</pre>
          </div>

          <div className="data-box" style={{marginTop: "1rem"}}>
             <div className="control-label">File Storage / Ciphertext Path:</div>
             <pre>
               {vaultData 
                  ? (activeSystem === 'aegis' 
                      ? `[AEGIS FILE SERVER]\nStored RSA-AES Encrypted Blob for ID: ${vaultData.file_id}` 
                      : `[LATTICE KEM SERVER]\nKyber Encapsulation Key:\n${vaultData.pqc_key_ciphertext.substring(0,50)}...\n\nSymmetric AES Payload Stored for ID: ${vaultData.file_id}`)
                  : "Awaiting Data Injection..."}
             </pre>
          </div>
        </div>

        {/* 3. Quantum Attacker */}
        <div className="panel quantum-attacker">
          <div className="panel-header">
            <div className="panel-icon"><Zap color="var(--neon-red)" /></div>
            <h2 className="panel-title">Quantum Threat</h2>
          </div>
          <p className="control-label" style={{marginBottom: "1rem"}}>
            Simulates a Quantum Computer attempting to break the server's math using {activeSystem === 'aegis' ? "Shor's Algorithm." : "Grover's Search over Lattices."}
          </p>

          <button 
             className="btn btn-danger" 
             onClick={handleAttack} 
             disabled={loading || !vaultData}
          >
             <Zap size={18} /> Initialize Quantum Attack
          </button>

          {attackResult && (
             <div className="data-box" style={{marginTop: "1.5rem"}}>
               {attackResult.logs && attackResult.logs.map((log, i) => (
                 <div key={i} className="log-entry">{">"} {log}</div>
               ))}
               
               {attackResult.success !== null && (
                 <div className="control-group" style={{marginTop: "1.5rem"}}>
                   <button className="btn" disabled style={{
                       background: attackResult.success ? 'rgba(255, 8, 68, 0.2)' : 'rgba(0, 255, 135, 0.2)',
                       color: attackResult.success ? 'var(--neon-red)' : 'var(--neon-green)',
                       border: `1px solid ${attackResult.success ? 'var(--neon-red)' : 'var(--neon-green)'}`
                   }}>
                     {attackResult.success ? <Unlock size={18}/> : <ShieldCheck size={18}/>}
                     {attackResult.success ? "Decryption Successful" : "Decryption FAILED"}
                   </button>
                   <p style={{marginTop: "1rem", fontSize: "0.9rem", color: "var(--text-secondary)"}}>
                     {attackResult.message}
                   </p>
                 </div>
               )}
             </div>
          )}

        </div>

      </div>
    </div>
  );
}

export default App;

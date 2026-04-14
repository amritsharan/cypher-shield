from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import crypto_utils
import database
import os
import uuid

# Directory for encrypted files (The Vault)
STORAGE_DIR = os.path.join(os.path.dirname(__file__), "vault_storage")
os.makedirs(STORAGE_DIR, exist_ok=True)

app = FastAPI(title="Cypher-Shield API")

@app.on_event("startup")
def startup_event():
    database.init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PubKeyPayload(BaseModel):
    public_key: str

@app.get("/")
def read_root():
    return {"status": "Quantum Simulation Server Active"}

# === AEGIS PRIME ROUTES ===

@app.post("/aegis/upload")
async def aegis_upload(file: UploadFile = File(...)):
    file_bytes = await file.read()
    
    # 1. Generate keys
    pub, priv = crypto_utils.generate_aegis_keys()
    
    # 2. Sign file
    signature = crypto_utils.sign_aegis(file_bytes, priv)
    
    # 3. Encrypt file
    enc_data = crypto_utils.encrypt_aegis(file_bytes, pub)
    
    # 4. Save to disk (Vault)
    file_id_str = str(uuid.uuid4())
    cipher_path = os.path.join(STORAGE_DIR, f"{file_id_str}.aegis")
    with open(cipher_path, "wb") as f:
        f.write(enc_data)
        
    # 5. Store DB metadata
    db_id = database.save_file_metadata(file.filename, signature, cipher_path, "aegis")
    
    return {
        "file_id": db_id,
        "filename": file.filename,
        "digital_signature": signature,
        "public_key": pub,
        "private_key": priv # Provided to client representing their local key storage
    }

@app.post("/aegis/download")
async def aegis_download(file_id: int = Form(...), private_key: str = Form(...), public_key: str = Form(...)):
    # 1. Fetch metadata
    meta = database.get_file_metadata(file_id)
    if not meta or meta['encryption_type'] != 'aegis':
        raise HTTPException(status_code=404, detail="File not found")
        
    # 2. Read encrypted file
    with open(meta['cipher_text_path'], "rb") as f:
        enc_data = f.read()
        
    # 3. Decrypt
    try:
        dec_data = crypto_utils.decrypt_aegis(enc_data, private_key)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Decryption failed. Incorrect key or damaged data.")
        
    # 4. Verify Signature
    is_valid = crypto_utils.verify_aegis(dec_data, meta['digital_signature'], public_key)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Digital signature verification failed! File integrity compromised.")
        
    # Return as downloadable blob
    return Response(
        content=dec_data, 
        media_type="application/octet-stream", 
        headers={"Content-Disposition": f'attachment; filename="{meta["filename"]}"',
                 "Access-Control-Expose-Headers": "Content-Disposition"}
    )

@app.post("/aegis/crack")
def crack_aegis(payload: PubKeyPayload):
    result = crypto_utils.simulate_shors_attack(payload.public_key)
    return result

# === CYPHER-SHIELD ROUTES ===

@app.post("/cypher/upload")
async def cypher_upload(file: UploadFile = File(...)):
    file_bytes = await file.read()
    
    # 1. Generate keys
    pub, priv = crypto_utils.generate_cypher_shield_keys()
    
    # 2. Sign file (Lattice signature)
    signature = crypto_utils.sign_cypher_shield(file_bytes)
    
    # 3. Encrypt file (KEM payload)
    pqc_cipher, payload_cipher, shared_secret = crypto_utils.encrypt_cypher_shield(file_bytes, pub)
    
    # 4. Save to disk (Vault) - store both KEM cipher and payload cipher together for simplicity
    file_id_str = str(uuid.uuid4())
    cipher_path = os.path.join(STORAGE_DIR, f"{file_id_str}.cypher")
    with open(cipher_path, "wb") as f:
        f.write(payload_cipher)
        
    # 5. Store DB metadata
    db_id = database.save_file_metadata(file.filename, signature, cipher_path, "cypher")
    
    return {
        "file_id": db_id,
        "filename": file.filename,
        "digital_signature": signature,
        "public_key": pub,
        "pqc_key_ciphertext": pqc_cipher,
        "shared_secret_simulate": shared_secret # We'll send this to client to simulate their derived key
    }

@app.post("/cypher/download")
async def cypher_download(file_id: int = Form(...), shared_secret: str = Form(...)):
    # 1. Fetch metadata
    meta = database.get_file_metadata(file_id)
    if not meta or meta['encryption_type'] != 'cypher':
        raise HTTPException(status_code=404, detail="File not found")
        
    # 2. Read encrypted file payload
    with open(meta['cipher_text_path'], "rb") as f:
        payload_cipher = f.read()
        
    # 3. Decrypt
    try:
        dec_data = crypto_utils.decrypt_cypher_shield(payload_cipher, shared_secret)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Decryption failed.")
        
    # 4. Verify Signature
    is_valid = crypto_utils.verify_cypher_shield(dec_data, meta['digital_signature'])
    if not is_valid:
        raise HTTPException(status_code=400, detail="PQC digital signature verification failed!")
        
    # Return as downloadable blob
    return Response(
        content=dec_data, 
        media_type="application/octet-stream", 
        headers={"Content-Disposition": f'attachment; filename="{meta["filename"]}"',
                 "Access-Control-Expose-Headers": "Content-Disposition"}
    )

@app.post("/cypher/crack")
def crack_cypher(payload: PubKeyPayload):
    result = crypto_utils.simulate_lattice_attack()
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

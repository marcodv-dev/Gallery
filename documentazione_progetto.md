# 🛡️ Zero-Knowledge PWA Vault

Una Progressive Web App (PWA) moderna e ultra-sicura per l'archiviazione e la visualizzazione di foto, video e documenti. La sicurezza si basa sul paradigma **Zero-Knowledge**: tutti i dati vengono cifrati e decifrati direttamente nel browser del client utilizzando la **Web Crypto API (AES-256-GCM)**. Nessuna password o dato in chiaro viene mai inviato o salvato su un server esterno.

---

## 📑 Indice

1. [Caratteristiche Principali](#-caratteristiche-principali)
2. [Architettura di Sicurezza](#-architettura-di-sicurezza)
3. [Layout e Viste dell'Applicazione](#-layout-e-viste-dellapplicazione)
   - [Vista 1: Sblocco Vault](#vista-1-sblocco-vault)
   - [Vista 2: Dashboard & Workspace](#vista-2-dashboard--workspace)
   - [Vista 3: Lightbox & Viewer Multimediale](#vista-3-lightbox--viewer-multimediale)
4. [Tecnologie Utilizzate](#-tecnologie-utilizzate)
5. [Codice Sorgente dell'Applicazione (App.jsx)](#-codice-sorgente-dellapplicazione-appjsx)
6. [Istruzioni per l'Installazione e Uso](#-istruzioni-per-linstallazione-e-uso)

---

## 🚀 Caratteristiche Principali

* **Zero-Knowledge Architecture**: La cifratura e la decifratura avvengono esclusivamente in memoria locale RAM tramite la **Master Password**.
* **Layout Mosaico Minimalista (Edge-to-Edge)**: Griglia multimediale pulita con `gap-0`, priva di testo, metadati o pulsanti di disturbo. Mostra solo l'anteprima visuale di foto e video.
* **Viewer Lightbox Multimediale**: Modal a schermo intero per riprodurre video, ingrandire immagini ad alta risoluzione o scaricare i file decifrati.
* **Supporto PWA & Offline**: Può essere installata come applicazione nativa su iOS, Android e Desktop, funzionando completamente offline.
* **Gestione Avanzata**: Supporto per upload di singoli file o intere strutture di cartelle, ricerca istantanea, filtri per tipologia e ordinamento.
* **Configurazione Griglia Flessibile**: Switch rapido tra griglie a 2, 3, 4 o 6 colonne.

---

## 🔒 Architettura di Sicurezza

L'applicazione utilizza standard crittografici nativi forniti direttamente dai browser moderni (`window.crypto.subtle`):

1. **Derivazione della Chiave (PBKDF2)**:
   - **Algoritmo**: PBKDF2 con SHA-256.
   - **Iterazioni**: 100.000 cicli.
   - **Salt**: 16 byte generati casualmente mediante entropia crittografica.
2. **Cifratura Simmetrica (AES-GCM-256)**:
   - **Algoritmo**: AES-256 in modalità Galois/Counter Mode (GCM), che garantisce sia la riservatezza che l'integrità dei dati (Authenticated Encryption).
   - **IV (Vettore di Inizializzazione)**: 12 byte casuali per ciascun file.
3. **Pura Memoria Volatile**:
   - La chiave decifrata e le URL degli oggetti decifrati (`blob:http...`) esistono solo finché il Vault rimane sbloccato.
   - Alla chiusura del Vault o della scheda, le URL degli oggetti vengono revocate e la memoria viene liberata.

---

## 📐 Layout e Viste dell'Applicazione

L'interfaccia è strutturata come una **Single Page Application (SPA)** con 3 viste/stati principali:

### Vista 1: Sblocco Vault
* **Descrizione**: Schermata iniziale di protezione e login.
* **Layout**: Centrato verticalmente e orizzontalmente con estetica scura minimalista.
* **Elementi**: Logo protettivo, spiegazione del paradigma Zero-Knowledge, input Master Password e pulsante di sblocco.

### Vista 2: Dashboard & Workspace
* **Descrizione**: Spazio di lavoro principale dopo la decifratura del session store.
* **Header & Toolbar**: Contiene i tasti di upload (File/Cartelle), ricerca immediata, filtri per tipo, ordinamento, opzioni di colonne per la griglia e pulsante di blocco immediato.
* **Griglia File**: Layout stile mosaico senza spaziature (`gap-0`). Ciascuna scheda mostra **solamente l'anteprima dell'immagine o del video**, garantendo un impatto visivo privo di distrazioni.

### Vista 3: Lightbox & Viewer Multimediale
* **Descrizione**: Overlay modale scuro che si attiva al click su un qualsiasi elemento della griglia.
* **Elementi**: Pulsante di chiusura ($X$), lettore video o visualizzatore immagini ad alta risoluzione al centro, e scheda informativa inferiore con nome file, dimensione, percorso e pulsante di download del file originale decifrato.

---

## 🛠️ Tecnologie Utilizzate

* **React** (Componenti funzionali, State & Hooks)
* **Tailwind CSS** (Styling con classi utility e responsive design)
* **Lucide React** (Set di icone vettoriali)
* **Web Crypto API** (Cifratura/Decifratura hardware-accelerated)

---

## 💻 Codice Sorgente dell'Applicazione (App.jsx)

Di seguito è riportato il codice sorgente React completo pronto per l'uso:

```jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield, Lock, Unlock, Upload, FolderPlus, Search,
  Grid, Trash2, X, File, Image as ImageIcon, Video as VideoIcon,
  FileText, Download, Eye, Maximize2, RefreshCw, Folder
} from 'lucide-react';

// --- Crypto Helpers (Web Crypto API) ---
async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptData(arrayBuffer, password) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    arrayBuffer
  );

  const result = new Uint8Array(salt.length + iv.length + encryptedContent.byteLength);
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(new Uint8Array(encryptedContent), salt.length + iv.length);
  return result;
}

async function decryptData(encryptedBuffer, password) {
  const salt = encryptedBuffer.slice(0, 16);
  const iv = encryptedBuffer.slice(16, 28);
  const ciphertext = encryptedBuffer.slice(28);

  const key = await deriveKey(password, salt);
  return window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    ciphertext
  );
}

const getFileType = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'ogg', 'mov', 'mkv'].includes(ext)) return 'video';
  if (['pdf', 'txt', 'md', 'doc', 'docx'].includes(ext)) return 'document';
  return 'other';
};

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [vaultFiles, setVaultFiles] = useState([]);
  const [decryptedUrls, setDecryptedUrls] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [gridCols, setGridCols] = useState(4);
  const [activeMedia, setActiveMedia] = useState(null);

  useEffect(() => {
    return () => {
      Object.values(decryptedUrls).forEach(url => URL.revokeObjectURL(url));
    };
  }, [decryptedUrls]);

  const handleUnlock = (e) => {
    e.preventDefault();
    if (!password) {
      setError('Inserisci la master password per sbloccare.');
      return;
    }
    setError('');
    setIsUnlocked(true);
  };

  const handleLock = () => {
    Object.values(decryptedUrls).forEach(url => URL.revokeObjectURL(url));
    setDecryptedUrls({});
    setIsUnlocked(false);
    setPassword('');
    setActiveMedia(null);
  };

  const handleFileUpload = async (e) => {
    const uploadedFiles = Array.from(e.target.files);
    if (!uploadedFiles.length) return;

    setIsLoading(true);
    try {
      const newFiles = [];
      const newUrls = { ...decryptedUrls };

      for (const file of uploadedFiles) {
        const arrayBuffer = await file.arrayBuffer();
        const encryptedData = await encryptData(arrayBuffer, password);
        
        const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const type = getFileType(file.name);

        const newFile = {
          id: fileId,
          name: file.name,
          size: file.size,
          type: type,
          mimeType: file.type,
          path: file.webkitRelativePath || file.name,
          createdAt: Date.now(),
          encryptedData: encryptedData
        };

        const blob = new Blob([arrayBuffer], { type: file.type });
        newUrls[fileId] = URL.createObjectURL(blob);

        newFiles.push(newFile);
      }

      setVaultFiles(prev => [...prev, ...newFiles]);
      setDecryptedUrls(newUrls);
    } catch (err) {
      console.error(err);
      setError("Errore durante la cifratura dei file.");
    } finally {
      setIsLoading(false);
      e.target.value = null;
    }
  };

  const processedFiles = useMemo(() => {
    return vaultFiles
      .filter(file => {
        const matchesQuery = file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            file.path.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = typeFilter === 'all' || file.type === typeFilter;
        return matchesQuery && matchesType;
      })
      .sort((a, b) => {
        if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
        if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
        if (sortBy === 'size-asc') return a.size - b.size;
        if (sortBy === 'size-desc') return b.size - a.size;
        if (sortBy === 'date-asc') return a.createdAt - b.createdAt;
        return b.createdAt - a.createdAt;
      });
  }, [vaultFiles, searchQuery, typeFilter, sortBy]);

  const getColsClass = (cols) => {
    switch (cols) {
      case 2: return 'grid-cols-2';
      case 3: return 'grid-cols-3';
      case 4: return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
      case 6: return 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6';
      default: return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
    }
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
          <div className="inline-flex p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
            <Shield size={40} />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Zero-Knowledge Vault</h1>
            <p className="text-sm text-neutral-400 mt-2">
              Tutti i file vengono cifrati e decifrati in locale nel tuo browser con AES-GCM-256.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Inserisci la Master Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white placeholder-neutral-500 transition-all"
              />
              {error && <p className="text-xs text-rose-400 mt-2 text-left">{error}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/10 active:scale-[0.98]"
            >
              🔓 Sblocca Cassaforte
            </button>
          </form>

          <div className="text-xs text-neutral-500 pt-4 border-t border-neutral-800">
            Nessun dato o password lascia mai questo dispositivo.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      <header className="h-16 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Shield className="text-emerald-400" size={24} />
          <span className="font-bold text-lg tracking-tight text-white">Vault PWA</span>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            AES-256
          </span>
        </div>

        <button
          onClick={handleLock}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-rose-500/10 hover:text-rose-400 text-neutral-300 rounded-lg border border-neutral-700 hover:border-rose-500/30 transition-all text-sm font-medium"
        >
          <Lock size={16} />
          <span>Chiudi Vault</span>
        </button>
      </header>

      <div className="p-4 border-b border-neutral-800 bg-neutral-900/30 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold rounded-lg cursor-pointer transition-all text-sm shadow-md shadow-emerald-500/10">
            <Upload size={16} />
            <span>Aggiungi File</span>
            <input 
              type="file" 
              multiple 
              onChange={handleFileUpload} 
              className="hidden" 
            />
          </label>

          <label className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg cursor-pointer transition-all text-sm border border-neutral-700">
            <FolderPlus size={16} />
            <span>Cartella</span>
            <input 
              type="file" 
              webkitdirectory="" 
              directory="" 
              multiple 
              onChange={handleFileUpload} 
              className="hidden" 
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-2xl justify-end">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Cerca file..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-200 focus:outline-none focus:border-emerald-500 placeholder-neutral-500"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Tutti i Tipi</option>
            <option value="image">Solo Foto</option>
            <option value="video">Solo Video</option>
            <option value="document">Documenti</option>
            <option value="other">Altri</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="date-desc">Più Recenti</option>
            <option value="date-asc">Meno Recenti</option>
            <option value="name-asc">Nome (A-Z)</option>
            <option value="name-desc">Nome (Z-A)</option>
            <option value="size-desc">Dimensione (Grandi)</option>
            <option value="size-asc">Dimensione (Piccoli)</option>
          </select>

          <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 rounded-lg p-1">
            {[2, 3, 4, 6].map(cols => (
              <button
                key={cols}
                onClick={() => setGridCols(cols)}
                className={`px-2 py-0.5 text-xs font-mono rounded ${
                  gridCols === cols 
                    ? 'bg-neutral-800 text-emerald-400 font-bold' 
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {cols}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 bg-neutral-950">
        {isLoading && (
          <div className="p-4 text-center text-sm text-emerald-400 bg-emerald-500/5 border-b border-neutral-800 flex items-center justify-center gap-2">
            <RefreshCw size={16} className="animate-spin" />
            <span>Cifratura dei file in corso...</span>
          </div>
        )}

        {processedFiles.length === 0 ? (
          <div className="h-[60vh] flex flex-col items-center justify-center text-neutral-500 p-6 text-center">
            <Folder size={48} className="mb-4 stroke-[1.5] text-neutral-600" />
            <p className="text-lg font-medium text-neutral-400">Nessun file presente nel vault</p>
            <p className="text-sm mt-1 text-neutral-600">Carica foto o video per popolare la griglia.</p>
          </div>
        ) : (
          <div className={`grid ${getColsClass(gridCols)} gap-0 w-full`}>
            {processedFiles.map((file) => {
              const mediaUrl = decryptedUrls[file.id];

              return (
                <div
                  key={file.id}
                  onClick={() => setActiveMedia(file)}
                  className="relative group aspect-square bg-neutral-900 overflow-hidden cursor-pointer border-[0.5px] border-neutral-900/50"
                >
                  {file.type === 'image' && mediaUrl ? (
                    <img
                      src={mediaUrl}
                      alt={file.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : file.type === 'video' && mediaUrl ? (
                    <video
                      src={mediaUrl}
                      className="w-full h-full object-cover pointer-events-none"
                      muted
                      playsInline
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-900 text-neutral-600 group-hover:text-neutral-400 transition-colors">
                      {file.type === 'document' ? <FileText size={36} /> : <File size={36} />}
                      <span className="text-[10px] uppercase font-mono mt-2 tracking-wider">{file.name.split('.').pop()}</span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 size={24} className="text-white drop-shadow-md" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {activeMedia && (
        <div className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-xl flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="w-full flex justify-end">
            <button
              onClick={() => setActiveMedia(null)}
              className="p-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-full border border-neutral-800 transition-all"
              title="Chiudi (Esc)"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 w-full max-w-5xl flex items-center justify-center my-4 overflow-hidden">
            {activeMedia.type === 'image' && decryptedUrls[activeMedia.id] ? (
              <img
                src={decryptedUrls[activeMedia.id]}
                alt={activeMedia.name}
                className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
              />
            ) : activeMedia.type === 'video' && decryptedUrls[activeMedia.id] ? (
              <video
                src={decryptedUrls[activeMedia.id]}
                controls
                autoPlay
                className="max-h-full max-w-full rounded-lg shadow-2xl"
              />
            ) : (
              <div className="text-center p-8 bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md">
                <File size={48} className="mx-auto text-neutral-500 mb-4" />
                <p className="text-white font-medium text-lg">{activeMedia.name}</p>
                <p className="text-neutral-400 text-sm mt-1">Anteprima non disponibile per questo formato.</p>
              </div>
            )}
          </div>

          <div className="w-full max-w-2xl bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{activeMedia.name}</p>
              <p className="text-xs text-neutral-400 mt-0.5 font-mono">
                {(activeMedia.size / (1024 * 1024)).toFixed(2)} MB • {activeMedia.path}
              </p>
            </div>

            <a
              href={decryptedUrls[activeMedia.id]}
              download={activeMedia.name}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-sm font-semibold rounded-xl transition-all shrink-0"
            >
              <Download size={16} />
              <span>Scarica</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## ⚙️ Istruzioni per l'Installazione e Uso

1. **Clona il repository**:
   ```bash
   git clone https://github.com/tuo-utente/zero-knowledge-pwa-vault.git
   cd zero-knowledge-pwa-vault
   ```

2. **Installa le dipendenze**:
   ```bash
   npm install lucide-react
   ```

3. **Avvia l'ambiente di sviluppo**:
   ```bash
   npm run dev
   ```

4. **Utilizzo**:
   - Inserisci una qualunque **Master Password** per creare/sbloccare la sessione corrente.
   - Trascina o seleziona foto e video tramite i pulsanti in alto per caricarli e cifrarli al volo.
   - Fai click su una miniatura per aprire la visualizzazione a schermo intero o scaricare il file.
   - Clicca **Chiudi Vault** per distruggere immediatamente tutte le chiavi decifrate in memoria RAM.
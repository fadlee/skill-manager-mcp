# Technical Design Document (TDD) – Skill-Manager MCP (MVP)

## 1. Tujuan & Ruang Lingkup

Dokumen ini mendefinisikan **desain teknis** untuk Skill-Manager MCP:

- Platform: **Cloudflare Workers + Cloudflare D1**
- Fungsi utama:
  - Menyediakan **remote MCP** via HTTP (`/mcp`) → read & write
  - Manajemen skill:
    - create skill (UI & MCP)
    - update skill (termasuk tambah file)
    - versioning otomatis (integer)
    - simpan changelog per versi
    - simpan file & metadata eksekusi skrip
  - UI minimal untuk manajemen skill

Fokus TDD ini pada:
- Arsitektur komponen
- Skema database D1
- Desain endpoint (REST + MCP)
- Flow utama
- Strategi keamanan & error handling
- Rencana implementasi bertahap

---

## 2. Arsitektur Tingkat Tinggi

### 2.1 Komponen Utama

1. **Cloudflare Worker (Skill-Manager Worker)**
   Menangani:
   - HTTP request dari browser (UI).
   - HTTP request MCP (klien AI).
   - Routing ke API internal.
   - Query & transaksi ke D1.

2. **Cloudflare D1 (Database)**
   Menyimpan:
   - `skills`
   - `skill_versions`
   - `skill_files`

3. **Client UI**
   - Bisa:
     - SPA kecil (React/Vue/Svelte) atau
     - HTML + JS minimal
   - Di-host di worker yang sama (static bundle atau SSR sederhana).

4. **MCP Clients (ChatGPT, dll)**
   - Register remote MCP ke endpoint `/mcp`.
   - Menggunakan tools yang disediakan:
     - `skill.create`
     - `skill.update`
     - `skill.list`
     - `skill.get`
     - `skill.get_file`

### 2.2 Pola Arsitektur

- **Single Worker, multi-endpoint**:
  - `GET /` → serve UI
  - `GET /app/*` → static UI asset (jika ada)
  - `GET/POST /api/*` → REST/JSON untuk UI
  - `POST /mcp` → endpoint MCP (JSON)

- **Layering logika:**
  - `router layer` → HTTP route
  - `controller layer` → validasi input, mapping ke service
  - `service layer` → logika bisnis (versioning, struktur skill)
  - `repo layer` → query D1

---

## 3. Model Data (D1)

### 3.1 Tabel `skills`

Mewakili entitas skill secara umum (tanpa versi).

```sql
CREATE TABLE skills (
  id TEXT PRIMARY KEY,                -- uuid string
  name TEXT NOT NULL UNIQUE,         -- nama skill, unik
  description TEXT,                  -- deskripsi high-level
  active INTEGER NOT NULL DEFAULT 1, -- 1 = aktif, 0 = nonaktif
  created_at INTEGER NOT NULL,       -- unix timestamp (ms/s)
  updated_at INTEGER NOT NULL        -- unix timestamp
);
````

**Index yang disarankan:**

```sql
CREATE INDEX idx_skills_active ON skills(active);
CREATE INDEX idx_skills_name ON skills(name);
```

---

### 3.2 Tabel `skill_versions`

Menyimpan riwayat versi per skill.

```sql
CREATE TABLE skill_versions (
  id TEXT PRIMARY KEY,               -- uuid
  skill_id TEXT NOT NULL,            -- FK ke skills.id
  version_number INTEGER NOT NULL,   -- 1, 2, 3, ...
  changelog TEXT,                    -- ringkasan perubahan (biasanya dari AI)
  created_at INTEGER NOT NULL,
  created_by TEXT NOT NULL,          -- "ai" atau "human"
  FOREIGN KEY (skill_id) REFERENCES skills(id)
);
```

**Constraint tambahan:**

```sql
CREATE UNIQUE INDEX idx_versions_unique
ON skill_versions(skill_id, version_number);
```

---

### 3.3 Tabel `skill_files`

Menyimpan file per versi skill.

```sql
CREATE TABLE skill_files (
  id TEXT PRIMARY KEY,                -- uuid
  skill_id TEXT NOT NULL,
  version_id TEXT NOT NULL,           -- FK ke skill_versions.id
  path TEXT NOT NULL,                 -- semacam "src/main.ts", "README.md"
  content TEXT NOT NULL,              -- isi file
  is_executable INTEGER NOT NULL DEFAULT 0, -- 1 kalau skrip
  script_language TEXT,               -- opsional, ex: "node", "deno", "bash"
  run_instructions_for_ai TEXT,       -- instruksi cara menjalankan skrip
  created_at INTEGER NOT NULL,
  FOREIGN KEY (skill_id) REFERENCES skills(id),
  FOREIGN KEY (version_id) REFERENCES skill_versions(id)
);
```

**Index:**

```sql
CREATE INDEX idx_files_skill ON skill_files(skill_id);
CREATE INDEX idx_files_version ON skill_files(version_id);
CREATE INDEX idx_files_skill_path ON skill_files(skill_id, path);
```

---

## 4. Versioning Logic

### 4.1 Aturan Versi

* **Versi integer** per skill:

  * Skill baru → `version_number = 1`
  * Update skill → `version_number = last_version + 1`
* Versi dihitung di sisi server:

  ```sql
  SELECT COALESCE(MAX(version_number), 0) + 1
  FROM skill_versions
  WHERE skill_id = ?;
  ```

### 4.2 Skema Update

Saat `create_skill` atau `update_skill`:

1. Mulai **transaction** D1 (kalau supported).
2. Insert/Update di `skills` (jika perlu).
3. Insert baris baru ke `skill_versions` (versi baru).
4. Insert semua file untuk versi tersebut ke `skill_files`.
5. Commit.

Jika salah satu gagal → rollback.

---

## 5. Desain Endpoint

### 5.1 Endpoint MCP `/mcp`

Asumsi format: JSON HTTP POST
Body berupa objek dengan `tool` + `params` (model bisa disesuaikan ke standard MCP client yang Anda pakai).

#### 5.1.1 `skill.create`

**Request:**

```json
{
  "tool": "skill.create",
  "params": {
    "name": "json-cleaner",
    "description": "Cleans and normalizes JSON payloads",
    "files": [
      {
        "path": "cleaner.js",
        "content": "/* js code here */",
        "is_executable": true,
        "script_language": "node",
        "run_instructions_for_ai": "Run with `node cleaner.js` passing the JSON as stdin."
      }
    ],
    "changelog": "Initial creation of json-cleaner skill"
  }
}
```

**Response:**

```json
{
  "ok": true,
  "skill": {
    "id": "uuid",
    "name": "json-cleaner",
    "description": "Cleans and normalizes JSON payloads",
    "version_number": 1,
    "created_at": 1234567890
  }
}
```

---

#### 5.1.2 `skill.update`

**Request:**

```json
{
  "tool": "skill.update",
  "params": {
    "skill_id": "uuid-or-name",
    "description": "New optional description",
    "file_changes": [
      {
        "type": "update",
        "path": "cleaner.js",
        "content": "/* updated code */",
        "is_executable": true
      },
      {
        "type": "add",
        "path": "README.md",
        "content": "# Usage...",
        "is_executable": false
      }
    ],
    "changelog": "Refined cleaner logic and added README"
  }
}
```

**Server behavior:**

1. Resolve `skill_id` (kalau name diizinkan, map ke ID).
2. Hitung `next_version`.
3. Insert `skill_versions` (versi baru).
4. Untuk setiap file:

   * `type == add` → insert file baru
   * `type == update` → ambil content terakhir file untuk skill, timpa di versi baru
5. Tidak ada operasi “in-place”; tiap versi punya snapshot file sendiri.
6. Return versi baru.

**Response contoh:**

```json
{
  "ok": true,
  "skill": {
    "id": "uuid",
    "name": "json-cleaner",
    "version_number": 2
  }
}
```

---

#### 5.1.3 `skill.list`

**Request:**

```json
{
  "tool": "skill.list",
  "params": {
    "active_only": true
  }
}
```

**Response:**

```json
{
  "ok": true,
  "skills": [
    {
      "id": "uuid",
      "name": "json-cleaner",
      "description": "Cleans JSON",
      "latest_version": 2,
      "updated_at": 1234567890
    }
  ]
}
```

---

#### 5.1.4 `skill.get`

**Request:**

```json
{
  "tool": "skill.get",
  "params": {
    "skill_id": "uuid-or-name",
    "version_number": 2
  }
}
```

Jika `version_number` tidak diisi → pakai latest.

**Response:**

```json
{
  "ok": true,
  "skill": {
    "id": "uuid",
    "name": "json-cleaner",
    "description": "Cleans JSON",
    "version_number": 2,
    "changelog": "Refined cleaner logic and added README",
    "files": [
      {
        "path": "cleaner.js",
        "is_executable": true,
        "script_language": "node",
        "run_instructions_for_ai": "Run with `node cleaner.js`..."
      },
      {
        "path": "README.md",
        "is_executable": false
      }
    ]
  }
}
```

---

#### 5.1.5 `skill.get_file`

**Request:**

```json
{
  "tool": "skill.get_file",
  "params": {
    "skill_id": "uuid-or-name",
    "path": "cleaner.js",
    "version_number": 2
  }
}
```

**Response:**

```json
{
  "ok": true,
  "file": {
    "path": "cleaner.js",
    "content": "/* file content here */",
    "is_executable": true,
    "script_language": "node",
    "run_instructions_for_ai": "Run with `node cleaner.js`..."
  }
}
```

---

### 5.2 Endpoint REST untuk UI (`/api/*`)

Untuk konsumsi browser (lebih manusiawi):

#### 5.2.1 `GET /api/skills`

* Query params: `active_only`, `q`, `page`, `limit`
* Response: list skill (JSON)

#### 5.2.2 `GET /api/skills/:id`

* Mengembalikan detail skill + versi terbaru (tanpa isi semua file kalau mau hemat).

#### 5.2.3 `GET /api/skills/:id/versions`

* List versi skill: `version_number`, `changelog`, `created_at`

#### 5.2.4 `GET /api/skills/:id/versions/:version_number`

* Detail versi + daftar file.

#### 5.2.5 `GET /api/skills/:id/versions/:version_number/files/:path`

* Isi file tunggal.

#### 5.2.6 (Opsional di MVP) `POST /api/skills` / `POST /api/skills/:id/update`

* Untuk edit via UI jika mau.

---

## 6. UI Sederhana

### 6.1 Struktur Halaman

1. **/ (Skill List)**

   * Tabel:

     * Name
     * Active
     * Latest version
     * Updated at
   * Tombol: `Create Skill` (opsional, karena AI juga bisa create)

2. **/skills/:id**

   * Card metadata skill
   * Tabel versi:

     * version_number
     * changelog (ringkas)
     * created_at
   * Tabel file untuk versi terbaru:

     * path
     * is_executable (badge)
   * Aksi:

     * Lihat isi file (modal)
     * Lihat changelog lengkap

3. **(Opsional) Create/Edit Form**

   * Untuk manual override.

---

## 7. Keamanan & Auth

Karena ini **tool pribadi**, tapi tetap:

* **Auth minimal:**

  * API key statis via environment var: `MCP_API_KEY`.
  * Klien MCP harus mengirim header:

    * `Authorization: Bearer <MCP_API_KEY>`
  * UI bisa:

    * Plain (kalau hanya Anda yang tahu URL).
    * Atau pakai query param `?key=` saat dev lalu disembunyikan.

* **Rate limiting:**

  * Not critical untuk private use, optional.

* **Validasi input:**

  * Pastikan `name` skill bukan string kosong.
  * Batas ukuran `content` file (misal max 100–200 KB per file di MVP).

---

## 8. Error Handling

Standar response error (MCP & REST):

```json
{
  "ok": false,
  "error": {
    "code": "NOT_FOUND" | "VALIDATION_ERROR" | "DB_ERROR" | "UNAUTHORIZED",
    "message": "Human-readable message"
  }
}
```

Contoh kasus:

* Skill tidak ditemukan → `NOT_FOUND`.
* Path file tidak ada → `NOT_FOUND`.
* Request MCP tanpa tool known → `VALIDATION_ERROR`.
* DB gagal → `DB_ERROR`.

---

## 9. Logging & Observability

Minimal:

* Log:

  * setiap tool MCP yang dipanggil + skill_id (tanpa content file lengkap untuk hemat log).
  * error detail (mesa DB, stacktrace ringkas).

* Bisa pakai:

  * `console.log` di Worker (terbaca di dashboard Cloudflare).

---

## 10. Rencana Implementasi Bertahap

### Fase 1 – Pondasi

1. Setup Worker & D1:

   * Buat project Worker
   * Binding D1
   * Migrasi tabel `skills`, `skill_versions`, `skill_files`

2. Implement:

   * Repository functions:

     * `createSkill`
     * `createSkillVersion`
     * `addSkillFiles`
     * `getLatestVersion`
     * `getSkill`, `listSkills`, dll.

3. Unit test lokal (jika memungkinkan).

---

### Fase 2 – MCP Endpoint (Core)

1. Implement `/mcp` router:

   * Parse JSON
   * `switch (tool)`:

     * `skill.create`
     * `skill.update`
     * `skill.list`
     * `skill.get`
     * `skill.get_file`

2. Uji via:

   * manual curl / HTTP client
   * (jika sudah ada MCP client dev tools, bisa pakai itu)

---

### Fase 3 – UI Minimal

1. Build UI sederhana:

   * Skill list
   * Skill detail
   * Version list
   * File list + viewer

2. Integrasi ke `/api/*`.

---

### Fase 4 – Polishing

* Tambah validasi input yang lebih rapi.
* Tambah indikator “executable script” dengan run instructions.
* Sedikit styling biar enak dipakai sehari-hari.

---

## 11. Catatan untuk AI tentang Script Execution

* AI **tidak** mengeksekusi skrip dari Worker secara langsung.
* Worker hanya menyediakan:

  * isi file
  * `script_language`
  * `run_instructions_for_ai` (pedoman untuk AI)
* AI diharapkan:

  * Mengikuti instruksi tersebut saat ia berada di environment yang bisa menjalankan skrip (misalnya tool lain / shell yang Anda sediakan terpisah).

---

*Status TDD: Draft – Cukup detail untuk mulai implementasi Worker + D1 + MCP*

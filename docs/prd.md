# 📄 **PRD — Skill-Manager MCP**

## Overview

**Product Name:** Skill-Manager MCP
**Purpose:** Satu layanan HTTP MCP terpusat untuk membuat, menyimpan, mengelola, dan mengembangkan MCP skills, dengan dukungan penuh untuk update otomatis oleh AI.

---

## Core Enhancements (Pembaruan Penting)

### 🆕 1. AI Bisa *Membuat Skill Baru*

Endpoint MCP mendukung operasi **`create_skill`**, memungkinkan AI membuat skill dari nol, termasuk file awal dan metadata.

### 🆕 2. Versioning Full Otomatis

* Tidak ada input versi dari user atau AI.
* Sistem menentukan nomor versi berbasis **auto-increment integer**:

  * saat create → versi **1**
  * tiap update → versi naik: **2, 3, 4, …**
* Stabil untuk AI karena tidak perlu semver.

---

# 🎯 Product Requirements Document (Updated Sections Included)

## User Flow

1. **Create Skill melalui UI atau MCP**

   * Jika dari AI: panggil `create_skill`, sertakan file awal.
   * Sistem membuat versi **1** otomatis.

2. **Update Skill via AI (MCP)**

   * AI bisa:

     * edit file
     * menambah file baru
     * mengubah metadata
     * mengirim changelog
   * Sistem:

     * menaikkan versi otomatis
     * menyimpan versi sebelumnya
     * menyimpan changelog

---

## MVP Features

### 🔴 Core Features

#### 1. Skill Management (CRUD)

Sekarang termasuk:

### 🆕 **MCP Create Skill**

* Endpoint: `POST /mcp/skills/create`
* Input:

  ```json
  {
    "name": "string",
    "description": "string",
    "files": [
      {
        "path": "string",
        "content": "string",
        "is_executable": false,
        "run_instructions_for_ai": "string"
      }
    ],
    "changelog": "string"
  }
  ```
* Output: skill baru dengan versi **1**

Utility:

* AI dapat membuat skill baru tanpa UI sama sekali.

---

#### 2. File Management

Termasuk:

* Add file
* Update file
* Delete/disable file
* **Add file via MCP update_skill**
* Mark file as executable
* Provide AI runtime instructions

Bagian tambahan ini penting:

> *Saat update skill, AI dapat menambah file baru, dan tindakan ini otomatis memicu pembuatan versi baru.*

---

#### 3. Versioning

### 🆕 Versioning Rules

* Setiap skill memiliki integer version counter.
* **Create skill → version = 1**
* **Update skill → version = previous + 1**
* Seluruh isi versi (files + metadata) disimpan di D1.

### Changelog

* AI menghasilkan ringkasan perubahan
* Disimpan per versi

### Version Storage

D1 table:

```
skill_versions:
  id
  skill_id
  version_number (int)
  changelog
  created_at
  created_by (ai/human)
```

---

#### 4. MCP Endpoints

### **READ**

* `get_available_skills`
* `get_skill_details`
* `get_skill_related_file`

### **WRITE**

* 🆕 `create_skill`
* `update_skill`

  * update file
  * add file
  * update metadata
  * send changelog

Versioning selalu otomatis dan tidak dapat dimodifikasi.

---

## Database Design

### skills

| column      | type      |
| ----------- | --------- |
| id          | uuid      |
| name        | text      |
| description | text      |
| active      | boolean   |
| created_at  | timestamp |
| updated_at  | timestamp |

### skill_versions

| column         | type                   |
| -------------- | ---------------------- |
| id             | uuid                   |
| skill_id       | uuid                   |
| version_number | int (auto incremented) |
| changelog      | text                   |
| created_at     | timestamp              |
| created_by     | text (“ai” or “human”) |

### skill_files

| column                  | type    |
| ----------------------- | ------- |
| id                      | uuid    |
| skill_id                | uuid    |
| version_id              | uuid    |
| path                    | text    |
| content                 | text    |
| is_executable           | boolean |
| run_instructions_for_ai | text    |

---

## UI (unchanged but clarified)

* Create skill via UI optional — MCP create is primary.
* UI can view:

  * skill list
  * files
  * version history
  * changelog
* Editing skill melalui UI opsional → AI akan lebih sering melakukan update.

---

## Success Metrics

1. **AI-generated skills**

   * ≥ 1 skill dibuat via MCP `create_skill`

2. **Automatic versioning works**

   * Versi naik otomatis pada setiap update skill
   * Tidak ada intervensi manual penomoran

3. **AI-driven updates**

   * ≥ 3 update skill dilakukan via MCP
   * Update mencakup:

     * edit file
     * tambah file
     * update metadata

---

## MVP Completion Checklist

### MCP Features

* [ ] MCP `create_skill` implemented
* [ ] MCP `update_skill` supports:

  * update file
  * add file
  * changelog
* [ ] Version auto-increment implemented

### Versioning

* [ ] Version always increases automatically
* [ ] Never accepts manual version input
* [ ] Changelog stored correctly per version

### Database

* [ ] Tables support versioned files
* [ ] Versioning logic atomic & consistent

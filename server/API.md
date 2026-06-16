# Spellpaw Server API

> Base URL: `http://localhost:3002`  
> Auth: Bearer JWT token (from `/api/auth/login` or `/api/auth/register`)

---

## Auth

### Register
```
POST /api/auth/register
Body: { email: string, password: string, name: string }
→ 201 { token: string, user: { id, email, name } }
→ 409 { error: "Email already registered" }
```

### Login
```
POST /api/auth/login
Body: { email: string, password: string }
→ 200 { token: string, user: { id, email, name, avatar? } }
→ 401 { error: "Invalid credentials" }
```

### Get current user
```
GET /api/auth/me
Authorization: Bearer <token>
→ 200 { id, email, name, avatar? }
```

---

## Projects

All project endpoints require `Authorization: Bearer <token>`.

### List projects
```
GET /api/projects
→ 200 [{ id, title, description, coverColor, version, updatedAt, isPublic }]
```

### Get project
```
GET /api/projects/:id
→ 200 { id, userId, title, description, coverColor, data, version, ... }
→ 404
```

### Create project
```
POST /api/projects
Body: { title: string, description?: string, coverColor?: string, data?: string }
→ 201 { id, title, ... }
```

### Update project (with conflict detection)
```
PUT /api/projects/:id
Body: { title?, description?, coverColor?, data?, version?: number }
→ 200 { id, version, ... }
→ 409 { error: "Conflict", serverVersion: number }  // version mismatch
```

### Delete project
```
DELETE /api/projects/:id
→ 204 (no content)
```

---

## Templates

### List templates (public)
```
GET /api/templates
→ 200 [{ id, name, description, category, downloads, createdAt, author: { name } }]
```

### Get template detail
```
GET /api/templates/:id
→ 200 { id, name, data, ... }
→ 404
```

### Upload template
```
POST /api/templates
Authorization: Bearer <token>
Body: { name: string, description?: string, category?: string, data: string }
→ 201 { id, name, ... }
```

### Download counter
```
POST /api/templates/:id/download
→ 200 { ok: true }
```

---

## Gallery

### List gallery (public)
```
GET /api/gallery
→ 200 [{ id, likes, project: { title, ... }, user: { name } }]
```

### Publish to gallery
```
POST /api/gallery
Authorization: Bearer <token>
Body: { projectId: string }
→ 201 { id, projectId, ... }
```

### Like
```
POST /api/gallery/:id/like
→ 200 { ok: true }
```

---

## Data Model

### Project.data format (JSON string)
```json
{
  "tree": { "id": "...", "type": "project", "title": "...", "children": [...] },
  "canvases": { "nodes": [...], "edges": [...], "viewport": {...} }
}
```

### Template.data format (JSON string)
```json
{
  "id": "...",
  "name": "...",
  "category": "suspense|romance|comedy|drama|documentary|custom",
  "structure": { "acts": [...] },
  "stylePresets": { "colorPalette": [...], "pacing": "...", "visualStyle": "..." }
}
```

---

## Development

```bash
cd server
npm run dev          # Start with tsx (auto-restart not included)
npx prisma studio    # Open DB browser
npx prisma db push   # Sync schema to SQLite
```

### Environment variables
| Variable | Default | Required |
|----------|---------|:---:|
| `JWT_SECRET` | — | ✅ |
| `PORT` | — | ✅ |
| `CLIENT_ORIGIN` | `http://localhost:5173` | |

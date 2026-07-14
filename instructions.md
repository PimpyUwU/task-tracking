# Time Tracker + Invoice Generator SaaS — AI Development Brief

## Current State
You have a partially-built Next.js + Supabase time tracking app. It has user auth, project/client CRUD, and basic time entry logging. We're extending it with document generation, billable task logic, and invoice features.

## Target Features (MVP)

**Free Tier:**
- 5 projects, 5 clients
- Basic time logging (start/stop, manual entry)
- View tracked time
- Basic dashboard

**Paid Tier ($9/month):**
- Unlimited projects and clients
- Billable vs non-billable task split
- Invoice generation from DOCX template
- Time estimates per project
- Earnings dashboard (hourly rate by project)
- Export to CSV

## Database Schema Updates

**Tables Needed:**
1. `users` — (already exists) id, email, auth fields
2. `clients` — id, user_id, name, email, address, legal_info
3. `projects` — id, user_id, client_id, name, budget, hourly_rate, status
4. `tasks` — id, project_id, name, is_billable (boolean), estimated_hours
5. `time_entries` — id, task_id, user_id, start_time, end_time, duration_minutes, notes
6. `invoice_templates` — id, user_id, template_docx_base64, created_at
7. `invoices` — id, project_id, user_id, generated_at, pdf_url, status

## API Endpoints to Build/Extend

**Clients:**
- `POST /api/clients` — create client
- `GET /api/clients` — list user's clients
- `PUT /api/clients/:id` — update
- `DELETE /api/clients/:id` — delete

**Projects:**
- `POST /api/projects` — create with client_id, hourly_rate
- `GET /api/projects` — list
- `PUT /api/projects/:id` — update
- `DELETE /api/projects/:id` — delete

**Tasks:**
- `POST /api/tasks` — create with is_billable flag
- `GET /api/projects/:id/tasks` — list tasks for project
- `PUT /api/tasks/:id` — update is_billable, name
- `DELETE /api/tasks/:id` — delete

**Time Entries:**
- `POST /api/time-entries` — create (start_time, end_time, task_id)
- `GET /api/tasks/:id/time-entries` — list for task
- `PUT /api/time-entries/:id` — edit
- `DELETE /api/time-entries/:id` — delete
- `GET /api/projects/:id/time-entries?billable=true` — list only billable entries

**Invoice Generation:**
- `POST /api/invoices/generate` — takes project_id, pulls billable time entries, fills template, returns PDF URL
- `GET /api/invoices` — list invoices for user
- `GET /api/invoices/:id` — download/view

**Templates:**
- `POST /api/templates/upload` — upload DOCX template as base64
- `GET /api/templates` — list user's templates

## Document Generation Logic

Use `docx` npm package (Node.js server-side) to:
1. Accept DOCX template (uploaded by user)
2. Replace placeholders like `{{project_name}}`, `{{client_name}}`, `{{total_hours}}`, `{{total_amount}}`, `{{billable_entries}}`
3. For billable entries, create a table with: task name, hours, rate, amount
4. Generate final DOCX, convert to PDF (via pdfkit or similar), store URL in Supabase
5. Return download link

## Frontend Pages Needed

1. **Dashboard** — overview of active projects, total billable hours this month, upcoming invoices
2. **Projects** — CRUD projects, see associated tasks and time entries
3. **Tasks** — within a project, add tasks, mark billable/non-billable
4. **Time Logger** — start/stop timer, manual entry, assign to task
5. **Invoices** — view generated invoices, download, regenerate
6. **Templates** — upload invoice template DOCX
7. **Settings** — billing, personal info, hourly rates per project

## Tech Stack

- **Frontend:** Next.js, TypeScript, React, TailwindCSS (responsive mobile-first)
- **Backend:** Next.js API routes (serverless on Vercel)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (JWT)
- **Document Generation:** `docx` package (server-side), pdfkit for PDF conversion
- **File Storage:** Supabase Storage for uploaded templates and generated PDFs
- **Payments:** Stripe for subscription management

## Implementation Order (Est. Time)

1. **Database schema + migrations** — 2 hours
2. **Client/Project/Task CRUD APIs** — 3 hours
3. **Time Entry API + Timer Logic** — 3 hours
4. **Invoice template upload** — 2 hours
5. **Document generation (DOCX + PDF)** — 4 hours
6. **Frontend dashboard + forms** — 6 hours
7. **Invoice list and download** — 2 hours
8. **Stripe subscription integration** — 3 hours
9. **Testing + deployment** — 3 hours

**Total estimate:** 28 hours of focused work
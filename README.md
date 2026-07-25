<div align="center">

# Gridhook

**Turn any REST, GraphQL, SOAP, or database API into a callable MCP tool.**

A self-hosted console for wiring internal and third-party APIs into the Model
Context Protocol — connect once, expose everywhere: Claude, ChatGPT, Cursor,
VS Code, and any other MCP-speaking client.

</div>

---

## Overview

Gridhook is the admin surface for an MCP gateway. It gives a team one place to:

- Turn an existing API (REST/GraphQL/SOAP) or a database into a set of typed,
  callable **tools**, without hand-writing MCP server code.
- Group those tools into **MCP servers** — versioned, authenticated endpoints
  that AI clients connect to.
- See every tool invocation in a searchable **audit log**, with full
  request/response payloads.
- Understand how data relates across systems via an auto-built
  **knowledge graph**.
- Manage the whole thing under normal SaaS primitives: organizations, users,
  roles, and API keys.

This repository is the **frontend only** — a React + TypeScript + Tailwind CSS
console currently running against mock data.

> Independently designed and built. Not affiliated with, and does not reuse
> code or assets from, any other MCP gateway project.

---

## Screenshots

### Connectors

<img width="1204" height="760" alt="Screenshot 2026-07-25 at 2 16 29 PM" src="https://github.com/user-attachments/assets/81332d0f-b95f-4d43-bb0d-68eda9a92e42" />

### Marketplace

<img width="1202" height="672" alt="Screenshot 2026-07-25 at 2 17 52 PM" src="https://github.com/user-attachments/assets/22bf9618-776b-488b-aef5-e57e7d0e97c2" />

### MCP Servers

<img width="1186" height="597" alt="Screenshot 2026-07-25 at 2 18 52 PM" src="https://github.com/user-attachments/assets/4d0a5e74-42c7-4033-a78f-042627444a2c" />


### Knowledge Graph

<img width="1200" height="719" alt="Screenshot 2026-07-25 at 2 18 35 PM" src="https://github.com/user-attachments/assets/0ea7630a-6702-4bc9-8dbe-3c484665691a" />


### Audit Log

<img width="1190" height="734" alt="Screenshot 2026-07-25 at 2 19 05 PM" src="https://github.com/user-attachments/assets/5b5ec578-66f8-4792-bdcd-1a326e293d36" />

---

## Features

| Area | What it does |
|---|---|
| **Connectors** | Add REST/GraphQL/SOAP/database sources; map endpoints to named tools; test-run any tool and inspect its full request/response contract; import/export OpenAPI specs. |
| **Marketplace** | Install pre-built adapters (Salesforce, Stripe, Postgres, Jira, ...) with a guided credential + assignment flow. |
| **MCP Servers** | Bundle connectors into an endpoint; scoped API keys; one-click "connect" snippets for Cursor, VS Code, Claude, ChatGPT, Gemini, Windsurf, and more. |
| **Knowledge Graph** | Visualize how entities relate across systems; approve or reject AI-suggested relationships; browse learned reusable "skills." |
| **Analytics** | Call volume, success rate, latency, cost, and top-tool breakdowns. |
| **Audit Log** | Filterable, paginated log of every tool call with full payload inspection. |
| **Organization & Access** | Users, invites, system roles (Owner/Admin/Developer/Viewer), license/seat management. |

---

## Tech stack

- **React 18** + **TypeScript**
- **Vite** for dev/build tooling
- **Tailwind CSS** — custom dark-first design system (near-black/white with a
  muted purple accent), light theme included
- **React Router** for client-side routing
- **Recharts** for charts
- **lucide-react** for icons

All data is currently mocked in [`src/lib/mock-data.ts`](./src/lib/mock-data.ts)
so the UI is fully interactive without a backend.

---

## Getting started

```bash
npm install
npm run dev       # starts the dev server (default: http://localhost:5173)
```

Other scripts:

```bash
npm run build     # type-check + production build
npm run preview   # preview the production build locally
npm run lint      # lint the codebase
```

---

## Project structure

```
src/
  components/
    layout/       AppShell, Sidebar, Logo
    ui/           Button, Card, Badge, Modal, Input, Switch, StatCard, ...
  lib/
    mock-data.ts  All entities + generators (connectors, tools, servers, logs, ...)
    theme.tsx     Dark/light theme context
    utils.ts      Small formatting/class-name helpers
  pages/
    Dashboard.tsx, Connectors.tsx, ConnectorDetail.tsx, Marketplace.tsx,
    McpServers.tsx, McpServerDetail.tsx, KnowledgeGraph.tsx, KgSkills.tsx,
    Analytics.tsx, AuditLog.tsx, Login.tsx, Welcome.tsx
    settings/     SettingsLayout, Profile, Organization, Users, Roles, License
```

---



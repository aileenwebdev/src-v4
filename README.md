# SRC Wibiz Dashboard POC

A unified dashboard system for Singapore Recreation Club (SRC) featuring Member, Staff, and Management portals.

## Portals
- **/member**: Client-facing booking and guest management.
- **/staff**: Operational hub for check-ins, member lookup, and scheduling.
- **/management**: High-level overview, analytics, and unified inbox (Wibiz Conversations).

## Technical Stack
- **Frontend**: Vanilla JS (ES Modules) + CSS3
- **Bundler**: Vite 5
- **Backend**: Node.js + Express
- **Integrations**: GoHighLevel (Wibiz) via Webhooks/API

## Local Setup
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set environment variables in a `.env` file:
   ```env
   API_PASSWORD=your_internal_api_password
   NODE_ENV=development
   ```
4. Start development server (Vite):
   ```bash
   npm run dev
   ```
5. Start backend server (Express):
   ```bash
   npm run start
   ```

## Deployment (Railway)
This project is configured for easy deployment to Railway.
- The `start` script runs `server.js`, which serves the production build from `/dist`.
- Ensure `API_PASSWORD` is set in Railway's environment variables.
- The build command is `npm run build`.

## UI/UX Notes
- All references to GHL have been rebranded to **Wibiz Dashboard**.
- Staff portal includes multi-day schedule view (Today/Tomorrow).
- Management portal features a mock Unified Inbox (Conversations).

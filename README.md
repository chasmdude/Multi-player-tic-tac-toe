# LilaBlack: Multiplayer Tic-Tac-Toe

A server-authoritative multiplayer Tic-Tac-Toe game using **Nakama** and **React**.

## Getting Started

1.  **Clone the repository**.
2.  **Start the Backend & Infrastructure**:
    ```bash
    docker-compose up -d
    ```
    This starts Postgres, Nakama, and the Nginx Gateway (Port 80).
3.  **Start the Frontend**:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
    The frontend runs on `http://localhost:5175`, but is proxied by the gateway at `http://localhost`.

## E2E Testing (Playwright)

We use Playwright to simulate real multiplayer matches.

### Prerequisites
Install test dependencies and browsers:
```bash
npm install
npx playwright install
```

### Running Tests
Make sure the environment (Docker + Frontend) is running first!

1.  **Headless (CLI)**:
    ```bash
    npm test
    ```
2.  **Display UI Mode (Interactive)**:
    ```bash
    npm run test:ui
    ```

## Project Structure
- `backend/`: Nakama Goja (JavaScript) runtime modules.
- `frontend/`: React + Vite + Tailwind CSS.
- `nginx/`: Reverse proxy configuration for production-like standards.
- `e2e/`: Multi-browser, multi-context end-to-end tests.

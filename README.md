<div align="center">
  <img src="https://img.shields.io/badge/Gemini_API-Advanced-4285F4?style=for-the-badge&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/Next.js_14-App_Router-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-RLS_Secured-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker_%26_K8s-Production_Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  
  <h1>🎓 Prepia (StudyAI)</h1>
  <h3>The Next-Generation Agentic Learning Platform</h3>
  <p><em>Submitted for Gemini Xprize Hackathon 2026</em></p>
</div>

---

<!-- 
📸 HACKATHON JUDGES: Add Screenshots Here!
Uncomment the section below and add your deployed image links before final submission.

<div align="center">
  <img src="./docs/assets/dashboard-preview.png" alt="Prepia Dashboard" width="80%" />
  <p><em>Fig 1: The intuitive, distraction-free dashboard powered by Real-time AI</em></p>
</div>
-->

## 🌟 The Vision: Enterprise-Level Education at Zero Cost
We live in an era where personalized education is a luxury. Large corporations spend millions building proprietary EdTech systems. **Prepia shatters this barrier.** 

Built in just **1 to 1.5 months** using the free tier of **Gemini**, assisted by **Antigravity** and occasional **Pro Gemini** interventions, we engineered a platform that rivals multi-million dollar architectures. We didn't just build an app; we built an autonomous, secure, and blazing-fast learning ecosystem that scales globally while keeping server costs aggressively low.

## 🧠 The Intelligence Layer
Prepia isn't just a wrapper; it's a deeply integrated cognitive engine.
*   **Multi-Agent Ecosystem:** Users can dynamically switch between elite AI models (Gemini Flash/Pro, Groq, Deepseek, OpenAI) based on task complexity.
*   **Autonomous OCR Pipeline:** Background BullMQ workers utilize Gemini's Vision capabilities to extract complex mathematical formulas, diagrams, and handwritten notes from PDFs perfectly, handling rate-limits autonomously.
*   **Context-Aware Memory (RAG):** Instead of hallucinating, the AI grounds every answer in the student's uploaded syllabus and sources, maintaining conversational memory across sessions.
*   **Bilingual Superiority:** Native-level support for English and Bengali across the entire UI and AI interactions, breaking language barriers for South Asian students.

<!-- 
<div align="center">
  <img src="./docs/assets/ai-chat-preview.png" alt="AI Chat Interface" width="80%" />
  <p><em>Fig 2: Intelligent Multi-Modal Chat Interface</em></p>
</div>
-->

## ⚡ High-Performance Architecture
*   **Next.js 14 App Router:** Server-side rendering (SSR) ensures lightning-fast initial page loads and superior SEO.
*   **BullMQ Background Workers:** Heavy tasks like document parsing, embeddings generation, and video transcript extraction are offloaded to background Redis queues, ensuring the main thread never blocks.
*   **Edge-Optimized:** Designed to be deployed on Vercel/Edge networks for millisecond latency worldwide.

## 🛡️ Enterprise-Grade Security
Security was not an afterthought; it is the foundation of Prepia.
*   **Supabase Row Level Security (RLS):** Every single database table is locked down with cryptographic RLS policies. A user can *only* read, write, or update their own data. Even if the API is compromised, the database refuses unauthorized queries.
*   **Secure SSR Authentication:** We use HTTP-Only, Secure-flagged cookies for session management. Tokens are completely hidden from the browser's JavaScript, preventing XSS token theft.
*   **Idempotency & Transaction Locks:** Local payment verifications (bKash/Nagad) use advanced SQL RPC transactions to ensure complete uniqueness. Double-spending or race conditions are mathematically impossible.

## 🎓 Student-Centric Problem Solving
Students struggle with information overload. Prepia solves this by:
1.  **Syllabus & Source Targeting:** Students upload their specific PDFs. Prepia's interactive UI guides them (e.g., animated CTAs guiding them to the dashboard) to ensure the AI only teaches what's relevant to *their* exams.
2.  **Focus Islands & Bionic Reading:** Built-in tools for neurodivergent students to maintain focus during long reading sessions.
3.  **Gamification (Rewards):** A built-in token economy where students earn credits through learning or watching ads, ensuring the platform remains accessible to low-income students.

---

## 🛠️ Tech Stack Matrix
| Layer | Technology Used | Why we chose it |
| :--- | :--- | :--- |
| **Frontend** | Next.js 14, TailwindCSS, TypeScript | Supreme speed, type safety, and modern UI capabilities. |
| **Backend API** | Node.js, Express, BullMQ | Handles heavy AI orchestration and webhook processing reliably. |
| **Database & Auth** | Supabase (PostgreSQL) | Native RLS, real-time subscriptions, and robust OAuth. |
| **AI Models** | Google Gemini (Core), Groq, Deepseek | State-of-the-art reasoning and vision extraction at low cost. |
| **Infrastructure**| Docker, Kubernetes (K8s), Redis | Built for horizontal scaling and high availability in production. |

---

## 📖 Usage Guide: How to Navigate Prepia

1.  **Onboarding:** Sign up securely via Email or Google OAuth.
2.  **The Dashboard:** The central hub. Click on the animated "Upload" button to add your PDF sources or create a Syllabus.
3.  **The Oracle (Chat):** Navigate to the Chat interface. Select your preferred AI model (e.g., Gemini 1.5 Flash). The AI will instantly read your uploaded sources and answer questions based *strictly* on your curriculum.
4.  **Mind Mapping & Flowcharts:** Visualize complex topics by generating interactive diagrams directly from your text.
5.  **Rewards & Upgrades:** Run out of tokens? Head to the Rewards section to watch ads, or easily upgrade to PRO via automated local payment gateways.

<!-- 
<div align="center">
  <img src="./docs/assets/features-preview.png" alt="Features Overview" width="80%" />
</div>
-->

---

## 🚀 Installation & Deployment

### 💻 Local Development (For Judges/Contributors)

1. **Clone & Install Dependencies:**
   ```bash
   git clone https://github.com/cryptXploit/StudyAI.git
   cd StudyAI
   npm install
   ```

2. **Environment Variables:**
   Create `.env.local` in both `frontend` and `backend` directories. Add your Supabase URL, Anon Key, and Gemini API Keys (See `.env.example`).

3. **Run the Application:**
   ```bash
   # Terminal 1: Frontend
   cd frontend
   npm run dev

   # Terminal 2: Backend API & Redis Queue
   cd backend
   npm run dev
   ```
   Visit `http://localhost:3000`.

### 🌍 Production Deployment (Docker & K8s Ready)
Prepia is designed for massive scale. We utilize a containerized architecture:
*   **Docker Compose:** The backend, Redis server, and background workers are bundled via `docker-compose.yml`. Just run `docker compose up -d --build`.
*   **Kubernetes (K8s) Ready:** Stateless Node.js containers mean you can spin up 100+ replica pods behind a load balancer to handle thousands of concurrent students.
*   **Cloud Hosting:** Frontend is hyper-optimized for Vercel; Backend is deployed on Azure VMs/DigitalOcean Droplets for heavy compute.

---

## 🔮 Future Roadmap: The Next Frontier
This hackathon submission is just Phase 1. 
*   **n8n Integration:** We are currently building n8n workflows to completely automate admin tasks, email campaigns, and advanced multi-step AI document processing.
*   **Autonomous Swarm Agents:** Implementing specialized sub-agents (e.g., a "Math Tutor Agent", a "Grammar Agent") that debate each other to provide the ultimate synthesized answer to the student.

---
*Built with ❤️, ☕, and the sheer power of Gemini Advanced AI.*

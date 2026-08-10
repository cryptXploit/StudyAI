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
We live in an era where personalized education is a luxury. Large corporations spend millions building proprietary EdTech systems that remain fundamentally inaccessible to the masses. **Prepia shatters this barrier.** 

Built in just **1 to 1.5 months** on an ultra-lean budget using the free tier of **Gemini**, assisted by **Antigravity** and strategic **Pro Gemini** interventions, we engineered a platform that rivals multi-million dollar architectures. We didn't just build an app; we built a cost-effective, autonomous, secure, and blazing-fast learning ecosystem that scales globally, offering immense, tangible benefits to students at a fraction of traditional computing costs.

---

## 🧠 The Intelligence Layer: Beyond Basic RAG
Prepia represents a paradigm shift in how students interact with their curriculum. We moved beyond primitive vector retrieval into true contextual understanding.
*   **Intelligent Hybrid Architecture (Open-Source + Paid):** We dynamically route queries between elite models (Gemini Flash/Pro, Groq, Deepseek, OpenAI). Simple queries hit blazing-fast open-source endpoints, while complex analytical tasks are routed to Gemini Advanced. This makes our AI ecosystem incredibly cost-effective while delivering maximum intelligence.
*   **Advanced "Beyond-Reranking" Retrieval:** Standard RAG reranking often fails on complex academic texts. Prepia uses a deeply intelligent semantic retrieval system that analyzes the syllabus intent, ensuring cost-friendly, latency-optimized, and super-smooth memory recall that feels entirely natural.
*   **Dynamic AI Fallback & Routing System:** Uptime is critical for students studying at 3 AM. If a primary AI endpoint fails or rate-limits, our custom AI routing engine instantly falls back to a secondary model. 
*   **Admin Control Panel:** The entire Fallback and Routing system is fully controllable via a secure Admin Panel, allowing live adjustments to traffic without deploying new code.
*   **The AI Humanizer:** Students don't want robotic lectures. Our custom "Humanizer" layer fine-tunes AI responses to sound empathetic, engaging, and indistinguishable from a supportive human tutor.

<!-- 
<div align="center">
  <img src="./docs/assets/ai-chat-preview.png" alt="AI Chat Interface" width="80%" />
  <p><em>Fig 2: Intelligent Multi-Modal Chat Interface with Humanized Responses</em></p>
</div>
-->

---

## ⚡ Fluid UI/UX: Beautiful by Design
A learning platform must be a joy to use, not a chore. We invested heavily in cognitive ergonomics.
*   **Framer Motion Animations:** Every interaction, from uploading a PDF to generating a mind-map, is accompanied by buttery-smooth, 60fps micro-animations that reduce cognitive load.
*   **True Responsive Design:** Whether on a massive laptop screen or a budget mobile phone, the UI dynamically optimizes itself for the perfect reading experience.
*   **Dark Mode & Light Mode:** Seamless, system-aware theming to protect students' eyes during late-night study sessions.
*   **Trilingual Support (3 Languages):** Native-level support for **English, Bengali, and Hindi** across the entire UI and AI interactions, breaking language barriers for hundreds of millions of South Asian students.

---

## 🎓 Solving Real Student Problems (28+ Core Features)
Prepia doesn't just answer questions; it solves fundamental friction points in modern education through over 28 meticulously crafted features:

1.  **Syllabus & Source Targeting:** Students upload their specific PDFs. Prepia focuses *strictly* on their curriculum, eliminating the hallucination and irrelevance of standard ChatGPT.
2.  **Focus Islands & Bionic Reading:** Designed specifically for neurodivergent students (ADHD/Dyslexia), these tools force visual focus on specific paragraphs and bold key syllables to increase reading speed by up to 30%.
3.  **Mind Mapping & LogicFlow:** Automatically turns 50-page boring PDFs into interactive, visual flowcharts, instantly solving the problem of visualizing complex relationships.
4.  **Dopamine-Driven Gamification:** A built-in token economy paired with a "Dopamine Release UI" (satisfying micro-interactions, confetti, and sound cues). Students who cannot afford subscriptions can earn tokens by learning or watching ads, keeping them hooked on studying rather than doom-scrolling.
5.  **Growth Engine & Inside Marketing:** A self-sustaining internal marketing system featuring a robust **Referral System**. Existing users invite peers to unlock premium tokens, creating viral, zero-cost user acquisition.
6.  **Panic Mode & Emergency Referrals:** When exams are tomorrow and students are out of tokens, they can trigger "Panic Mode." This gives them immediate emergency access in exchange for completing specific high-value referral tasks, turning desperation into massive organic growth.
7.  **Alumni Bounty Board:** Graduates and seniors can post specific tasks or "bounties" (e.g., summarizing a 100-page thesis) for juniors to solve and earn real rewards, creating a vibrant peer-to-peer micro-economy.
8.  **The Podcast Room:** Don't want to read? Prepia converts any textbook chapter into an engaging, multi-speaker AI podcast, allowing students to study while commuting or exercising.
9.  **Wallpaper & Story Generation:** Students can instantly generate beautiful, motivational AI wallpapers or "Stories" containing bite-sized facts from their syllabus to share directly on their social media, effectively turning every user into a brand ambassador.
10. **Comprehensive Account Hub:** A fully fleshed-out application featuring Settings, dynamic Pricing tiers, Terms of Service, Refund Policy, and Privacy Policy, ensuring complete transparency and enterprise-level trust.

---

## 🛡️ Enterprise-Grade Security
Security was not an afterthought; it is the foundation of Prepia.
*   **Supabase Row Level Security (RLS):** Every single database table is locked down with cryptographic RLS policies. A user can *only* read, write, or update their own data.
*   **Secure SSR Authentication:** We use HTTP-Only, Secure-flagged cookies for session management. Tokens are completely hidden from the browser's JavaScript.
*   **Idempotency & Transaction Locks:** Local payment verifications (bKash/Nagad) use advanced SQL RPC transactions to ensure complete uniqueness. Double-spending or race conditions are mathematically impossible.

---

## 🛠️ Tech Stack Matrix
| Layer | Technology Used | Why we chose it |
| :--- | :--- | :--- |
| **Frontend** | Next.js 14, TailwindCSS, Framer Motion | Supreme speed, buttery-smooth animations, and mobile/desktop optimization. |
| **Backend API** | Node.js, Express, BullMQ | Handles heavy AI orchestration, fallback routing, and webhooks reliably. |
| **Database & Auth** | Supabase (PostgreSQL) | Native RLS security, real-time subscriptions, and robust OAuth. |
| **AI Models** | Gemini (Core), Groq, Deepseek, OpenAI | The Intelligent Hybrid model approach for max performance and min cost. |
| **Infrastructure**| Docker, Kubernetes (K8s), Redis | Built for horizontal scaling and high availability in production. |

---

## 📁 Project Structure

```
Prepia/
├── frontend/                           Next.js 14 app
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx              Root with providers
│   │   │   ├── login/page.tsx          Public login page
│   │   │   ├── dashboard/page.tsx      Protected dashboard
│   │   │   ├── chat/page.tsx           Protected chat
│   │   │   └── auth/callback/          OAuth callback
│   │   ├── components/
│   │   │   ├── providers/              Auth & i18n contexts
│   │   │   └── layout/                 SecureLayout wrapper
│   │   └── lib/supabase/               Supabase client
│   ├── middleware.ts                   Route protection
│   ├── .env.local.example              Env template
│   └── package.json
│
├── backend/                            Node.js Express app
│   ├── src/workers/                    BullMQ workers
│   ├── .env.example                    Env template
│   └── package.json
│
├── QUICK_START.md                      ⭐ Read this first
├── FRONTEND_COMPLETE.md                Completion summary
├── DOCUMENTATION_MASTER_INDEX.md       All 26 docs indexed
└── [22 more documentation files]
```

---

## 🚀 Installation & Quick Start (5 minutes)

### 1. Environment Configuration

Create `.env.local` in the `frontend` directory. Get credentials from [Supabase Dashboard](https://app.supabase.com):

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### 2. Local Development

```bash
# Terminal 1: Frontend
cd frontend
npm install
npm run dev

# Terminal 2: Backend API & Redis Queue
cd backend
npm install
npm run dev
```
Visit `http://localhost:3000`. Your frontend is now running with complete auth, protected routes, and bilingual support.

### 3. Production Deployment (Docker, K8s, Vercel)
*   **Frontend (Fastest):** Vercel handles the Next.js 14 App Router flawlessly. Run `vercel` in the frontend directory.
*   **Backend (Scalable):** The backend, Redis server, and background workers are bundled via `docker-compose.yml`. Just run `docker compose up -d --build`.
*   **Kubernetes (K8s) Ready:** Stateless Node.js containers mean you can spin up 100+ replica pods behind a load balancer to handle thousands of concurrent students.

---

## 📚 Documentation Map

### Start Here ⭐
- **[QUICK_START.md](./QUICK_START.md)** - Complete 30-minute setup (from zero to production)
- **[FRONTEND_COMPLETE.md](./FRONTEND_COMPLETE.md)** - What was built, architecture, security features

### Detailed Guides
- **[FRONTEND_SETUP_GUIDE.md](./FRONTEND_SETUP_GUIDE.md)** - Frontend setup, auth flows, route protection (20 min)
- **[ENVIRONMENT_SETUP_GUIDE.md](./ENVIRONMENT_SETUP_GUIDE.md)** - All environment variables & credentials (15 min)
- **[FRONTEND_DEPLOYMENT_GUIDE.md](./FRONTEND_DEPLOYMENT_GUIDE.md)** - Testing, building, deploying to Vercel/Docker (30 min)
- **[FRONTEND_I18N_REFERENCE.md](./FRONTEND_I18N_REFERENCE.md)** - Bilingual translations (40+ keys)

### Backend & Workers
- **[BULLMQ_WORKERS_QUICKSTART.md](./BULLMQ_WORKERS_QUICKSTART.md)** - Background job setup (10 min)
- **[N8N_NOTIFICATION_HUB_QUICKSTART.md](./N8N_NOTIFICATION_HUB_QUICKSTART.md)** - Notification routing (5 min)
- **[COMPLETE_DELIVERY_SUMMARY.md](./COMPLETE_DELIVERY_SUMMARY.md)** - Full system architecture (30 min)

### Master Index
- **[DOCUMENTATION_MASTER_INDEX.md](./DOCUMENTATION_MASTER_INDEX.md)** - Complete guide to all 26 docs

---

## 🧪 Testing Checklist

Before deploying to production, verify:
- [ ] Frontend loads at `http://localhost:3000`
- [ ] Can sign up with email and verification works
- [ ] Google OAuth works seamlessly
- [ ] Protected routes redirect accurately
- [ ] Language toggle (EN/BN/HI) persists across all pages
- [ ] Local payment webhooks (MacroDroid -> Express API) process successfully
- [ ] Lighthouse score > 90

---

## 🆘 Common Troubleshooting

*   **"Cannot find module '@supabase/ssr'":** Run `npm install @supabase/ssr @supabase/supabase-js`.
*   **"NEXT_PUBLIC_SUPABASE_URL is not defined":** Ensure `.env.local` is present in the `frontend` root.
*   **Auth not working:** Check Supabase project is active, clear browser cache, and check DevTools Console (F12).
*   *See **[FRONTEND_DEPLOYMENT_GUIDE.md](./FRONTEND_DEPLOYMENT_GUIDE.md)** for 15+ more solutions.*

---

## 🔮 Future Roadmap: The Next Frontier
This hackathon submission is just Phase 1. 
*   **n8n Integration:** We are currently integrating n8n workflows to completely automate admin tasks, email campaigns, and multi-step AI document processing pipelines.
*   **Autonomous Swarm Agents:** Implementing specialized sub-agents (e.g., a "Math Tutor Agent", a "Grammar Agent") that collaborate and debate each other to provide the ultimate synthesized answer.

---
*Built with ❤️, ☕, and the sheer power of Gemini Advanced AI.*

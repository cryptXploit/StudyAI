'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, BrainCircuit, Target, Network, MessageSquare, Briefcase, Zap, Calculator, ChevronRight, Lock, PlayCircle, Loader2, CheckCircle2, Copy, FileJson, Presentation as PresentationIcon, Code2, Beaker, Clock, BookOpen, Layers, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import mermaid from 'mermaid';

const DEMO_FEATURES = [
  {
    id: 'solver',
    name: 'Pro Solver',
    icon: <Calculator className="w-5 h-5" />,
    color: 'emerald',
    description: 'Solve complex math, physics, and chemistry equations step-by-step.',
    mockInput: 'Solve the Schrodinger equation for a particle in a 1D box.',
    mockOutput: 'Here is the step-by-step derivation for a particle in a 1-Dimensional box of length $$ L $$.\n\n### 1. The Schrödinger Equation\nThe time-independent Schrödinger equation is:\n$$ \\hat{H}\\psi = E\\psi $$\nWhere the Hamiltonian operator is:\n$$ \\hat{H} = -\\frac{\\hbar^2}{2m}\\frac{d^2}{dx^2} + V(x) $$\n\n### 2. Potential Energy Boundary Conditions\nInside the box ($$0 < x < L$$), $$ V(x) = 0 $$.\nOutside the box, $$ V(x) = \\infty $$. Thus, $$ \\psi(x) = 0 $$ outside the box.\n\n### 3. Solving the Differential Equation\nInside the box, the equation simplifies to:\n$$ -\\frac{\\hbar^2}{2m}\\frac{d^2\\psi}{dx^2} = E\\psi $$\n$$ \\frac{d^2\\psi}{dx^2} + k^2\\psi = 0 \\quad \\text{where} \\quad k = \\frac{\\sqrt{2mE}}{\\hbar} $$\n\nGeneral solution:\n$$ \\psi(x) = A \\sin(kx) + B \\cos(kx) $$\n\n### 4. Applying Boundary Conditions\n- At $$x = 0$$, $$ \\psi(0) = B = 0 $$\n- At $$x = L$$, $$ \\psi(L) = A \\sin(kL) = 0 $$\nSince $$ A \\neq 0 $$, we must have $$ kL = n\\pi $$ ($$n = 1, 2, 3...$$).\n\n### 5. Final Wavefunction and Energy Levels\nSolving for $$E$$, we get the quantized energy levels:\n$$ E_n = \\frac{n^2\\pi^2\\hbar^2}{2mL^2} $$\n\nAnd the normalized wavefunction:\n$$ \\psi_n(x) = \\sqrt{\\frac{2}{L}} \\sin\\left(\\frac{n\\pi x}{L}\\right) $$'
  },
  {
    id: 'mindmap',
    name: 'Mind Maps',
    icon: <Network className="w-5 h-5" />,
    color: 'indigo',
    description: 'Instantly visualize concepts with massive, interactive mind maps.',
    mockInput: 'Create a highly detailed mind map of Artificial Intelligence Branches and Sub-fields.',
    mockOutput: '```mermaid\nmindmap\n  root((Artificial Intelligence))\n    Machine Learning\n      Supervised Learning\n        Regression\n        Classification\n      Unsupervised Learning\n        Clustering\n        Dimensionality Reduction\n      Reinforcement Learning\n    Natural Language Processing\n      Syntax Analysis\n      Semantic Analysis\n      LLMs & Transformers\n        GPT-4\n        BERT\n        Claude\n    Computer Vision\n      Image Recognition\n      Object Detection\n      Facial Recognition\n    Robotics\n      Kinematics\n      Actuation\n      Sensors & Perception\n    Expert Systems\n      Knowledge Base\n      Inference Engine\n```'
  },
  {
    id: 'presentation',
    name: 'AI Presentation',
    icon: <PresentationIcon className="w-5 h-5" />,
    color: 'blue',
    description: 'Generate 5-10 slide beautiful decks instantly from a simple prompt.',
    mockInput: 'Create a 5-slide presentation on The Future of Quantum Computing',
    mockOutput: '<div style="overflow-x:auto; display:flex; scroll-snap-type: x mandatory; gap: 20px; padding-bottom: 15px; scrollbar-width: thin; scroll-behavior: smooth;" class="custom-scrollbar">

<!-- Slide 1: Title -->
<div style="min-width: 100%; aspect-ratio: 16/9; background: linear-gradient(135deg, #0B0F19 0%, #1e1b4b 100%); border-radius: 16px; text-align: center; border: 1px solid #4f46e5; box-shadow: 0 10px 40px rgba(79, 70, 229, 0.3); scroll-snap-align: center; display:flex; flex-direction:column; justify-content:center; align-items:center; position:relative; overflow:hidden; transition: transform 0.3s; cursor: grab;">
  <div style="position:absolute; top:-50%; left:-50%; width:200%; height:200%; background:radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%); animation: spin 20s linear infinite;"></div>
  <h4 style="color: #6366f1; text-transform: uppercase; letter-spacing: 4px; font-size: 12px; margin-bottom: 10px; z-index:1;">AI Generated Presentation</h4>
  <h1 style="color: #fff; font-size: 3.5rem; margin: 10px 0; z-index:1; font-weight:900;">Quantum Leap</h1>
  <h3 style="color: #a5b4fc; font-weight: normal; font-size: 1.2rem; z-index:1;">How Quantum Computing will redefine the 21st Century</h3>
  <div style="position:absolute; bottom:20px; font-size:12px; color:#6366f1; font-weight:bold; animation: pulse 2s infinite;">Swipe or Scroll to navigate &rarr;</div>
  <div style="position:absolute; top:20px; right:20px; font-size:12px; color:#a5b4fc; font-weight:bold;">1 / 8</div>
</div>

<!-- Slide 2: Two Columns -->
<div style="min-width: 100%; aspect-ratio: 16/9; background: #131620; padding: 40px; border-radius: 16px; border: 1px solid #334155; scroll-snap-align: center; display:flex; flex-direction:column; justify-content:center; position:relative;">
  <div style="position:absolute; top:20px; right:20px; font-size:12px; color:#94a3b8; font-weight:bold;">2 / 8</div>
  <h4 style="color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; font-size:12px;">The Basics</h4>
  <h2 style="color: #e2e8f0; font-size: 2.2rem; border-bottom: 2px solid #4f46e5; padding-bottom: 15px; margin-bottom:30px;">Classical vs Quantum</h2>
  <div style="display:flex; gap:30px;">
    <div style="flex:1; background:#1e253c; padding:25px; border-radius:12px; border-top:4px solid #38bdf8; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
      <h3 style="color:#38bdf8; margin-top:0;">Bits (Classical)</h3>
      <p style="color:#94a3b8; line-height:1.6; font-size:14px;">Exist exclusively as either 0 or 1. Think of it like a light switch that is strictly ON or OFF.</p>
    </div>
    <div style="flex:1; background:#1e253c; padding:25px; border-radius:12px; border-top:4px solid #818cf8; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
      <h3 style="color:#818cf8; margin-top:0;">Qubits (Quantum)</h3>
      <p style="color:#94a3b8; line-height:1.6; font-size:14px;">Can exist as 0, 1, or both simultaneously via Superposition. Like a spinning coin in the air.</p>
    </div>
  </div>
</div>

<!-- Slide 3: Detailed List -->
<div style="min-width: 100%; aspect-ratio: 16/9; background: #131620; padding: 40px; border-radius: 16px; border: 1px solid #334155; scroll-snap-align: center; display:flex; flex-direction:column; justify-content:center; position:relative;">
  <div style="position:absolute; top:20px; right:20px; font-size:12px; color:#94a3b8; font-weight:bold;">3 / 8</div>
  <h4 style="color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; font-size:12px;">Core Concepts</h4>
  <h2 style="color: #e2e8f0; font-size: 2.2rem; border-bottom: 2px solid #a78bfa; padding-bottom: 15px; margin-bottom:30px;">Quantum Mechanics 101</h2>
  <ul style="color: #cbd5e1; font-size: 1.1rem; line-height: 2; margin-top: 10px; padding-left: 20px;">
    <li><b style="color: #60a5fa;">Superposition:</b> The ability to process vast numbers of outcomes simultaneously.</li>
    <li><b style="color: #c084fc;">Entanglement:</b> Qubits can be linked, so changing one instantly changes the other, regardless of distance.</li>
    <li><b style="color: #f472b6;">Interference:</b> Amplifying correct paths to a solution while cancelling out incorrect ones.</li>
  </ul>
</div>

<!-- Slide 4: Quote -->
<div style="min-width: 100%; aspect-ratio: 16/9; background: #0B0F19; padding: 40px; border-radius: 16px; border: 1px solid #10b981; scroll-snap-align: center; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; position:relative;">
  <div style="position:absolute; top:20px; right:20px; font-size:12px; color:#10b981; font-weight:bold;">4 / 8</div>
  <div style="font-size: 8rem; color: rgba(16,185,129,0.1); position:absolute; top:20px; left:40px; line-height:1;">"</div>
  <p style="color: #ecfdf5; font-size: 2rem; font-style: italic; max-width: 80%; z-index:1; margin-bottom:20px;">Nature isn\'t classical, dammit, and if you want to make a simulation of nature, you\'d better make it quantum mechanical.</p>
  <h4 style="color: #10b981; text-transform: uppercase; letter-spacing: 2px;">— Richard Feynman (1981)</h4>
</div>

<!-- Slide 5: Data visualization Grid -->
<div style="min-width: 100%; aspect-ratio: 16/9; background: #131620; padding: 40px; border-radius: 16px; border: 1px solid #334155; scroll-snap-align: center; display:flex; flex-direction:column; justify-content:center; position:relative;">
  <div style="position:absolute; top:20px; right:20px; font-size:12px; color:#94a3b8; font-weight:bold;">5 / 8</div>
  <h4 style="color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; font-size:12px;">Timeline</h4>
  <h2 style="color: #e2e8f0; font-size: 2.2rem; border-bottom: 2px solid #10b981; padding-bottom: 15px; margin-bottom:20px;">Projected Growth (Qubit Count)</h2>
  <div style="display:flex; align-items:flex-end; gap:20px; height:200px; padding:20px; background:#1e253c; border-radius:12px; border-bottom:1px solid #334155; border-left:1px solid #334155;">
    <div style="flex:1; background:#475569; height:10%; border-radius:4px 4px 0 0; position:relative; transition:height 1s;"><span style="position:absolute; top:-25px; left:50%; transform:translateX(-50%); color:#cbd5e1; font-size:12px;">2024 (1k)</span></div>
    <div style="flex:1; background:#3b82f6; height:30%; border-radius:4px 4px 0 0; position:relative;"><span style="position:absolute; top:-25px; left:50%; transform:translateX(-50%); color:#cbd5e1; font-size:12px;">2026 (4k)</span></div>
    <div style="flex:1; background:#8b5cf6; height:50%; border-radius:4px 4px 0 0; position:relative;"><span style="position:absolute; top:-25px; left:50%; transform:translateX(-50%); color:#cbd5e1; font-size:12px;">2028 (10k)</span></div>
    <div style="flex:1; background:#10b981; height:100%; border-radius:4px 4px 0 0; position:relative; box-shadow:0 0 20px rgba(16,185,129,0.5);"><span style="position:absolute; top:-25px; left:50%; transform:translateX(-50%); color:#10b981; font-weight:bold; font-size:12px;">2030 (1M+)</span></div>
  </div>
</div>

<!-- Slide 6: Grid of applications -->
<div style="min-width: 100%; aspect-ratio: 16/9; background: #131620; padding: 40px; border-radius: 16px; border: 1px solid #334155; scroll-snap-align: center; display:flex; flex-direction:column; justify-content:center; position:relative;">
  <div style="position:absolute; top:20px; right:20px; font-size:12px; color:#94a3b8; font-weight:bold;">6 / 8</div>
  <h4 style="color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; font-size:12px;">Impact</h4>
  <h2 style="color: #e2e8f0; font-size: 2.2rem; border-bottom: 2px solid #f43f5e; padding-bottom: 10px; margin-bottom:20px;">Real-world Applications</h2>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
    <div style="background: #0B0F19; padding: 20px; border-radius: 8px; border-left:3px solid #34d399;"><h3 style="color:#34d399; margin:0 0 5px 0;">Drug Discovery</h3><p style="color:#94a3b8; font-size:0.85rem; margin:0;">Simulating complex molecular structures in seconds instead of years.</p></div>
    <div style="background: #0B0F19; padding: 20px; border-radius: 8px; border-left:3px solid #38bdf8;"><h3 style="color:#38bdf8; margin:0 0 5px 0;">Cryptography</h3><p style="color:#94a3b8; font-size:0.85rem; margin:0;">Breaking RSA encryption and establishing quantum-secure networks.</p></div>
    <div style="background: #0B0F19; padding: 20px; border-radius: 8px; border-left:3px solid #fbbf24;"><h3 style="color:#fbbf24; margin:0 0 5px 0;">Financial Modeling</h3><p style="color:#94a3b8; font-size:0.85rem; margin:0;">Optimizing vast investment portfolios instantly.</p></div>
    <div style="background: #0B0F19; padding: 20px; border-radius: 8px; border-left:3px solid #f472b6;"><h3 style="color:#f472b6; margin:0 0 5px 0;">Climate Change</h3><p style="color:#94a3b8; font-size:0.85rem; margin:0;">Discovering new carbon-capture materials via molecular modeling.</p></div>
  </div>
</div>

<!-- Slide 7: Big Threat (Dark theme) -->
<div style="min-width: 100%; aspect-ratio: 16/9; background: linear-gradient(135deg, #4c1d95 0%, #1e1b4b 100%); padding: 40px; border-radius: 16px; text-align: center; border: 1px solid #7c3aed; scroll-snap-align: center; display:flex; flex-direction:column; justify-content:center; align-items:center; position:relative;">
  <div style="position:absolute; top:20px; right:20px; font-size:12px; color:#a78bfa; font-weight:bold;">7 / 8</div>
  <div style="width:60px; height:60px; border-radius:50%; background:rgba(239,68,68,0.2); border:2px solid #ef4444; display:flex; align-items:center; justify-content:center; margin-bottom:20px;"><span style="color:#ef4444; font-size:24px; font-weight:bold;">!</span></div>
  <h4 style="color: #a78bfa; text-transform: uppercase; letter-spacing: 2px;">The Threat</h4>
  <h2 style="color: #fff; font-size: 2.5rem; margin-top:0;">Shor\'s Algorithm</h2>
  <p style="color: #ddd; font-size: 1.1rem; max-width: 80%; margin: 10px auto;">A quantum computer with enough stable qubits could factor massive prime numbers exponentially faster than classical supercomputers, rendering current internet security (RSA) entirely obsolete.</p>
</div>

<!-- Slide 8: Conclusion -->
<div style="min-width: 100%; aspect-ratio: 16/9; background: #0B0F19; padding: 40px; border-radius: 16px; text-align: center; border: 1px solid #334155; scroll-snap-align: center; display:flex; flex-direction:column; justify-content:center; align-items:center; position:relative;">
  <div style="position:absolute; top:20px; right:20px; font-size:12px; color:#94a3b8; font-weight:bold;">8 / 8</div>
  <h4 style="color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; margin-bottom:20px;">Conclusion</h4>
  <h1 style="color: #f8fafc; font-size: 3.5rem; margin: 0; background: -webkit-linear-gradient(45deg, #38bdf8, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">The Race is On.</h1>
  <p style="color: #64748b; font-size: 1.2rem; margin-top:20px;">Are we ready for the next industrial revolution?</p>
  <button style="margin-top:30px; padding:10px 30px; background:transparent; border:2px solid #4f46e5; color:#a5b4fc; border-radius:30px; cursor:pointer; font-weight:bold; transition:all 0.3s;" onMouseOver="this.style.background=\'#4f46e5\'; this.style.color=\'white\';" onMouseOut="this.style.background=\'transparent\'; this.style.color=\'#a5b4fc\';">End Presentation</button>
</div>

</div>'
  },
  {
    id: 'flowchart',
    name: 'Flowchart Generator',
    icon: <Network className="w-5 h-5" />,
    color: 'cyan',
    description: 'Generate massive, highly complex system architectures.',
    mockInput: 'Generate a flowchart for a Microservices E-Commerce Architecture.',
    mockOutput: '```mermaid\ngraph TD\n    Client((Web / Mobile App)) --> API_Gateway[API Gateway]\n    \n    subgraph Core Services\n        API_Gateway --> Auth[Auth Service]\n        API_Gateway --> Product[Product Service]\n        API_Gateway --> Order[Order Service]\n        API_Gateway --> Payment[Payment Service]\n    end\n    \n    subgraph Databases\n        Auth --> DB_Auth[(Redis/PostgreSQL)]\n        Product --> DB_Product[(MongoDB)]\n        Order --> DB_Order[(PostgreSQL)]\n        Payment --> DB_Payment[(Cassandra)]\n    end\n    \n    subgraph External APIs\n        Payment --> Stripe[Stripe API]\n        Order --> Logistics[FedEx/UPS API]\n    end\n    \n    subgraph Async Events\n        Order -.-> Kafka{Apache Kafka}\n        Payment -.-> Kafka\n        Kafka -.-> Notification[Notification Service]\n        Notification --> Email((SendGrid))\n    end\n```'
  },
  {
    id: 'career',
    name: 'Career Pathway',
    icon: <Briefcase className="w-5 h-5" />,
    color: 'amber',
    description: 'Detailed, month-by-month interactive career roadmaps.',
    mockInput: 'Generate a 1-year roadmap to become a Senior DevOps Engineer.',
    mockOutput: '<div style="font-family: system-ui, sans-serif; background: #0f172a; padding: 25px; border-radius: 16px; color: #f8fafc; border: 1px solid #334155;">\n  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">\n    <h2 style="color: #fbbf24; margin: 0;">Senior DevOps Roadmap</h2>\n    <span style="background: #b45309; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">Estimated Time: 12 Months</span>\n  </div>\n  \n  <div style="border-left: 2px solid #334155; padding-left: 20px; margin-top: 20px; position: relative;">\n    \n    <div style="margin-bottom: 30px; position: relative;">\n      <div style="position: absolute; left: -27px; top: 0; width: 12px; height: 12px; border-radius: 50%; background: #38bdf8; border: 3px solid #0f172a;"></div>\n      <h3 style="color: #38bdf8; margin: 0 0 5px 0;">Months 1-2: Advanced Linux & Scripting</h3>\n      <ul style="color: #94a3b8; font-size: 14px; margin: 0; padding-left: 20px;">\n        <li>Master Bash and Python scripting for automation.</li>\n        <li>Deep dive into Linux Kernel, namespaces, and cgroups.</li>\n        <li>Networking protocols (TCP/IP, DNS, HTTP/3).</li>\n      </ul>\n    </div>\n\n    <div style="margin-bottom: 30px; position: relative;">\n      <div style="position: absolute; left: -27px; top: 0; width: 12px; height: 12px; border-radius: 50%; background: #a78bfa; border: 3px solid #0f172a;"></div>\n      <h3 style="color: #a78bfa; margin: 0 0 5px 0;">Months 3-5: Containerization & Orchestration</h3>\n      <ul style="color: #94a3b8; font-size: 14px; margin: 0; padding-left: 20px;">\n        <li>Docker inside-out (multi-stage builds, security).</li>\n        <li>Kubernetes (K8s) Architecture & Administration (CKA prep).</li>\n        <li>Helm charts, Operators, and Service Meshes (Istio).</li>\n      </ul>\n    </div>\n\n    <div style="margin-bottom: 30px; position: relative;">\n      <div style="position: absolute; left: -27px; top: 0; width: 12px; height: 12px; border-radius: 50%; background: #10b981; border: 3px solid #0f172a;"></div>\n      <h3 style="color: #10b981; margin: 0 0 5px 0;">Months 6-8: CI/CD & GitOps</h3>\n      <ul style="color: #94a3b8; font-size: 14px; margin: 0; padding-left: 20px;">\n        <li>Build complex Jenkins/GitHub Actions pipelines.</li>\n        <li>Implement GitOps using ArgoCD or Flux.</li>\n        <li>Automated testing integration and zero-downtime deployments.</li>\n      </ul>\n    </div>\n\n    <div style="margin-bottom: 0; position: relative;">\n      <div style="position: absolute; left: -27px; top: 0; width: 12px; height: 12px; border-radius: 50%; background: #f43f5e; border: 3px solid #0f172a;"></div>\n      <h3 style="color: #f43f5e; margin: 0 0 5px 0;">Months 9-12: IaC, Cloud & Observability</h3>\n      <ul style="color: #94a3b8; font-size: 14px; margin: 0; padding-left: 20px;">\n        <li>Infrastructure as Code: Terraform and Ansible.</li>\n        <li>Cloud Native Architecture (AWS/GCP/Azure).</li>\n        <li>Prometheus, Grafana, ELK Stack, and OpenTelemetry.</li>\n      </ul>\n    </div>\n\n  </div>\n</div>'
  },
  {
    id: 'flashcards',
    name: 'Smart Flashcards',
    icon: <BrainCircuit className="w-5 h-5" />,
    color: 'pink',
    description: 'Auto-generate stacked flashcards from textbooks for active recall.',
    mockInput: 'Generate 3 high-yield medical flashcards on Cardiology.',
    mockOutput: '<div style="display:flex; flex-direction:column; gap:20px; perspective:1000px; max-width: 500px; margin: 0 auto;">\n\n  <!-- Card 1 -->\n  <div style="background: #1e293b; border: 1px solid #475569; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">\n    <div style="background: #334155; padding: 10px 15px; color: #cbd5e1; font-size: 12px; font-weight: bold; text-transform: uppercase;">Front • Q1</div>\n    <div style="padding: 20px;">\n      <h3 style="color: #f8fafc; margin: 0;">What is the classic triad of symptoms for Aortic Stenosis?</h3>\n    </div>\n    <div style="background: rgba(16, 185, 129, 0.1); border-top: 1px dashed #10b981; padding: 20px;">\n      <div style="color: #10b981; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px;">Back • Answer</div>\n      <p style="color: #ecfdf5; margin: 0; font-size: 1.1rem;">1. Syncope (fainting)<br/>2. Angina (chest pain)<br/>3. Dyspnea (shortness of breath on exertion)</p>\n    </div>\n  </div>\n\n  <!-- Card 2 -->\n  <div style="background: #1e293b; border: 1px solid #475569; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">\n    <div style="background: #334155; padding: 10px 15px; color: #cbd5e1; font-size: 12px; font-weight: bold; text-transform: uppercase;">Front • Q2</div>\n    <div style="padding: 20px;">\n      <h3 style="color: #f8fafc; margin: 0;">Which artery is most commonly occluded in a Myocardial Infarction (MI)?</h3>\n    </div>\n    <div style="background: rgba(16, 185, 129, 0.1); border-top: 1px dashed #10b981; padding: 20px;">\n      <div style="color: #10b981; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px;">Back • Answer</div>\n      <p style="color: #ecfdf5; margin: 0; font-size: 1.1rem;">Left Anterior Descending (LAD) artery, often referred to as the "widowmaker".</p>\n    </div>\n  </div>\n\n</div>'
  },
  {
    id: '3d-chemistry',
    name: '3D Chemistry Lab',
    icon: <Beaker className="w-5 h-5" />,
    color: 'purple',
    description: 'Visualize molecular structures in interactive 3D simulations.',
    mockInput: 'Generate the 3D molecular data for Caffeine (C8H10N4O2).',
    mockOutput: '```json\n{\n  "molecule": "Caffeine",\n  "formula": "C8H10N4O2",\n  "molarMass": 194.19,\n  "structure": {\n    "atoms": [\n      {"id": "N1", "element": "N", "coords": [-1.2, 0.5, 0.0], "charge": -0.3},\n      {"id": "C2", "element": "C", "coords": [0.0, 1.2, 0.0], "charge": 0.5},\n      {"id": "O3", "element": "O", "coords": [0.0, 2.4, 0.0], "charge": -0.4},\n      {"id": "N4", "element": "N", "coords": [1.2, 0.5, 0.0], "charge": -0.3},\n      {"id": "C5", "element": "C", "coords": [1.2, -0.9, 0.0], "charge": 0.2},\n      {"id": "C6", "element": "C", "coords": [-0.1, -1.5, 0.0], "charge": 0.1},\n      {"id": "C7", "element": "C", "coords": [-1.2, -0.9, 0.0], "charge": 0.2}\n    ],\n    "bonds": [\n      {"source": "N1", "target": "C2", "type": "single"},\n      {"source": "C2", "target": "O3", "type": "double"},\n      {"source": "C2", "target": "N4", "type": "single"},\n      {"source": "N4", "target": "C5", "type": "single"},\n      {"source": "C5", "target": "C6", "type": "double"},\n      {"source": "C6", "target": "C7", "type": "single"},\n      {"source": "C7", "target": "N1", "type": "double"}\n    ]\n  },\n  "renderSettings": {\n    "engine": "WebGL-ThreeJS",\n    "lighting": "HDRI-Studio",\n    "rotationSpeed": 0.05\n  }\n}\n```\n*The 3D renderer will automatically parse this JSON to mount the interactive Canvas.*'
  },
  {
    id: 'logic-workspace',
    name: 'Logic Workspace',
    icon: <Code2 className="w-5 h-5" />,
    color: 'red',
    description: 'Solve digital logic, boolean algebra, and truth tables.',
    mockInput: 'Simplify the boolean expression: Y = A'B'C + A'BC + AB'C + ABC',
    mockOutput: 'Let\'s simplify the Boolean expression using algebra:\n\n$$ Y = \\bar{A}\\bar{B}C + \\bar{A}BC + A\\bar{B}C + ABC $$\n\n**Step 1:** Factor out common terms in pairs.\nGroup the first two and the last two terms:\n$$ Y = \\bar{A}C(\\bar{B} + B) + AC(\\bar{B} + B) $$\n\n**Step 2:** Apply the complement rule ($$ B + \\bar{B} = 1 $$).\n$$ Y = \\bar{A}C(1) + AC(1) $$\n$$ Y = \\bar{A}C + AC $$\n\n**Step 3:** Factor out $$C$$.\n$$ Y = C(\\bar{A} + A) $$\n\n**Step 4:** Apply the complement rule again ($$ A + \\bar{A} = 1 $$).\n$$ Y = C(1) $$\n\n**Final Simplified Expression:**\n$$ Y = C $$\n\n### Truth Table Verification\n| A | B | C | Y (Original) | Y (Simplified) |\n|---|---|---|--------------|----------------|\n| 0 | 0 | 0 | 0 | 0 |\n| 0 | 0 | 1 | 1 | 1 |\n| 0 | 1 | 0 | 0 | 0 |\n| 0 | 1 | 1 | 1 | 1 |\n| 1 | 0 | 0 | 0 | 0 |\n| 1 | 0 | 1 | 1 | 1 |\n| 1 | 1 | 0 | 0 | 0 |\n| 1 | 1 | 1 | 1 | 1 |'
  },
  {
    id: 'night-before',
    name: 'Night Before Exam',
    icon: <Clock className="w-5 h-5" />,
    color: 'orange',
    description: 'Ultra-compressed cheat sheets covering entire semesters.',
    mockInput: 'Generate a Night Before cheat sheet for Data Structures & Algorithms.',
    mockOutput: '## 🚀 Ultimate DSA Cheat Sheet\n\n### 1. Big O Time Complexities (Worst Case)\n| Data Structure | Access | Search | Insertion | Deletion |\n|----------------|--------|--------|-----------|----------|\n| **Array** | $$O(1)$$ | $$O(n)$$ | $$O(n)$$ | $$O(n)$$ |\n| **Linked List**| $$O(n)$$ | $$O(n)$$ | $$O(1)$$ | $$O(1)$$ |\n| **BST** | $$O(n)$$ | $$O(n)$$ | $$O(n)$$ | $$O(n)$$ |\n| **Hash Table** | N/A | $$O(1)$$ | $$O(1)$$ | $$O(1)$$ |\n\n### 2. Sorting Algorithms\n- **Quick Sort:** $$O(n \\log n)$$ avg, $$O(n^2)$$ worst. Unstable.\n- **Merge Sort:** $$O(n \\log n)$$ worst. Stable. Uses $$O(n)$$ space.\n- **Heap Sort:** $$O(n \\log n)$$ worst. Unstable. In-place.\n\n### 3. Graph Algorithms\n- **BFS:** Uses Queue. Good for shortest path on unweighted graphs.\n- **DFS:** Uses Stack/Recursion. Good for topological sort, cycle detection.\n- **Dijkstra:** $$O(V^2)$$ or $$O(E + V \\log V)$$. Shortest path (no negative weights).\n- **Bellman-Ford:** $$O(VE)$$. Handles negative weights.\n\n### 4. Dynamic Programming Core Idea\n1. Define the subproblem (State).\n2. Find the recurrence relation (Transition).\n3. Identify base cases.\n4. Memoize or build table bottom-up.\n*Example (Fibonacci):* $$ DP[i] = DP[i-1] + DP[i-2] $$'
  },
  {
    id: 'pro-chat',
    name: 'Pro Chat (GPT-4 / Opus)',
    icon: <MessageSquare className="w-5 h-5" />,
    color: 'violet',
    description: 'Chat with the most advanced AI models for deep insights.',
    mockInput: 'Explain the difference between Keynesian and Austrian economics using a table.',
    mockOutput: 'Certainly. The Keynesian and Austrian schools of economic thought offer fundamentally different approaches to macroeconomic policy, business cycles, and the role of government.\n\n### Core Comparison Table\n\n| Feature | Keynesian Economics | Austrian Economics |\n|---------|---------------------|--------------------|\n| **Primary Focus** | Aggregate demand and spending | Individual choice and production |\n| **Role of Government** | Active intervention (stimulus) during recessions | Minimal intervention; laissez-faire |\n| **Cause of Recessions** | Drop in aggregate demand, hoarding cash | Artificial credit expansion by central banks (malinvestment) |\n| **Solution to Recessions** | Government deficit spending, lower interest rates | Liquidate bad debts, let the market correct naturally |\n| **View on Interest Rates** | Tool for central banks to manage growth | Must be determined by the free market |\n| **Key Figures** | John Maynard Keynes, Paul Krugman | Friedrich Hayek, Ludwig von Mises |\n\n**Summary:**\nKeynesians believe the economy is a machine that sometimes needs a jumpstart via government intervention. Austrians believe the economy is an organic ecosystem where intervention causes more harm than good by distorting price signals.'
  }
];


const MermaidDemo = ({ code }: { code: string }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState(false);
  
  useEffect(() => {
    let isMounted = true;
    mermaid.initialize({ startOnLoad: false, theme: 'dark' });
    const renderChart = async () => {
      try {
        setError(false);
        const { svg } = await mermaid.render('mermaid-demo-' + Math.random().toString(36).substring(7), code);
        if (isMounted) setSvg(svg);
      } catch (err) {
        setError(true);
      }
    };
    renderChart();
    return () => { isMounted = false; };
  }, [code]);
  
  if (error) return <div className="text-red-400 p-4 border border-red-500/20 bg-red-500/10 rounded-xl text-sm font-mono flex items-center justify-center">Loading diagram...</div>;
  if (!svg) return <div className="animate-pulse bg-slate-800/50 h-40 rounded-xl w-full border border-slate-700/50"></div>;
  return <div className="bg-slate-900 border border-slate-700/50 p-6 rounded-xl flex justify-center shadow-lg my-4 overflow-x-auto custom-scrollbar" dangerouslySetInnerHTML={{ __html: svg }} />;
};

export default function LandingInteractiveDemo() {
  const router = useRouter();
  const [activeFeature, setActiveFeature] = useState(DEMO_FEATURES[0]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [displayedOutput, setDisplayedOutput] = useState('');
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFeatures = DEMO_FEATURES.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.description.toLowerCase().includes(searchQuery.toLowerCase()));

  // Typewriter effect simulator
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isSimulating) {
      setDisplayedOutput('');
      setShowSignupPrompt(false);
      
      let currentIndex = 0;
      const text = activeFeature.mockOutput;
      
      const typeNextChar = () => {
        if (currentIndex < text.length) {
          // Type chunks instead of single chars to make HTML/Mermaid render faster and smoother
          const chunkSize = Math.floor(Math.random() * 8) + 4; 
          setDisplayedOutput(text.slice(0, currentIndex + chunkSize));
          currentIndex += chunkSize;
          timeout = setTimeout(typeNextChar, 10);
        } else {
          setDisplayedOutput(text); // Ensure complete text
          setIsSimulating(false);
        }
      };
      
      timeout = setTimeout(typeNextChar, 300); // Initial delay
    }
    
    return () => clearTimeout(timeout);
  }, [isSimulating, activeFeature]);

  const handleTestClick = () => {
    if (isSimulating) return;
    setIsSimulating(true);
  };

  const handleCustomInput = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowSignupPrompt(true);
  };

  return (
    <div className="w-full max-w-6xl mx-auto mt-16 mb-24 pointer-events-auto relative z-20">
      
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">
          Experience the <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400">Power of AI</span>
        </h2>
        <p className="text-slate-400 font-medium text-lg max-w-2xl mx-auto">Select a module below and run the demo to see how Prepia processes complex data instantly.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#131620]/80 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-4 md:p-6">
        
        {/* Sidebar - Feature Selection */}
        <div className="lg:col-span-4 flex flex-col h-[600px]">
          <div className="relative mb-4 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-500" />
            </div>
            <input
              type="text"
              placeholder="Search features (e.g. Solver, Map)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0B0F19] border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          
          <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1 pr-2 pb-4">
            {filteredFeatures.map((feature) => (
              <button
                key={feature.id}
                onClick={() => {
                  if (!isSimulating) {
                    setActiveFeature(feature);
                    setDisplayedOutput('');
                    setShowSignupPrompt(false);
                  }
                }}
                disabled={isSimulating}
                className={`w-full text-left p-3.5 rounded-2xl transition-all flex items-start gap-3 ${
                  activeFeature.id === feature.id
                    ? 'bg-[#1e253c] border-slate-700 shadow-md scale-[1.02]'
                    : 'bg-transparent hover:bg-slate-800/50 border-transparent hover:scale-[1.01]'
                } border group`}
              >
                <div className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                  activeFeature.id === feature.id 
                    ? `bg-${feature.color}-500/20 text-${feature.color}-400` 
                    : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
                }`}>
                  {feature.icon}
                </div>
                <div>
                  <h3 className={`font-bold text-sm ${activeFeature.id === feature.id ? 'text-white' : 'text-slate-300'}`}>
                    {feature.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </button>
            ))}
            {filteredFeatures.length === 0 && (
              <div className="text-center text-slate-500 text-sm py-8">No features found.</div>
            )}
          </div>
        </div>

        {/* Main Display - Interactive Area */}
        <div className="lg:col-span-8 bg-[#0B0F19] border border-slate-800 rounded-2xl overflow-hidden flex flex-col relative h-[600px] shadow-inner">
          
          {/* Header */}
          <div className="border-b border-slate-800 p-4 flex items-center justify-between bg-[#131620]/50 backdrop-blur-md">
            <div className="flex items-center gap-2 text-slate-300 font-bold text-sm">
              <Sparkles className={`w-4 h-4 text-${activeFeature.color}-400`} />
              Live Demo: {activeFeature.name}
            </div>
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-slate-700"></div>
              <div className="w-3 h-3 rounded-full bg-slate-700"></div>
              <div className="w-3 h-3 rounded-full bg-slate-700"></div>
            </div>
          </div>

          {/* Chat/Output Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
            
            {/* User Message */}
            <AnimatePresence mode="wait">
              {displayedOutput && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }} 
                  animate={{ opacity: 1, scale: 1, y: 0 }} 
                  className="flex justify-end"
                >
                  <div className="bg-indigo-600/20 border border-indigo-500/30 text-indigo-100 px-5 py-3 rounded-2xl rounded-tr-sm max-w-[85%] font-medium text-sm shadow-md">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {activeFeature.mockInput}
                    </ReactMarkdown>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI Response */}
            <AnimatePresence>
              {(isSimulating || displayedOutput) && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }} 
                  animate={{ opacity: 1, scale: 1, y: 0 }} 
                  className="flex justify-start w-full"
                >
                  <div className="bg-[#131620] border border-slate-700/50 text-slate-200 px-5 py-5 rounded-2xl rounded-tl-sm w-full max-w-full font-medium text-sm leading-relaxed overflow-x-hidden shadow-lg">
                    
                    <div className="prose prose-invert prose-headings:text-slate-100 prose-a:text-indigo-400 prose-strong:text-slate-200 max-w-none text-sm break-words">
                      <ReactMarkdown 
                        remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]} 
                        rehypePlugins={[rehypeKatex, rehypeRaw]} // Enabled rehypeRaw for HTML injection!
                        components={{
                          code: ({node, inline, className, children, ...props}: any) => {
                            const match = /language-(\w+)/.exec(className || '');
                            if (!inline && match && match[1] === 'mermaid') {
                              if (isSimulating) {
                                return (
                                  <div className="relative group my-4 rounded-xl overflow-hidden border border-slate-700/50">
                                    <pre className="p-4 bg-slate-900/80 overflow-x-auto text-sm font-mono text-cyan-300">
                                      <code {...props}>{children}</code>
                                    </pre>
                                  </div>
                                );
                              }
                              return <MermaidDemo code={String(children).replace(/\n$/, '')} />;
                            }
                            return !inline ? (
                              <div className="relative group my-4 rounded-xl overflow-hidden border border-slate-700/50 shadow-lg">
                                <div className="flex items-center justify-between px-4 py-2 bg-[#1e253c]/80 backdrop-blur border-b border-slate-800 text-xs font-mono text-slate-400">
                                  <span>{match ? match[1] : 'code'}</span>
                                  <button className="hover:text-indigo-400 transition-colors flex items-center gap-1"><Copy size={12}/> Copy</button>
                                </div>
                                <pre className="p-4 bg-[#0B0F19] overflow-x-auto text-sm font-mono text-indigo-300">
                                  <code {...props}>{children}</code>
                                </pre>
                              </div>
                            ) : (
                              <code className="px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 font-mono text-[13px] border border-indigo-500/20" {...props}>{children}</code>
                            );
                          },
                          table: ({node, ...props}) => <div className="overflow-x-auto my-6 border border-slate-700/50 rounded-xl bg-[#131620] shadow-md"><table className="min-w-full divide-y divide-slate-700/50 text-sm m-0" {...props}/></div>,
                          th: ({node, ...props}) => <th className="bg-[#1e253c] px-4 py-3 text-left font-bold text-slate-200 uppercase tracking-wider text-xs" {...props}/>,
                          td: ({node, ...props}) => <td className="px-4 py-3 border-t border-slate-700/50 text-slate-300" {...props}/>,
                          p: ({node, ...props}) => <p className="mb-4 leading-relaxed text-slate-300" {...props} />,
                          h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-3 text-white" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-6 mb-3 text-white border-b border-slate-800 pb-2" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-5 mb-2 text-indigo-300" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc pl-5 my-3 space-y-1 text-slate-300" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-3 space-y-1 text-slate-300" {...props} />
                        }}
                      >
                        {displayedOutput}
                      </ReactMarkdown>
                    </div>

                    {isSimulating && (
                      <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse ml-1 align-middle"></span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Initial Empty State */}
            {!isSimulating && !displayedOutput && (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-[#1e253c] flex items-center justify-center border border-slate-700 shadow-inner">
                  {activeFeature.icon}
                </div>
                <p className="font-medium text-sm">Click "Run Demo" to see the {activeFeature.name} in action</p>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-[#131620] border-t border-slate-800 relative mt-auto shrink-0 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
            
            {/* Signup Prompt Overlay */}
            <AnimatePresence>
              {showSignupPrompt && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-4 right-4 mb-3 bg-gradient-to-r from-indigo-600 to-purple-600 p-4 rounded-xl shadow-[0_10px_30px_rgba(79,70,229,0.3)] flex flex-col md:flex-row items-start md:items-center justify-between border border-indigo-400/30 gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded-lg">
                      <Lock className="w-5 h-5 text-indigo-100" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-sm">Want to generate your own?</h4>
                      <p className="text-indigo-100 text-xs mt-0.5">Create a free account to unlock all 28 AI tools.</p>
                    </div>
                  </div>
                  <Link 
                    href="/signup" 
                    className="px-5 py-2.5 bg-white text-indigo-700 text-sm font-black rounded-lg shadow-sm hover:scale-105 active:scale-95 transition-all w-full md:w-auto text-center"
                  >
                    Sign Up Free
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-3 relative">
              <div 
                onClick={handleCustomInput}
                className="flex-1 bg-[#0B0F19] border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-400 cursor-text hover:border-indigo-500/50 transition-colors flex items-center shadow-inner"
              >
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                   {activeFeature.mockInput}
                </ReactMarkdown>
              </div>
              <button 
                onClick={handleTestClick}
                disabled={isSimulating || !!displayedOutput}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all active:scale-95 shrink-0 shadow-lg shadow-indigo-500/20"
              >
                {isSimulating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                ) : displayedOutput ? (
                  <><CheckCircle2 className="w-4 h-4" /> Finished</>
                ) : (
                  <><Zap className="w-4 h-4" /> Run Demo</>
                )}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

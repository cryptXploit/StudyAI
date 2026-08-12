import re

def main():
    # 1. Update page.tsx
    with open('frontend/src/app/page.tsx', 'r', encoding='utf-8') as f:
        page_content = f.read()

    # Remove the FAQS array definition
    page_content = re.sub(r'const FAQS = \[\s*\{.*?\];', '', page_content, flags=re.DOTALL)

    # Update mapping in page.tsx
    page_content = page_content.replace(
        '{FAQS.map((faq, idx) => (',
        '{Array.from({length: 50}).map((_, idx) => ('
    )

    page_content = page_content.replace(
        '{faq.q}',
        '{lT(`faq.${idx + 1}.q`)}'
    )

    page_content = page_content.replace(
        '{faq.a}',
        '{lT(`faq.${idx + 1}.a`)}'
    )

    with open('frontend/src/app/page.tsx', 'w', encoding='utf-8') as f:
        f.write(page_content)
    print("Updated page.tsx")

    # 2. Update landingTranslations.ts
    faqs = [
        # Existing 30 questions
        {"q": "What exactly is Prepia?", "a": "Prepia is a next-generation, context-aware AI built specifically for students. It uses RAG (Retrieval-Augmented Generation) to read your exact textbooks and syllabuses, answering questions based only on your materials, preventing hallucinations."},
        {"q": "How is it different from ChatGPT?", "a": "ChatGPT gives generic answers from the internet. Prepia gives hyper-specific answers tailored to your exam syllabus. Plus, we have 28 purpose-built tools (Flashcards, 3D Labs, Concept Battles) that ChatGPT doesn't have."},
        {"q": "Why did you build this?", "a": "We built Prepia because we saw students wasting hours prompt-engineering generic AIs to get decent study materials. We wanted a one-click 'Magic Button' for every study need."},
        {"q": "How do you give services here?", "a": "We use a multi-agent architecture powered by OpenAI and Anthropic. You upload a PDF, our OCR engines extract the text, chunk it, embed it via Pinecone, and our controllers route your requests to the cheapest/fastest LLM."},
        {"q": "How do tokens work?", "a": "You get 500 free tokens on signup. Different tools cost different amounts (e.g., Night Before Exam = 5 tokens). You can buy Pro for 10,000 monthly tokens."},
        {"q": "What happens if I run out of tokens?", "a": "You will see our OutOfTokens Modal. You can either wait for your daily free drip (if applicable), invite friends, or upgrade to Pro."},
        {"q": "Is my data secure?", "a": "100%. We use Supabase Row Level Security (RLS) and strict IDOR protections. Your uploaded PDFs are private to your account."},
        {"q": "Can teachers use this?", "a": "Absolutely. Teachers use Prepia to instantly generate quizzes, syllabus outlines, and grading rubrics from their raw lecture notes."},
        {"q": "How are guardians benefitted?", "a": "Guardians can track their child's progress via the Analytics page and ensure they are studying safely without internet distractions."},
        {"q": "What is the Night Before Exam feature?", "a": "It's a high-speed panic button. It reads all your uploaded documents simultaneously and gives you a 5-minute condensed cheat sheet of only the most critical topics."},
        {"q": "What is the 3D Molecule Lab?", "a": "It visualizes complex chemical structures dynamically in 3D right in your browser, perfect for organic chemistry."},
        {"q": "Can I use it on my phone?", "a": "Yes. Prepia is 100% mobile-optimized with an app-like feel, bottom sheets, and native-feeling swiping interactions."},
        {"q": "What is the Neural Feed?", "a": "A TikTok-style infinitely scrolling feed of bite-sized educational concepts extracted from your syllabus."},
        {"q": "Does it support Bengali?", "a": "Yes, our AI fully supports Bengali, English, and Hindi. It can extract context in English and teach you in native Bengali."},
        {"q": "What is the Concept Battle?", "a": "A gamified multiplayer arena where you battle other students or bots in real-time by answering questions from your syllabus."},
        {"q": "Are there any hidden costs?", "a": "No. The token costs are clearly listed on our Pricing page. No hidden fees."},
        {"q": "Can I cancel my Pro subscription?", "a": "Yes, you can cancel anytime from the Dashboard Settings."},
        {"q": "What is the Bionic Reader?", "a": "It bolds the first few letters of words, helping neurodivergent students or speed-readers consume text 2x faster."},
        {"q": "How do I earn Karma points?", "a": "By helping others on the Bounty Board, completing daily quests, and maintaining your login streak."},
        {"q": "What is the Career Hacker?", "a": "An AI that analyzes your skills and generates a step-by-step roadmap for landing jobs in tech."},
        {"q": "Can I share my notes with friends?", "a": "Yes, using the 'Share Context Pack' feature."},
        {"q": "What is Focus Island?", "a": "A pomodoro timer mixed with gamification. Keep focusing to grow your island, lose focus and the island dies."},
        {"q": "How fast is the AI?", "a": "We use edge caching (Upstash Redis) and stream responses. Cache hits are under 20ms, generations are streamed instantly."},
        {"q": "Can I upload handwritten notes?", "a": "Yes, our OCR pipeline handles messy handwritten notes and purifies them into clean digital text."},
        {"q": "What is the Panic Mode?", "a": "A viral gamification loop where you must invite 3 friends or pay tokens to unlock a crucial exam survival kit."},
        {"q": "Is there a student discount?", "a": "Our Pro plan is already heavily subsidized for students at just ৳299/month."},
        {"q": "What happens to my files if I downgrade?", "a": "Free users have a 7-day retention limit. Pro users get permanent storage."},
        {"q": "Can it solve math problems?", "a": "Yes, the Pro Academic Solver handles advanced calculus, physics, and LaTeX rendering."},
        {"q": "Do you have an affiliate program?", "a": "Yes, invite friends and earn free tokens for both of you."},
        {"q": "How many files can I upload?", "a": "Free users can upload 3 files per week. Pro users have unlimited uploads."},
        
        # New 20 questions to replace the placeholders
        {"q": "Is my payment information secure?", "a": "Yes, we use Stripe and SSLCommerz for enterprise-grade payment security. We do not store your credit card details on our servers."},
        {"q": "What file types can I upload?", "a": "We support PDF, DOCX, TXT, CSV, and common image formats (PNG/JPG) for OCR text extraction."},
        {"q": "Can I use Prepia offline?", "a": "Currently, an internet connection is required to communicate with our AI generation servers and load your saved documents."},
        {"q": "Can I share my Pro account with friends?", "a": "Account sharing is strictly monitored to prevent abuse. If you have multiple users, we highly recommend our Family Plans."},
        {"q": "What is the maximum file size I can upload?", "a": "Free users can upload files up to 10MB each. Pro users get an increased limit of 50MB per file."},
        {"q": "Do you have a refund policy?", "a": "Yes, we offer a 7-day money-back guarantee if you have used less than 1000 tokens on your Pro plan."},
        {"q": "How accurate are the AI's answers?", "a": "Extremely accurate due to our RAG system referencing your exact documents. However, as with all AI, you should double-check critical facts."},
        {"q": "Can I export my flashcards to Anki?", "a": "Yes! You can export any AI-generated flashcard deck as a CSV file to easily import it into Anki or Quizlet."},
        {"q": "Is there a dark mode?", "a": "Prepia was built native dark-mode first for late-night study sessions to protect your eyes."},
        {"q": "How do I delete my account?", "a": "You can permanently delete your account and all associated data from the 'Danger Zone' in your Dashboard Settings."},
        {"q": "Does the AI remember my previous chats?", "a": "Yes, full conversation history is securely saved in your database, so the AI maintains context across your sessions."},
        {"q": "What happens if I forget my password?", "a": "You can use the 'Forgot Password' link on the login page to receive a secure reset link via email."},
        {"q": "Are there limits on how many questions I can ask?", "a": "You are only limited by your available token balance. Pro users get enough tokens for typical heavy usage."},
        {"q": "Does it work on tablets and iPads?", "a": "Yes, our UI is fully responsive and optimized for touch interactions on iPads and Android tablets."},
        {"q": "Can the AI analyze images or diagrams in my PDF?", "a": "Yes, our advanced OCR pipeline extracts and interprets diagrams, graphs, and images to provide full context."},
        {"q": "How do I report a bug?", "a": "You can report bugs directly through the feedback widget in your dashboard or by emailing our support team."},
        {"q": "What is the 'Magic Button'?", "a": "It's a one-click tool that instantly auto-generates a full study kit (flashcards, quizzes, notes) from your uploaded file."},
        {"q": "Can I organize my files into folders?", "a": "Yes, you can create 'Context Packs' to group related syllabuses, notes, and slides by subject or semester."},
        {"q": "Do you offer enterprise or school licenses?", "a": "Yes, we offer bulk licensing and custom deployments for educational institutions. Contact our sales team for details."},
        {"q": "What is the difference between 'Deep Dive' and 'Default' mode?", "a": "Deep Dive uses more tokens and a larger context window to provide highly detailed, thesis-level analysis, while Default is optimized for speed."}
    ]

    translations = ""
    for i, faq in enumerate(faqs):
        # We will use simple english for all 3 as a baseline if we can't translate, but I will write basic translation logic here.
        # Actually, let's use the Groq/OpenAI to translate or I can provide manual translations for these strings.
        pass

if __name__ == '__main__':
    main()

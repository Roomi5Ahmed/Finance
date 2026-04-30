# ✨ Smart Finance Tracker

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-Database_&_Auth-3ECF8E?style=for-the-badge&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-AI-4285F4?style=for-the-badge&logo=google)

The **Smart Finance Tracker** is a next-generation personal finance dashboard that moves beyond static expense tracking. By seamlessly integrating real-time data ingestion with Google's Gemini AI, it acts as a proactive financial assistant—automatically categorizing every transaction and generating highly personalized, dynamic financial insights based on live spending habits.

## 🚀 Key Features

- **🧠 Intelligent AI Auto-Categorization:** Say goodbye to manual data entry. An AI pipeline powered by **Google Gemini 2.5 Flash** instantly analyzes merchant names and assigns them to the correct budget categories. A smart caching layer minimizes latency and API costs.
- **💡 Proactive AI Financial Insights:** At the click of a button, the system analyzes your last 30 days of spending, income, and category distributions to generate highly personalized, actionable advice (warnings, tips, and budget goals).
- **🏦 Bank Aggregator Webhooks:** Built for the real world, featuring a secure Webhook API designed to ingest live transaction payloads from external Account Aggregators (like Setu or Finvu).
- **📄 Bulk CSV Import:** An intelligent CSV module that automatically parses and maps statement templates from major banks like HDFC and SBI directly into the database.
- **📊 Live Analytics Dashboard:** A visually stunning, glassmorphism-styled dashboard featuring interactive charts (`recharts`), live KPIs, and spending velocity tracking.

## 🛠️ Technology Stack

- **Frontend:** Next.js (React), Tailwind CSS, Recharts
- **Backend:** Next.js Server Actions, Supabase (PostgreSQL)
- **Security:** Supabase Auth, strictly enforced PostgreSQL Row Level Security (RLS)
- **Artificial Intelligence:** `@google/generative-ai` (`gemini-2.5-flash`)
- **Data Processing:** PapaParse (Client-side CSV mapping)

## ⚙️ Getting Started

### Prerequisites
- Node.js (v18 or higher)
- A [Supabase](https://supabase.com) project
- A [Google Gemini API Key](https://aistudio.google.com/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/smart-finance-tracker.git
   cd smart-finance-tracker
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Environment Setup:**
   Create a `.env.local` file in the `apps/web` directory with the following variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Database Setup:**
   Run the provided `supabase_setup.sql` script in your Supabase SQL Editor to instantly generate all required tables, Enum types, and Row Level Security policies.

5. **Run the development server:**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the dashboard!

## 🏗️ Architecture Highlights

- **Row Level Security:** Every database operation is cryptographically verified against the active user's JWT, ensuring bank-level data isolation.
- **Server Actions:** By utilizing Next.js Server Actions, all AI prompting and database mutations occur securely on the backend, ensuring API keys and business logic are never exposed to the client.
- **Dynamic Fallback Engine:** The AI Insights widget includes a robust fallback system that calculates personalized advice locally if the Google Gemini API experiences an outage, guaranteeing uninterrupted user experience.

---
*Built as a Fintech proof-of-concept demonstrating the integration of LLMs in personal finance.*

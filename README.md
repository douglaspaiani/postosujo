<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/a19307ee-6d2f-484e-8c4f-696aa9b73cc4

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Configure o banco no `.env`
4. Rode as migrations do Prisma:
   `npm run prisma:migrate`
5. Run the backend API (terminal 1):
   `npm run dev:api`
6. Run the app (terminal 2):
   `npm run dev`

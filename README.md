# Video Recording App (Next.js)

This project is a web application built with [Next.js](https://nextjs.org/) and [TypeScript](https://www.typescriptlang.org/) that allows users to record videos directly from their browser, review them, and upload them to Google Drive. It uses [Tailwind CSS](https://tailwindcss.com/) for styling and includes a modern, responsive UI.

## Features
- **Record videos** using your camera and microphone
- **Review** your recordings before uploading
- **Upload** videos to Google Drive (requires configuration)
- **Responsive design** for desktop and mobile
- Built with **TypeScript** and **Tailwind CSS**

## Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

## Getting Started

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd <project-folder>
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory. You will need Google Drive API credentials to enable uploading videos to Google Drive. Add the following variables:

```env
NEXT_GOOGLE_CLIENT_EMAIL=your-google-service-account-email
NEXT_GOOGLE_PRIVATE_KEY=your-google-service-account-private-key
NEXT_GOOGLE_FOLDER_ID=your-google-drive-folder-id
NEXT_GOOGLE_FOLDER_CSM_ID=your-google-drive-csm-folder-id
NEXT_GOOGLE_FOLDER_UNCLASSIFIED_ID=your-google-drive-unclassified-folder-id
NEXT_PUBLIC_MAKE_WEBHOOK_CSM_LIST=your-make-webhook-url-to -retrieve-csm-list
NEXT_PUBLIC_MAKE_WEBHOOK_POST_URL=your-make-webhook-url-to-submit
NEXT_PUBLIC_MAKE_WEBHOOK_COACH_GET_URL=your-make-webhook-url-to-retrieve-coach-list
```

> **Note:** Never commit your `.env.local` file to version control. It is listed in `.gitignore` by default.

### 4. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the app.

## Project Structure
- `app/` - Main application pages (including dashboard, record, review, etc.)
- `components/` - Reusable UI and feature components
- `context/` - React context providers
- `hooks/` - Custom React hooks
- `lib/` - Utility functions and types
- `public/` - Static assets (if any)

## Styling
This project uses [Tailwind CSS](https://tailwindcss.com/) for utility-first styling. You can customize styles in `tailwind.config.ts` and global styles in `app/globals.css`.

## Linting
To check code quality, run:
```bash
npm run lint
```

## Building for Production
To build the app for production:
```bash
npm run build
```
To start the production server:
```bash
npm start
```

## Troubleshooting
- Make sure your environment variables are set correctly for Google Drive and Make.com integration.
- If you have issues with permissions, check your Google Cloud Console and service account settings.
- For styling issues, ensure Tailwind CSS is installed and configured properly.

## Learn More
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---
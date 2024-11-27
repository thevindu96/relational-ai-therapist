# AI-Powered Real-time Conversation Analysis

A real-time conversation analysis tool that provides instant feedback on communication style using Non-Violent Communication (NVC) principles. This application helps users improve their communication skills by analyzing speech in real-time and providing constructive feedback.

## Description

This tool uses advanced AI to analyze conversations in real-time, providing immediate feedback based on Non-Violent Communication principles developed by Marshall Rosenberg. It helps users identify areas for improvement in their communication style and offers suggestions for more empathetic and effective dialogue.

## Key Features

- **Real-time Speech Recognition**: Captures and transcribes conversation audio in real-time
- **Live NVC Analysis**: Provides immediate feedback on communication patterns
- **Speaker Differentiation**: Automatically distinguishes between different speakers
- **Interactive UI**: Split-panel interface showing both conversation transcript and analysis
- **Visual Feedback**: Color-coded analysis ratings (good, medium, bad) with detailed feedback
- **Responsive Design**: Works seamlessly across different screen sizes

## Tech Stack

### Frontend
- React with TypeScript
- Tailwind CSS for styling
- Shadcn UI components
- React Query for data fetching
- Wouter for routing

### Backend
- Node.js with Express
- OpenAI API (GPT-4o and Whisper) for AI analysis
- WebRTC for audio recording

### Development Tools
- Vite for frontend bundling
- TypeScript for type safety
- ESLint and Prettier for code formatting

## Setup Instructions

1. **Prerequisites**
   - Node.js (v18 or higher)
   - npm (v8 or higher)
   - OpenAI API key

2. **Environment Setup**
   ```bash
   # Create a .env file in the root directory
   OPENAI_API_KEY=your_openai_api_key
   ```

3. **Installation**
   ```bash
   # Install dependencies
   npm install
   ```

4. **Running the Application**
   ```bash
   # Start the development server
   npm run dev
   ```
   The application will be available at `http://localhost:5000`

5. **Building for Production**
   ```bash
   # Create production build
   npm run build
   
   # Start production server
   npm run start
   ```

## Usage

1. Click the "Start" button to begin a new conversation session
2. Use the record button to capture conversation audio
3. View real-time transcription in the left panel
4. See NVC analysis and feedback in the right panel
5. Hover over analysis items to highlight corresponding conversation segments

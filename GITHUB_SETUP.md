# GitHub Repository Setup Instructions

1. Create a new repository on GitHub:
   - Go to github.com and sign in
   - Click the "+" button in the top right and select "New repository"
   - Name: relational-ai-therapist
   - Description: A real-time conversation analysis tool using AI for non-violent communication feedback
   - Make it Public
   - Don't initialize with README (we already have one)

2. Initialize Git and push the code (run these commands in the terminal):
   ```bash
   # Initialize git repository
   git init

   # Add all files
   git add .

   # Create initial commit
   git commit -m "Initial commit: Real-time conversation analysis tool"

   # Add GitHub repository as remote
   git remote add origin https://github.com/thevindu96/relational-ai-therapist.git

   # Push code to GitHub
   git push -u origin main
   ```

3. Verify Repository Setup:
   - Check that all files are pushed correctly
   - Ensure no sensitive information is exposed
   - Verify .gitignore is working as expected

Note: Make sure you have Git configured with your GitHub credentials before pushing.

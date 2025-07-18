# LinkedIn Message Reply AI Chrome Extension

An AI-powered Chrome extension for LinkedIn that reads your previous chats, generates context-aware replies with descriptions, and automates the response process.

## Features

- **Context-Aware Replies:** Automatically reads previous LinkedIn chats and generates tailored responses based on your description and conversation history.
- **Customizable Descriptions:** Set a custom description to guide the AI in generating the reply.
- **Auto-Send Functionality:** Sends the generated reply automatically after a 10-second delay.
- **Manual Override:** Stop the auto-send feature by tagging in the text area, allowing you to edit or change the reply before sending.
- **Seamless Integration:** Uses the **Gemini API** for natural language processing and robust response generation.

## Video Demo

Watch the demo video to see the extension in action: [Demo Video](#)  


## Setup Instructions

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/nikhilnagar29/LinkFlow-AI.git
   ```

2. **Project Structure:**

   ```
   Element-finder
   Extension
   ext-backend
   ```

3. **Install and Run the Backend:**

   ```bash
   cd ext-backend
   npm install
   node index.js  # If this command doesn't work, try the appropriate command for your setup.
   ```

4. **Configure Environment Variables:**

   Create a `.env` file in the `ext-backend` directory and add your Gemini API key:

   ```bash
   GEMINI_API_KEY="your-gemini-api-key"
   ```

5. **Load the Extension in Chrome:**

   - Open Chrome and go to `chrome://extensions/`.
   - Enable **Developer Mode**.
   - Click **Load unpacked** and select the `Extension` folder.
   - Open LinkedIn, set your description, and let the AI-powered extension generate your responses.

Now you can enjoy an enhanced LinkedIn messaging experience with your friends and colleagues!

# Afiya - Your Friendly Emotional and Technical Support AI

Afiya is an AI-powered support system designed to offer both **emotional comfort** and **technical guidance** in a seamless, human-like chat experience. Built using cutting-edge models including **LLaMA 70B** for technical support and **DeepSeek R1 70B** for emotional conversation, Afiya combines warmth with intelligence.

## Features

* 💬 **Emotionally supportive conversations** powered by OpenChat (optimized for human-like empathy).
* 💻 **Technical assistance** including code generation, debugging, and learning help, using LLaMA 34B.
* 💾 **Chat history storage** via MongoDB, allowing users to revisit past conversations.
* 🔁 **Session continuity** that maintains conversational context.
* 🧠 **Model switching logic** to dynamically change AI models based on the message type (technical or emotional).
* 📜 **Username persistence** using local storage, for personalized experience.
* 📈 Modern frontend built with **TailwindCSS**, delivering a smooth and responsive UI.

## Tech Stack

* **Backend:** Node.js + Express
* **Frontend:** HTML + TailwindCSS + JavaScript
* **Database:** MongoDB
* **AI Models:** Hosted on Hugging Face APIs

## Getting Started

### Prerequisites

* Node.js (v18+)
* MongoDB running locally or remotely
* Hugging Face API key

### Setup Instructions

1. Clone the repository:

```bash
https://github.com/your-username/afiya.git
cd afiya
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file (or `ap.env`) in the root with the following variables:

```env
HF_API_KEY=your_huggingface_api_key
MONGODB_URI=your_mongodb_uri
OPENROUTER_API_KEY=your_openrouter_api_key
```

4. Start the server:

```bash
node server.js
```

5. Open your browser:

```
http://localhost:3001
```

## Current Limitations

🚧 **Under Development:**

* 🔊 **Voice recognition** and **audio response support** are not yet functional.
* 📁 **File upload and interaction** is planned but not implemented.

These features are being actively developed and will be released in upcoming versions.

## Contribution

We welcome contributions! Feel free to fork the repository and make pull requests. Please create an issue first for major changes.

## License

[MIT License](LICENSE)

---

> Afiya means "health" and "peace" in Swahili and Arabic. Our AI is designed to reflect this essence — offering warmth, help, and calm in every interaction.

Thank you for using Afiya! 💖

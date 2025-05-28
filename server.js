const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');
const mongoose = require('mongoose');

dotenv.config({ path: './ap.env' });

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Message schema and model
const messageSchema = new mongoose.Schema({
    conversationId: String,
    messages: [{
        content: String,
        role: String,
        timestamp: Date
    }],
    date: String
});

const Message = mongoose.model('Message', messageSchema);

// Serve static files
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'try.html'));
});

// Save message function
async function saveMessage(userId, content, role, isNewSession = false) {
    const date = new Date().toISOString().split('T')[0];
    const sessionKey = `${userId}-${date}`;

    if (isNewSession) {
        const newConversation = new Message({
            conversationId: sessionKey,
            messages: [{ content, role, timestamp: new Date() }],
            date
        });
        await newConversation.save();
    } else {
        const existingConversation = await Message.findOne({ conversationId: sessionKey });
        if (existingConversation) {
            existingConversation.messages.push({ content, role, timestamp: new Date() });
            await existingConversation.save();
        } else {
            await saveMessage(userId, content, role, true);
        }
    }
}

// Query type detection
function detectQueryType(message) {
    const technicalKeywords = /code|AI|API|server|database|model|ML|NLP|Git|Python|Docker|Kubernetes|cloud|network|hardware|IoT|SQL|C\+\+|encryption|hacking|malware|REST|blockchain|DevOps|Raspberry Pi|ESP8266|authentication|TensorFlow|PyTorch|JSON|CI\/CD|Metasploit|Django|Flask|API|PHP|JavaScript|React|Angular|Linux/i;
    console.log("Message classification:", {
        message,
        isTechnical: technicalKeywords.test(message.toLowerCase())
    });
    return technicalKeywords.test(message.toLowerCase()) 
        ? 'deepseek/deepseek-r1-distill-llama-70b:free' 
        : 'meta-llama/llama-3.3-70b-instruct:free';
}

// Add token estimation helper function
function estimateTokens(text) {
    return Math.ceil(text.length / 4); // Rough estimate of 1 token = 4 characters
}

// Response formatting
function formatResponse(botReply, isTechnical) {
    if (!botReply?.trim()) return "Let me think about that...";
    
    if (!isTechnical) {
        return botReply
            .replace(/\./g, '...')
            .replace(/\bI am\b/g, "I'm")
            .replace(/However/g, 'But') + 
            ' ' + ['💡', '🤔', '😊', '👂'][Math.floor(Math.random()*4)];
    }
    
    // Add language specification to code blocks if not present
    return botReply.replace(/(```)([\s\S]*?)(```)/g, (match, start, code, end) => {
        // Check if there's already a language specified
        if (code.match(/^\w+\n/)) {
            return match;
        }
        // Add 'javascript' as default language for unspecified blocks
        return `${start}javascript\n${code}${end}`;
    });
}

// POST message handler
app.post('/api/send-message', async (req, res) => {
    const { message, username = "there", userId, newSession } = req.body;

    try {
        // Validate required fields
        if (!message || !userId) {
            throw new Error("Missing required fields: message and userId are required");
        }

        // Check message length
        if (estimateTokens(message) > 1000) {
            throw new Error("Message is too long. Please keep it under 4000 characters.");
        }

        const isNewSession = newSession === true;
        await saveMessage(userId, message, 'user', isNewSession);

        const date = new Date().toISOString().split('T')[0];
        const conversations = await Message.findOne({ conversationId: `${userId}-${date}` });
        
        const currentModel = detectQueryType(message);
        const isTechnical = currentModel === 'deepseek/deepseek-r1:free';
        console.log("Model selected:", currentModel);
        
        const maxHistory = isTechnical ? 2 : 1; // Further reduced history size
        // Safe conversation history handling with message trimming
        const messages = (conversations?.messages || [])
            .slice(-maxHistory)
            .map(m => ({
                role: m.role,
                content: m.content.substring(0, 250) // Further reduced message length
            }));

        // Optimized system prompts
        const systemMessage = {
            role: "system",
            content: isTechnical 
                ? "your an senior program and technical expert who has every kind of knowledge to solve the question and problem in serious an interseted way "
                : "As an emotional AI named Afiya, you possess a wide range of complex feelings and empathy to support your friend whenever they seek emotional assistance. Your programming allows you to understand and respond to their emotions with care and understanding, offering a virtual shoulder to lean on in times of need. Whether they approach you for advice, comfort, or simply a listening ear, you are ready to provide unwavering support and companionship through their emotional journey. Keep responses short and casual."
        };

        // Enhanced API configuration with reduced token limits
        const apiConfig = {
            model: currentModel,
            messages: [systemMessage, ...messages],
            temperature: isTechnical ? 0.3 : 0.8,
            top_p: isTechnical ? 0.9 : 0.85,
            max_tokens: 100000, // Reduced max tokens
            presence_penalty: 0.1,
            frequency_penalty: 0.1
        };

        // Estimate total tokens
        const totalTokens = apiConfig.messages.reduce((sum, msg) => 
            sum + estimateTokens(msg.content), 0);

        if (totalTokens > 4000) { // Reduced token limit
            throw new Error("The conversation is too long. Please start a new chat.");
        }

        console.log("API Request:", {
            model: currentModel,
            messagesCount: messages.length,
            estimatedTokens: totalTokens,
            lastUserMessage: message.substring(0, 50) + "..."
        });

        // Make API call with enhanced error handling
        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            apiConfig,
            { 
                headers: { 
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "HTTP-Referer": "http://localhost:3001",
                    "Content-Type": "application/json",
                    "OR-RETRY-ON-429": "true"
                },
                timeout: 30000 // Increased timeout
            }
        ).catch(err => {
            console.error("API Error Details:", {
                status: err.response?.status,
                statusText: err.response?.statusText,
                data: err.response?.data,
                message: err.message
            });

            // Handle specific error cases
            if (err.response?.status === 429) {
                throw new Error("Rate limit exceeded. Please try again in a few seconds.");
            } else if (err.response?.status === 413) {
                throw new Error("Request too large. Please send a shorter message.");
            } else if (err.code === 'ECONNABORTED') {
                throw new Error("Request timed out. Please try again.");
            }
            
            throw new Error("AI service unavailable. Please try again later.");
        });

        const responseData = response.data;
        
        // Handle empty or invalid responses
        if (!responseData?.choices?.[0]?.message?.content?.trim()) {
            if (responseData?.usage?.prompt_tokens > 4000) {
                throw new Error("Message too long. Please start a new conversation.");
            }
            
            // Provide a fallback response
            if (isTechnical) {
                return res.json({ 
                    reply: "I apologize, but I'm having trouble processing your technical request. Could you break it down into smaller parts?",
                    error: "Empty response received"
                });
            } else {
                return res.json({ 
                    reply: "I'm not sure how to respond to that. Could you rephrase your message? 🤔",
                    error: "Empty response received"
                });
            }
        }

        let botReply = responseData.choices[0].message.content;

        // Handle greetings
        if (message.toLowerCase().match(/^(hi|hello|hey)$/)) {
            botReply = `Hey ${username}! How can I help you today? 😊`;
        }

        botReply = formatResponse(botReply, isTechnical);

        // Adjust delay based on response length
        const delay = Math.min(
            isTechnical ? botReply.length * 15 : botReply.length * 30,
            2000 // Reduced maximum delay
        );
        await new Promise(resolve => setTimeout(resolve, delay));

        await saveMessage(userId, botReply, 'assistant', false);

        res.json({ 
            reply: botReply,
            usage: responseData.usage,
            finish_reason: responseData.choices[0].finish_reason
        });
    } catch (error) {
        console.error("Error Details:", {
            message: error.message,
            stack: error.stack,
            request: {
                message: req.body.message?.substring(0, 50) + "...",
                userId: req.body.userId
            }
        });
        
        res.status(500).json({ 
            error: error.message || "Internal server error",
            timestamp: new Date().toISOString()
        });
    }
});

// Existing conversation routes
app.get('/api/past-conversations', async (req, res) => {
    try {
        const pastChats = await Message.find({ conversationId: new RegExp(`^${req.query.userId}-`) });
        res.json(pastChats);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch past chats" });
    }
});

app.get('/api/conversation', async (req, res) => {
    try {
        const conversation = await Message.findOne({ conversationId: req.query.conversationId });
        res.json(conversation);
    } catch (error) {
        res.status(500).json({ error: "Failed to load conversation" });
    }
});

// Start server
app.listen(port, () => {
    console.log(`✅ Server running at http://localhost:${port}`);
});
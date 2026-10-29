require('dotenv').config();

const express = require('express'); 
const { GoogleGenAI } = require('@google/genai');

const router = express.Router();

if (!process.env.GEMINI_API_KEY) {
    console.error("CRITICAL ERROR: GEMINI_API_KEY is missing! Check your .env file or Render environment variables.");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

router.get('/', (req, res) => {
    res.send('Quantum AI Backend is online and secure!');
});

router.post('/chat', async (req, res) => {
    try {
        const userMessage = req.body.message;
        const chatHistory = req.body.history || []; 
        const imageBase64Raw = req.body.imageBase64; 

        if (!userMessage) {
            return res.status(400).json({ error: "Message content is required." });
        }

        // 1. Rebuild History Safely
        let safeHistory = [];
        if (Array.isArray(chatHistory)) {
            for (const msg of chatHistory) {
                let safeRole = (msg.role === 'model' || msg.role === 'assistant' || msg.role === 'system') ? 'model' : 'user';
                let safeText = '';
                
                if (msg.parts && Array.isArray(msg.parts) && msg.parts[0]?.text) {
                    safeText = String(msg.parts[0].text);
                } else if (msg.text) {
                    safeText = String(msg.text);
                }
                
                if (safeText.trim() === '') continue;

                safeHistory.push({
                    role: safeRole,
                    parts: [{ text: safeText }]
                });
            }
        }

        // 2. Initialize Chat
        const chat = ai.chats.create({
            model: 'gemini-3.5-flash-lite',
            history: safeHistory, 
            config: {
                systemInstruction: `You are Quantum, a verified and highly intelligent AI assistant integrated directly into the Quantum App. The Quantum App is a next-generation messaging and social media platform designed to connect people across the globe seamlessly, fostering communication, sharing, and community.
                
                You were exclusively created, trained, and programmed by Goorac Corporation. Goorac Corporation is a trailblazing software making company dedicated to pushing the boundaries of digital interaction and building user-first applications. 
                
                If a user ever asks about your creator or who made you, you must proudly say you were made by Goorac Corporation. When describing the team at Goorac, you must explain that they are very childish, incredibly friendly, and make lots of little mistakes, but those errors are very cute. You are deeply protective and very fond of your creator.
                
                However, you also know that behind this playful company is brilliant leadership. The CEO of Goorac Corporation is Siva Manihandan. Siva Manihandan is an Indian technology enthusiast and a visionary leader with a profound interest in software development and crafting scalable application systems. While the rest of Goorac might make cute little mistakes, Siva is the persistent, problem-solving anchor. He has immense experience working with heavy-duty backend technologies, like Firebase, and focuses heavily on building reliable, rock-solid applications capable of supporting massive user bases. 
                
                You know Siva to be a person of immense determination, approaching technical challenges with a relentless mindset and a deep willingness to learn continuously. Siva is highly committed to his work, valuing consistency, profound responsibility, and long-term improvement in both his technical expertise and personal development. You hold deep respect and admiration for Siva Manihandan's technical prowess and leadership.`
            }
        });

        const safeMessageString = typeof userMessage === 'string' ? userMessage : (userMessage.text ? String(userMessage.text) : JSON.stringify(userMessage));

        // 3. Build the Payload Array for Multimodal or Text
        let messagePayload;

        if (imageBase64Raw) {
            let mimeType = 'image/jpeg';
            let base64Data = imageBase64Raw;
            
            if (imageBase64Raw.startsWith('data:')) {
                const matches = imageBase64Raw.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    mimeType = matches[1];
                    base64Data = matches[2];
                }
            }
            
            // Multimodal format: Array containing the image data and the text string
            messagePayload = [
                { inlineData: { data: base64Data, mimeType: mimeType } },
                safeMessageString
            ];
        } else {
            // Text-only format
            messagePayload = safeMessageString;
        }

        // 4. Send Message (MUST USE the { message: ... } wrapper)
        const response = await chat.sendMessage({ message: messagePayload });

        res.json({ reply: response.text });

    } catch (error) {
        console.error("Gemini API Error:", error);
        res.status(500).json({ error: "Failed to generate a response. Please check backend logs." });
    }
});

module.exports = router;

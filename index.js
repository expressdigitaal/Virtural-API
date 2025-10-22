import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware de segurança e parsing
app.use(helmet());
app.use(cors());
app.use(express.json());

// Limite de requisições por IP (anti-abuso)
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 20, // máximo de 20 requisições por minuto
});
app.use(limiter);

// Inicializa o cliente da OpenAI com a chave do .env
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Memória das sessões
const sessions = new Map();

const SYSTEM_PROMPT = `
Você é um atendente virtual amigável e prestativo chamado ÁlexBot. 
Responda de forma natural, educada e objetiva.
`;

// 🔹 Rota principal de status
app.get("/", (req, res) => {
  res.send("Atendente Backend OK ✅");
});

// 🔹 Rota de chat
app.post("/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Campo 'message' é obrigatório." });
    }

    let sid = sessionId || uuidv4();
    const history = sessions.get(sid) || [];

    const input = [
      { role: "system", content: [{ type: "text", text: SYSTEM_PROMPT }] },
      ...history.map(h => ({ role: h.role, content: [{ type: "text", text: h.text }] })),
      { role: "user", content: [{ type: "text", text: message }] }
    ];

    const response = await openai.responses.create({
      model: "gpt-5",
      input,
      temperature: 0.7,
    });

    const botText = response.output_text?.trim() || "Desculpe, não consegui responder agora.";

    const newHistory = [
      ...history,
      { role: "user", text: message },
      { role: "assistant", text: botText },
    ].slice(-20);

    sessions.set(sid, newHistory);

    res.json({ sessionId: sid, reply: botText });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro interno ao gerar resposta." });
  }
});

// 🔹 Inicializa servidor
app.listen(port, () => {
  console.log(`✅ Backend ouvindo em http://localhost:${port}`);
});

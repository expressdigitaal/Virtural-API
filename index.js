import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { v4 as uuidv4 } from "uuid";
import OpenAI from "openai";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cors({ origin: "*", methods: ["GET","POST"] }));
app.use(helmet());

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
}));

const sessions = new Map();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `
Você é um atendente virtual educado, objetivo e proativo.
- Sempre peça os detalhes necessários para ajudar melhor.
- Se a pergunta for ambígua, faça 1 pergunta de esclarecimento.
- Use respostas curtas e claras. Se necessário, liste passos numerados.
`;

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
      temperature: 0.7
    });

    const botText = response.output_text?.trim() || "Desculpe, não consegui responder agora.";

    const newHistory = [...history, { role: "user", text: message }, { role: "assistant", text: botText }].slice(-20);
    sessions.set(sid, newHistory);

    res.json({ sessionId: sid, reply: botText });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro interno ao gerar resposta." });
  }
});

app.get("/", (_req, res) => res.send("Atendente Backend OK"));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Backend ouvindo em http://localhost:${PORT}`));

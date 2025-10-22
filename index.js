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

// Fonction serverless Vercel : GET /api/cours
// Récupère le cours Eiffage côté serveur (clé API jamais exposée au navigateur).
// Nécessite la variable d'environnement ANTHROPIC_API_KEY configurée sur Vercel
// (Project Settings > Environment Variables).

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY non configurée sur le serveur" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 300,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [
          {
            role: "user",
            content:
              "What is the latest closing price in euros of Eiffage stock ticker FGR on Euronext Paris? Reply with ONLY the numeric price (e.g. 140.50), nothing else.",
          },
        ],
      }),
    });

    const data = await response.json();
    const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join(" ");
    const match = text.match(/\b(\d{2,3}[.,]\d{1,2})\b/);

    if (match) {
      return res.status(200).json({ price: match[1].replace(",", ".") });
    }
    return res.status(404).json({ error: "Cours introuvable" });
  } catch (e) {
    return res.status(500).json({ error: "Erreur réseau" });
  }
}

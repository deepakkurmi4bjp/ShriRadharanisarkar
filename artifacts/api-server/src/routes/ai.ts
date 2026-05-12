import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/ai/insights", async (req, res): Promise<void> => {
  try {
    const [summary] = await db.execute<{
      total_amount: string;
      total_donations: string;
      today_amount: string;
      today_donations: string;
      avg_donation: string;
    }>(sql`
      SELECT
        COALESCE(SUM(amount), 0)::text AS total_amount,
        COUNT(*)::text AS total_donations,
        COALESCE(SUM(CASE WHEN DATE(created_at AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE THEN amount ELSE 0 END), 0)::text AS today_amount,
        COUNT(CASE WHEN DATE(created_at AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE THEN 1 END)::text AS today_donations,
        COALESCE(AVG(amount), 0)::text AS avg_donation
      FROM donations
    `);

    const topCollectors = await db.execute<{ name: string; total: string; count: string }>(sql`
      SELECT u.name, SUM(d.amount)::text AS total, COUNT(d.id)::text AS count
      FROM donations d
      JOIN users u ON u.id = d.collector_id
      GROUP BY u.name
      ORDER BY SUM(d.amount) DESC
      LIMIT 5
    `);

    const recentTrend = await db.execute<{ date: string; amount: string; count: string }>(sql`
      SELECT
        DATE(created_at AT TIME ZONE 'Asia/Kolkata')::text AS date,
        SUM(amount)::text AS amount,
        COUNT(*)::text AS count
      FROM donations
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at AT TIME ZONE 'Asia/Kolkata')
      ORDER BY date DESC
      LIMIT 7
    `);

    const topPurposes = await db.execute<{ purpose: string; count: string; total: string }>(sql`
      SELECT purpose, COUNT(*)::text AS count, SUM(amount)::text AS total
      FROM donations
      WHERE purpose IS NOT NULL
      GROUP BY purpose
      ORDER BY SUM(amount) DESC
      LIMIT 5
    `);

    const dataContext = `
आप एक दान प्रबंधन प्रणाली के AI सहायक हैं। नीचे दिए गए डेटा का विश्लेषण करें और हिंदी में 3-5 महत्वपूर्ण insights दें।

**कुल आंकड़े:**
- कुल राशि: ₹${Number(summary?.total_amount || 0).toLocaleString('en-IN')}
- कुल दान: ${summary?.total_donations || 0}
- आज की राशि: ₹${Number(summary?.today_amount || 0).toLocaleString('en-IN')}
- आज के दान: ${summary?.today_donations || 0}
- औसत दान: ₹${Math.round(Number(summary?.avg_donation || 0)).toLocaleString('en-IN')}

**शीर्ष Collector:**
${topCollectors.map((c, i) => `${i + 1}. ${c.name} — ₹${Number(c.total).toLocaleString('en-IN')} (${c.count} दान)`).join('\n')}

**पिछले 7 दिनों का ट्रेंड:**
${recentTrend.map(r => `${r.date}: ₹${Number(r.amount).toLocaleString('en-IN')} (${r.count} दान)`).join('\n')}

**शीर्ष उद्देश्य:**
${topPurposes.map(p => `${p.purpose}: ₹${Number(p.total).toLocaleString('en-IN')} (${p.count} दान)`).join('\n')}

कृपया निम्नलिखित प्रारूप में JSON response दें:
{
  "insights": [
    {
      "title": "insight का शीर्षक",
      "description": "विस्तृत विवरण",
      "type": "positive|warning|info|achievement"
    }
  ],
  "summary": "एक लाइन में समग्र सारांश"
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 1024,
      messages: [
        {
          role: "system",
          content: "आप एक expert financial analyst हैं जो religious/social organizations के लिए donation data का विश्लेषण करते हैं। हमेशा valid JSON में respond करें।",
        },
        { role: "user", content: dataContext },
      ],
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    let parsed: { insights?: unknown[]; summary?: string } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { insights: [], summary: "डेटा विश्लेषण में समस्या आई।" };
    }

    res.json({
      insights: parsed.insights || [],
      summary: parsed.summary || "",
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    req.log?.error({ err }, "AI insights error");
    res.status(500).json({ error: "AI insights उत्पन्न करने में समस्या आई।" });
  }
});

export default router;

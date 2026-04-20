const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { analysis } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const tools = [{
      type: "function",
      function: {
        name: "submit_jobs",
        description: "Submit job suggestions",
        parameters: {
          type: "object",
          properties: {
            jobs: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  level: { type: "string", enum: ["Intern", "Junior", "Mid", "Senior", "Lead"] },
                  match_percent: { type: "number" },
                  matching_skills: { type: "array", items: { type: "string" } },
                  reason: { type: "string" }
                },
                required: ["title", "level", "match_percent", "matching_skills", "reason"]
              }
            }
          },
          required: ["jobs"]
        }
      }
    }];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a career advisor. Suggest 5 realistic jobs that match the candidate's skills and experience." },
          { role: "user", content: `Resume analysis:\n${JSON.stringify(analysis)}\n\nSuggest 5 jobs with match%, level, matching skills, and a clear reason.` }
        ],
        tools,
        tool_choice: { type: "function", function: { name: "submit_jobs" } }
      })
    });

    if (!resp.ok) {
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error ${resp.status}`);
    }
    const data = await resp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    return new Response(JSON.stringify(JSON.parse(args)), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

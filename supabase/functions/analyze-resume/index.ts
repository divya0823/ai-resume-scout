// Analyze resume text via Lovable AI Gateway with structured tool calling
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, jobDescription, requiredSkills, genderPreference } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const trimmed = (text || "").slice(0, 18000);
    const systemPrompt = `You are an expert ATS (Applicant Tracking System) and resume analyzer.
Extract structured information from the resume and produce a rigorous ATS score.
Be honest. If a section is missing, return empty arrays.
Detect potentially fake/inflated claims (impossible timelines, vague buzzword spam, no specifics).`;

    const userPrompt = `RESUME TEXT:
"""
${trimmed}
"""

${jobDescription ? `TARGET JOB DESCRIPTION:\n"""${jobDescription}"""\n` : ""}
${requiredSkills?.length ? `REQUIRED SKILLS: ${requiredSkills.join(", ")}\n` : ""}
${genderPreference && genderPreference !== "none" ? `RECRUITER GENDER PREFERENCE (only used as a small scoring nudge, do not discriminate): ${genderPreference}\n` : ""}

Analyze and return structured data via the tool.`;

    const tools = [{
      type: "function",
      function: {
        name: "submit_resume_analysis",
        description: "Submit structured resume analysis",
        parameters: {
          type: "object",
          properties: {
            candidate_name: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            summary: { type: "string", description: "1-2 sentence professional summary" },
            detected_gender: { type: "string", enum: ["male", "female", "unknown"], description: "Inferred from name/pronouns; unknown if unclear" },
            skills: { type: "array", items: { type: "string" } },
            missing_skills: { type: "array", items: { type: "string" }, description: "Important skills missing vs job requirements" },
            experience: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  role: { type: "string" },
                  company: { type: "string" },
                  duration: { type: "string" },
                  highlights: { type: "array", items: { type: "string" } }
                },
                required: ["role", "company", "duration"]
              }
            },
            is_fresher: { type: "boolean" },
            education: {
              type: "array",
              items: {
                type: "object",
                properties: { degree: { type: "string" }, institution: { type: "string" }, year: { type: "string" } },
                required: ["degree", "institution"]
              }
            },
            projects: { type: "array", items: { type: "string" } },
            certifications: { type: "array", items: { type: "string" } },
            ats_score: { type: "number", description: "0-100 overall ATS quality (formatting, keywords, completeness)" },
            match_score: { type: "number", description: "0-100 match vs job description (0 if no JD)" },
            fake_risk: { type: "number", description: "0-100 likelihood of fabricated content" },
            ats_breakdown: {
              type: "object",
              properties: {
                skills: { type: "number" },
                experience: { type: "number" },
                education: { type: "number" },
                projects: { type: "number" },
                formatting: { type: "number" }
              },
              required: ["skills", "experience", "education", "projects", "formatting"]
            }
          },
          required: ["candidate_name", "skills", "experience", "education", "projects", "certifications", "ats_score", "match_score", "fake_risk", "ats_breakdown", "is_fresher", "detected_gender", "missing_skills"]
        }
      }
    }];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools,
        tool_choice: { type: "function", function: { name: "submit_resume_analysis" } }
      })
    });

    if (!resp.ok) {
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await resp.text();
      console.error("AI error:", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No structured response");
    const parsed = JSON.parse(toolCall.function.arguments);

    // Apply gender preference nudge (small, transparent)
    if (genderPreference && genderPreference !== "none" && parsed.detected_gender === genderPreference) {
      parsed.match_score = Math.min(100, (parsed.match_score || 0) + 5);
    }

    return new Response(JSON.stringify({ analysis: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("analyze-resume error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

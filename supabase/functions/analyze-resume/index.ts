// Analyze resume text via Lovable AI Gateway with structured tool calling
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Indian city/state regex+keyword fallback. Runs ONLY if the AI returns an empty city.
const INDIAN_CITIES: Record<string, string> = {
  // city -> state (canonical)
  "mumbai": "Maharashtra", "bombay": "Maharashtra", "pune": "Maharashtra", "nagpur": "Maharashtra",
  "nashik": "Maharashtra", "thane": "Maharashtra", "navi mumbai": "Maharashtra", "aurangabad": "Maharashtra",
  "delhi": "Delhi", "new delhi": "Delhi", "noida": "Uttar Pradesh", "ghaziabad": "Uttar Pradesh",
  "lucknow": "Uttar Pradesh", "kanpur": "Uttar Pradesh", "varanasi": "Uttar Pradesh", "agra": "Uttar Pradesh",
  "gurgaon": "Haryana", "gurugram": "Haryana", "faridabad": "Haryana",
  "bengaluru": "Karnataka", "bangalore": "Karnataka", "mysuru": "Karnataka", "mysore": "Karnataka",
  "mangalore": "Karnataka", "mangaluru": "Karnataka", "hubli": "Karnataka",
  "chennai": "Tamil Nadu", "madras": "Tamil Nadu", "coimbatore": "Tamil Nadu", "madurai": "Tamil Nadu",
  "tiruchirappalli": "Tamil Nadu", "trichy": "Tamil Nadu", "salem": "Tamil Nadu",
  "hyderabad": "Telangana", "secunderabad": "Telangana", "warangal": "Telangana",
  "vijayawada": "Andhra Pradesh", "visakhapatnam": "Andhra Pradesh", "vizag": "Andhra Pradesh", "guntur": "Andhra Pradesh",
  "kolkata": "West Bengal", "calcutta": "West Bengal", "howrah": "West Bengal", "siliguri": "West Bengal",
  "ahmedabad": "Gujarat", "surat": "Gujarat", "vadodara": "Gujarat", "baroda": "Gujarat", "rajkot": "Gujarat", "gandhinagar": "Gujarat",
  "jaipur": "Rajasthan", "jodhpur": "Rajasthan", "udaipur": "Rajasthan", "kota": "Rajasthan",
  "kochi": "Kerala", "cochin": "Kerala", "thiruvananthapuram": "Kerala", "trivandrum": "Kerala",
  "kozhikode": "Kerala", "calicut": "Kerala",
  "bhopal": "Madhya Pradesh", "indore": "Madhya Pradesh", "gwalior": "Madhya Pradesh", "jabalpur": "Madhya Pradesh",
  "patna": "Bihar", "gaya": "Bihar",
  "bhubaneswar": "Odisha", "cuttack": "Odisha",
  "chandigarh": "Chandigarh", "mohali": "Punjab", "ludhiana": "Punjab", "amritsar": "Punjab", "jalandhar": "Punjab",
  "dehradun": "Uttarakhand", "haridwar": "Uttarakhand",
  "ranchi": "Jharkhand", "jamshedpur": "Jharkhand", "dhanbad": "Jharkhand",
  "raipur": "Chhattisgarh", "bilaspur": "Chhattisgarh",
  "guwahati": "Assam", "shillong": "Meghalaya", "imphal": "Manipur", "agartala": "Tripura",
  "panaji": "Goa", "panjim": "Goa", "margao": "Goa",
  "puducherry": "Puducherry", "pondicherry": "Puducherry",
  "srinagar": "Jammu and Kashmir", "jammu": "Jammu and Kashmir",
};
const CITY_ALIASES: Record<string, string> = {
  bombay: "Mumbai", bangalore: "Bengaluru", calcutta: "Kolkata", madras: "Chennai",
  gurgaon: "Gurugram", "new delhi": "Delhi", "delhi ncr": "Delhi", ncr: "Delhi",
  trivandrum: "Thiruvananthapuram", pondicherry: "Puducherry", cochin: "Kochi",
  mysore: "Mysuru", calicut: "Kozhikode", baroda: "Vadodara", vizag: "Visakhapatnam",
  trichy: "Tiruchirappalli", panjim: "Panaji", mangalore: "Mangaluru",
};

function fallbackExtractCity(rawText: string): { city: string; state: string } {
  const text = (rawText || "").replace(/\s+/g, " ");
  if (!text) return { city: "", state: "" };

  const lower = text.toLowerCase();

  // 1) Look near explicit keywords first: "Address", "Location", "Based in", "City", "Residing at", "Permanent Address"
  const keywordRe = /(?:address|location|based in|city|residing at|residence|permanent address|current address|hometown)[:\-\s]+([^\n,;|]{2,80})/gi;
  const candidates: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = keywordRe.exec(text)) !== null) candidates.push(m[1]);

  // 2) Pattern "City, State" (Title-cased)
  const cityStateRe = /\b([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+){0,2}),\s*([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+){0,2})\b/g;
  while ((m = cityStateRe.exec(text)) !== null) candidates.push(`${m[1]}, ${m[2]}`);

  // Try each candidate against our city dictionary
  for (const cand of candidates) {
    const c = cand.toLowerCase();
    for (const cityKey of Object.keys(INDIAN_CITIES)) {
      const re = new RegExp(`\\b${cityKey.replace(/\s+/g, "\\s+")}\\b`);
      if (re.test(c)) {
        const canonical = CITY_ALIASES[cityKey] || cityKey.replace(/\b\w/g, (l) => l.toUpperCase());
        return { city: canonical, state: INDIAN_CITIES[cityKey] };
      }
    }
  }

  // 3) Whole-text scan as last resort
  for (const cityKey of Object.keys(INDIAN_CITIES)) {
    const re = new RegExp(`\\b${cityKey.replace(/\s+/g, "\\s+")}\\b`);
    if (re.test(lower)) {
      const canonical = CITY_ALIASES[cityKey] || cityKey.replace(/\b\w/g, (l) => l.toUpperCase());
      return { city: canonical, state: INDIAN_CITIES[cityKey] };
    }
  }

  return { city: "", state: "" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, jobDescription, requiredSkills, genderPreference, preferredLocation } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const trimmed = (text || "").slice(0, 18000);
    const wordCount = trimmed.trim().split(/\s+/).filter(Boolean).length;
    const lowContent = wordCount < 150;

    // DEBUG: log first 500 chars of extracted text so we can see exactly what the AI receives
    console.log("=== ANALYZE-RESUME DEBUG ===");
    console.log("WORD COUNT:", wordCount);
    console.log("EXTRACTED TEXT (first 500):", trimmed.slice(0, 500));
    console.log("EXTRACTED TEXT (last 300):", trimmed.slice(-300));

    const systemPrompt = `You are an expert ATS (Applicant Tracking System) and resume analyzer.
Extract ALL inferable information from the resume — even short ones. Be FLEXIBLE: if a section is unlabeled, infer it from context (e.g., a list of technologies = skills, a project description = projects).
NEVER refuse to analyze a short resume. If content is sparse, still produce best-effort scores and mark fields as empty arrays only when truly absent.
Produce honest, calibrated scores. Detect inflated/fake claims (impossible timelines, vague buzzword spam, no specifics).
For freshers (no work experience), weight scoring toward Skills, Projects, Education, and Certifications.
LOCATION: Extract the candidate's CURRENT Indian city and state from the resume (address, contact details, or any mentioned city). Focus ONLY on India. Normalize aliases: "Bombay"→"Mumbai", "Bangalore"→"Bengaluru", "Calcutta"→"Kolkata", "Madras"→"Chennai", "Gurgaon"→"Gurugram", "Delhi NCR"/"NCR"/"New Delhi"→"Delhi", "Trivandrum"→"Thiruvananthapuram", "Pondicherry"→"Puducherry", "Cochin"→"Kochi", "Mysore"→"Mysuru". Return only city name (no "India" suffix). If no Indian city is found, return empty strings for city and state.`;

    const userPrompt = `RESUME TEXT (${wordCount} words${lowContent ? " — LOW CONTENT, be lenient but honest" : ""}):
"""
${trimmed}
"""

${jobDescription ? `TARGET JOB DESCRIPTION:\n"""${jobDescription}"""\n` : ""}
${requiredSkills?.length ? `REQUIRED SKILLS: ${requiredSkills.join(", ")}\n` : ""}
${genderPreference && genderPreference !== "none" ? `RECRUITER GENDER PREFERENCE (small nudge only, do not discriminate): ${genderPreference}\n` : ""}
${preferredLocation ? `PREFERRED LOCATION (city in India, used for match scoring nudge): ${preferredLocation}\n` : ""}

Analyze flexibly and submit structured data via the tool. Always return all required fields.`;

    const tools = [{
      type: "function",
      function: {
        name: "submit_resume_analysis",
        description: "Submit structured resume analysis with detailed sub-scores and categorized improvement suggestions",
        parameters: {
          type: "object",
          properties: {
            candidate_name: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            city: { type: "string", description: "Normalized Indian city (e.g. Mumbai, Pune, Bengaluru). Empty string if not detected." },
            state: { type: "string", description: "Indian state name (e.g. Maharashtra, Karnataka). Empty string if unknown." },
            summary: { type: "string", description: "1-2 sentence professional summary" },
            detected_gender: { type: "string", enum: ["male", "female", "unknown"] },
            skills: { type: "array", items: { type: "string" } },
            missing_skills: { type: "array", items: { type: "string" } },
            experience: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  role: { type: "string" }, company: { type: "string" },
                  duration: { type: "string" }, highlights: { type: "array", items: { type: "string" } }
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
            // Sub-scores 0-100
            skill_score: { type: "number", description: "0-100 quality & breadth of skills" },
            experience_score: { type: "number", description: "0-100 work experience strength (for freshers, base on internships/projects)" },
            education_score: { type: "number", description: "0-100 education quality" },
            project_score: { type: "number", description: "0-100 project portfolio strength" },
            ats_score: { type: "number", description: "0-100 ATS friendliness (formatting, keywords, completeness)" },
            match_score: { type: "number", description: "0-100 job match (0 if no JD)" },
            overall_score: { type: "number", description: "0-100 weighted overall (skill 30%, exp 25%, edu 15%, proj 20%, ats 10% — for freshers shift exp weight to projects/skills)" },
            fake_risk: { type: "number", description: "0-100 likelihood of fabricated content" },
            ats_breakdown: {
              type: "object",
              properties: {
                skills: { type: "number" }, experience: { type: "number" },
                education: { type: "number" }, projects: { type: "number" }, formatting: { type: "number" }
              },
              required: ["skills", "experience", "education", "projects", "formatting"]
            },
            // Categorized improvement suggestions
            improvements: {
              type: "object",
              description: "Specific, actionable improvement suggestions grouped by category",
              properties: {
                skills: { type: "array", items: { type: "string" }, description: "e.g. 'Add Docker, Kubernetes', 'Mention Git workflow'" },
                experience: { type: "array", items: { type: "string" }, description: "e.g. 'Add quantified achievements (e.g. improved X by Y%)'" },
                formatting: { type: "array", items: { type: "string" }, description: "e.g. 'Use bullet points', 'Add a clear summary section'" },
                links: { type: "array", items: { type: "string" }, description: "e.g. 'Add GitHub link', 'Include LinkedIn URL'" }
              },
              required: ["skills", "experience", "formatting", "links"]
            }
          },
          required: [
            "candidate_name", "skills", "experience", "education", "projects", "certifications",
            "ats_score", "match_score", "fake_risk", "ats_breakdown",
            "skill_score", "experience_score", "education_score", "project_score", "overall_score",
            "is_fresher", "detected_gender", "missing_skills", "improvements", "city", "state"
          ]
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

    // Attach low content metadata
    parsed.low_content = lowContent;
    parsed.word_count = wordCount;

    // City fallback: if AI failed to detect a city, try regex + keyword + dictionary scan
    if (!parsed.city || !String(parsed.city).trim()) {
      const fb = fallbackExtractCity(text || "");
      if (fb.city) {
        parsed.city = fb.city;
        if (!parsed.state || !String(parsed.state).trim()) parsed.state = fb.state;
        parsed.city_source = "fallback";
      }
    } else {
      parsed.city_source = "ai";
    }

    // Gender preference small nudge
    if (genderPreference && genderPreference !== "none" && parsed.detected_gender === genderPreference) {
      parsed.match_score = Math.min(100, (parsed.match_score || 0) + 5);
      parsed.overall_score = Math.min(100, (parsed.overall_score || 0) + 2);
    }

    // Location match nudge (preferred Indian city)
    if (preferredLocation && parsed.city) {
      const norm = (s: string) => s.toLowerCase().trim();
      if (norm(parsed.city) === norm(preferredLocation)) {
        parsed.match_score = Math.min(100, (parsed.match_score || 0) + 5);
        parsed.overall_score = Math.min(100, (parsed.overall_score || 0) + 2);
        parsed.location_match = true;
      } else {
        parsed.location_match = false;
      }
    }

    return new Response(JSON.stringify({ analysis: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("analyze-resume error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

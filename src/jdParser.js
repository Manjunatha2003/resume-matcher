const { extractRequiredSkills } = require("./skillsExtractor");

function extractSalary(text) {
  const patterns = [
    /(?:salary|ctc|compensation|pay\s+range|pay\s+scale)\s*[:\-]?\s*([\$₹£€]?\s*[\d,]+(?:\.\d+)?\s*(?:[-–—to]+\s*[\$₹£€]?\s*[\d,]+(?:\.\d+)?)?\s*(?:LPA|lpa|per\s+annum|per\s+year|\/year|\/yr|USD|INR|k|K)?)/i,
    /([\$₹£€]\s*[\d,]+(?:\.\d+)?(?:k|K)?)\s*[-–—to]+\s*([\$₹£€]\s*[\d,]+(?:\.\d+)?(?:k|K)?)\s*(?:per\s+(?:year|annum|hour)|\/year|\/hr|\/hour|annually)?/i,
    /(\d+(?:\.\d+)?)\s*(?:LPA|lpa|L\s+per\s+annum)/i,
    /(\d{2,3}(?:,\d{3})+(?:\.\d+)?)\s*(?:USD|INR)?\s*(?:per\s+year|annually|\/year)?/i,
    /\$\s*([\d,]+)\s*[-–—\/]\s*\$?\s*([\d,]+)\s*(?:per\s+year|annually)?/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].replace(/\s+/g, " ").trim();
    }
  }

  return null;
}

function extractExperienceRequired(text) {
  const patterns = [
    /(\d+)\+?\s*years?\s+of\s+(?:relevant\s+)?(?:professional\s+)?(?:hands.?on\s+)?experience/i,
    /(\d+)\s*[-–—to]+\s*(\d+)\+?\s*years?\s+(?:of\s+)?(?:relevant\s+)?experience/i,
    /(?:minimum|at\s+least|minimum\s+of)\s+(\d+)\+?\s*years?\s+(?:of\s+)?(?:relevant\s+)?(?:professional\s+)?experience/i,
    /bachelor[''s]*\s+(?:degree)?\s+with\s+(\d+)\+?\s*years?/i,
    /(\d+)\+?\s*years?\s+of\s+experience\s+in\s+software/i,
    /(\d+)\+?\s*years?\s+of\s+professional/i,
    /experience[:\s]+(\d+)\+?\s*years?/i,
    /(\d+)\+?\s*years?\s+(?:of\s+)?(?:SWE|software|development|programming)/i,
    /fresher|entry.?level|0\+?\s*years?/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (/fresher|entry.?level/i.test(match[0])) return 0;
      if (match[2]) {
        return parseFloat(match[1]) + "-" + parseFloat(match[2]);
      }
      return parseFloat(match[1]);
    }
  }

  return null;
}

function extractJobSummary(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 20);
  const summaryHeaders = ["about", "overview", "opportunity", "description", "position overview", "job description"];
  const endHeaders = ["responsibilities", "qualifications", "requirements", "skills", "what you'll", "how you'll", "what we"];

  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    const isHeader = summaryHeaders.some(h => lower.includes(h));

    if (isHeader || i < 3) {
      let summaryLines = [];
      let start = isHeader ? i + 1 : i;

      for (let j = start; j < Math.min(start + 10, lines.length); j++) {
        const lineLower = lines[j].toLowerCase();
        const isEnd = endHeaders.some(h => lineLower.startsWith(h));
        if (isEnd) break;
        if (lines[j].length > 30) summaryLines.push(lines[j]);
        if (summaryLines.join(" ").length > 300) break;
      }

      if (summaryLines.length > 0) {
        return summaryLines.join(" ").substring(0, 400).trim();
      }
    }
  }

  const longLines = lines.filter(l => l.length > 60).slice(0, 3);
  return longLines.join(" ").substring(0, 400).trim() || "No description available.";
}

function extractJobTitle(text) {
  const titlePatterns = [
    /(?:position|role|job\s+title|title)[:\s]+([A-Z][^\n]{5,60})/i,
    /(?:seeking\s+a?|looking\s+for\s+a?|opening\s+for\s+a?)\s+([A-Z][^\n]{5,50})/i,
    /^([A-Z][A-Z\s\/\-]{5,50})$/m
  ];

  for (const pattern of titlePatterns) {
    const match = text.match(pattern);
    if (match) {
      const title = match[1].trim();
      if (title.split(" ").length <= 8) return title;
    }
  }

  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  for (const line of lines.slice(0, 5)) {
    if (/software engineer|developer|programmer|full stack|backend|frontend/i.test(line) && line.length < 80) {
      return line;
    }
  }

  return "Software Engineer";
}

function parseJD(text, jobId) {
  if (!text || text.trim().length === 0) {
    throw new Error("JD text is empty.");
  }

  const skillData = extractRequiredSkills(text);

  return {
    jobId: jobId || ("JD_" + Date.now()),
    role: extractJobTitle(text),
    aboutRole: extractJobSummary(text),
    salary: extractSalary(text),
    experienceRequired: extractExperienceRequired(text),
    requiredSkills: skillData.required,
    optionalSkills: skillData.optional,
    allSkills: skillData.all
  };
}

module.exports = { parseJD };
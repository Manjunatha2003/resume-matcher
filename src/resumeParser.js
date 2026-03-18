const { extractSkills } = require("./skillsExtractor");

function extractName(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);

  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];

    if (/^(name|full name)\s*[:\-]/i.test(line)) {
      const match = line.replace(/^(name|full name)\s*[:\-]\s*/i, "").trim();
      if (match.length > 2) return capitalizeWords(match);
    }

    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const phonePattern = /(\+?\d[\d\s\-().]{7,}\d)/;
    const addressPattern = /\b(street|road|avenue|city|state|zip|india|usa|uk)\b/i;
    const skillsKeywords = /\b(skills|experience|education|summary|profile|objective)\b/i;

    if (emailPattern.test(line) || phonePattern.test(line) || addressPattern.test(line) || skillsKeywords.test(line)) {
      continue;
    }

    if (/^[A-Z][a-z]+(\s[A-Z][a-z]+){1,3}$/.test(line) && line.split(" ").length <= 4) {
      return line;
    }

    if (/^[A-Z\s]{3,40}$/.test(line) && line.split(" ").length <= 4) {
      return capitalizeWords(line.toLowerCase());
    }
  }

  return "Unknown";
}

function extractEmail(text) {
  const match = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  return match ? match[0] : null;
}

function extractPhone(text) {
  const match = text.match(/(\+?\d[\d\s\-().]{7,}\d)/);
  return match ? match[0].trim() : null;
}

function extractYearsOfExperience(text) {
  const patterns = [
    /(\d+(?:\.\d+)?)\+?\s*years?\s+of\s+(?:total\s+)?(?:professional\s+)?experience/i,
    /(?:total\s+)?experience\s*[:\-]?\s*(\d+(?:\.\d+)?)\+?\s*years?/i,
    /(\d+(?:\.\d+)?)\+?\s*years?\s+(?:exp(?:erience)?|industry|work)/i,
    /(?:over|more than|approximately)\s+(\d+(?:\.\d+)?)\s*years?/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseFloat(match[1]);
    }
  }

  const experience = calculateExperienceFromDates(text);
  if (experience !== null) return experience;

  if (/\b(fresher|entry.?level|no experience|0 years?)\b/i.test(text)) {
    return 0;
  }

  return null;
}

function calculateExperienceFromDates(text) {
  const dateRangePattern = /(\w+\s*\d{4}|\d{4})\s*[-–—to]+\s*(\w+\s*\d{4}|\d{4}|present|current|now)/gi;
  const matches = [...text.matchAll(dateRangePattern)];

  if (matches.length === 0) return null;

  let totalMonths = 0;
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  for (const match of matches) {
    const startStr = match[1];
    const endStr = match[2];

    const startYear = extractYearFromString(startStr);
    const startMonth = extractMonthFromString(startStr) || 1;

    let endYear, endMonth;
    if (/present|current|now/i.test(endStr)) {
      endYear = currentYear;
      endMonth = currentMonth;
    } else {
      endYear = extractYearFromString(endStr);
      endMonth = extractMonthFromString(endStr) || 12;
    }

    if (startYear && endYear && endYear >= startYear && startYear > 1970 && startYear <= currentYear) {
      const months = (endYear - startYear) * 12 + (endMonth - startMonth);
      if (months > 0 && months < 600) {
        totalMonths += months;
      }
    }
  }

  if (totalMonths === 0) return null;
  return Math.round((totalMonths / 12) * 10) / 10;
}

function extractYearFromString(str) {
  const match = str.match(/\d{4}/);
  return match ? parseInt(match[0]) : null;
}

function extractMonthFromString(str) {
  const months = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    january: 1, february: 2, march: 3, april: 4, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
  };
  const lower = str.toLowerCase();
  for (const [name, num] of Object.entries(months)) {
    if (lower.includes(name)) return num;
  }
  return null;
}

function capitalizeWords(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

function parseResume(text) {
  if (!text || text.trim().length === 0) {
    throw new Error("Resume text is empty. Could not extract content from file.");
  }

  return {
    name: extractName(text),
    email: extractEmail(text),
    phone: extractPhone(text),
    yearOfExperience: extractYearsOfExperience(text),
    resumeSkills: extractSkills(text),
    rawText: text
  };
}

module.exports = { parseResume };
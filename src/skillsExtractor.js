const { SKILLS_DICTIONARY, SKILL_ALIASES } = require("./skillsDictionary");

function normalizeText(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s\.\+\#\/]/g, " ");
}

function extractSkills(text) {
  const normalized = normalizeText(text);
  const foundSkills = new Set();

  for (const skill of SKILLS_DICTIONARY) {
    const skillLower = skill.toLowerCase();
    const pattern = new RegExp("(?<![a-z0-9])" + escapeRegex(skillLower) + "(?![a-z0-9])", "i");
    if (pattern.test(normalized)) {
      foundSkills.add(skill.toLowerCase());
    }
  }

  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    for (const alias of aliases) {
      const pattern = new RegExp("(?<![a-z0-9])" + escapeRegex(alias.toLowerCase()) + "(?![a-z0-9])", "i");
      if (pattern.test(normalized)) {
        foundSkills.add(canonical.toLowerCase());
        break;
      }
    }
  }

  return [...foundSkills];
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractRequiredSkills(text) {
  const requiredSection = extractSection(text, [
    "required qualifications", "required skills", "must have",
    "minimum qualifications", "basic qualifications", "requirements"
  ]);

  const optionalSection = extractSection(text, [
    "desired qualifications", "preferred qualifications", "good to have",
    "nice to have", "desired skills", "preferred skills", "bonus"
  ]);

  const allSkills = extractSkills(text);
  const requiredSkills = requiredSection ? extractSkills(requiredSection) : [];
  const optionalSkills = optionalSection ? extractSkills(optionalSection) : [];

  const onlyOptional = optionalSkills.filter(s => !requiredSkills.includes(s));
  const remaining = allSkills.filter(s => !requiredSkills.includes(s) && !onlyOptional.includes(s));

  return {
    required: requiredSkills.length > 0 ? requiredSkills : allSkills,
    optional: onlyOptional,
    all: allSkills
  };
}

function extractSection(text, sectionHeaders) {
  const lines = text.split("\n");
  let inSection = false;
  let sectionLines = [];
  const endMarkers = ["qualifications", "requirements", "responsibilities", "about", "overview", "benefits", "compensation"];

  for (let i = 0; i < lines.length; i++) {
    const lineLower = lines[i].toLowerCase().trim();

    const isHeader = sectionHeaders.some(h => lineLower.includes(h));
    if (isHeader) {
      inSection = true;
      continue;
    }

    if (inSection) {
      const isNewSection = endMarkers.some(m => lineLower.startsWith(m)) && lineLower.length < 60;
      if (isNewSection && sectionLines.length > 2) {
        break;
      }
      sectionLines.push(lines[i]);
    }
  }

  return sectionLines.join("\n");
}

module.exports = { extractSkills, extractRequiredSkills };
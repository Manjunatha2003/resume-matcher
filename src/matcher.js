function normalizeSkill(skill) {
  return skill.toLowerCase().trim();
}

function skillsMatch(resumeSkills, jdSkill) {
  const normalized = normalizeSkill(jdSkill);
  return resumeSkills.some(rs => normalizeSkill(rs) === normalized);
}

function calculateMatchingScore(resumeSkills, jdSkills) {
  if (!jdSkills || jdSkills.length === 0) return 0;

  const matched = jdSkills.filter(skill => skillsMatch(resumeSkills, skill));
  const score = (matched.length / jdSkills.length) * 100;
  return Math.round(score * 10) / 10;
}

function buildSkillsAnalysis(resumeSkills, jdSkills) {
  return jdSkills.map(skill => ({
    skill: skill,
    presentInResume: skillsMatch(resumeSkills, skill)
  }));
}

function matchResumeToJDs(resume, parsedJDs) {
  const matchingJobs = parsedJDs.map(jd => {
    const skillsToMatch = jd.allSkills.length > 0 ? jd.allSkills : jd.requiredSkills;
    const skillsAnalysis = buildSkillsAnalysis(resume.resumeSkills, skillsToMatch);
    const matchingScore = calculateMatchingScore(resume.resumeSkills, skillsToMatch);

    return {
      jobId: jd.jobId,
      role: jd.role,
      aboutRole: jd.aboutRole,
      salary: jd.salary,
      experienceRequired: jd.experienceRequired,
      skillsAnalysis: skillsAnalysis,
      matchingScore: matchingScore,
      matchedSkillsCount: skillsAnalysis.filter(s => s.presentInResume).length,
      totalJDSkills: skillsToMatch.length
    };
  });

  matchingJobs.sort((a, b) => b.matchingScore - a.matchingScore);

  return matchingJobs;
}

module.exports = { matchResumeToJDs, calculateMatchingScore, buildSkillsAnalysis };
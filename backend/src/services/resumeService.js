const { PDFParse } = require('pdf-parse');
const path = require('path');

const ALIASES = {
  'Java': ['java'],
  'Python': ['python'],
  'JavaScript': ['javascript', 'ecmascript'],
  'TypeScript': ['typescript'],
  'C++': ['c++', 'cpp'],
  'Kotlin': ['kotlin'],
  'Go': ['golang', 'go language'],
  'SQL': ['sql'],
  'HTML': ['html', 'html5'],
  'CSS': ['css', 'css3'],
  'React': ['react', 'react.js', 'reactjs'],
  'Node.js': ['node.js', 'nodejs', 'node js', 'node'],
  'Express.js': ['express.js', 'expressjs', 'express'],
  'Spring Boot': ['spring boot', 'springboot'],
  'Django': ['django'],
  'Flask': ['flask'],
  'Angular': ['angular'],
  'Next.js': ['next.js', 'nextjs'],
  'REST APIs': ['rest api', 'restful', 'rest apis'],
  'Tailwind CSS': ['tailwind'],
  'Bootstrap': ['bootstrap'],
  'MySQL': ['mysql'],
  'PostgreSQL': ['postgresql', 'postgres'],
  'MongoDB': ['mongodb', 'mongo db'],
  'Redis': ['redis'],
  'Git': ['git'],
  'GitHub': ['github'],
  'Docker': ['docker'],
  'Kubernetes': ['kubernetes', 'k8s'],
  'AWS': ['aws', 'amazon web services'],
  'Linux': ['linux', 'ubuntu', 'unix'],
  'Postman': ['postman'],
  'Jira': ['jira'],
  'Figma': ['figma'],
  'Excel': ['microsoft excel', 'ms excel', 'excel'],
  'Power BI': ['power bi', 'powerbi'],
  'Tableau': ['tableau'],
  'Data Structures and Algorithms': ['data structures', 'dsa', 'algorithms'],
  'Object-Oriented Programming': ['object oriented', 'object-oriented', 'oops', 'oop'],
  'DBMS': ['dbms', 'database management'],
  'Operating Systems': ['operating system', 'operating systems'],
  'Computer Networks': ['computer networks', 'computer networking'],
  'System Design': ['system design'],
  'Machine Learning': ['machine learning', 'ml '],
  'Data Analysis': ['data analysis', 'data analytics'],
  'Statistics': ['statistics', 'probability'],
  'Problem Solving': ['problem solving', 'problem-solving'],
  'Communication': ['communication'],
  'Aptitude': ['aptitude', 'quantitative reasoning'],
  'Agile': ['agile', 'scrum'],
};

const HEADER_PATTERNS = {
  projects: /^(projects?|academic projects?|personal projects?|key projects?)\s*:?\s*$/i,
  education: /^(education|academic background|academics|qualifications?)\s*:?\s*$/i,
  certifications: /^(certifications?|licenses? (and|&) certifications?|courses?)\s*:?\s*$/i,
  skills: /^(technical skills|skills|technologies|tech stack|programming languages)\s*:?\s*$/i,
  experience: /^(experience|work experience|internships?|employment)\s*:?\s*$/i,
};

const ALL_HEADERS = Object.values(HEADER_PATTERNS);

function cleanLine(line) {
  return line.replace(/\s+/g, ' ').trim();
}

function normaliseText(raw) {
  return raw
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractSection(lines, headerPattern, nextHeaderPatterns, maxLines = 8) {
  const start = lines.findIndex((line) => headerPattern.test(cleanLine(line)));
  if (start === -1) return [];
  const section = [];
  for (let i = start + 1; i < lines.length && section.length < maxLines; i += 1) {
    const line = cleanLine(lines[i]);
    if (!line) continue;
    if (nextHeaderPatterns.some((pattern) => pattern.test(line))) break;
    if (line.length < 2) continue;
    section.push(line);
  }
  return section;
}

function extractEmail(text) {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : null;
}

function extractPhone(text) {
  const candidates = text.match(/\+?\d[\d\s().-]{7,}\d/g) || [];
  for (const candidate of candidates) {
    const digits = candidate.replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 13) return candidate.trim();
  }
  return null;
}

function detectSkills(text, catalogue) {
  const lower = text.toLowerCase();
  const matched = [];
  for (const skill of catalogue) {
    const aliases = ALIASES[skill.name] || [skill.name.toLowerCase()];
    const found = aliases.some((alias) => {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();
      if (!escaped) return false;
      const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
      return regex.test(lower);
    });
    if (found) matched.push(skill);
  }
  // C is too ambiguous to detect without context. Look for explicit phrases.
  const cSkill = catalogue.find((skill) => skill.name === 'C');
  if (cSkill && !matched.some((skill) => skill.id === cSkill.id) && /(^|\n)\s*c\s*(programming|language)|c language|\bc programming\b/i.test(text)) {
    matched.push(cSkill);
  }
  return matched;
}

function extractResumeData(text, catalogue) {
  const lines = text.split('\n').map(cleanLine);
  const skills = detectSkills(text, catalogue);
  const otherHeaderPatterns = ALL_HEADERS;

  const projects = extractSection(lines, HEADER_PATTERNS.projects, otherHeaderPatterns)
    .filter((line) => line.length > 3)
    .map((line) => ({ title: line.split(/[—|:-]/)[0].trim().slice(0, 120), description: line.slice(0, 400) }));

  const education = extractSection(lines, HEADER_PATTERNS.education, otherHeaderPatterns, 5);
  const certifications = extractSection(lines, HEADER_PATTERNS.certifications, otherHeaderPatterns, 8);

  const projectKeywords = /(project|app|application|system|platform|website|dashboard)/i;
  const fallbackProjects = !projects.length
    ? lines.filter((line) => projectKeywords.test(line) && line.length < 220).slice(0, 4).map((line) => ({
      title: line.split(/[—|:-]/)[0].slice(0, 120),
      description: line.slice(0, 400),
    }))
    : [];

  const certificationsFallback = !certifications.length
    ? lines.filter((line) => /(certif|coursera|udemy|nptel|great learning|aws certified|microsoft certified)/i.test(line)).slice(0, 8)
    : [];

  const educationFallback = !education.length
    ? lines.filter((line) => /(b\.?tech|bachelor|university|college|institute|graduat)/i.test(line)).slice(0, 5)
    : [];

  return {
    name: lines.find((line) => line.length > 2 && line.length < 60 && !/@|https?:|\d{5}/.test(line)) || null,
    email: extractEmail(text),
    phone: extractPhone(text),
    skills: skills.map((skill) => skill.name),
    programming_languages: skills.filter((skill) => skill.category === 'programming').map((skill) => skill.name),
    tools: skills.filter((skill) => skill.category === 'tool').map((skill) => skill.name),
    projects: projects.length ? projects : fallbackProjects,
    education: education.length ? education : educationFallback,
    certifications: certifications.length ? certifications : certificationsFallback,
    warnings: [],
  };
}

async function parseResumePdf(buffer, catalogue) {
  if (!buffer || buffer.length === 0) {
    throw new Error('The uploaded file is empty.');
  }
  if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error('The uploaded file does not look like a valid PDF.');
  }

  const parser = new PDFParse({ data: buffer });
  let parsed;
  try {
    parsed = await parser.getText();
  } finally {
    await parser.destroy().catch(() => {});
  }
  const text = normaliseText(parsed.text || '');
  if (text.length < 60) {
    throw new Error('No readable text was found. This may be a scanned PDF or an image-only file. Upload a text-based PDF or add your skills manually.');
  }

  const extracted = extractResumeData(text.slice(0, 120000), catalogue);
  if (extracted.skills.length === 0) {
    extracted.warnings.push('No known skills were detected. Review the extracted text and add skills manually.');
  }
  if (text.length < 350) {
    extracted.warnings.push('Very little text was extracted. Check that the PDF is complete and text-based.');
  }
  extracted.warnings.push('Skill extraction is pattern based and is not guaranteed to be complete or accurate. Review every suggestion before importing it.');
  extracted.page_count = parsed.total || null;

  return { text: text.slice(0, 200000), extracted };
}

function safeFilename(originalName) {
  const base = path.basename(originalName || 'resume.pdf').replace(/[^a-zA-Z0-9._ -]/g, '_');
  return base.slice(0, 200);
}

module.exports = { parseResumePdf, extractResumeData, detectSkills, safeFilename, ALIASES };

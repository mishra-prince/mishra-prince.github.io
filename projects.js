export const projects = [
  {
    id: 'spendoath', name: 'SpendOath', category: 'web', label: 'WEB + AGENTS', status: 'Local demo',
    colour: '#dff470', cover: 'payment', repo: 'SpendOath',
    summary: 'A little accountability for agents that spend. Budgets, receipts and delivery verification.',
    tech: ['TypeScript', 'React', 'Express', 'SQLite'],
    facts: ['Server-enforced spending limits', 'Idempotent retries and SHA-256 checks', '15 automated test cases in the repository'],
    problem: 'An agent requesting a paid service needs a hard spending limit and a way to verify what was delivered.',
    detail: 'A deterministic agent-commerce demo that connects budget authorization, payment, artifact delivery and executable verification in one traceable flow.',
    built: ['Budget policy enforced by the server rather than the agent.', 'Idempotent requests, audit receipts and delivery integrity checks.', 'Executable result checks and tests for budget, retry and tampering cases.'],
    learning: 'Designing explicit payment states and testing the failure paths that matter as much as a successful transaction.',
    scope: 'A locally runnable demo using simulated payments. The repository includes the server implementation; this portfolio does not process payments.'
  },
  {
    id: 'hackathon-calendar', name: 'Hackathon Calendar', category: 'automation', label: 'AUTOMATION', status: 'Project',
    colour: '#d8ccf5', cover: 'calendar', repo: 'hackathon-calendar',
    summary: 'Because the best hackathon is the one you remember to register for. Discovery meets reminders.',
    tech: ['Python', 'FastAPI', 'React', 'SQLite', 'Telegram'],
    facts: ['Adapters for four hackathon sources', 'Scheduled reminders and change alerts', 'Calendar dashboard and automated tests'],
    problem: 'Hackathon registration dates, submission deadlines and announcements are scattered across different platforms.',
    detail: 'A Python tracker that normalizes hackathon records and combines scheduled discovery, Telegram reminders and a web calendar.',
    built: ['Source adapters for Devpost, Devfolio, Unstop and Commudle.', 'SQLite records, registration and submission reminders, and announcement detection.', 'A React calendar with tests for parsing, reminders and change notifications.'],
    learning: 'Turning inconsistent external data into a consistent model, then making scheduled work useful to a person.',
    scope: 'Live collection and notifications require the source configuration and a Telegram bot token. Source availability can vary.'
  },
  {
    id: 'swasthya-voice', name: 'SwasthyaVoice', category: 'web', label: 'VOICE + AI', status: 'Prototype',
    colour: '#c9e5f0', cover: 'voice', repo: 'swasthya-voice',
    summary: 'A voice-first intake prototype that remembers the conversation and keeps a human in the loop.',
    tech: ['Python', 'FastAPI', 'React', 'Qdrant'],
    facts: ['Recoverable conversation state', 'Patient-history retrieval', '14 synthetic evaluation scenarios'],
    problem: 'Text-heavy interfaces can make intake difficult, and restarting a conversation loses useful context.',
    detail: 'A hackathon prototype for voice symptom intake, recoverable conversations, structured history retrieval and a human-review dashboard.',
    built: ['An explicit conversation state machine with interruption and recovery paths.', 'History retrieval with Qdrant and a separate deterministic urgency layer.', 'Synthetic scenarios covering memory, corrections, recovery and escalation.'],
    learning: 'Separating model-assisted extraction from deterministic rules, while treating state and continuity as real product features.',
    scope: 'A prototype using synthetic data and demo rules, not a diagnostic system. Live speech and language providers need their own configuration.'
  },
  {
    id: 'ant-x-micro', name: 'ANT-X Micro', category: 'robotics', label: 'ROBOTICS', status: 'In development',
    colour: '#ffa087', cover: 'ant', repo: 'ANT-X-Micro',
    summary: 'A tiny-robot idea, starting with the essentials: a computer, a microcontroller and a reliable conversation.',
    tech: ['Python', 'Arduino C++', 'ESP32-C3', 'Wi-Fi / UDP'],
    facts: ['JSON commands and 5 Hz telemetry', 'CSV logs and a robot emulator', 'Contact-stop and command-expiry logic'],
    problem: 'A small robot needs fast local reflexes while a computer handles logging and higher-level commands.',
    detail: 'The first stage of an ant-inspired robot: a PC-to-ESP32-C3 communication prototype with telemetry, manual commands and stop conditions.',
    built: ['A JSON command protocol over UDP with 5 Hz telemetry and CSV logging.', 'A hardware-free robot emulator for protocol development.', 'Packet validation, contact-stop logic and command expiry in the firmware.'],
    learning: 'Defining a communication contract and making the microcontroller stop safely when commands disappear.',
    scope: 'A communication and safety prototype. Autonomous navigation and walking mechanics are future development, not completed features.'
  },
  {
    id: 'swarshield', name: 'SwarShield', category: 'web', label: 'WEB + SAFETY', status: 'Browser demo',
    colour: '#f2d2dd', cover: 'shield', repo: 'swarshield',
    summary: 'A browser demo exploring coercion-pattern scoring and a family code-word check for suspicious calls.',
    tech: ['JavaScript', 'HTML / CSS', 'Web Speech API'],
    facts: ['Live-transcription interface', 'Coercion-pattern scoring', 'Out-of-band family verification flow'],
    problem: 'A convincing voice alone does not establish trust. Suspicious calls can combine authority, secrecy, urgency and payment demands.',
    detail: 'A dependency-free browser prototype with scripted scenarios, live transcription, risk indicators and a family code-word verification flow.',
    built: ['A semantic scoring interface across coercion-related categories.', 'Scripted scam and benign-control demonstrations.', 'A pause-and-verify interaction with an out-of-band family check.'],
    learning: 'Making the reason for a risk indicator understandable, and designing verification beyond a detection score.',
    scope: 'A browser prototype. The acoustic voice-clone model is still in development; the project does not claim production fraud-detection accuracy.'
  },
  {
    id: 'passenger-detector', name: 'Passenger Detector', category: 'robotics', label: 'CIRCUITS + SYSTEMS', status: 'May 2023',
    colour: '#f5dfaa', cover: 'sensor', repo: null,
    summary: 'An early hardware project bringing passenger detection, a driver alert and a seat-number display together.',
    tech: ['Circuit design', 'Electrical integration', 'Safety alert logic'],
    facts: ['Circuit and Design Developer', 'Driver alarm and seat identification', 'An early step into system integration'],
    problem: 'A driver needs an alert when a passenger extends a hand or head outside a vehicle window, with a way to identify the seat.',
    detail: 'An early passenger-safety project focused on circuit design and integrating the sensing, alert and display components.',
    built: ['Designed the circuit and integrated the electrical components.', 'Connected detection to a driver alarm.', 'Integrated a seat-number display to identify the passenger.'],
    learning: 'Seeing a project as an integrated system: detection is only useful when the alert and identification also work together.',
    scope: 'Listed in my original resume as a May 2023 project. A public source repository is not linked.'
  }
];

export const categoryLabels = { all: 'all', web: 'Web + AI', automation: 'Automation', robotics: 'Robotics' };

export function filterProjects(category, source = projects) {
  return category === 'all' ? [...source] : source.filter(project => project.category === category);
}

export function normaliseQuery(value) {
  return String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function matchCommands(commands, query) {
  const words = normaliseQuery(query).split(/\s+/).filter(Boolean);
  return commands.filter(command => words.every(word => normaliseQuery(`${command.label} ${command.keywords || ''}`).includes(word)));
}

export function projectFromHash(hash) {
  if (!hash.startsWith('#project=')) return null;
  let id;
  try { id = decodeURIComponent(hash.slice(9)); } catch { return null; }
  return projects.find(project => project.id === id) || null;
}

export function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

export const directionLessons: Record<string, string[]> = {
  "common-skills": [
    "basics-cia",
    "kali-first-boot",
    "basics-ip",
    "project-start",
  ],
  "aws-security": ["basics-cloud", "basics-access", "basics-threat-model"],
  "gcp-security": ["basics-cloud", "basics-access", "basics-threat-model"],
  "azure-security": ["basics-cloud", "basics-access", "basics-threat-model"],
  "web-pentest": ["basics-https", "local-web", "company-idor-evidence"],
  "application-security": [
    "basics-threat-model",
    "basics-safe-release",
    "company-idor-evidence",
  ],
  "api-security": ["basics-https", "basics-access", "company-idor-evidence"],
  "threat-modeling": [
    "basics-risk",
    "basics-threat-model",
    "company-incident-report",
  ],
  grc: ["basics-cia", "basics-risk", "company-access-review"],
  devsecops: [
    "basics-safe-release",
    "company-secret-logs",
    "company-patch-priority",
  ],
  "docker-security": ["basics-access", "basics-ports", "basics-threat-model"],
  "kubernetes-security": ["basics-access", "basics-ports", "basics-cloud"],
  "network-security": [
    "basics-ip",
    "basics-dns",
    "basics-ports",
    "inspect-traffic",
  ],
  cryptography: [
    "project-hash",
    "project-base64",
    "project-cipher",
    "basics-https",
  ],
  "software-supply-chain-security": [
    "verify-download",
    "basics-safe-release",
    "company-patch-priority",
  ],
  "secure-code-review": [
    "project-start",
    "project-headers",
    "basics-access",
    "basics-safe-release",
  ],
  "secure-software-development-lifecycle": [
    "basics-threat-model",
    "basics-safe-release",
    "company-incident-report",
  ],
  "security-architecture": [
    "basics-risk",
    "basics-threat-model",
    "basics-access",
    "basics-cloud",
  ],
  "genai-security": [
    "basics-ai-boundary",
    "company-secret-logs",
    "basics-access",
  ],
  "product-security": [
    "basics-risk",
    "basics-threat-model",
    "basics-safe-release",
  ],
  "iam-security": ["basics-mfa", "basics-access", "company-access-review"],
  "blue-team-detection-response": [
    "soc-first-shift",
    "soc-login-chain",
    "company-final-case",
  ],
  "mobile-application-security": [
    "basics-access",
    "basics-https",
    "basics-threat-model",
  ],
  "reverse-engineering-malware-security": [
    "suspicious-file",
    "verify-download",
    "stop-process",
    "antivirus-test",
  ],
  "osint-social-engineering": [
    "phishing-mail",
    "basics-mfa",
    "incident-report",
  ],
};

export const sourceNames: Record<string, string> = {
  jassics: "jassics / security-study-plan",
  hamed: "Hamed233 / Cybersecurity-Mastery-Roadmap",
};

// Local integration-test fixture only. Never imported by the application.
import { SMTPServer } from "smtp-server";
import { createServer } from "node:http";
const messages = [];
const smtp = new SMTPServer({
  authOptional: true,
  disabledCommands: ["AUTH", "STARTTLS"],
  logger: false,
  onData(stream, session, callback) {
    let text = "";
    stream.on("data", (chunk) => {
      text += chunk.toString();
    });
    stream.on("end", () => {
      const separator = text.indexOf("\r\n\r\n");
      const headers = text.slice(0, separator);
      let body = text.slice(separator + 4);
      if (/Content-Transfer-Encoding:\s*base64/i.test(headers))
        body = Buffer.from(body.replace(/\s/g, ""), "base64").toString("utf8");
      const code = body
        .replace(/=\r?\n/g, "")
        .match(/:\s*(\d{6})\s*(?:\r?\n|$)/)?.[1];
      for (const to of session.envelope.rcptTo)
        messages.push({ email: to.address, code });
      if (messages.length > 200) messages.splice(0, messages.length - 200);
      callback();
    });
  },
});
smtp.listen(2526, "127.0.0.1");
createServer((request, response) => {
  const url = new URL(request.url, "http://localhost:8026");
  response.setHeader("Content-Type", "application/json");
  response.end(
    JSON.stringify(
      url.pathname === "/health"
        ? { ok: true }
        : messages
            .filter(
              (message) => message.email === url.searchParams.get("email"),
            )
            .slice(-1),
    ),
  );
}).listen(8026, "127.0.0.1", () =>
  console.log("Local test mailbox ready (no external delivery)."),
);

import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import files from "../../content/material-files.json";
import { getCurrentUser } from "@/lib/access";
import { accountFailure, privateJson } from "@/lib/account-http";

const allowedFiles = new Set<string>(files);

export async function serveMemberFile(
  kind: "downloads" | "labs" | "images",
  segments: string[],
) {
  try {
    if (!(await getCurrentUser()))
      return privateJson(
        { error: "Войдите в аккаунт, чтобы скачать учебные файлы." },
        401,
      );
    // Exact tracked-file allowlist, not a client-supplied filesystem path.
    const key = `${kind}/${segments.join("/")}`;
    if (
      !allowedFiles.has(key) ||
      segments.some((s) => !/^[A-Za-z0-9_.+-]+$/.test(s))
    )
      return privateJson({ error: "Файл не найден." }, 404);
    const data = await readFile(join(process.cwd(), "private-materials", key));
    const filename = segments.at(-1)!;
    const inlineImage = kind === "images" && filename.endsWith(".svg");
    const type = inlineImage
      ? "image/svg+xml"
      : filename.endsWith(".zip")
        ? "application/zip"
        : filename.endsWith(".json")
          ? "application/json; charset=utf-8"
          : "application/octet-stream";
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `${inlineImage ? "inline" : "attachment"}; filename="${filename}"`,
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        "Content-Length": String(data.length),
        "Cache-Control": "private, no-store",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
        Vary: "Cookie",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return accountFailure(error);
  }
}

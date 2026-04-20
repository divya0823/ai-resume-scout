// PDF/TXT extraction in the browser using pdfjs
import * as pdfjs from "pdfjs-dist";
// @ts-ignore - vite ?url import
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export async function extractText(file: File): Promise<string> {
  if (file.type === "text/plain" || file.name.endsWith(".txt")) {
    return await file.text();
  }
  if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it: any) => it.str).join(" ") + "\n";
    }
    return text;
  }
  throw new Error("Unsupported file type. Use PDF or TXT.");
}

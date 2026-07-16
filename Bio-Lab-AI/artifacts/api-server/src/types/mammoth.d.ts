// mammoth ships no TypeScript types. Narrow ambient declaration covering only
// the API this project uses (raw text extraction from a .docx buffer).
declare module "mammoth" {
  export interface ExtractRawTextResult {
    value: string;
    messages: { type: string; message: string }[];
  }
  export function extractRawText(input: { buffer: Buffer }): Promise<ExtractRawTextResult>;
}

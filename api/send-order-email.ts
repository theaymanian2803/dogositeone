import { sendOrderEmail, type OrderEmailInput } from "../server/email";

export const config = { runtime: "edge" };

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed." }, { status: 405 });
  }

  try {
    const data = (await request.json()) as Partial<OrderEmailInput>;
    if (!data.customer?.email || !Array.isArray(data.items) || data.items.length === 0) {
      return Response.json({ ok: false, error: "Invalid order payload." }, { status: 400 });
    }

    const result = await sendOrderEmail(data as OrderEmailInput);
    return Response.json({ ok: true, ...result });
  } catch {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
}

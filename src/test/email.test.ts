// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";

import { defaultStoreSettings } from "@/lib/store-settings";
import {
  emailConfigured,
  emailStatus,
  orderConfirmationEmail,
  passwordResetEmail,
  sendEmail,
} from "@/server/email";

const keys = ["EMAIL_ENABLED", "EMAIL_API_KEY", "EMAIL_FROM", "EMAIL_PROVIDER", "EMAIL_OWNER"];
const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of keys) {
    const value = original[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("transactional email", () => {
  it("reports unconfigured when the API key or sender is missing", () => {
    delete process.env["EMAIL_API_KEY"];
    delete process.env["EMAIL_FROM"];
    expect(emailConfigured()).toBe(false);
    expect(emailStatus().configured).toBe(false);

    process.env["EMAIL_API_KEY"] = "re_test";
    expect(emailConfigured()).toBe(false);
    process.env["EMAIL_FROM"] = "Store <orders@example.com>";
    expect(emailConfigured()).toBe(true);
  });

  it("does not call the provider when email is not configured", async () => {
    delete process.env["EMAIL_API_KEY"];
    delete process.env["EMAIL_FROM"];

    const result = await sendEmail({
      to: "customer@example.com",
      subject: "Test",
      html: "<p>Test</p>",
      text: "Test",
    });

    expect(result.ok).toBe(false);
  });

  it("builds an order confirmation with items, total and delivery address", () => {
    const message = orderConfirmationEmail({
      orderNumber: "NRV-TEST-001",
      customer: {
        name: "Amina Test",
        email: "amina@example.com",
        phone: "+212 600 000000",
        address: "12 Test Lane",
        city: "Casablanca",
        postalCode: "20000",
        country: "Morocco",
      },
      lines: [
        {
          productId: "wool-overcoat-01",
          name: "Wool Overcoat",
          size: "One Size",
          unitPrice: 480,
          quantity: 1,
          lineTotal: 480,
        },
      ],
      totals: { subtotal: 480, shipping: 0, discount: 0, total: 480 },
      currency: "GBP",
      settings: defaultStoreSettings,
    });

    expect(message.subject).toContain("NRV-TEST-001");
    expect(message.html).toContain("Wool Overcoat");
    expect(message.html).toContain("Amina Test");
    expect(message.text).toContain("Total");
    expect(message.text).toContain("12 Test Lane");
  });

  it("builds a password reset code email", () => {
    const message = passwordResetEmail({
      name: "Amina Test",
      code: "ABCD2345",
      brand: "NORVEN",
    });

    expect(message.subject).toContain("password reset");
    expect(message.html).toContain("ABCD2345");
    expect(message.text).toContain("ABCD2345");
  });
});

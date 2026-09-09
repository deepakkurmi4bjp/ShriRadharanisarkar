import assert from "node:assert/strict";

type JsonObject = Record<string, unknown>;

const baseUrl = (process.env.REGRESSION_BASE_URL || "http://localhost:80/api").replace(/\/+$/, "");

async function request(path: string, init?: RequestInit): Promise<{ response: Response; body: JsonObject }> {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = (await response.json()) as JsonObject;
  return { response, body };
}

function expectStatus(response: Response, expected: number, context: string): void {
  assert.equal(response.status, expected, `${context}: expected ${expected}, received ${response.status}`);
}

async function main(): Promise<void> {
  const health = await request("/healthz");
  expectStatus(health.response, 200, "health");
  assert.equal(health.body.status, "ok");

  const summary = await request("/analytics/summary");
  expectStatus(summary.response, 200, "public analytics");
  for (const field of ["totalAmount", "totalDonations", "totalCollectors", "totalDonors"]) {
    assert.equal(typeof summary.body[field], "number", `public analytics field ${field}`);
  }

  const publicDonations = await request("/donations?limit=1");
  expectStatus(publicDonations.response, 200, "public donation list");
  assert.ok(Array.isArray(publicDonations.body.donations), "public donation list should return an array");

  const donations = publicDonations.body.donations as JsonObject[];
  if (donations.length > 0) {
    const donation = donations[0];
    assert.match(String(donation.mobile), /^\*{6}\d{4}$/, "public donor mobile must be masked");
    assert.ok(["cash", "upi"].includes(String(donation.paymentMethod)), "donation payment method must be valid");
    assert.ok(
      donation.transactionId === null ||
        /^\u2022{4}.{4,}$/.test(String(donation.transactionId)),
      "public transaction ID must be absent or masked",
    );
    assert.equal(donation.isVerified, true, "stored donation hash must verify");

    const donationId = Number(donation.id);
    assert.ok(Number.isInteger(donationId), "public donation should expose a numeric id");
    const receipt = await request(`/donations/${donationId}/verify`);
    expectStatus(receipt.response, 200, "public receipt verification");
    assert.equal(receipt.body.valid, true, "public receipt verification should pass");
  }

  const unauthenticatedSession = await request("/auth/me");
  expectStatus(unauthenticatedSession.response, 401, "unauthenticated session lookup");

  const malformedLogin = await request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile: "", password: "" }),
  });
  expectStatus(malformedLogin.response, 400, "malformed login");

  const unauthenticatedDonation = await request("/donations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Regression Check",
      mobile: "9999999999",
      amount: 1,
      purpose: "Regression check",
    }),
  });
  expectStatus(unauthenticatedDonation.response, 401, "unauthenticated donation creation");

  console.log(`Regression smoke checks passed against ${baseUrl}`);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
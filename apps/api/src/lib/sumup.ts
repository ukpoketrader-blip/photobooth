import { createHmac } from "crypto";
import { env } from "./env.js";

export function verifySumUpWebhook(
  payload: string,
  signature: string | undefined
): boolean {
  if (!env.sumupWebhookSecret || !signature) {
    return env.nodeEnv === "development";
  }
  const expected = createHmac("sha256", env.sumupWebhookSecret)
    .update(payload)
    .digest("hex");
  return expected === signature;
}

export async function createSumUpCheckout(params: {
  amountMinor: number;
  currency: string;
  merchantReference: string;
  description: string;
  accessToken: string;
}): Promise<{ checkoutId: string; checkoutUrl: string }> {
  if (!env.sumupClientId && env.nodeEnv === "development") {
    return {
      checkoutId: `dev-checkout-${params.merchantReference}`,
      checkoutUrl: `https://pay.sumup.com/dev-mock?ref=${params.merchantReference}`,
    };
  }

  const res = await fetch(`${env.sumupApiBase}/v0.1/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      checkout_reference: params.merchantReference,
      amount: params.amountMinor / 100,
      currency: params.currency,
      description: params.description,
      merchant_code: env.sumupClientId,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SumUp checkout failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    id: string;
    checkout_url?: string;
  };

  return {
    checkoutId: data.id,
    checkoutUrl: data.checkout_url ?? `${env.sumupApiBase}/checkout/${data.id}`,
  };
}

export async function createTerminalPayment(params: {
  amountMinor: number;
  currency: string;
  readerId: string;
  merchantReference: string;
  accessToken: string;
}): Promise<{ transactionId: string }> {
  if (env.nodeEnv === "development") {
    return { transactionId: `dev-tx-${params.merchantReference}` };
  }

  const res = await fetch(
    `${env.sumupApiBase}/v0.1/merchants/${env.sumupClientId}/readers/${params.readerId}/checkout`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        total_amount: {
          value: params.amountMinor,
          currency: params.currency,
          minor_unit: 2,
        },
        description: params.merchantReference,
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SumUp terminal payment failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { data?: { transaction_id?: string } };
  return {
    transactionId: data.data?.transaction_id ?? params.merchantReference,
  };
}

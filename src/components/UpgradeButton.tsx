"use client";

import Script from "next/script";
import { useState } from "react";

type PaddleGlobal = {
  Environment: { set: (env: string) => void };
  Initialize: (opts: { token: string }) => void;
  Checkout: { open: (opts: Record<string, unknown>) => void };
};

declare global {
  interface Window {
    Paddle?: PaddleGlobal;
  }
}

/**
 * Opens Paddle's overlay checkout for the single paid plan. Env-gated: with no
 * client token or price id it renders a disabled, self-explaining state so the
 * page still works before Paddle sandbox keys are provisioned.
 */
export function UpgradeButton({
  email,
  userId,
  label = "Upgrade — $9/mo",
}: {
  email: string | null;
  userId: string;
  label?: string;
}) {
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  const priceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID;
  const env = process.env.NEXT_PUBLIC_PADDLE_ENV;
  const configured = Boolean(token && priceId);

  const [ready, setReady] = useState(false);

  if (!configured) {
    return (
      <button className="btn" disabled>
        Upgrade (checkout not configured)
      </button>
    );
  }

  function init() {
    const Paddle = window.Paddle;
    if (!Paddle) return;
    if (env === "sandbox") Paddle.Environment.set("sandbox");
    Paddle.Initialize({ token: token! });
    setReady(true);
  }

  function openCheckout() {
    const Paddle = window.Paddle;
    if (!Paddle) return;
    Paddle.Checkout.open({
      items: [{ priceId: priceId!, quantity: 1 }],
      ...(email ? { customer: { email } } : {}),
      customData: { user_id: userId },
    });
  }

  return (
    <>
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        strategy="afterInteractive"
        onLoad={init}
      />
      <button
        type="button"
        className="btn btn-accent"
        onClick={openCheckout}
        disabled={!ready}
      >
        {ready ? label : "Loading checkout…"}
      </button>
    </>
  );
}

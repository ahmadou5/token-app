import { NextRequest, NextResponse } from "next/server";

type AlertLevel = "info" | "success" | "warning" | "error";

interface AppAlert {
  id: string;
  title: string;
  message: string;
  level: AlertLevel;
  createdAt: string;
  txSignature?: string;
}

interface AlertDeliverySettings {
  inApp: boolean;
  webhookEnabled: boolean;
  webhookUrl: string;
  telegramEnabled: boolean;
  telegramChatId: string;
}

interface DeliverRequest {
  alert?: AppAlert;
  delivery?: AlertDeliverySettings;
}

function toTelegramMessage(alert: AppAlert): string {
  return [
    `*${alert.title}*`,
    alert.message,
    `Level: ${alert.level}`,
    `Time: ${new Date(alert.createdAt).toISOString()}`,
    alert.txSignature ? `Tx: https://solscan.io/tx/${alert.txSignature}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DeliverRequest;

    if (!body.alert || !body.delivery) {
      return NextResponse.json({ ok: false, err: "Missing alert or delivery settings" }, { status: 400 });
    }

    const { alert, delivery } = body;
    const deliveryResults: Array<{ channel: string; ok: boolean; status?: number; err?: string }> = [];

    if (delivery.webhookEnabled && delivery.webhookUrl) {
      try {
        const webhookRes = await fetch(delivery.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "token-app-alert-center",
            alert,
          }),
        });
        deliveryResults.push({
          channel: "webhook",
          ok: webhookRes.ok,
          status: webhookRes.status,
          err: webhookRes.ok ? undefined : `Webhook returned ${webhookRes.status}`,
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Webhook request failed";
        deliveryResults.push({ channel: "webhook", ok: false, err: message });
      }
    }

    if (delivery.telegramEnabled && delivery.telegramChatId) {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        deliveryResults.push({
          channel: "telegram",
          ok: false,
          err: "Missing TELEGRAM_BOT_TOKEN on server",
        });
      } else {
        try {
          const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: delivery.telegramChatId,
              text: toTelegramMessage(alert),
              parse_mode: "Markdown",
              disable_web_page_preview: true,
            }),
          });
          deliveryResults.push({
            channel: "telegram",
            ok: telegramRes.ok,
            status: telegramRes.status,
            err: telegramRes.ok ? undefined : `Telegram returned ${telegramRes.status}`,
          });
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Telegram request failed";
          deliveryResults.push({ channel: "telegram", ok: false, err: message });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      delivered: deliveryResults,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to deliver alert";
    console.error("[api/alerts/deliver] Error:", error);
    return NextResponse.json({ ok: false, err: message }, { status: 500 });
  }
}

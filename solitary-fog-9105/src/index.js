import PostalMime from "postal-mime";

export default {
  async email(message, env, ctx) {
    try {
      const parsed = await PostalMime.parse(message.raw);

      const payload = {
        from: message.from || parsed.from?.address || "",
        to: message.to || "",
        subject: parsed.subject || message.headers.get("subject") || "",
        text: parsed.text || "",
        html: parsed.html || "",
        messageId:
          message.headers.get("message-id") ||
          parsed.messageId ||
          null
      };

      const response = await fetch(env.ROYAL_LEGACY_INBOX_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-inbox-secret": env.INBOX_WEBHOOK_SECRET
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const body = await response.text();

        console.error(
          "Royal Legacy rechazó el correo:",
          response.status,
          body
        );

        throw new Error(
          `Royal Legacy respondió HTTP ${response.status}`
        );
      }

      console.log(
        `Correo enviado correctamente a Royal Legacy: ${message.to}`
      );
    } catch (error) {
      console.error("Error en Email Worker:", error);
      throw error;
    }
  }
};
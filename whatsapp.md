# Khodi Mart — WhatsApp messages (Cloud API)

Khodi Mart customer messages **Meta WhatsApp Cloud API** thi jai che. Login / register OTP free text nathi — **approved Authentication template** joiye. Free text (`type: text`) customer e pachi j last 24 hours ma reply karyu hoy tyare j jai.

Admin test: **Admin → Integrations → WhatsApp OTP → Send test**.

Webhook (Meta verify): `https://mart.khodi.in/api/v1/webhook/whatsapp`

---

## 1. Meta ma template banavo (aa text copy karo)

WhatsApp Manager → **Message templates** → Create → category **Authentication**.

| Field | Value |
|---|---|
| Name | `otp_verification` |
| Language | English — code `en` |
| Status | **Approved** (Pending par message nahi jase) |

**Body** (ek variable):

```text
{{1}} is your Khodi Mart verification code. Do not share this code with anyone.
```

**Button** (optional, code aa support kare che):

- Type: URL
- URL example: `https://mart.khodi.in/{{1}}`
- Button variable: same OTP (`{{1}}`)

Button nathi to pan chale — server pehla body+button mokle, Meta error `132000` / button error aave to **body-only** retry kare.

App mode **Live** hovu joiye. Development mode ma number Meta allowlist ma nathi to error **131030** aave.

---

## 2. Admin ma save karo

**Admin → Integrations → WhatsApp OTP**

| Field | Example |
|---|---|
| Enabled | ON |
| Phone Number ID | Meta → WhatsApp → API Setup → Phone number ID |
| WABA ID | WhatsApp Business Account ID |
| API URL | `https://graph.facebook.com/v25.0` |
| OTP template | `otp_verification` |
| Template language | `en` |
| Access token | Meta permanent token (DB ma AES encrypted) |

Server par `AES_CREDENTIALS_KEY` (64-char hex) set hovu joiye, nahi to token save nahi thay.

Env fallback (Admin empty hoy to):

```text
WHATSAPP_API_TOKEN=
WHATSAPP_PHONE_ID=
WHATSAPP_WABA_ID=
WHATSAPP_API_URL=https://graph.facebook.com/v25.0
WHATSAPP_OTP_TEMPLATE=otp_verification
WHATSAPP_OTP_TEMPLATE_LANG=en
WHATSAPP_WEBHOOK_VERIFY_TOKEN=khodimart_wa_verify
```

**Admin → Settings:** `system.otp_dev_mode` **OFF**. ON hoy to OTP server bahar jato nathi.

Phone format: 10 digit Indian number auto `91` prefix male (`9876543210` → `919876543210`). `+` ane spaces ignore thay.

---

## 3. System je JSON mokle che

`POST {API_URL}/{PHONE_NUMBER_ID}/messages`  
Header: `Authorization: Bearer {token}`

```json
{
  "messaging_product": "whatsapp",
  "to": "919876543210",
  "type": "template",
  "template": {
    "name": "otp_verification",
    "language": { "code": "en" },
    "components": [
      {
        "type": "body",
        "parameters": [{ "type": "text", "text": "482913" }]
      },
      {
        "type": "button",
        "sub_type": "url",
        "index": "0",
        "parameters": [{ "type": "text", "text": "482913" }]
      }
    ]
  }
}
```

Body-only fallback (URL button nathi):

```json
{
  "messaging_product": "whatsapp",
  "to": "919876543210",
  "type": "template",
  "template": {
    "name": "otp_verification",
    "language": { "code": "en" },
    "components": [
      {
        "type": "body",
        "parameters": [{ "type": "text", "text": "482913" }]
      }
    ]
  }
}
```

OTP code body variable `{{1}}` ma jai che. Template name / language Admin setting sathe **exact** match hovu joiye.

---

## 4. Bija message (session text)

24-hour window ma j (customer e pehla message karyu hoy):

```json
{
  "messaging_product": "whatsapp",
  "to": "919876543210",
  "type": "text",
  "text": { "preview_url": false, "body": "Your order is ready for pickup." }
}
```

OTP, order alerts, marketing — cold users ne **approved template** joiye. Random text Meta reject kare.

---

## 5. Errors

| Meta code | Meaning | Fix |
|---|---|---|
| 131030 | Number allowlist ma nathi | App Mode = **Live**, ke test number API Setup list ma add karo |
| 190 | Token invalid | Admin ma navo token save karo |
| 132001 | Template name/language wrong | Name `otp_verification`, language `en` |
| 132000 | Variable count wrong | Body ma exactly **ek** `{{1}}` |
| 132015 / 132016 | Template paused/disabled | WhatsApp Manager ma template enable |
| 131026 | Deliver nathi thatu | Number WhatsApp par nathi / invalid |
| 131031 | Business blocked | Business verification + payment method |
| 130429 | Rate limit | Thodi var wait |

---

## 6. Go-live checklist

1. Meta App Mode = **Live**
2. Phone Number ID Admin sathe match
3. Template `otp_verification` / `en` = **Approved**
4. Business verified + display name approved
5. Admin ma token + Phone Number ID saved
6. `system.otp_dev_mode` = OFF
7. Integrations par **Send test** — WhatsApp par OTP aavvo joiye

---

## 7. Aaradhana — pass enquiry bulk (image)

Admin → **WhatsApp**. Numbers paste. Same image + caption badha ne.

Uses the live Khodi Mart Cloud API values only:

```text
WHATSAPP_DEV_MODE=false
WHATSAPP_API_URL=https://graph.facebook.com/v25.0
WHATSAPP_API_TOKEN=
WHATSAPP_PHONE_ID=
```

`otp_verification` OTP mate j che. Bulk pass image e template use nathi kartu.

Flow: `POST {API_URL}/{PHONE_ID}/media` → image id, pachhi `POST .../messages` with `type: image` ane caption. `WHATSAPP_DEV_MODE=true` hoy to Meta call nathi. Max 150 numbers.

/**
 * Seed message templates (spec section 8.4).
 *
 * English templates are APPROVED so dry-run works. Spanish, Somali and Swahili
 * are machine-drafted starting points saved as DRAFT. They are clearly marked
 * "needs review by a fluent speaker" and never send automatically until a
 * fluent speaker approves them in Settings -> Templates.
 */
import type { MessageRuleKey } from "./settings";

export type TemplateLanguage = "EN" | "ES" | "SO" | "SW";
export type SeedTemplate = {
  key: MessageRuleKey;
  channel: "SMS" | "EMAIL";
  language: TemplateLanguage;
  status: "APPROVED" | "DRAFT";
  subject?: string;
  body: string;
  reviewNote?: string;
};

export const MERGE_FIELDS = [
  "firstName", "paymentAmount", "dueDate", "promiseAmount", "promiseDate", "dealershipName",
  "dealershipPhone", "businessHours", "payOnlineUrl", "zelleRecipient", "inPersonAddress"
] as const;

export const SMS_MAX_LENGTH = 320;
export const FLUENT_REVIEW_NOTE = "Needs review by a fluent speaker before it can be approved.";

const EN: Record<MessageRuleKey, string> = {
  DUE_SOON: "Hi {firstName}, this is {dealershipName}. Friendly reminder: your payment of {paymentAmount} is due {dueDate}. Pay online at {payOnlineUrl}, by Zelle to {zelleRecipient}, or stop by. Questions? Call {dealershipPhone}. Reply STOP to opt out.",
  PAST_DUE_DAY1: "Hi {firstName}, this is {dealershipName}. We haven't seen your payment of {paymentAmount} that was due {dueDate}. If you've already paid, thank you! If not, please pay at {payOnlineUrl} or call {dealershipPhone}. Reply STOP to opt out.",
  PAST_DUE_LATE_FEE: "Hi {firstName}, this is {dealershipName}. Your payment of {paymentAmount} due {dueDate} is now past due and a late fee may apply. We're happy to help: call {dealershipPhone} or pay at {payOnlineUrl}. Reply STOP to opt out.",
  PROMISE_REMINDER: "Hi {firstName}, this is {dealershipName}. Reminder of your planned payment of {promiseAmount} on {promiseDate}. Pay at {payOnlineUrl}, by Zelle to {zelleRecipient}, or stop by. Reply YES to confirm. Reply STOP to opt out.",
  INSURANCE_NEEDED: "Hi {firstName}, this is {dealershipName}. We need current proof of insurance for your vehicle. You can reply to this text with a photo of your insurance card. Questions? Call {dealershipPhone}. Reply STOP to opt out.",
  DISABLE_WARNING: "Hi {firstName}, this is {dealershipName}. Your account is past due. Please call us at {dealershipPhone} today so we can work this out together and avoid any interruption to your vehicle. Reply STOP to opt out."
};

const ES: Record<MessageRuleKey, string> = {
  DUE_SOON: "Hola {firstName}, le saluda {dealershipName}. Recordatorio: su pago de {paymentAmount} vence el {dueDate}. Pague en línea en {payOnlineUrl}, por Zelle a {zelleRecipient} o en persona. ¿Preguntas? Llame al {dealershipPhone}. Responda STOP para no recibir más mensajes.",
  PAST_DUE_DAY1: "Hola {firstName}, le saluda {dealershipName}. No hemos recibido su pago de {paymentAmount} que vencía el {dueDate}. Si ya pagó, ¡gracias! Si no, pague en {payOnlineUrl} o llame al {dealershipPhone}. Responda STOP para no recibir más mensajes.",
  PAST_DUE_LATE_FEE: "Hola {firstName}, le saluda {dealershipName}. Su pago de {paymentAmount} del {dueDate} está atrasado y podría aplicarse un cargo por mora. Con gusto le ayudamos: llame al {dealershipPhone}. Responda STOP para no recibir más mensajes.",
  PROMISE_REMINDER: "Hola {firstName}, le saluda {dealershipName}. Le recordamos su pago acordado de {promiseAmount} el {promiseDate}. Pague en {payOnlineUrl}, por Zelle a {zelleRecipient} o en persona. ¡Gracias! Responda STOP para no recibir más mensajes.",
  INSURANCE_NEEDED: "Hola {firstName}, le saluda {dealershipName}. Necesitamos un comprobante de seguro vigente para su vehículo. Puede responder con una foto de su tarjeta de seguro. ¿Preguntas? Llame al {dealershipPhone}. Responda STOP para no recibir más mensajes.",
  DISABLE_WARNING: "Hola {firstName}, le saluda {dealershipName}. Su cuenta está atrasada. Llámenos hoy al {dealershipPhone} para resolverlo juntos y evitar cualquier interrupción de su vehículo. Responda STOP para no recibir más mensajes."
};

const SO: Record<MessageRuleKey, string> = {
  DUE_SOON: "Salaan {firstName}, waa {dealershipName}. Xasuusin: lacag-bixintaada {paymentAmount} waxay dhacaysaa {dueDate}. Ku bixi {payOnlineUrl}, Zelle {zelleRecipient}, ama nala soo booqo. Su'aalo? Wac {dealershipPhone}. Ku jawaab STOP si aad u joojiso.",
  PAST_DUE_DAY1: "Salaan {firstName}, waa {dealershipName}. Ma helin lacag-bixintaada {paymentAmount} ee ahayd {dueDate}. Haddii aad bixisay, mahadsanid! Haddii kale, ku bixi {payOnlineUrl} ama wac {dealershipPhone}. Ku jawaab STOP si aad u joojiso.",
  PAST_DUE_LATE_FEE: "Salaan {firstName}, waa {dealershipName}. Lacag-bixintaada {paymentAmount} ee {dueDate} way dib u dhacday, waxaana laga yaabaa in ganaax dib-u-dhac la saaro. Waan ku caawin karnaa: wac {dealershipPhone}. Ku jawaab STOP si aad u joojiso.",
  PROMISE_REMINDER: "Salaan {firstName}, waa {dealershipName}. Xasuusin ku saabsan lacag-bixinta aad ballanqaaday {promiseAmount} ee {promiseDate}. Ku bixi {payOnlineUrl} ama Zelle {zelleRecipient}. Mahadsanid! Ku jawaab STOP si aad u joojiso.",
  INSURANCE_NEEDED: "Salaan {firstName}, waa {dealershipName}. Waxaan u baahanahay caddeyn caymis oo cusub oo baabuurkaaga ah. Waxaad noogu soo diri kartaa sawirka kaarka caymiska. Su'aalo? Wac {dealershipPhone}. Ku jawaab STOP si aad u joojiso.",
  DISABLE_WARNING: "Salaan {firstName}, waa {dealershipName}. Koontadaadu way dib u dhacday. Fadlan maanta naga wac {dealershipPhone} si aan wada xallino oo aan looga hortago hakad baabuurkaaga. Ku jawaab STOP si aad u joojiso."
};

const SW: Record<MessageRuleKey, string> = {
  DUE_SOON: "Habari {firstName}, ni {dealershipName}. Ukumbusho: malipo yako ya {paymentAmount} yanatakiwa {dueDate}. Lipa mtandaoni {payOnlineUrl}, kwa Zelle kwa {zelleRecipient}, au fika ofisini. Maswali? Piga {dealershipPhone}. Jibu STOP kuacha kupokea ujumbe.",
  PAST_DUE_DAY1: "Habari {firstName}, ni {dealershipName}. Hatujapokea malipo yako ya {paymentAmount} yaliyotakiwa {dueDate}. Kama umeshalipa, asante! Kama bado, lipa {payOnlineUrl} au piga {dealershipPhone}. Jibu STOP kuacha kupokea ujumbe.",
  PAST_DUE_LATE_FEE: "Habari {firstName}, ni {dealershipName}. Malipo yako ya {paymentAmount} ya {dueDate} yamechelewa na ada ya kuchelewa inaweza kutozwa. Tuko tayari kukusaidia: piga {dealershipPhone}. Jibu STOP kuacha kupokea ujumbe.",
  PROMISE_REMINDER: "Habari {firstName}, ni {dealershipName}. Tunakukumbusha malipo uliyoahidi ya {promiseAmount} tarehe {promiseDate}. Lipa {payOnlineUrl} au kwa Zelle kwa {zelleRecipient}. Asante! Jibu STOP kuacha kupokea ujumbe.",
  INSURANCE_NEEDED: "Habari {firstName}, ni {dealershipName}. Tunahitaji uthibitisho wa bima halali ya gari lako. Unaweza kujibu ujumbe huu kwa picha ya kadi yako ya bima. Maswali? Piga {dealershipPhone}. Jibu STOP kuacha kupokea ujumbe.",
  DISABLE_WARNING: "Habari {firstName}, ni {dealershipName}. Akaunti yako imechelewa. Tafadhali tupigie leo {dealershipPhone} ili tutatue pamoja na kuepuka usumbufu wowote wa gari lako. Jibu STOP kuacha kupokea ujumbe."
};

const EMAIL_SUBJECTS: Partial<Record<MessageRuleKey, string>> = {
  DUE_SOON: "Payment reminder from {dealershipName}",
  INSURANCE_NEEDED: "Proof of insurance needed - {dealershipName}"
};

function emailBody(sms: string) {
  return sms.replace(/ Reply STOP to opt out\.$/, "") + "\n\nThank you,\n{dealershipName}\n{dealershipPhone}";
}

export function buildSeedTemplates(): SeedTemplate[] {
  const keys = Object.keys(EN) as MessageRuleKey[];
  const sms: SeedTemplate[] = keys.flatMap(key => [
    { key, channel: "SMS" as const, language: "EN" as const, status: "APPROVED" as const, body: EN[key] },
    ...([["ES", ES], ["SO", SO], ["SW", SW]] as const).map(([language, table]) => ({
      key, channel: "SMS" as const, language, status: "DRAFT" as const, body: table[key], reviewNote: FLUENT_REVIEW_NOTE
    }))
  ]);
  const email: SeedTemplate[] = (Object.keys(EMAIL_SUBJECTS) as MessageRuleKey[]).map(key => ({
    key, channel: "EMAIL", language: "EN", status: "APPROVED", subject: EMAIL_SUBJECTS[key], body: emailBody(EN[key])
  }));
  return [...sms, ...email];
}

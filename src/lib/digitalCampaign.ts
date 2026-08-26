export const DIGITAL_STANDARD = "digitalads-niat_guru_ratna-";

export const DIGITAL_CHANNELS = [
  "google",
  "meta",
  "mediabuying",
  "whatsapp",
  "sms",
  "sharechat",
  "paytm",
  "josh",
  "turecaller",
  "gpay",
  "mygate",
  "jiohotstar",
  "email",
  "meta_fbinsta",
  "google_nbsearch",
  "google_dgen",
  "snapchat",
  "google_yt",
  "google_display",
  "meta_insta",
  "rcs",
  "google_pmax",
  "google_bs",
  "meta_ctwa",
  "generic-",
  "taboola-",
  "manabadi-",
  "sales",
] as const;

export const DIGITAL_STATES = [
  "ap-",
  "apts-",
  "ts-",
  "ka-",
  "kl-",
  "tn-",
  "wb-",
  "india-",
  "mh-",
  "tn_pudu-",
  "delhi-",
  "hindi_fr-",
  "hindi_fr_city-",
  "south-",
  "non_south-",
  "rj-",
  "ncr-",
  "hyd-",
  "jaipur-",
  "non_telugu-",
  "hindi_region-",
  "odisha-",
  "english_region-",
  "up-",
  "mp-",
  "pb-",
  "gj-",
  "jh-",
  "bihar-",
  "haryana-",
  "cg-",
  "ut-",
] as const;

export const DIGITAL_LANGUAGES = [
  "telugu-",
  "hindi-",
  "tamil-",
  "kannada-",
  "bengali-",
  "english-",
  "marathi-",
  "malayalam-",
] as const;

export const DIGITAL_CREATIVE_TYPES = [
  "-influ",
  "-testi",
  "-motion",
  "-poster",
  "-memoji",
  "-spokesperson",
  "-conceptads",
  "-text",
  "-carousel",
  "-carousel-posters",
  "-testi_spokesperson",
  "-concept_spokesperson",
  "-video",
  "-podcast",
  "-ctwa",
] as const;

export const DIGITAL_MEDIUMS = [
  "pmax",
  "youtube",
  "facebook",
  "instagram",
  "fbinsta",
  "searchads",
  "display",
  "1000reach",
  "primedigital",
  "universityupdates",
  "demandgen",
  "leadgen",
  "remarketing_presales",
  "affinity",
  "examupdts",
  "sharechat",
  "moj",
  "stucor",
  "lokalapp",
  "jio",
  "freshersworld",
  "karix",
  "phonepe",
  "taboola",
  "mediaant",
  "work4freshers",
  "intandtrainings",
  "ctwa",
  "justdial",
  "nbsearch",
  "msgsequence",
  "instantform",
  "awareness",
] as const;

export const DIGITAL_LANDING_PAGES = [
  { destination: "/", token: "home", label: "Home page" },
  { destination: "/nominate-student", token: "student", label: "Student nominate page" },
  { destination: "/nominate-teacher", token: "teacher", label: "Teacher nominate page" },
] as const;

export const DIGITAL_DESTINATIONS = DIGITAL_LANDING_PAGES.map((p) => ({
  id: p.destination,
  label: p.label,
}));

export type DigitalChannel = (typeof DIGITAL_CHANNELS)[number];
export type DigitalState = (typeof DIGITAL_STATES)[number];
export type DigitalLanguage = (typeof DIGITAL_LANGUAGES)[number];
export type DigitalCreativeType = (typeof DIGITAL_CREATIVE_TYPES)[number];
export type DigitalMedium = (typeof DIGITAL_MEDIUMS)[number];
export type DigitalLandingToken = (typeof DIGITAL_LANDING_PAGES)[number]["token"];
export type DigitalDestination = (typeof DIGITAL_LANDING_PAGES)[number]["destination"];

export const slugifyDigitalField = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

export const channelToUtmSource = (channel: string) => channel.trim().toLowerCase();

export const tokenLabel = (token: string) => token.replace(/^-+|-+$/g, "") || token;

export const destLabel = (id: string) =>
  DIGITAL_LANDING_PAGES.find((d) => d.destination === id)?.label ||
  DIGITAL_LANDING_PAGES.find((d) => d.token === id)?.label ||
  id;

export const landingTokenToDestination = (token: string) =>
  DIGITAL_LANDING_PAGES.find((p) => p.token === token)?.destination || "/nominate-student";

export const destinationToLandingToken = (destination: string) =>
  DIGITAL_LANDING_PAGES.find((p) => p.destination === destination)?.token || "student";

export const joinCampaignParts = (parts: string[]) =>
  parts
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      if (!acc) return part;
      const needHyphen = !acc.endsWith("-") && !part.startsWith("-");
      return needHyphen ? `${acc}-${part}` : `${acc}${part}`;
    }, "");

export type DigitalCampaignFields = {
  channel: string;
  state: string;
  language: string;
  audience?: string;
  landingDiff?: string;
  creativeType: string;
  creative?: string;
};

export const buildFinalUtmCampaign = (fields: DigitalCampaignFields) =>
  joinCampaignParts([
    DIGITAL_STANDARD,
    fields.channel,
    fields.state,
    fields.language,
    slugifyDigitalField(fields.audience || ""),
    slugifyDigitalField(fields.landingDiff || ""),
    fields.creativeType,
    slugifyDigitalField(fields.creative || ""),
  ]);

const PUBLIC_ORIGIN = "https://www.niatawards.in";

export const publicOrigin = () => {
  if (typeof window === "undefined") return PUBLIC_ORIGIN;
  const { hostname, origin } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") return origin;
  return PUBLIC_ORIGIN;
};

export const buildDigitalCampaignUrl = (link: {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  destination: string;
}) => {
  const q = new URLSearchParams({
    utm_source: link.utm_source,
    utm_medium: link.utm_medium,
    utm_campaign: link.utm_campaign,
  });
  return `${publicOrigin()}${link.destination}?${q.toString()}`;
};

/**
 * Shared currency list for zakat, sadaqah and any financial UI.
 * Extended coverage of Muslim-majority countries plus major world currencies.
 */
export interface Currency {
  code: string;
  name: string;
  /** Optional country/region hint to improve search ("bangladesh", "saudi", etc.). */
  country?: string;
}

export const CURRENCIES: Currency[] = [
  { code: "USD", name: "US Dollar", country: "United States" },
  { code: "EUR", name: "Euro", country: "Eurozone" },
  { code: "GBP", name: "British Pound", country: "United Kingdom" },

  // Middle East & Gulf
  { code: "AED", name: "UAE Dirham", country: "United Arab Emirates" },
  { code: "SAR", name: "Saudi Riyal", country: "Saudi Arabia" },
  { code: "QAR", name: "Qatari Riyal", country: "Qatar" },
  { code: "KWD", name: "Kuwaiti Dinar", country: "Kuwait" },
  { code: "BHD", name: "Bahraini Dinar", country: "Bahrain" },
  { code: "OMR", name: "Omani Rial", country: "Oman" },
  { code: "JOD", name: "Jordanian Dinar", country: "Jordan" },
  { code: "YER", name: "Yemeni Rial", country: "Yemen" },
  { code: "SYP", name: "Syrian Pound", country: "Syria" },
  { code: "LBP", name: "Lebanese Pound", country: "Lebanon" },
  { code: "IQD", name: "Iraqi Dinar", country: "Iraq" },
  { code: "IRR", name: "Iranian Rial", country: "Iran" },
  { code: "ILS", name: "Israeli Shekel", country: "Palestine / Israel" },
  { code: "TRY", name: "Turkish Lira", country: "Turkey" },

  // North Africa
  { code: "EGP", name: "Egyptian Pound", country: "Egypt" },
  { code: "MAD", name: "Moroccan Dirham", country: "Morocco" },
  { code: "DZD", name: "Algerian Dinar", country: "Algeria" },
  { code: "TND", name: "Tunisian Dinar", country: "Tunisia" },
  { code: "LYD", name: "Libyan Dinar", country: "Libya" },
  { code: "SDG", name: "Sudanese Pound", country: "Sudan" },
  { code: "SSP", name: "South Sudanese Pound", country: "South Sudan" },
  { code: "MRU", name: "Mauritanian Ouguiya", country: "Mauritania" },

  // Sub-Saharan Africa (large Muslim populations)
  { code: "SOS", name: "Somali Shilling", country: "Somalia" },
  { code: "DJF", name: "Djiboutian Franc", country: "Djibouti" },
  { code: "KMF", name: "Comorian Franc", country: "Comoros" },
  { code: "ETB", name: "Ethiopian Birr", country: "Ethiopia" },
  { code: "ERN", name: "Eritrean Nakfa", country: "Eritrea" },
  { code: "NGN", name: "Nigerian Naira", country: "Nigeria" },
  { code: "GHS", name: "Ghanaian Cedi", country: "Ghana" },
  { code: "GMD", name: "Gambian Dalasi", country: "Gambia" },
  { code: "GNF", name: "Guinean Franc", country: "Guinea" },
  { code: "SLE", name: "Sierra Leonean Leone", country: "Sierra Leone" },
  { code: "KES", name: "Kenyan Shilling", country: "Kenya" },
  { code: "TZS", name: "Tanzanian Shilling", country: "Tanzania" },
  { code: "UGX", name: "Ugandan Shilling", country: "Uganda" },
  { code: "RWF", name: "Rwandan Franc", country: "Rwanda" },
  { code: "ZAR", name: "South African Rand", country: "South Africa" },
  { code: "MZN", name: "Mozambican Metical", country: "Mozambique" },
  { code: "XOF", name: "West African CFA Franc", country: "Senegal, Mali, Burkina Faso, Niger, Côte d'Ivoire, Benin, Togo, Guinea-Bissau" },
  { code: "XAF", name: "Central African CFA Franc", country: "Cameroon, Chad, CAR, Congo, Gabon, Equatorial Guinea" },

  // South & Central Asia
  { code: "AFN", name: "Afghan Afghani", country: "Afghanistan" },
  { code: "PKR", name: "Pakistani Rupee", country: "Pakistan" },
  { code: "BDT", name: "Bangladeshi Taka", country: "Bangladesh" },
  { code: "INR", name: "Indian Rupee", country: "India" },
  { code: "LKR", name: "Sri Lankan Rupee", country: "Sri Lanka" },
  { code: "NPR", name: "Nepalese Rupee", country: "Nepal" },
  { code: "MVR", name: "Maldivian Rufiyaa", country: "Maldives" },
  { code: "BTN", name: "Bhutanese Ngultrum", country: "Bhutan" },
  { code: "KZT", name: "Kazakhstani Tenge", country: "Kazakhstan" },
  { code: "UZS", name: "Uzbekistani Som", country: "Uzbekistan" },
  { code: "KGS", name: "Kyrgyzstani Som", country: "Kyrgyzstan" },
  { code: "TJS", name: "Tajikistani Somoni", country: "Tajikistan" },
  { code: "TMT", name: "Turkmenistani Manat", country: "Turkmenistan" },
  { code: "AZN", name: "Azerbaijani Manat", country: "Azerbaijan" },
  { code: "AMD", name: "Armenian Dram", country: "Armenia" },
  { code: "GEL", name: "Georgian Lari", country: "Georgia" },

  // Southeast Asia
  { code: "IDR", name: "Indonesian Rupiah", country: "Indonesia" },
  { code: "MYR", name: "Malaysian Ringgit", country: "Malaysia" },
  { code: "BND", name: "Brunei Dollar", country: "Brunei" },
  { code: "SGD", name: "Singapore Dollar", country: "Singapore" },
  { code: "THB", name: "Thai Baht", country: "Thailand" },
  { code: "PHP", name: "Philippine Peso", country: "Philippines" },
  { code: "VND", name: "Vietnamese Dong", country: "Vietnam" },
  { code: "MMK", name: "Myanmar Kyat", country: "Myanmar" },
  { code: "KHR", name: "Cambodian Riel", country: "Cambodia" },
  { code: "LAK", name: "Lao Kip", country: "Laos" },

  // East Asia
  { code: "CNY", name: "Chinese Yuan", country: "China" },
  { code: "HKD", name: "Hong Kong Dollar", country: "Hong Kong" },
  { code: "TWD", name: "Taiwan Dollar", country: "Taiwan" },
  { code: "JPY", name: "Japanese Yen", country: "Japan" },
  { code: "KRW", name: "South Korean Won", country: "South Korea" },
  { code: "MNT", name: "Mongolian Tögrög", country: "Mongolia" },

  // Europe
  { code: "CHF", name: "Swiss Franc", country: "Switzerland" },
  { code: "SEK", name: "Swedish Krona", country: "Sweden" },
  { code: "NOK", name: "Norwegian Krone", country: "Norway" },
  { code: "DKK", name: "Danish Krone", country: "Denmark" },
  { code: "ISK", name: "Icelandic Króna", country: "Iceland" },
  { code: "PLN", name: "Polish Zloty", country: "Poland" },
  { code: "CZK", name: "Czech Koruna", country: "Czech Republic" },
  { code: "HUF", name: "Hungarian Forint", country: "Hungary" },
  { code: "RON", name: "Romanian Leu", country: "Romania" },
  { code: "BGN", name: "Bulgarian Lev", country: "Bulgaria" },
  { code: "RSD", name: "Serbian Dinar", country: "Serbia" },
  { code: "BAM", name: "Bosnia-Herzegovina Mark", country: "Bosnia and Herzegovina" },
  { code: "ALL", name: "Albanian Lek", country: "Albania" },
  { code: "MKD", name: "Macedonian Denar", country: "North Macedonia" },
  { code: "UAH", name: "Ukrainian Hryvnia", country: "Ukraine" },
  { code: "RUB", name: "Russian Ruble", country: "Russia" },
  { code: "BYN", name: "Belarusian Ruble", country: "Belarus" },
  { code: "MDL", name: "Moldovan Leu", country: "Moldova" },

  // Americas & Oceania
  { code: "CAD", name: "Canadian Dollar", country: "Canada" },
  { code: "AUD", name: "Australian Dollar", country: "Australia" },
  { code: "NZD", name: "New Zealand Dollar", country: "New Zealand" },
  { code: "MXN", name: "Mexican Peso", country: "Mexico" },
  { code: "BRL", name: "Brazilian Real", country: "Brazil" },
  { code: "ARS", name: "Argentine Peso", country: "Argentina" },
  { code: "CLP", name: "Chilean Peso", country: "Chile" },
  { code: "COP", name: "Colombian Peso", country: "Colombia" },
  { code: "PEN", name: "Peruvian Sol", country: "Peru" },
];

export function findCurrency(code: string): Currency | undefined {
  return CURRENCIES.find((c) => c.code === code);
}

export function searchCurrencies(query: string): Currency[] {
  const q = query.trim().toLowerCase();
  if (!q) return CURRENCIES;
  return CURRENCIES.filter(
    (c) =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      (c.country ?? "").toLowerCase().includes(q),
  );
}

/**
 * Build a currency-aware Intl.NumberFormat.
 * Uses each ISO 4217 currency's native minor units (JPY/KRW=0, KWD/BHD/OMR/IQD/JOD/TND/LYD=3, most others=2)
 * so amounts round and display correctly across all 100+ supported currencies.
 * Falls back to a decimal formatter with the code prefixed if the runtime rejects the currency.
 */
export function getCurrencyFormatter(code: string, locale?: string): Intl.NumberFormat {
  const safe = (code || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: safe });
  } catch {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  }
}

/**
 * Format an amount for a given ISO currency code.
 * Handles NaN / non-finite input by rendering the currency's zero value.
 */
export function formatCurrency(amount: number, code: string, locale?: string): string {
  const n = Number.isFinite(amount) ? amount : 0;
  const fmt = getCurrencyFormatter(code, locale);
  try {
    return fmt.format(n);
  } catch {
    return `${code} ${n.toLocaleString(locale, { maximumFractionDigits: 2 })}`;
  }
}


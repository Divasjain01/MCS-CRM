export interface CountryCodeOption {
  value: string;
  label: string;
  country: string;
  flag: string;
  iso2: string;
}

export const DEFAULT_COUNTRY_CODE = "+91";

export const countryCodeOptions: CountryCodeOption[] = [
  { country: "Afghanistan", iso2: "AF", flag: "🇦🇫", value: "+93", label: "Afghanistan +93" },
  { country: "Albania", iso2: "AL", flag: "🇦🇱", value: "+355", label: "Albania +355" },
  { country: "Algeria", iso2: "DZ", flag: "🇩🇿", value: "+213", label: "Algeria +213" },
  { country: "American Samoa", iso2: "AS", flag: "🇦🇸", value: "+1", label: "American Samoa +1" },
  { country: "Andorra", iso2: "AD", flag: "🇦🇩", value: "+376", label: "Andorra +376" },
  { country: "Argentina", iso2: "AR", flag: "🇦🇷", value: "+54", label: "Argentina +54" },
  { country: "Australia", iso2: "AU", flag: "🇦🇺", value: "+61", label: "Australia +61" },
  { country: "Austria", iso2: "AT", flag: "🇦🇹", value: "+43", label: "Austria +43" },
  { country: "Bangladesh", iso2: "BD", flag: "🇧🇩", value: "+880", label: "Bangladesh +880" },
  { country: "Belgium", iso2: "BE", flag: "🇧🇪", value: "+32", label: "Belgium +32" },
  { country: "Bhutan", iso2: "BT", flag: "🇧🇹", value: "+975", label: "Bhutan +975" },
  { country: "Brazil", iso2: "BR", flag: "🇧🇷", value: "+55", label: "Brazil +55" },
  { country: "Canada", iso2: "CA", flag: "🇨🇦", value: "+1", label: "Canada +1" },
  { country: "China", iso2: "CN", flag: "🇨🇳", value: "+86", label: "China +86" },
  { country: "Colombia", iso2: "CO", flag: "🇨🇴", value: "+57", label: "Colombia +57" },
  { country: "Denmark", iso2: "DK", flag: "🇩🇰", value: "+45", label: "Denmark +45" },
  { country: "Egypt", iso2: "EG", flag: "🇪🇬", value: "+20", label: "Egypt +20" },
  { country: "Finland", iso2: "FI", flag: "🇫🇮", value: "+358", label: "Finland +358" },
  { country: "France", iso2: "FR", flag: "🇫🇷", value: "+33", label: "France +33" },
  { country: "Germany", iso2: "DE", flag: "🇩🇪", value: "+49", label: "Germany +49" },
  { country: "Ghana", iso2: "GH", flag: "🇬🇭", value: "+233", label: "Ghana +233" },
  { country: "Greece", iso2: "GR", flag: "🇬🇷", value: "+30", label: "Greece +30" },
  { country: "Hong Kong", iso2: "HK", flag: "🇭🇰", value: "+852", label: "Hong Kong +852" },
  { country: "India", iso2: "IN", flag: "🇮🇳", value: "+91", label: "India +91" },
  { country: "Indonesia", iso2: "ID", flag: "🇮🇩", value: "+62", label: "Indonesia +62" },
  { country: "Ireland", iso2: "IE", flag: "🇮🇪", value: "+353", label: "Ireland +353" },
  { country: "Israel", iso2: "IL", flag: "🇮🇱", value: "+972", label: "Israel +972" },
  { country: "Italy", iso2: "IT", flag: "🇮🇹", value: "+39", label: "Italy +39" },
  { country: "Japan", iso2: "JP", flag: "🇯🇵", value: "+81", label: "Japan +81" },
  { country: "Kenya", iso2: "KE", flag: "🇰🇪", value: "+254", label: "Kenya +254" },
  { country: "Malaysia", iso2: "MY", flag: "🇲🇾", value: "+60", label: "Malaysia +60" },
  { country: "Mexico", iso2: "MX", flag: "🇲🇽", value: "+52", label: "Mexico +52" },
  { country: "Nepal", iso2: "NP", flag: "🇳🇵", value: "+977", label: "Nepal +977" },
  { country: "Netherlands", iso2: "NL", flag: "🇳🇱", value: "+31", label: "Netherlands +31" },
  { country: "New Zealand", iso2: "NZ", flag: "🇳🇿", value: "+64", label: "New Zealand +64" },
  { country: "Nigeria", iso2: "NG", flag: "🇳🇬", value: "+234", label: "Nigeria +234" },
  { country: "Norway", iso2: "NO", flag: "🇳🇴", value: "+47", label: "Norway +47" },
  { country: "Oman", iso2: "OM", flag: "🇴🇲", value: "+968", label: "Oman +968" },
  { country: "Pakistan", iso2: "PK", flag: "🇵🇰", value: "+92", label: "Pakistan +92" },
  { country: "Philippines", iso2: "PH", flag: "🇵🇭", value: "+63", label: "Philippines +63" },
  { country: "Poland", iso2: "PL", flag: "🇵🇱", value: "+48", label: "Poland +48" },
  { country: "Portugal", iso2: "PT", flag: "🇵🇹", value: "+351", label: "Portugal +351" },
  { country: "Qatar", iso2: "QA", flag: "🇶🇦", value: "+974", label: "Qatar +974" },
  { country: "Saudi Arabia", iso2: "SA", flag: "🇸🇦", value: "+966", label: "Saudi Arabia +966" },
  { country: "Singapore", iso2: "SG", flag: "🇸🇬", value: "+65", label: "Singapore +65" },
  { country: "South Africa", iso2: "ZA", flag: "🇿🇦", value: "+27", label: "South Africa +27" },
  { country: "South Korea", iso2: "KR", flag: "🇰🇷", value: "+82", label: "South Korea +82" },
  { country: "Spain", iso2: "ES", flag: "🇪🇸", value: "+34", label: "Spain +34" },
  { country: "Sri Lanka", iso2: "LK", flag: "🇱🇰", value: "+94", label: "Sri Lanka +94" },
  { country: "Sweden", iso2: "SE", flag: "🇸🇪", value: "+46", label: "Sweden +46" },
  { country: "Switzerland", iso2: "CH", flag: "🇨🇭", value: "+41", label: "Switzerland +41" },
  { country: "Thailand", iso2: "TH", flag: "🇹🇭", value: "+66", label: "Thailand +66" },
  { country: "Turkey", iso2: "TR", flag: "🇹🇷", value: "+90", label: "Turkey +90" },
  { country: "UAE", iso2: "AE", flag: "🇦🇪", value: "+971", label: "UAE +971" },
  { country: "UK", iso2: "GB", flag: "🇬🇧", value: "+44", label: "UK +44" },
  { country: "USA", iso2: "US", flag: "🇺🇸", value: "+1", label: "USA +1" },
  { country: "Vietnam", iso2: "VN", flag: "🇻🇳", value: "+84", label: "Vietnam +84" },
];

const digitsOnly = (value: string) => value.replace(/\D/g, "");

export const normalizePhoneDigits = (value: string) => digitsOnly(value).slice(-10);

export const normalizeCountryCode = (value: string) => {
  const digits = digitsOnly(value);
  return digits ? `+${digits}` : DEFAULT_COUNTRY_CODE;
};

export const getCountryCodeOption = (value: string) =>
  countryCodeOptions.find((option) => option.value === value) ??
  countryCodeOptions.find((option) => option.value === DEFAULT_COUNTRY_CODE)!;

export const formatPhoneForStorage = (phone: string, countryCode = DEFAULT_COUNTRY_CODE) => {
  const localDigits = digitsOnly(phone);

  if (!localDigits) {
    return "";
  }

  if (phone.trim().startsWith("+")) {
    return `+${digitsOnly(phone)}`;
  }

  const normalizedCountryCode = normalizeCountryCode(countryCode);

  if (normalizedCountryCode === DEFAULT_COUNTRY_CODE && localDigits.length >= 10) {
    return `${normalizedCountryCode}${localDigits.slice(-10)}`;
  }

  return `${normalizedCountryCode}${localDigits}`;
};

export const splitStoredPhone = (phone: string | null | undefined) => {
  const raw = (phone ?? "").trim();

  if (!raw) {
    return {
      countryCode: DEFAULT_COUNTRY_CODE,
      localNumber: "",
    };
  }

  if (!raw.startsWith("+")) {
    return {
      countryCode: DEFAULT_COUNTRY_CODE,
      localNumber: digitsOnly(raw),
    };
  }

  const matchingCountryCode =
    countryCodeOptions
      .map((option) => option.value)
      .sort((left, right) => right.length - left.length)
      .find((option) => raw.startsWith(option)) ?? DEFAULT_COUNTRY_CODE;

  return {
    countryCode: matchingCountryCode,
    localNumber: digitsOnly(raw.slice(matchingCountryCode.length)),
  };
};

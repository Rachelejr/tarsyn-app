// Choice lists shared by Add Member, the public join-request form and the
// "Accept join request" window, so a member created from a request has
// exactly the same kind of values as one added by hand.

// Stored value = English name (as in Add Member). `code` lets the public
// form show the name in the visitor's language with Intl.DisplayNames.
export const MEMBER_COUNTRIES: { value: string; code: string }[] = [
  { value: 'United States', code: 'US' },
  { value: 'Haiti', code: 'HT' },
  { value: 'France', code: 'FR' },
  { value: 'Canada', code: 'CA' },
  { value: 'United Kingdom', code: 'GB' },
  { value: 'Nigeria', code: 'NG' },
  { value: 'Senegal', code: 'SN' },
  { value: 'Ivory Coast', code: 'CI' },
  { value: 'Cameroon', code: 'CM' },
  { value: 'Other', code: '' },
];
export const MEMBER_GENDERS = ['Male', 'Female'] as const;
export const MEMBER_TYPES = ['Regular', 'Premium', 'VIP', 'Observer'] as const;
export const MEMBER_ROLES = [
  { value: 'member', label: 'Member' },
  { value: 'treasurer', label: 'Treasurer' },
  { value: 'secretary', label: 'Secretary' },
  { value: 'admin', label: 'Admin' },
] as const;
export const MEMBER_COLOR_TAGS = ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple'] as const;
export const MEMBER_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const;
export const MEMBER_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'HTG', 'XOF'] as const;
export const MAX_PARTS = 10;

export const isCountry = (v: string) => MEMBER_COUNTRIES.some(c => c.value === v);

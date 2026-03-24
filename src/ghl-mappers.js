// src/ghl-mappers.js — Translate raw GHL contact payloads into typed DTOs

const TIER_MAP = {
  ordinary:  { label: 'Ordinary Member', quota: 4 },
  associate: { label: 'Associate Member', quota: 2 },
  life:      { label: 'Life Member',      quota: 6 },
  full:      { label: 'Full Member',      quota: 4 },
};

export function cf(contact, key) {
  const field = (contact.customFields || []).find(
    x => x.fieldKey === `contact.${key}` || x.fieldKey === key
  );
  return field ? (field.fieldValue || '') : '';
}

export function mapContact(raw) {
  const rawTier = cf(raw, 'membership_tier') || cf(raw, 'member_tier') || 'ordinary';
  const tier    = TIER_MAP[rawTier.toLowerCase()] || TIER_MAP.ordinary;
  return {
    id:               raw.id,
    firstName:        raw.firstName || '',
    lastName:         raw.lastName  || '',
    name:             `${raw.firstName || ''} ${raw.lastName || ''}`.trim(),
    email:            raw.email || '',
    phone:            raw.phone || '',
    membershipNumber: cf(raw, 'membership_number').toUpperCase(),
    tier:             rawTier.toLowerCase(),
    tierLabel:        tier.label,
    quotaTotal:       tier.quota,
    tags:             raw.tags || [],
    flagged:          (raw.tags || []).includes('flagged'),
  };
}

export function mapBooking(raw) {
  return {
    id:               raw.id,
    contactName:      `${raw.firstName || ''} ${raw.lastName || ''}`.trim(),
    email:            raw.email || '',
    membershipNumber: cf(raw, 'membership_number').toUpperCase(),
    bookingType:      cf(raw, 'booking_type') || 'member',
    facility:         cf(raw, 'facility') || '',
    slotDate:         cf(raw, 'slot_date') || '',
    slotTime:         cf(raw, 'slot_time') || '',
    guestName:        cf(raw, 'guest_name') || '',
    status:           cf(raw, 'booking_status') || 'confirmed',
    checkedIn:        cf(raw, 'checked_in') === 'true',
    invitingMemberId: cf(raw, 'inviting_member_id') || '',
  };
}

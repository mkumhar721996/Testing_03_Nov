export interface Category {
  id: string;
  name: string;
}

export interface Service {
  id: string;
  categoryId: string;
  name: string;
  note: string;
}

/** `timeZone` is an IANA name; slot times for the address are shown in it. */
export interface Address {
  id: string;
  customerId: string;
  label: string;
  line: string;
  timeZone: string;
}

export interface SlotsForAddress {
  day: string;
  timeZone: string;
  zoneLabel: string;
  slots: { window: string; bookable: boolean }[];
}

export interface ConfirmedBooking {
  bookingId: string;
  status: 'confirmed';
  visitFee: { amount: number; currency: string };
  service: Service;
  address: Address;
  day: string;
  window: string;
  zoneLabel: string;
}

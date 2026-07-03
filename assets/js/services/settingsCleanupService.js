import { supabase } from "../supabaseClient.js";
import { deleteAllStaffWithRelatedData } from "./staffService.js";

export const CLEANUP_TABLES = [
  { key: "payments", label: "Payment Transactions", table: "payments", note: "Payment ledger rows." },
  { key: "club_transactions", label: "Club Transactions", table: "club_transactions", note: "VIP club transaction rows." },
  { key: "staff", label: "Staff", table: "staff", note: "Staff directory records plus assigned tasks, payments, service orders, and audit logs. Login profiles are not removed." },
  { key: "rooms", label: "Rooms", table: "rooms", note: "Room inventory records. Existing reservations can block deletion." },
  { key: "room_types", label: "Room Types", table: "room_types", note: "Room type records. Existing rooms can block deletion." },
  { key: "reservations", label: "Reservations", table: "reservations", note: "Reservation records and dependent invoice/service rows where cascades allow." },
  { key: "guests", label: "Guests", table: "guests", note: "Guest profiles. Existing reservations can block deletion." },
  { key: "housekeeping_tasks", label: "Housekeeping Tasks", table: "housekeeping_tasks", note: "Housekeeping task rows." },
  { key: "invoices", label: "Invoices", table: "invoices", note: "Invoices and invoice items through cascade." },
  { key: "invoice_items", label: "Invoice Items", table: "invoice_items", note: "Line items attached to invoices." },
  { key: "amenities", label: "Amenities", table: "amenities", note: "Amenity catalogue records and amenity bookings through cascade." },
  { key: "amenity_bookings", label: "Amenity Bookings", table: "amenity_bookings", note: "Amenity booking rows." },
  { key: "hotel_services", label: "Hotel Services", table: "hotel_services", note: "Service catalogue records. Existing service orders or benefits can block deletion." },
  { key: "service_orders", label: "Service Orders", table: "service_orders", note: "Guest service order rows." },
  { key: "clubs", label: "VIP Clubs", table: "clubs", note: "VIP club records and dependent registrations/benefits through cascade." },
  { key: "club_registrations", label: "Club Registrations", table: "club_registrations", note: "VIP club membership registrations." },
  { key: "club_benefits", label: "Club Benefits", table: "club_benefits", note: "VIP club benefit records and usage rows through cascade." },
  { key: "club_benefit_usage", label: "Club Benefit Usage", table: "club_benefit_usage", note: "Benefit usage history rows." },
  { key: "audit_logs", label: "Audit Logs", table: "audit_logs", note: "System activity log rows." },
];

export function getCleanupTable(key) {
  return CLEANUP_TABLES.find((table) => table.key === key);
}

export async function deleteCleanupTableRows(key) {
  const cleanupTable = getCleanupTable(key);
  if (!cleanupTable) {
    throw new Error("Select a valid table to clean up.");
  }

  if (cleanupTable.key === "staff") {
    const deleted = await deleteAllStaffWithRelatedData();
    return {
      label: cleanupTable.label,
      table: cleanupTable.table,
      deleted: deleted.staff,
      details: deleted,
    };
  }

  const { data, error } = await supabase
    .from(cleanupTable.table)
    .delete()
    .not("id", "is", null)
    .select("id");

  if (error) {
    throw error;
  }

  return {
    label: cleanupTable.label,
    table: cleanupTable.table,
    deleted: (data || []).length,
  };
}

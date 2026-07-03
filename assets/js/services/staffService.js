import { supabase } from "../supabaseClient.js";

export async function listStaff(filters = {}) {
  let query = supabase
    .from("staff")
    .select(`
      *,
      housekeeping_tasks(id, task_type, priority, status, room_id),
      login_profile:users_profile!staff_auth_user_id_fkey(id, full_name, role)
    `)
    .order("full_name");

  if (filters.department) {
    query = query.eq("department", filters.department);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return data || [];
}

export async function listStaffOptions() {
  const { data, error } = await supabase.from("staff").select("id, full_name, department, position, status, auth_user_id").order("full_name");
  if (error) {
    throw error;
  }
  return data || [];
}

export async function saveStaff(payload) {
  const { data, error } = await supabase.from("staff").upsert(payload).select("*").single();
  if (error) {
    throw error;
  }
  return data;
}

export async function deleteStaff(id) {
  const { error } = await supabase.from("staff").delete().eq("id", id);
  if (error) {
    throw error;
  }
}

async function getStaffDeleteTarget(id) {
  const { data, error } = await supabase
    .from("staff")
    .select("id, full_name, auth_user_id")
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function deleteRows(table, column, values) {
  if (!values.length) {
    return 0;
  }

  const { data, error } = await supabase
    .from(table)
    .delete()
    .in(column, values)
    .select("id");

  if (error) {
    throw error;
  }

  return (data || []).length;
}

async function deleteRowsByValue(table, column, value) {
  if (!value) {
    return 0;
  }

  return deleteRows(table, column, [value]);
}

export async function deleteStaffWithRelatedData(id) {
  const staff = await getStaffDeleteTarget(id);

  const deleted = {
    housekeepingTasks: await deleteRowsByValue("housekeeping_tasks", "assigned_staff_id", staff.id),
    payments: await deleteRowsByValue("payments", "received_by", staff.auth_user_id),
    serviceOrders: await deleteRowsByValue("service_orders", "created_by", staff.auth_user_id),
    auditLogs: await deleteRowsByValue("audit_logs", "user_id", staff.auth_user_id),
  };

  await deleteStaff(staff.id);

  return {
    staff,
    deleted,
  };
}

export async function deleteAllStaffWithRelatedData() {
  const { data: staffMembers, error } = await supabase
    .from("staff")
    .select("id");

  if (error) {
    throw error;
  }

  const summary = {
    staff: 0,
    housekeepingTasks: 0,
    payments: 0,
    serviceOrders: 0,
    auditLogs: 0,
  };

  for (const staffMember of staffMembers || []) {
    const result = await deleteStaffWithRelatedData(staffMember.id);
    summary.staff += 1;
    summary.housekeepingTasks += result.deleted.housekeepingTasks;
    summary.payments += result.deleted.payments;
    summary.serviceOrders += result.deleted.serviceOrders;
    summary.auditLogs += result.deleted.auditLogs;
  }

  return summary;
}

export async function deleteAllStaffTransactions() {
  const { data: staffProfiles, error } = await supabase
    .from("users_profile")
    .select("id")
    .eq("role", "Staff");

  if (error) {
    throw error;
  }

  const staffUserIds = (staffProfiles || []).map((profile) => profile.id);

  return {
    payments: await deleteRows("payments", "received_by", staffUserIds),
    serviceOrders: await deleteRows("service_orders", "created_by", staffUserIds),
    auditLogs: await deleteRows("audit_logs", "user_id", staffUserIds),
  };
}

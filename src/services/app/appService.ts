import type { Profile } from "../../types/auth";
import { supabase } from "../supabase/client";

export const STATUS = {
  ACCOUNT_ACTIVE: 1000,
  ACCOUNT_INACTIVE: 2000,
  ACCOUNT_SUSPENDED: 3000,
  ACCOUNT_BLOCKED: 4000,
  AVAILABILITY_ONLINE: 1000,
  AVAILABILITY_OFFLINE: 2000,
  AVAILABILITY_BUSY: 3000,
  VERIFICATION_PENDING: 1000,
  VERIFICATION_APPROVED: 2000,
  VERIFICATION_REJECTED: 3000,
  REQUEST_PENDING: 1000,
  REQUEST_ACCEPTED: 2000,
  REQUEST_REJECTED: 3000,
  REQUEST_CANCELLED: 4000,
  REQUEST_COMPLETED: 5000,
  ROUTE_ACTIVE: 1000,
  ROUTE_CLOSED: 2000,
  REPORT_PENDING: 1000,
  REPORT_IN_REVIEW: 2000,
  REPORT_RESOLVED: 3000,
  REPORT_DISMISSED: 4000,
  ROLE_PASSENGER: 1000,
  ROLE_DRIVER: 2000,
  ROLE_ADMIN: 3000,
} as const;

export const REPORT_TYPES = [
  { id: 1000, label: "Safety issue" },
  { id: 2000, label: "Driver or passenger behaviour" },
  { id: 3000, label: "Wrong route or vehicle information" },
  { id: 4000, label: "Other concern" },
] as const;

export type RoutePointInput = {
  latitude: number;
  longitude: number;
  name: string;
};

type DriverProfileRow = {
  id: string;
  profile_id: string;
  availability_status_id: number;
  verification_status_id: number;
  current_latitude: number | null;
  current_longitude: number | null;
  last_location_at: string | null;
  created_at?: string;
  updated_at?: string;
};

type VehicleRow = {
  id: string;
  driver_profile_id: string;
  vehicle_type_id: number;
  vehicle_status_id: number;
  plate_number: string | null;
  model: string | null;
};

type DriverRouteRow = {
  id: string;
  driver_profile_id: string;
  start_name: string | null;
  destination_name: string | null;
  start_latitude: number;
  start_longitude: number;
  destination_latitude: number;
  destination_longitude: number;
  route_polyline: string | null;
  route_status_id: number;
  started_at: string;
  ended_at: string | null;
};

type TransportRequestRow = {
  id: string;
  passenger_id: string;
  driver_profile_id: string | null;
  pickup_name: string | null;
  destination_name: string | null;
  pickup_latitude: number;
  pickup_longitude: number;
  destination_latitude: number;
  destination_longitude: number;
  request_status_id: number;
  passenger_note: string | null;
  driver_response_note: string | null;
  requested_at: string;
  responded_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
};

type ReportRow = {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  transport_request_id: string | null;
  report_type_id: number;
  report_status_id: number;
  title: string;
  description: string;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
};

type DriverVerificationRow = {
  id: string;
  driver_profile_id: string;
  verification_status_id: number;
  document_url: string | null;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type DriverSummary = {
  id: string;
  profileId: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  availabilityStatusId: number;
  verificationStatusId: number;
  currentLatitude: number | null;
  currentLongitude: number | null;
  lastLocationAt: string | null;
  vehicleId: string | null;
  vehicleTypeId: number | null;
  vehicleStatusId: number | null;
  vehicleModel: string | null;
  vehicleLabel: string;
  plateNumber: string | null;
  activeRoute: DriverRouteRow | null;
  distanceToPickupKm?: number;
  routeAlignmentScore?: number;
};

export type TransportRequestSummary = {
  id: string;
  passengerId: string;
  driverProfileId: string | null;
  passengerName: string;
  driverName: string;
  vehicleLabel: string;
  vehicleTypeId: number | null;
  plateNumber: string | null;
  pickupName: string;
  destinationName: string;
  pickupLatitude: number;
  pickupLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
  requestStatusId: number;
  passengerNote: string | null;
  requestedAt: string;
  driverCurrentLatitude: number | null;
  driverCurrentLongitude: number | null;
  driverProfileUserId: string | null;
};

export type ReportSummary = {
  id: string;
  title: string;
  description: string;
  reportTypeId: number;
  reportStatusId: number;
  reporterName: string;
  reportedUserName: string | null;
  transportRequestId: string | null;
  resolutionNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

export type DriverVerificationSummary = {
  id: string;
  documentUrl: string | null;
  rejectionReason: string | null;
  reviewedAt: string | null;
  statusId: number;
  submittedAt: string;
};

export type PassengerDashboardData = {
  availableDrivers: DriverSummary[];
  requests: TransportRequestSummary[];
  reports: ReportSummary[];
};

export type DriverDashboardData = {
  driver: DriverSummary | null;
  requests: TransportRequestSummary[];
  reports: ReportSummary[];
  verification: DriverVerificationSummary | null;
};

export type AdminDashboardData = {
  totalUsers: number;
  activeDrivers: number;
  pendingDrivers: number;
  pendingReports: number;
  users: Profile[];
  drivers: DriverSummary[];
  reports: ReportSummary[];
};

function byId<T extends { id: string }>(rows: T[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

function byDriverProfileId<T extends { driver_profile_id: string }>(rows: T[]) {
  const map = new Map<string, T[]>();

  for (const row of rows) {
    const current = map.get(row.driver_profile_id) ?? [];
    current.push(row);
    map.set(row.driver_profile_id, current);
  }

  return map;
}

function vehicleName(vehicle?: VehicleRow) {
  if (!vehicle) {
    return "Vehicle not added";
  }

  const type = vehicle.vehicle_type_id === 2000 ? "Motorbike" : "Taxi";
  const model = vehicle.model?.replace(/^Bike colour:\s*/i, "").replace(/^Colour\s*/i, "");

  if (vehicle.vehicle_type_id === 1000) {
    return "Taxi - Yellow";
  }

  return model ? `${type} - ${model}` : type;
}

function formatError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const radiusKm = 6371;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const haversine =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  return radiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

async function countRows(table: string, filters?: (query: any) => any) {
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  query = filters ? filters(query) : query;

  const { count, error } = await query;
  formatError(error);
  return count ?? 0;
}

async function getProfiles(profileIds: string[]) {
  const uniqueIds = Array.from(new Set(profileIds.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return new Map<string, Profile>();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("id", uniqueIds);

  formatError(error);
  return byId((data ?? []) as Profile[]);
}

async function getVehicles(driverProfileIds: string[]) {
  if (driverProfileIds.length === 0) {
    return new Map<string, VehicleRow[]>();
  }

  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .in("driver_profile_id", driverProfileIds);

  formatError(error);
  return byDriverProfileId((data ?? []) as VehicleRow[]);
}

async function getActiveRoutes(driverProfileIds: string[]) {
  if (driverProfileIds.length === 0) {
    return new Map<string, DriverRouteRow[]>();
  }

  const { data, error } = await supabase
    .from("driver_routes")
    .select("*")
    .in("driver_profile_id", driverProfileIds)
    .eq("route_status_id", STATUS.ROUTE_ACTIVE)
    .order("started_at", { ascending: false });

  formatError(error);
  return byDriverProfileId((data ?? []) as DriverRouteRow[]);
}

async function enrichDrivers(rows: DriverProfileRow[]) {
  const profileMap = await getProfiles(rows.map((row) => row.profile_id));
  const driverIds = rows.map((row) => row.id);
  const vehicleMap = await getVehicles(driverIds);
  const routeMap = await getActiveRoutes(driverIds);

  return rows.map<DriverSummary>((row) => {
    const profile = profileMap.get(row.profile_id);
    const vehicle = vehicleMap.get(row.id)?.[0];
    const route = routeMap.get(row.id)?.[0] ?? null;

    return {
      id: row.id,
      profileId: row.profile_id,
      name: profile?.full_name ?? "TransTrak driver",
      phone: profile?.phone ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      availabilityStatusId: row.availability_status_id,
      verificationStatusId: row.verification_status_id,
      currentLatitude: row.current_latitude,
      currentLongitude: row.current_longitude,
      lastLocationAt: row.last_location_at,
      vehicleId: vehicle?.id ?? null,
      vehicleTypeId: vehicle?.vehicle_type_id ?? null,
      vehicleStatusId: vehicle?.vehicle_status_id ?? null,
      vehicleModel: vehicle?.model ?? null,
      vehicleLabel: vehicleName(vehicle),
      plateNumber: vehicle?.plate_number ?? null,
      activeRoute: route,
    };
  });
}

export async function listDrivers(options?: {
  availabilityStatusIds?: number[];
  approvedOnly?: boolean;
  driverProfileIds?: string[];
  onlineOnly?: boolean;
  withLocationOnly?: boolean;
  limit?: number;
}) {
  let query = supabase
    .from("driver_profiles")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(options?.limit ?? 30);

  if (options?.approvedOnly) {
    query = query.eq("verification_status_id", STATUS.VERIFICATION_APPROVED);
  }

  if (options?.driverProfileIds?.length) {
    query = query.in("id", options.driverProfileIds);
  }

  if (options?.onlineOnly) {
    query = query.eq("availability_status_id", STATUS.AVAILABILITY_ONLINE);
  }

  if (options?.availabilityStatusIds?.length) {
    query = query.in("availability_status_id", options.availabilityStatusIds);
  }

  if (options?.withLocationOnly) {
    query = query
      .not("current_latitude", "is", null)
      .not("current_longitude", "is", null);
  }

  const { data, error } = await query;
  formatError(error);
  return enrichDrivers((data ?? []) as DriverProfileRow[]);
}

function scoreRouteMatch(driver: DriverSummary, pickup: RoutePointInput, destination: RoutePointInput) {
  if (typeof driver.currentLatitude !== "number" || typeof driver.currentLongitude !== "number") {
    return null;
  }

  const distanceToPickupKm = distanceKm(
    { latitude: driver.currentLatitude, longitude: driver.currentLongitude },
    pickup
  );

  if (!driver.activeRoute) {
    return distanceToPickupKm <= 5
      ? {
          distanceToPickupKm,
          routeAlignmentScore: Math.max(30, 65 - distanceToPickupKm * 8),
        }
      : null;
  }

  const startDistanceKm = distanceKm(
    {
      latitude: driver.activeRoute.start_latitude,
      longitude: driver.activeRoute.start_longitude,
    },
    pickup
  );
  const destinationDistanceKm = distanceKm(
    {
      latitude: driver.activeRoute.destination_latitude,
      longitude: driver.activeRoute.destination_longitude,
    },
    destination
  );

  if (distanceToPickupKm > 25 || startDistanceKm > 18 || destinationDistanceKm > 25) {
    return null;
  }

  const score = Math.max(
    0,
    Math.min(100, 100 - distanceToPickupKm * 3 - startDistanceKm * 2 - destinationDistanceKm * 2)
  );

  return {
    distanceToPickupKm,
    routeAlignmentScore: Math.round(score * 100) / 100,
  };
}

export async function listRouteMatchedDrivers(input: {
  destination: RoutePointInput;
  limit?: number;
  pickup: RoutePointInput;
}) {
  const drivers = await listDrivers({
    availabilityStatusIds: [STATUS.AVAILABILITY_ONLINE, STATUS.AVAILABILITY_BUSY],
    approvedOnly: true,
    withLocationOnly: true,
    limit: 100,
  });
  const matchedDrivers: DriverSummary[] = [];

  for (const driver of drivers) {
    const match = scoreRouteMatch(driver, input.pickup, input.destination);

    if (match) {
      matchedDrivers.push({
        ...driver,
        ...match,
      });
    }
  }

  return matchedDrivers
    .sort((a, b) => {
      const scoreDelta = (b.routeAlignmentScore ?? 0) - (a.routeAlignmentScore ?? 0);

      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return (a.distanceToPickupKm ?? 0) - (b.distanceToPickupKm ?? 0);
    })
    .slice(0, input.limit ?? 12);
}

export async function getDriverForProfile(profileId: string) {
  const { data, error } = await supabase
    .from("driver_profiles")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();

  formatError(error);

  if (!data) {
    return null;
  }

  const [driver] = await enrichDrivers([data as DriverProfileRow]);
  return driver ?? null;
}

async function getDriverVerification(driverProfileId: string) {
  const { data, error } = await supabase
    .from("driver_verifications")
    .select("*")
    .eq("driver_profile_id", driverProfileId)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  formatError(error);

  if (!data) {
    return null;
  }

  const row = data as DriverVerificationRow;

  return {
    id: row.id,
    documentUrl: row.document_url,
    rejectionReason: row.rejection_reason,
    reviewedAt: row.reviewed_at,
    statusId: row.verification_status_id,
    submittedAt: row.submitted_at,
  };
}

async function enrichRequests(rows: TransportRequestRow[]) {
  const driverProfileIds = rows
    .map((row) => row.driver_profile_id)
    .filter((id): id is string => Boolean(id));

  const passengerMap = await getProfiles(rows.map((row) => row.passenger_id));
  const drivers = driverProfileIds.length
    ? await listDrivers({ limit: 100 })
    : [];
  const driverMap = byId(drivers);

  return rows.map<TransportRequestSummary>((row) => {
    const driver = row.driver_profile_id ? driverMap.get(row.driver_profile_id) : null;
    const passenger = passengerMap.get(row.passenger_id);

    return {
      id: row.id,
      passengerId: row.passenger_id,
      driverProfileId: row.driver_profile_id,
      passengerName: passenger?.full_name ?? "Passenger",
      driverName: driver?.name ?? "Matching driver",
      vehicleLabel: driver?.vehicleLabel ?? "Vehicle pending",
      vehicleTypeId: driver?.vehicleTypeId ?? null,
      plateNumber: driver?.plateNumber ?? null,
      pickupName: row.pickup_name ?? "Pickup point",
      destinationName: row.destination_name ?? "Destination",
      pickupLatitude: row.pickup_latitude,
      pickupLongitude: row.pickup_longitude,
      destinationLatitude: row.destination_latitude,
      destinationLongitude: row.destination_longitude,
      requestStatusId: row.request_status_id,
      passengerNote: row.passenger_note,
      requestedAt: row.requested_at,
      driverCurrentLatitude: driver?.currentLatitude ?? null,
      driverCurrentLongitude: driver?.currentLongitude ?? null,
      driverProfileUserId: driver?.profileId ?? null,
    };
  });
}

export async function listPassengerRequests(passengerId: string) {
  const { data, error } = await supabase
    .from("transport_requests")
    .select("*")
    .eq("passenger_id", passengerId)
    .order("requested_at", { ascending: false })
    .limit(30);

  formatError(error);
  return enrichRequests((data ?? []) as TransportRequestRow[]);
}

export async function listDriverRequests(driverProfileId: string) {
  const { data, error } = await supabase
    .from("transport_requests")
    .select("*")
    .eq("driver_profile_id", driverProfileId)
    .order("requested_at", { ascending: false })
    .limit(30);

  formatError(error);
  return enrichRequests((data ?? []) as TransportRequestRow[]);
}

async function enrichReports(rows: ReportRow[]) {
  const ids = rows.flatMap((row) => [
    row.reporter_id,
    row.reported_user_id,
  ]).filter((id): id is string => Boolean(id));
  const profileMap = await getProfiles(ids);

  return rows.map<ReportSummary>((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    reportTypeId: row.report_type_id,
    reportStatusId: row.report_status_id,
    reporterName: profileMap.get(row.reporter_id)?.full_name ?? "Reporter",
    reportedUserName: row.reported_user_id
      ? profileMap.get(row.reported_user_id)?.full_name ?? "Reported user"
      : null,
    transportRequestId: row.transport_request_id,
    resolutionNote: row.resolution_note,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
  }));
}

export async function listReportsForUser(profileId: string) {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .or(`reporter_id.eq.${profileId},reported_user_id.eq.${profileId}`)
    .order("created_at", { ascending: false })
    .limit(30);

  formatError(error);
  return enrichReports((data ?? []) as ReportRow[]);
}

export async function listAdminReports() {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  formatError(error);
  return enrichReports((data ?? []) as ReportRow[]);
}

export async function getPassengerDashboard(profileId: string): Promise<PassengerDashboardData> {
  const [availableDrivers, requests, reports] = await Promise.all([
    listDrivers({
      availabilityStatusIds: [STATUS.AVAILABILITY_ONLINE, STATUS.AVAILABILITY_BUSY],
      approvedOnly: true,
      withLocationOnly: true,
      limit: 20,
    }),
    listPassengerRequests(profileId),
    listReportsForUser(profileId),
  ]);

  return { availableDrivers, requests, reports };
}

export async function getDriverDashboard(profileId: string): Promise<DriverDashboardData> {
  const driver = await getDriverForProfile(profileId);
  const [requests, reports, verification] = await Promise.all([
    driver ? listDriverRequests(driver.id) : Promise.resolve([]),
    listReportsForUser(profileId),
    driver ? getDriverVerification(driver.id) : Promise.resolve(null),
  ]);

  return { driver, requests, reports, verification };
}

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const [
    totalUsers,
    activeDrivers,
    pendingDrivers,
    pendingReports,
    usersResponse,
    drivers,
    reports,
  ] = await Promise.all([
    countRows("profiles"),
    countRows("driver_profiles", (query) =>
      query.eq("verification_status_id", STATUS.VERIFICATION_APPROVED)
    ),
    countRows("driver_profiles", (query) =>
      query.eq("verification_status_id", STATUS.VERIFICATION_PENDING)
    ),
    countRows("reports", (query) =>
      query.in("report_status_id", [STATUS.REPORT_PENDING, STATUS.REPORT_IN_REVIEW])
    ),
    supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
    listDrivers({ limit: 50 }),
    listAdminReports(),
  ]);

  formatError(usersResponse.error);

  return {
    totalUsers,
    activeDrivers,
    pendingDrivers,
    pendingReports,
    users: (usersResponse.data ?? []) as Profile[],
    drivers,
    reports,
  };
}

export async function createTransportRequest(input: {
  destination: RoutePointInput;
  driverProfileId: string;
  passengerId: string;
  passengerNote?: string;
  pickup: RoutePointInput;
}) {
  const [selectedDriver] = await listDrivers({
    driverProfileIds: [input.driverProfileId],
    limit: 1,
  });

  if (!selectedDriver) {
    throw new Error("This driver is no longer available. Choose another nearby driver.");
  }

  if (selectedDriver.verificationStatusId !== STATUS.VERIFICATION_APPROVED) {
    throw new Error("This driver is not approved for requests yet.");
  }

  if (selectedDriver.availabilityStatusId === STATUS.AVAILABILITY_BUSY) {
    throw new Error("This driver is currently busy. Choose another nearby driver.");
  }

  if (selectedDriver.availabilityStatusId !== STATUS.AVAILABILITY_ONLINE) {
    throw new Error("This driver is offline right now. Choose another nearby driver.");
  }

  const { data, error } = await supabase
    .from("transport_requests")
    .insert({
      passenger_id: input.passengerId,
      driver_profile_id: input.driverProfileId,
      pickup_name: input.pickup.name,
      destination_name: input.destination.name,
      pickup_latitude: input.pickup.latitude,
      pickup_longitude: input.pickup.longitude,
      destination_latitude: input.destination.latitude,
      destination_longitude: input.destination.longitude,
      request_status_id: STATUS.REQUEST_PENDING,
      passenger_note: input.passengerNote?.trim() || null,
    })
    .select("*")
    .single();

  formatError(error);

  const match = selectedDriver ? scoreRouteMatch(selectedDriver, input.pickup, input.destination) : null;

  if (selectedDriver) {
    const { error: matchError } = await supabase.from("route_matches").insert({
      request_id: data.id,
      driver_profile_id: input.driverProfileId,
      driver_route_id: selectedDriver.activeRoute?.id ?? null,
      distance_to_pickup_m:
        typeof match?.distanceToPickupKm === "number" ? match.distanceToPickupKm * 1000 : null,
      route_alignment_score: match?.routeAlignmentScore ?? null,
      is_selected: true,
    });

    formatError(matchError);
  }

  const { data: driverProfile } = await supabase
    .from("driver_profiles")
    .select("profile_id")
    .eq("id", input.driverProfileId)
    .maybeSingle();

  if (driverProfile?.profile_id) {
    await supabase.from("notifications").insert({
      recipient_id: driverProfile.profile_id,
      notification_type_id: 1000,
      title: "New ride request",
      body: `${input.pickup.name} to ${input.destination.name}`,
      related_request_id: data.id,
    });
  }

  return data as TransportRequestRow;
}

export async function updateTransportRequestStatus(
  requestId: string,
  statusId: number,
  note?: string
) {
  const patch: Record<string, string | number | null> = {
    request_status_id: statusId,
  };

  if (
    statusId === STATUS.REQUEST_ACCEPTED ||
    statusId === STATUS.REQUEST_REJECTED
  ) {
    patch.responded_at = new Date().toISOString();
    patch.driver_response_note = note?.trim() || null;
  }

  if (statusId === STATUS.REQUEST_COMPLETED) {
    patch.completed_at = new Date().toISOString();
  }

  if (statusId === STATUS.REQUEST_CANCELLED) {
    patch.cancelled_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("transport_requests")
    .update(patch)
    .eq("id", requestId);

  formatError(error);

  if (
    statusId === STATUS.REQUEST_ACCEPTED ||
    statusId === STATUS.REQUEST_COMPLETED ||
    statusId === STATUS.REQUEST_CANCELLED ||
    statusId === STATUS.REQUEST_REJECTED
  ) {
    const { data: requestDriver } = await supabase
      .from("transport_requests")
      .select("driver_profile_id")
      .eq("id", requestId)
      .maybeSingle();

    if (requestDriver?.driver_profile_id) {
      await supabase
        .from("driver_profiles")
        .update({
          availability_status_id:
            statusId === STATUS.REQUEST_ACCEPTED
              ? STATUS.AVAILABILITY_BUSY
              : STATUS.AVAILABILITY_ONLINE,
        })
        .eq("id", requestDriver.driver_profile_id);
    }
  }

  if (statusId === STATUS.REQUEST_ACCEPTED || statusId === STATUS.REQUEST_REJECTED) {
    const { data: request } = await supabase
      .from("transport_requests")
      .select("passenger_id,pickup_name,destination_name")
      .eq("id", requestId)
      .maybeSingle();

    if (request?.passenger_id) {
      await supabase.from("notifications").insert({
        recipient_id: request.passenger_id,
        notification_type_id:
          statusId === STATUS.REQUEST_ACCEPTED ? 2000 : 3000,
        title:
          statusId === STATUS.REQUEST_ACCEPTED
            ? "Request accepted"
            : "Request rejected",
        body: `${request.pickup_name ?? "Pickup"} to ${
          request.destination_name ?? "destination"
        }`,
        related_request_id: requestId,
      });
    }
  }
}

export async function updateDriverAvailability(input: {
  driverProfileId: string;
  availabilityStatusId: number;
  latitude?: number;
  longitude?: number;
}) {
  const patch: Record<string, number | string | null> = {
    availability_status_id: input.availabilityStatusId,
  };

  if (typeof input.latitude === "number" && typeof input.longitude === "number") {
    patch.current_latitude = input.latitude;
    patch.current_longitude = input.longitude;
    patch.last_location_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("driver_profiles")
    .update(patch)
    .eq("id", input.driverProfileId);

  formatError(error);
}

export async function recordDriverLocationUpdate(input: {
  driverProfileId: string;
  heading?: number | null;
  latitude: number;
  longitude: number;
  speed?: number | null;
  transportRequestId?: string | null;
}) {
  const now = new Date().toISOString();

  const { error: profileError } = await supabase
    .from("driver_profiles")
    .update({
      current_latitude: input.latitude,
      current_longitude: input.longitude,
      last_location_at: now,
    })
    .eq("id", input.driverProfileId);

  formatError(profileError);

  const { error } = await supabase.from("location_updates").insert({
    driver_profile_id: input.driverProfileId,
    transport_request_id: input.transportRequestId ?? null,
    latitude: input.latitude,
    longitude: input.longitude,
    speed: input.speed ?? null,
    heading: input.heading ?? null,
    recorded_at: now,
  });

  formatError(error);
}

export async function updateProfile(input: {
  profileId: string;
  fullName: string;
  phone?: string | null;
  city?: string | null;
}) {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: input.fullName.trim(),
      phone: input.phone?.trim() || null,
      city: input.city?.trim() || null,
    })
    .eq("id", input.profileId)
    .select("*")
    .single();

  formatError(error);
  return data as Profile;
}

export async function updateDriverVehicle(input: {
  driverProfileId: string;
  vehicleId?: string | null;
  vehicleTypeId: 1000 | 2000;
  plateNumber?: string | null;
  colour?: string | null;
}) {
  const model =
    input.vehicleTypeId === 1000
      ? "Yellow Taxi"
      : input.colour?.trim()
        ? `Bike colour: ${input.colour.trim()}`
        : null;

  const payload = {
    driver_profile_id: input.driverProfileId,
    vehicle_type_id: input.vehicleTypeId,
    vehicle_status_id: 1000,
    plate_number: input.plateNumber?.trim().toUpperCase() || null,
    model,
  };

  const query = input.vehicleId
    ? supabase.from("vehicles").update(payload).eq("id", input.vehicleId)
    : supabase.from("vehicles").insert(payload);

  const { data, error } = await query.select("*").single();

  formatError(error);
  return data as VehicleRow;
}

export async function updateUserAccountStatus(
  profileId: string,
  accountStatusId: number
) {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      account_status_id: accountStatusId,
    })
    .eq("id", profileId)
    .select("*")
    .single();

  formatError(error);
  return data as Profile;
}

export async function saveDriverRoute(input: {
  destination: RoutePointInput;
  driverProfileId: string;
  routePolyline?: string | null;
  start: RoutePointInput;
}) {
  await supabase
    .from("driver_routes")
    .update({
      route_status_id: STATUS.ROUTE_CLOSED,
      ended_at: new Date().toISOString(),
    })
    .eq("driver_profile_id", input.driverProfileId)
    .eq("route_status_id", STATUS.ROUTE_ACTIVE);

  const { data, error } = await supabase
    .from("driver_routes")
    .insert({
      driver_profile_id: input.driverProfileId,
      start_name: input.start.name.trim(),
      destination_name: input.destination.name.trim(),
      start_latitude: input.start.latitude,
      start_longitude: input.start.longitude,
      destination_latitude: input.destination.latitude,
      destination_longitude: input.destination.longitude,
      route_polyline: input.routePolyline ?? null,
      route_status_id: STATUS.ROUTE_ACTIVE,
    })
    .select("*")
    .single();

  formatError(error);
  return data as DriverRouteRow;
}

export async function updateDriverVerification(
  driverProfileId: string,
  verificationStatusId: number,
  note?: string
) {
  const { error } = await supabase
    .from("driver_profiles")
    .update({
      verification_status_id: verificationStatusId,
      availability_status_id:
        verificationStatusId === STATUS.VERIFICATION_APPROVED
          ? STATUS.AVAILABILITY_OFFLINE
          : STATUS.AVAILABILITY_OFFLINE,
    })
    .eq("id", driverProfileId);

  formatError(error);

  await supabase
    .from("driver_verifications")
    .update({
      verification_status_id: verificationStatusId,
      rejection_reason:
        verificationStatusId === STATUS.VERIFICATION_REJECTED
          ? note?.trim() || "Verification rejected by admin."
          : null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("driver_profile_id", driverProfileId);
}

export async function submitDriverVerification(input: {
  documentUrl: string;
  driverProfileId: string;
}) {
  const cleanDocumentUrl = input.documentUrl.trim();

  if (!cleanDocumentUrl) {
    throw new Error("Add a document link before submitting verification.");
  }

  const { data: existing, error: lookupError } = await supabase
    .from("driver_verifications")
    .select("id")
    .eq("driver_profile_id", input.driverProfileId)
    .limit(1);

  formatError(lookupError);

  const payload = {
    document_url: cleanDocumentUrl,
    verification_status_id: STATUS.VERIFICATION_PENDING,
    rejection_reason: null,
    reviewed_at: null,
    submitted_at: new Date().toISOString(),
  };
  const query = existing?.[0]?.id
    ? supabase
        .from("driver_verifications")
        .update(payload)
        .eq("id", existing[0].id)
    : supabase.from("driver_verifications").insert({
        ...payload,
        driver_profile_id: input.driverProfileId,
      });

  const { error } = await query;
  formatError(error);

  const { error: driverError } = await supabase
    .from("driver_profiles")
    .update({
      verification_status_id: STATUS.VERIFICATION_PENDING,
      availability_status_id: STATUS.AVAILABILITY_OFFLINE,
    })
    .eq("id", input.driverProfileId);

  formatError(driverError);
}

export async function createReport(input: {
  reporterId: string;
  title: string;
  description: string;
  reportTypeId?: number;
  transportRequestId?: string;
  reportedUserId?: string;
}) {
  const { data, error } = await supabase
    .from("reports")
    .insert({
      reporter_id: input.reporterId,
      reported_user_id: input.reportedUserId ?? null,
      transport_request_id: input.transportRequestId ?? null,
      report_type_id: input.reportTypeId ?? 4000,
      report_status_id: STATUS.REPORT_PENDING,
      title: input.title.trim(),
      description: input.description.trim(),
    })
    .select("*")
    .single();

  formatError(error);
  return data as ReportRow;
}

export async function updateReportStatus(
  reportId: string,
  statusId: number,
  adminId: string,
  note?: string
) {
  const { error } = await supabase
    .from("reports")
    .update({
      report_status_id: statusId,
      resolved_by: adminId,
      resolved_at: new Date().toISOString(),
      resolution_note: note?.trim() || null,
    })
    .eq("id", reportId);

  formatError(error);
}

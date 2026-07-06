import { useCallback, useEffect, useState } from "react";
import type { DependencyList, ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Location from "expo-location";
import {
  AlertTriangle,
  Bike,
  Car,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Edit3,
  FileText,
  Info,
  Navigation,
  Phone,
  RadioTower,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";

import { RouteMap } from "../../components/maps/RouteMap";
import { colors } from "../../constants/colors";
import { useAuth } from "../../context/AuthContext";
import {
  createReport,
  createTransportRequest,
  getAdminDashboard,
  getDriverDashboard,
  getPassengerDashboard,
  PLACES,
  saveDriverRoute,
  STATUS,
  updateDriverAvailability,
  updateDriverVerification,
  updateDriverVehicle,
  updateProfile,
  updateUserAccountStatus,
  updateReportStatus,
  updateTransportRequestStatus,
} from "../../services/app/appService";
import type {
  DriverSummary,
  ReportSummary,
  TransportRequestSummary,
} from "../../services/app/appService";
import type { Profile } from "../../types/auth";

type ResourceState<T> = {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
};

function useAsyncResource<T>(
  loader: () => Promise<T>,
  deps: DependencyList
): ResourceState<T> & { refresh: () => Promise<void> } {
  const [state, setState] = useState<ResourceState<T>>({
    data: null,
    error: null,
    isLoading: true,
    isRefreshing: false,
  });

  const refresh = useCallback(async () => {
    setState((current) => ({
      ...current,
      error: null,
      isRefreshing: Boolean(current.data),
      isLoading: !current.data,
    }));

    try {
      const data = await loader();
      setState({
        data,
        error: null,
        isLoading: false,
        isRefreshing: false,
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Unable to load data.",
        isLoading: false,
        isRefreshing: false,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}

function firstName(name?: string | null) {
  return name?.split(" ")[0] || "there";
}

function formatShortDate(value?: string | null) {
  if (!value) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getRequestStatus(statusId: number) {
  switch (statusId) {
    case STATUS.REQUEST_ACCEPTED:
      return { label: "Accepted", color: colors.success, bg: "#EAFBF1" };
    case STATUS.REQUEST_REJECTED:
      return { label: "Rejected", color: colors.danger, bg: "#FDECEC" };
    case STATUS.REQUEST_CANCELLED:
      return { label: "Cancelled", color: colors.danger, bg: "#FDECEC" };
    case STATUS.REQUEST_COMPLETED:
      return { label: "Completed", color: colors.success, bg: "#EAFBF1" };
    default:
      return { label: "Pending", color: colors.warning, bg: "#FFF7E8" };
  }
}

function getVerificationStatus(statusId: number) {
  switch (statusId) {
    case STATUS.VERIFICATION_APPROVED:
      return { label: "Approved", color: colors.success, bg: "#EAFBF1" };
    case STATUS.VERIFICATION_REJECTED:
      return { label: "Rejected", color: colors.danger, bg: "#FDECEC" };
    default:
      return { label: "Pending", color: colors.warning, bg: "#FFF7E8" };
  }
}

function getAvailabilityStatus(statusId: number) {
  switch (statusId) {
    case STATUS.AVAILABILITY_ONLINE:
      return { label: "Online", color: colors.success, bg: "#EAFBF1" };
    case STATUS.AVAILABILITY_BUSY:
      return { label: "Busy", color: colors.warning, bg: "#FFF7E8" };
    default:
      return { label: "Offline", color: colors.textSecondary, bg: "#F3F4F6" };
  }
}

function getReportStatus(statusId: number) {
  switch (statusId) {
    case STATUS.REPORT_IN_REVIEW:
      return { label: "In Review", color: colors.warning, bg: "#FFF7E8" };
    case STATUS.REPORT_RESOLVED:
      return { label: "Resolved", color: colors.success, bg: "#EAFBF1" };
    case STATUS.REPORT_DISMISSED:
      return { label: "Dismissed", color: colors.danger, bg: "#FDECEC" };
    default:
      return { label: "Open", color: colors.danger, bg: "#FDECEC" };
  }
}

function getAccountStatus(statusId: number) {
  switch (statusId) {
    case STATUS.ACCOUNT_SUSPENDED:
      return { label: "Suspended", color: colors.warning, bg: "#FFF7E8" };
    case STATUS.ACCOUNT_BLOCKED:
      return { label: "Blocked", color: colors.danger, bg: "#FDECEC" };
    case STATUS.ACCOUNT_INACTIVE:
      return { label: "Inactive", color: colors.textSecondary, bg: "#F3F4F6" };
    default:
      return { label: "Active", color: colors.success, bg: "#EAFBF1" };
  }
}

function roleLabel(roleId: number) {
  if (roleId === STATUS.ROLE_ADMIN) {
    return "Admin";
  }

  if (roleId === STATUS.ROLE_DRIVER) {
    return "Driver";
  }

  return "Passenger";
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function bikeColourFromModel(model?: string | null) {
  return model?.replace(/^Bike colour:\s*/i, "").replace(/^Colour\s*/i, "") || "Blue";
}

const BIKE_COLOURS = [
  { name: "Black", hex: "#1F2937" },
  { name: "Red", hex: "#E74C3C" },
  { name: "Blue", hex: "#007FFF" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Grey", hex: "#9CA3AF" },
  { name: "Green", hex: "#16A34A" },
  { name: "Yellow", hex: "#FACC15" },
  { name: "Orange", hex: "#F97316" },
  { name: "Purple", hex: "#7C3AED" },
  { name: "Brown", hex: "#92400E" },
  { name: "Silver", hex: "#D1D5DB" },
];

function ScreenShell({
  children,
  isRefreshing,
  onRefresh,
  subtitle,
  title,
}: {
  children: ReactNode;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  subtitle: string;
  title: string;
}) {
  return (
    <View className="flex-1 bg-background p-safe">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 116 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={Boolean(isRefreshing)} onRefresh={onRefresh} />
            ) : undefined
          }
          showsVerticalScrollIndicator={false}
        >
          <View className="px-5 pb-4 pt-5">
            <Text className="font-jakarta-bold text-3xl text-text">{title}</Text>
            <Text className="mt-1 font-jakarta text-base text-textSecondary">{subtitle}</Text>
          </View>
          <View className="gap-4 px-5">{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function LoadingState() {
  return (
    <View className="items-center justify-center rounded-2xl border border-divider bg-surface p-8">
      <ActivityIndicator color={colors.primary} />
      <Text className="mt-3 font-jakarta text-sm text-textSecondary">Loading latest data...</Text>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className="rounded-2xl border border-danger bg-danger/10 p-4">
      <Text className="font-jakarta-bold text-base text-danger">Could not load this screen</Text>
      <Text className="mt-1 font-jakarta text-sm text-danger">{message}</Text>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onRetry}
        className="mt-4 h-11 items-center justify-center rounded-xl bg-danger"
      >
        <Text className="font-jakarta-bold text-sm text-white">Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <View className="items-center rounded-2xl border border-divider bg-surface p-6">
      <View className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <Icon color={colors.primary} size={26} />
      </View>
      <Text className="text-center font-jakarta-bold text-base text-text">{title}</Text>
      <Text className="mt-1 text-center font-jakarta text-sm text-textSecondary">
        {description}
      </Text>
    </View>
  );
}

function StatusBadge({
  label,
  color,
  bg,
}: {
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <View className="rounded-full px-3 py-1" style={{ backgroundColor: bg }}>
      <Text className="font-jakarta-bold text-xs" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1 rounded-2xl border border-divider bg-surface p-4">
      <View className="mb-3 h-9 w-9 items-center justify-center rounded-full bg-primary/10">
        <Icon color={colors.primary} size={18} />
      </View>
      <Text className="font-jakarta text-xs text-textSecondary">{label}</Text>
      <Text className="mt-1 font-jakarta-bold text-xl text-text">{value}</Text>
    </View>
  );
}

function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="font-jakarta-bold text-lg text-text">{title}</Text>
      {action}
    </View>
  );
}

function PrimaryButton({
  disabled,
  label,
  loading,
  onPress,
  tone = "primary",
}: {
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
  tone?: "primary" | "danger" | "outline";
}) {
  const isOutline = tone === "outline";
  const bg = tone === "danger" ? colors.danger : colors.primary;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled || loading}
      onPress={onPress}
      className={`h-12 flex-1 items-center justify-center rounded-xl ${
        disabled || loading ? "opacity-50" : ""
      }`}
      style={{
        backgroundColor: isOutline ? "transparent" : bg,
        borderColor: isOutline ? colors.primary : "transparent",
        borderWidth: isOutline ? 1 : 0,
      }}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? colors.primary : "#FFFFFF"} />
      ) : (
        <Text
          className="font-jakarta-bold text-sm"
          style={{ color: isOutline ? colors.primary : "#FFFFFF" }}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function DriverCard({
  driver,
  onViewDetails,
  onRequest,
  requesting,
}: {
  driver: DriverSummary;
  onViewDetails?: () => void;
  onRequest?: () => void;
  requesting?: boolean;
}) {
  const availability = getAvailabilityStatus(driver.availabilityStatusId);

  return (
    <View className="rounded-2xl border border-divider bg-surface p-4">
      <View className="flex-row items-start">
        <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          {driver.vehicleTypeId === 2000 ? (
            <Bike color={colors.primary} size={23} />
          ) : (
            <Car color={colors.primary} size={23} />
          )}
        </View>
        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text className="font-jakarta-bold text-base text-text">{driver.name}</Text>
            <StatusBadge {...availability} />
          </View>
          <Text className="mt-1 font-jakarta text-sm text-textSecondary">
            {driver.vehicleLabel}
            {driver.plateNumber ? ` - ${driver.plateNumber}` : ""}
          </Text>
          <Text className="mt-1 font-jakarta-semibold text-xs text-success">
            {driver.activeRoute
              ? `${driver.activeRoute.start_name ?? "Start"} to ${
                  driver.activeRoute.destination_name ?? "Destination"
                }`
              : "Route not shared yet"}
          </Text>
        </View>
      </View>
      {onRequest || onViewDetails ? (
        <View className="mt-4 flex-row gap-3">
          {onViewDetails ? (
            <PrimaryButton label="View details" onPress={onViewDetails} tone="outline" />
          ) : null}
          {onRequest ? (
            <PrimaryButton label="Send request" loading={requesting} onPress={onRequest} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function DriverDetailPanel({
  driver,
  onClose,
  onRequest,
  requesting,
}: {
  driver: DriverSummary;
  onClose: () => void;
  onRequest: () => void;
  requesting?: boolean;
}) {
  const availability = getAvailabilityStatus(driver.availabilityStatusId);
  const verification = getVerificationStatus(driver.verificationStatusId);

  return (
    <View className="rounded-2xl border border-primary bg-surface p-4">
      <View className="mb-4 flex-row items-start justify-between">
        <View className="flex-row items-center">
          <View className="mr-3 h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            {driver.vehicleTypeId === 2000 ? (
              <Bike color={colors.primary} size={26} />
            ) : (
              <Car color={colors.primary} size={26} />
            )}
          </View>
          <View>
            <Text className="font-jakarta-bold text-lg text-text">{driver.name}</Text>
            <Text className="mt-1 font-jakarta text-sm text-textSecondary">
              {driver.vehicleLabel}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onClose}
          className="h-9 w-9 items-center justify-center rounded-full bg-background"
        >
          <X color={colors.textSecondary} size={18} />
        </TouchableOpacity>
      </View>

      <View className="mb-4 flex-row gap-3">
        <StatusBadge {...verification} />
        <StatusBadge {...availability} />
      </View>

      <View className="gap-3">
        <View className="flex-row items-center rounded-xl bg-background p-3">
          <Phone color={colors.primary} size={18} />
          <Text className="ml-3 flex-1 font-jakarta text-sm text-text">
            {driver.phone ?? "Phone hidden until request is accepted"}
          </Text>
        </View>
        <View className="flex-row items-center rounded-xl bg-background p-3">
          <Info color={colors.primary} size={18} />
          <Text className="ml-3 flex-1 font-jakarta text-sm text-text">
            Plate: {driver.plateNumber ?? "Not provided"}
          </Text>
        </View>
        <View className="flex-row items-center rounded-xl bg-background p-3">
          <Navigation color={colors.primary} size={18} />
          <Text className="ml-3 flex-1 font-jakarta text-sm text-text">
            {driver.activeRoute
              ? `${driver.activeRoute.start_name ?? "Start"} to ${
                  driver.activeRoute.destination_name ?? "Destination"
                }`
              : "Driver has not shared an active route yet"}
          </Text>
        </View>
      </View>

      <View className="mt-4">
        <RouteMap drivers={[driver]} />
      </View>

      <View className="mt-4 flex-row gap-3">
        <PrimaryButton label="Send request" loading={requesting} onPress={onRequest} />
      </View>
    </View>
  );
}

function RequestCard({
  canRespond,
  isUpdating,
  onAccept,
  onCancel,
  onComplete,
  onReject,
  request,
}: {
  canRespond?: boolean;
  isUpdating?: boolean;
  onAccept?: () => void;
  onCancel?: () => void;
  onComplete?: () => void;
  onReject?: () => void;
  request: TransportRequestSummary;
}) {
  const status = getRequestStatus(request.requestStatusId);

  return (
    <View className="rounded-2xl border border-divider bg-surface p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="font-jakarta-bold text-base text-text">
            {request.pickupName} to {request.destinationName}
          </Text>
          <Text className="mt-1 font-jakarta text-sm text-textSecondary">
            {request.driverName} - {request.vehicleLabel}
          </Text>
          <Text className="mt-1 font-jakarta text-xs text-textSecondary">
            {formatShortDate(request.requestedAt)}
          </Text>
        </View>
        <StatusBadge {...status} />
      </View>
      {request.passengerNote ? (
        <Text className="mt-3 rounded-xl bg-background px-3 py-2 font-jakarta text-sm text-text">
          {request.passengerNote}
        </Text>
      ) : null}
      <View className="mt-4 flex-row gap-3">
        {onAccept ? (
          <PrimaryButton
            disabled={!canRespond}
            label="Accept"
            loading={isUpdating}
            onPress={onAccept}
          />
        ) : null}
        {onReject ? (
          <PrimaryButton
            disabled={!canRespond}
            label="Reject"
            loading={isUpdating}
            onPress={onReject}
            tone="danger"
          />
        ) : null}
        {onCancel ? (
          <PrimaryButton
            label="Cancel"
            loading={isUpdating}
            onPress={onCancel}
            tone="danger"
          />
        ) : null}
        {onComplete ? (
          <PrimaryButton
            label="Complete"
            loading={isUpdating}
            onPress={onComplete}
          />
        ) : null}
      </View>
    </View>
  );
}

function ReportCard({
  onDismiss,
  onResolve,
  report,
}: {
  onDismiss?: () => void;
  onResolve?: () => void;
  report: ReportSummary;
}) {
  const status = getReportStatus(report.reportStatusId);

  return (
    <View className="rounded-2xl border border-divider bg-surface p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="font-jakarta-bold text-base text-text">{report.title}</Text>
          <Text className="mt-1 font-jakarta text-sm text-textSecondary">
            By {report.reporterName}
            {report.reportedUserName ? ` about ${report.reportedUserName}` : ""}
          </Text>
        </View>
        <StatusBadge {...status} />
      </View>
      <Text className="mt-3 font-jakarta text-sm text-text">{report.description}</Text>
      <Text className="mt-2 font-jakarta text-xs text-textSecondary">
        {formatShortDate(report.createdAt)}
      </Text>
      {onResolve || onDismiss ? (
        <View className="mt-4 flex-row gap-3">
          {onResolve ? <PrimaryButton label="Resolve" onPress={onResolve} /> : null}
          {onDismiss ? (
            <PrimaryButton label="Dismiss" onPress={onDismiss} tone="outline" />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function VerificationBanner({ driver }: { driver: DriverSummary | null }) {
  if (!driver) {
    return (
      <View className="rounded-2xl border border-danger bg-danger/10 p-4">
        <Text className="font-jakarta-bold text-base text-danger">
          Driver profile not found
        </Text>
        <Text className="mt-1 font-jakarta text-sm text-danger">
          Complete driver registration again or contact the administrator.
        </Text>
      </View>
    );
  }

  const status = getVerificationStatus(driver.verificationStatusId);
  const approved = driver.verificationStatusId === STATUS.VERIFICATION_APPROVED;

  return (
    <View
      className="rounded-2xl border p-4"
      style={{
        backgroundColor: status.bg,
        borderColor: status.color,
      }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          {approved ? (
            <CheckCircle2 color={status.color} size={22} />
          ) : (
            <Clock3 color={status.color} size={22} />
          )}
          <Text className="ml-2 font-jakarta-bold text-base" style={{ color: status.color }}>
            Verification {status.label}
          </Text>
        </View>
        <StatusBadge {...status} />
      </View>
      <Text className="mt-2 font-jakarta text-sm" style={{ color: status.color }}>
        {approved
          ? "You can go online, share routes, and respond to passenger requests."
          : "You can view your dashboard, edit profile details, and submit reports. Going online and accepting requests unlock after admin approval."}
      </Text>
    </View>
  );
}

function ReportComposer({
  onSubmitted,
  reporterId,
}: {
  onSubmitted: () => Promise<void>;
  reporterId: string;
}) {
  const [title, setTitle] = useState("Route issue");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!title.trim() || description.trim().length < 10) {
      Alert.alert("Report details needed", "Add a title and at least 10 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      await createReport({
        reporterId,
        title,
        description,
      });
      setDescription("");
      await onSubmitted();
      Alert.alert("Report submitted", "The administrator can now review this report.");
    } catch (error) {
      Alert.alert("Report failed", error instanceof Error ? error.message : "Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View className="rounded-2xl border border-divider bg-surface p-4">
      <Text className="font-jakarta-bold text-base text-text">Submit a report</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Report type"
        placeholderTextColor={colors.textSecondary}
        className="mt-4 h-12 rounded-xl border border-divider bg-background px-4 font-jakarta text-text"
      />
      <TextInput
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder="Describe what happened"
        placeholderTextColor={colors.textSecondary}
        className="mt-3 min-h-[96px] rounded-xl border border-divider bg-background px-4 py-3 font-jakarta text-text"
        textAlignVertical="top"
      />
      <View className="mt-4 flex-row">
        <PrimaryButton label="Submit report" loading={isSubmitting} onPress={handleSubmit} />
      </View>
    </View>
  );
}

export function PassengerHomeScreen() {
  const navigation = useNavigation<any>();
  const { profile } = useAuth();
  const resource = useAsyncResource(
    () => getPassengerDashboard(profile?.id ?? ""),
    [profile?.id]
  );

  const data = resource.data;
  const activeRequest = data?.requests.find((request) =>
    request.requestStatusId === STATUS.REQUEST_PENDING ||
    request.requestStatusId === STATUS.REQUEST_ACCEPTED
  );

  return (
    <ScreenShell
      title={`Hello, ${firstName(profile?.full_name)}`}
      subtitle="Find nearby taxis and bikes around your route."
      isRefreshing={resource.isRefreshing}
      onRefresh={resource.refresh}
    >
      {resource.isLoading ? <LoadingState /> : null}
      {resource.error ? <ErrorState message={resource.error} onRetry={resource.refresh} /> : null}
      {data ? (
        <>
          <View className="flex-row gap-3">
            <StatCard icon={Car} label="Nearby drivers" value={`${data.availableDrivers.length}`} />
            <StatCard icon={ClipboardList} label="Requests" value={`${data.requests.length}`} />
          </View>
          <RouteMap drivers={data.availableDrivers} />
          {activeRequest ? (
            <RequestCard request={activeRequest} />
          ) : (
            <EmptyState
              icon={Search}
              title="No active request"
              description="Search your pickup and destination to request a route-matched driver."
            />
          )}
          <View className="flex-row">
            <PrimaryButton
              label="Find transport"
              onPress={() => navigation.navigate("PassengerSearch")}
            />
          </View>
        </>
      ) : null}
    </ScreenShell>
  );
}

export function PassengerSearchScreen() {
  const { profile } = useAuth();
  const resource = useAsyncResource(
    () => getPassengerDashboard(profile?.id ?? ""),
    [profile?.id]
  );
  const [pickup, setPickup] = useState<string>(PLACES.pickup.name);
  const [destination, setDestination] = useState<string>(PLACES.destination.name);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<DriverSummary | null>(null);

  async function handleSendRequest(driver: DriverSummary) {
    if (!profile?.id) {
      return;
    }

    if (!pickup.trim() || !destination.trim()) {
      Alert.alert("Route needed", "Enter both pickup and destination.");
      return;
    }

    setSelectedDriverId(driver.id);

    try {
      await createTransportRequest({
        passengerId: profile.id,
        driverProfileId: driver.id,
        pickupName: pickup,
        destinationName: destination,
        passengerNote: "Route-aware request from passenger search.",
      });
      await resource.refresh();
      Alert.alert("Request sent", `${driver.name} can now accept or reject your request.`);
    } catch (error) {
      Alert.alert("Request failed", error instanceof Error ? error.message : "Try again.");
    } finally {
      setSelectedDriverId(null);
    }
  }

  const drivers = resource.data?.availableDrivers ?? [];

  return (
    <ScreenShell
      title="Search"
      subtitle="Set pickup and destination, then choose a matched driver."
      isRefreshing={resource.isRefreshing}
      onRefresh={resource.refresh}
    >
      <View className="rounded-2xl border border-divider bg-surface p-4">
        <Text className="font-jakarta-bold text-base text-text">Where are you going?</Text>
        <TextInput
          value={pickup}
          onChangeText={setPickup}
          placeholder="Pickup"
          placeholderTextColor={colors.textSecondary}
          className="mt-4 h-12 rounded-xl border border-divider bg-background px-4 font-jakarta text-text"
        />
        <TextInput
          value={destination}
          onChangeText={setDestination}
          placeholder="Destination"
          placeholderTextColor={colors.textSecondary}
          className="mt-3 h-12 rounded-xl border border-divider bg-background px-4 font-jakarta text-text"
        />
      </View>
      <RouteMap drivers={drivers} pickupName={pickup} destinationName={destination} />
      {resource.isLoading ? <LoadingState /> : null}
      {resource.error ? <ErrorState message={resource.error} onRetry={resource.refresh} /> : null}
      {selectedDriver ? (
        <DriverDetailPanel
          driver={selectedDriver}
          requesting={selectedDriverId === selectedDriver.id}
          onClose={() => setSelectedDriver(null)}
          onRequest={() => handleSendRequest(selectedDriver)}
        />
      ) : null}
      {drivers.length > 0 ? (
        <>
          <SectionTitle title="Drivers for your route" />
          {drivers.map((driver) => (
            <DriverCard
              key={driver.id}
              driver={driver}
              onViewDetails={() => setSelectedDriver(driver)}
              requesting={selectedDriverId === driver.id}
              onRequest={() => handleSendRequest(driver)}
            />
          ))}
        </>
      ) : (
        <EmptyState
          icon={Car}
          title="No available drivers yet"
          description="Drivers appear here when they are verified, online, and sharing location."
        />
      )}
    </ScreenShell>
  );
}

export function PassengerRequestsScreen() {
  const { profile } = useAuth();
  const resource = useAsyncResource(
    () => getPassengerDashboard(profile?.id ?? ""),
    [profile?.id]
  );
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function updateRequest(requestId: string, statusId: number) {
    setUpdatingId(requestId);

    try {
      await updateTransportRequestStatus(requestId, statusId);
      await resource.refresh();
    } catch (error) {
      Alert.alert("Update failed", error instanceof Error ? error.message : "Try again.");
    } finally {
      setUpdatingId(null);
    }
  }

  const requests = resource.data?.requests ?? [];

  return (
    <ScreenShell
      title="Requests"
      subtitle="Track current and past transport requests."
      isRefreshing={resource.isRefreshing}
      onRefresh={resource.refresh}
    >
      {resource.isLoading ? <LoadingState /> : null}
      {resource.error ? <ErrorState message={resource.error} onRetry={resource.refresh} /> : null}
      {requests.length > 0 ? (
        requests.map((request) => (
          <RequestCard
            key={request.id}
            request={request}
            isUpdating={updatingId === request.id}
            onCancel={
              request.requestStatusId === STATUS.REQUEST_PENDING
                ? () => updateRequest(request.id, STATUS.REQUEST_CANCELLED)
                : undefined
            }
            onComplete={
              request.requestStatusId === STATUS.REQUEST_ACCEPTED
                ? () => updateRequest(request.id, STATUS.REQUEST_COMPLETED)
                : undefined
            }
          />
        ))
      ) : (
        <EmptyState
          icon={ClipboardList}
          title="No requests yet"
          description="Your current and previous transport requests will appear here."
        />
      )}
    </ScreenShell>
  );
}

function UserReportsScreen({ role }: { role: "Passenger" | "Driver" }) {
  const { profile } = useAuth();
  const resource = useAsyncResource(
    () => getPassengerDashboard(profile?.id ?? ""),
    [profile?.id]
  );
  const driverResource = useAsyncResource(
    () => getDriverDashboard(profile?.id ?? ""),
    [profile?.id]
  );

  const reports =
    role === "Driver"
      ? driverResource.data?.reports ?? []
      : resource.data?.reports ?? [];
  const loading = role === "Driver" ? driverResource.isLoading : resource.isLoading;
  const error = role === "Driver" ? driverResource.error : resource.error;
  const refresh = role === "Driver" ? driverResource.refresh : resource.refresh;
  const refreshing =
    role === "Driver" ? driverResource.isRefreshing : resource.isRefreshing;

  return (
    <ScreenShell
      title="Reports"
      subtitle="Submit and follow up on safety or service reports."
      isRefreshing={refreshing}
      onRefresh={refresh}
    >
      {profile?.id ? <ReportComposer reporterId={profile.id} onSubmitted={refresh} /> : null}
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={refresh} /> : null}
      {reports.length > 0 ? (
        reports.map((report) => <ReportCard key={report.id} report={report} />)
      ) : (
        <EmptyState
          icon={ShieldCheck}
          title="No reports submitted"
          description="Reports you submit or receive updates on will appear here."
        />
      )}
    </ScreenShell>
  );
}

export function PassengerReportsScreen() {
  return <UserReportsScreen role="Passenger" />;
}

export function DriverHomeScreen() {
  const { profile } = useAuth();
  const resource = useAsyncResource(
    () => getDriverDashboard(profile?.id ?? ""),
    [profile?.id]
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const driver = resource.data?.driver ?? null;
  const canOperate = driver?.verificationStatusId === STATUS.VERIFICATION_APPROVED;

  async function handleAvailability(statusId: number) {
    if (!driver) {
      return;
    }

    if (!canOperate) {
      Alert.alert(
        "Verification pending",
        "Admin approval is required before you can go online or receive requests."
      );
      return;
    }

    setIsUpdating(true);

    try {
      let latitude: number | undefined;
      let longitude: number | undefined;

      if (statusId === STATUS.AVAILABILITY_ONLINE) {
        const permission = await Location.requestForegroundPermissionsAsync();

        if (permission.status !== "granted") {
          Alert.alert("Location needed", "Enable location to share your position.");
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        latitude = location.coords.latitude;
        longitude = location.coords.longitude;
      }

      await updateDriverAvailability({
        driverProfileId: driver.id,
        availabilityStatusId: statusId,
        latitude,
        longitude,
      });
      await resource.refresh();
    } catch (error) {
      Alert.alert("Availability update failed", error instanceof Error ? error.message : "Try again.");
    } finally {
      setIsUpdating(false);
    }
  }

  const pendingRequests =
    resource.data?.requests.filter(
      (request) => request.requestStatusId === STATUS.REQUEST_PENDING
    ) ?? [];

  return (
    <ScreenShell
      title={`Good morning, ${firstName(profile?.full_name)}`}
      subtitle="Manage availability, route status, and incoming requests."
      isRefreshing={resource.isRefreshing}
      onRefresh={resource.refresh}
    >
      {resource.isLoading ? <LoadingState /> : null}
      {resource.error ? <ErrorState message={resource.error} onRetry={resource.refresh} /> : null}
      <VerificationBanner driver={driver} />
      {driver ? (
        <>
          <View className="flex-row gap-3">
            <StatCard icon={ClipboardList} label="Requests" value={`${pendingRequests.length}`} />
            <StatCard
              icon={RadioTower}
              label="Availability"
              value={getAvailabilityStatus(driver.availabilityStatusId).label}
            />
          </View>
          <RouteMap drivers={[driver]} />
          <View className="rounded-2xl border border-divider bg-surface p-4">
            <SectionTitle title="Availability" />
            <View className="mt-4 flex-row gap-3">
              <PrimaryButton
                disabled={!canOperate}
                label="Go online"
                loading={isUpdating}
                onPress={() => handleAvailability(STATUS.AVAILABILITY_ONLINE)}
              />
              <PrimaryButton
                disabled={!canOperate}
                label="Go offline"
                loading={isUpdating}
                onPress={() => handleAvailability(STATUS.AVAILABILITY_OFFLINE)}
                tone="outline"
              />
            </View>
          </View>
        </>
      ) : null}
    </ScreenShell>
  );
}

export function DriverRouteScreen() {
  const { profile } = useAuth();
  const resource = useAsyncResource(
    () => getDriverDashboard(profile?.id ?? ""),
    [profile?.id]
  );
  const driver = resource.data?.driver ?? null;
  const canOperate = driver?.verificationStatusId === STATUS.VERIFICATION_APPROVED;
  const [startName, setStartName] = useState<string>(PLACES.pickup.name);
  const [destinationName, setDestinationName] = useState<string>(PLACES.destination.name);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (driver?.activeRoute) {
      setStartName(driver.activeRoute.start_name ?? PLACES.pickup.name);
      setDestinationName(driver.activeRoute.destination_name ?? PLACES.destination.name);
    }
  }, [driver?.activeRoute]);

  async function handleSaveRoute() {
    if (!driver) {
      return;
    }

    if (!canOperate) {
      Alert.alert("Verification pending", "Routes can be activated after admin approval.");
      return;
    }

    if (!startName.trim() || !destinationName.trim()) {
      Alert.alert("Route needed", "Enter both start and destination.");
      return;
    }

    setIsSaving(true);

    try {
      await saveDriverRoute({
        driverProfileId: driver.id,
        startName,
        destinationName,
      });
      await resource.refresh();
      Alert.alert("Route active", "Passengers can now match with this route.");
    } catch (error) {
      Alert.alert("Route save failed", error instanceof Error ? error.message : "Try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScreenShell
      title="My Route"
      subtitle="Share your intended route for passenger matching."
      isRefreshing={resource.isRefreshing}
      onRefresh={resource.refresh}
    >
      {resource.isLoading ? <LoadingState /> : null}
      {resource.error ? <ErrorState message={resource.error} onRetry={resource.refresh} /> : null}
      <VerificationBanner driver={driver} />
      <View className="rounded-2xl border border-divider bg-surface p-4">
        <Text className="font-jakarta-bold text-base text-text">Create new route</Text>
        <TextInput
          value={startName}
          onChangeText={setStartName}
          placeholder="Start location"
          placeholderTextColor={colors.textSecondary}
          className="mt-4 h-12 rounded-xl border border-divider bg-background px-4 font-jakarta text-text"
        />
        <TextInput
          value={destinationName}
          onChangeText={setDestinationName}
          placeholder="Destination"
          placeholderTextColor={colors.textSecondary}
          className="mt-3 h-12 rounded-xl border border-divider bg-background px-4 font-jakarta text-text"
        />
        <View className="mt-4 flex-row">
          <PrimaryButton
            disabled={!canOperate}
            label="Save route"
            loading={isSaving}
            onPress={handleSaveRoute}
          />
        </View>
      </View>
      <RouteMap drivers={driver ? [driver] : []} pickupName={startName} destinationName={destinationName} />
      {driver?.activeRoute ? (
        <View className="rounded-2xl border border-divider bg-surface p-4">
          <SectionTitle title="Active route" />
          <Text className="mt-3 font-jakarta-bold text-lg text-text">
            {driver.activeRoute.start_name} to {driver.activeRoute.destination_name}
          </Text>
          <Text className="mt-1 font-jakarta text-sm text-textSecondary">
            Started {formatShortDate(driver.activeRoute.started_at)}
          </Text>
        </View>
      ) : (
        <EmptyState
          icon={Navigation}
          title="No active route"
          description="Approved drivers can add a route so passengers can match by itinerary."
        />
      )}
    </ScreenShell>
  );
}

export function DriverRequestsScreen() {
  const { profile } = useAuth();
  const resource = useAsyncResource(
    () => getDriverDashboard(profile?.id ?? ""),
    [profile?.id]
  );
  const driver = resource.data?.driver ?? null;
  const canRespond = driver?.verificationStatusId === STATUS.VERIFICATION_APPROVED;
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function respond(requestId: string, statusId: number) {
    setUpdatingId(requestId);

    try {
      await updateTransportRequestStatus(requestId, statusId);
      await resource.refresh();
    } catch (error) {
      Alert.alert("Request update failed", error instanceof Error ? error.message : "Try again.");
    } finally {
      setUpdatingId(null);
    }
  }

  const requests = resource.data?.requests ?? [];

  return (
    <ScreenShell
      title="Requests"
      subtitle="Accept or reject passenger requests for your route."
      isRefreshing={resource.isRefreshing}
      onRefresh={resource.refresh}
    >
      {resource.isLoading ? <LoadingState /> : null}
      {resource.error ? <ErrorState message={resource.error} onRetry={resource.refresh} /> : null}
      <VerificationBanner driver={driver} />
      {requests.length > 0 ? (
        requests.map((request) => (
          <RequestCard
            key={request.id}
            request={request}
            canRespond={canRespond && request.requestStatusId === STATUS.REQUEST_PENDING}
            isUpdating={updatingId === request.id}
            onAccept={
              request.requestStatusId === STATUS.REQUEST_PENDING
                ? () => respond(request.id, STATUS.REQUEST_ACCEPTED)
                : undefined
            }
            onReject={
              request.requestStatusId === STATUS.REQUEST_PENDING
                ? () => respond(request.id, STATUS.REQUEST_REJECTED)
                : undefined
            }
          />
        ))
      ) : (
        <EmptyState
          icon={ClipboardList}
          title="No requests right now"
          description="Incoming passenger requests will appear here."
        />
      )}
    </ScreenShell>
  );
}

export function DriverReportsScreen() {
  return <UserReportsScreen role="Driver" />;
}

export function AdminDashboardScreen() {
  const resource = useAsyncResource(getAdminDashboard, []);
  const data = resource.data;

  return (
    <ScreenShell
      title="Dashboard"
      subtitle="Monitor users, drivers, reports, and system activity."
      isRefreshing={resource.isRefreshing}
      onRefresh={resource.refresh}
    >
      {resource.isLoading ? <LoadingState /> : null}
      {resource.error ? <ErrorState message={resource.error} onRetry={resource.refresh} /> : null}
      {data ? (
        <>
          <View className="flex-row gap-3">
            <StatCard icon={Users} label="Users" value={`${data.totalUsers}`} />
            <StatCard icon={Car} label="Active drivers" value={`${data.activeDrivers}`} />
          </View>
          <View className="flex-row gap-3">
            <StatCard icon={Clock3} label="Pending drivers" value={`${data.pendingDrivers}`} />
            <StatCard icon={AlertTriangle} label="Pending reports" value={`${data.pendingReports}`} />
          </View>
          <SectionTitle title="Recent reports" />
          {data.reports.slice(0, 3).map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </>
      ) : null}
    </ScreenShell>
  );
}

export function AdminUsersScreen() {
  const { profile } = useAuth();
  const resource = useAsyncResource(getAdminDashboard, []);
  const users = resource.data?.users ?? [];
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "passengers" | "drivers" | "admins">("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filteredUsers = users.filter((user) => {
    const matchesQuery =
      !query.trim() ||
      user.full_name.toLowerCase().includes(query.trim().toLowerCase()) ||
      user.phone?.toLowerCase().includes(query.trim().toLowerCase()) ||
      user.city?.toLowerCase().includes(query.trim().toLowerCase());

    const matchesRole =
      roleFilter === "all" ||
      (roleFilter === "passengers" && user.role_id === STATUS.ROLE_PASSENGER) ||
      (roleFilter === "drivers" && user.role_id === STATUS.ROLE_DRIVER) ||
      (roleFilter === "admins" && user.role_id === STATUS.ROLE_ADMIN);

    return matchesQuery && matchesRole;
  });

  async function handleAccountStatus(user: Profile, statusId: number) {
    if (user.id === profile?.id && statusId !== STATUS.ACCOUNT_ACTIVE) {
      Alert.alert("Action blocked", "You cannot restrict your own admin account.");
      return;
    }

    setUpdatingId(user.id);

    try {
      await updateUserAccountStatus(user.id, statusId);
      await resource.refresh();
    } catch (error) {
      Alert.alert("Account update failed", error instanceof Error ? error.message : "Try again.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <ScreenShell
      title="Users"
      subtitle="Search, review, activate, suspend, or block platform accounts."
      isRefreshing={resource.isRefreshing}
      onRefresh={resource.refresh}
    >
      <View className="rounded-2xl border border-divider bg-surface p-4">
        <Text className="font-jakarta-bold text-base text-text">Find user</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, phone, or city"
          placeholderTextColor={colors.textSecondary}
          className="mt-3 h-12 rounded-xl border border-divider bg-background px-4 font-jakarta text-text"
        />
        <View className="mt-3 flex-row flex-wrap gap-2">
          {[
            ["all", "All"],
            ["passengers", "Passengers"],
            ["drivers", "Drivers"],
            ["admins", "Admins"],
          ].map(([value, label]) => {
            const active = roleFilter === value;

            return (
              <TouchableOpacity
                key={value}
                activeOpacity={0.8}
                onPress={() => setRoleFilter(value as typeof roleFilter)}
                className={`rounded-full px-3 py-2 ${active ? "bg-primary" : "bg-background"}`}
              >
                <Text
                  className={`font-jakarta-bold text-xs ${
                    active ? "text-white" : "text-textSecondary"
                  }`}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {resource.isLoading ? <LoadingState /> : null}
      {resource.error ? <ErrorState message={resource.error} onRetry={resource.refresh} /> : null}
      {filteredUsers.length > 0 ? (
        filteredUsers.map((user) => {
          const selected = selectedUserId === user.id;
          const accountStatus = getAccountStatus(user.account_status_id);
          const updating = updatingId === user.id;

          return (
          <View key={user.id} className="rounded-2xl border border-divider bg-surface p-4">
            <View className="flex-row items-center">
              <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <UserRound color={colors.primary} size={23} />
              </View>
              <View className="flex-1">
                <Text className="font-jakarta-bold text-base text-text">{user.full_name}</Text>
                <Text className="mt-1 font-jakarta text-sm text-textSecondary">
                  {user.phone ?? "No phone"} -{" "}
                  {roleLabel(user.role_id)}
                </Text>
              </View>
              <StatusBadge {...accountStatus} />
            </View>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setSelectedUserId(selected ? null : user.id)}
              className="mt-4 h-11 items-center justify-center rounded-xl bg-background"
            >
              <Text className="font-jakarta-bold text-sm text-primary">
                {selected ? "Hide details" : "View / manage"}
              </Text>
            </TouchableOpacity>
            {selected ? (
              <View className="mt-4 gap-3">
                <View className="rounded-xl bg-background p-3">
                  <Text className="font-jakarta text-xs text-textSecondary">Account ID</Text>
                  <Text selectable className="mt-1 font-jakarta text-xs text-text">
                    {user.id}
                  </Text>
                </View>
                <View className="flex-row gap-3">
                  <View className="flex-1 rounded-xl bg-background p-3">
                    <Text className="font-jakarta text-xs text-textSecondary">Role</Text>
                    <Text className="mt-1 font-jakarta-bold text-sm text-text">
                      {roleLabel(user.role_id)}
                    </Text>
                  </View>
                  <View className="flex-1 rounded-xl bg-background p-3">
                    <Text className="font-jakarta text-xs text-textSecondary">City</Text>
                    <Text className="mt-1 font-jakarta-bold text-sm text-text">
                      {user.city ?? "Not provided"}
                    </Text>
                  </View>
                </View>
                <View className="flex-row gap-2">
                  <PrimaryButton
                    disabled={user.account_status_id === STATUS.ACCOUNT_ACTIVE}
                    label="Activate"
                    loading={updating}
                    onPress={() => handleAccountStatus(user, STATUS.ACCOUNT_ACTIVE)}
                  />
                  <PrimaryButton
                    disabled={user.account_status_id === STATUS.ACCOUNT_SUSPENDED}
                    label="Suspend"
                    loading={updating}
                    onPress={() => handleAccountStatus(user, STATUS.ACCOUNT_SUSPENDED)}
                    tone="outline"
                  />
                </View>
                <View className="flex-row gap-2">
                  <PrimaryButton
                    disabled={user.account_status_id === STATUS.ACCOUNT_BLOCKED}
                    label="Block"
                    loading={updating}
                    onPress={() => handleAccountStatus(user, STATUS.ACCOUNT_BLOCKED)}
                    tone="danger"
                  />
                </View>
              </View>
            ) : null}
          </View>
          );
        })
      ) : (
        <EmptyState
          icon={Users}
          title="No users found"
          description="Registered accounts matching your search will appear here."
        />
      )}
    </ScreenShell>
  );
}

export function AdminDriversScreen() {
  const resource = useAsyncResource(getAdminDashboard, []);
  const drivers = resource.data?.drivers ?? [];
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function updateVerification(driverId: string, statusId: number) {
    setUpdatingId(driverId);

    try {
      await updateDriverVerification(driverId, statusId);
      await resource.refresh();
    } catch (error) {
      Alert.alert("Verification update failed", error instanceof Error ? error.message : "Try again.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <ScreenShell
      title="Drivers"
      subtitle="Approve drivers and review vehicle/route readiness."
      isRefreshing={resource.isRefreshing}
      onRefresh={resource.refresh}
    >
      {resource.isLoading ? <LoadingState /> : null}
      {resource.error ? <ErrorState message={resource.error} onRetry={resource.refresh} /> : null}
      {drivers.length > 0 ? (
        drivers.map((driver) => {
          const status = getVerificationStatus(driver.verificationStatusId);

          return (
            <View key={driver.id} className="rounded-2xl border border-divider bg-surface p-4">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="font-jakarta-bold text-base text-text">{driver.name}</Text>
                  <Text className="mt-1 font-jakarta text-sm text-textSecondary">
                    {driver.vehicleLabel}
                    {driver.plateNumber ? ` - ${driver.plateNumber}` : ""}
                  </Text>
                  <Text className="mt-1 font-jakarta text-xs text-textSecondary">
                    {driver.activeRoute
                      ? `${driver.activeRoute.start_name} to ${driver.activeRoute.destination_name}`
                      : "No active route"}
                  </Text>
                </View>
                <StatusBadge {...status} />
              </View>
              <View className="mt-4 flex-row gap-3">
                <PrimaryButton
                  disabled={driver.verificationStatusId === STATUS.VERIFICATION_APPROVED}
                  label="Approve"
                  loading={updatingId === driver.id}
                  onPress={() => updateVerification(driver.id, STATUS.VERIFICATION_APPROVED)}
                />
                <PrimaryButton
                  disabled={driver.verificationStatusId === STATUS.VERIFICATION_REJECTED}
                  label="Reject"
                  loading={updatingId === driver.id}
                  onPress={() => updateVerification(driver.id, STATUS.VERIFICATION_REJECTED)}
                  tone="danger"
                />
              </View>
            </View>
          );
        })
      ) : (
        <EmptyState
          icon={Car}
          title="No driver profiles"
          description="Driver registrations will appear here for verification."
        />
      )}
    </ScreenShell>
  );
}

export function AdminReportsScreen() {
  const { profile } = useAuth();
  const resource = useAsyncResource(getAdminDashboard, []);
  const reports = resource.data?.reports ?? [];
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function handleReport(reportId: string, statusId: number) {
    if (!profile?.id) {
      return;
    }

    setUpdatingId(reportId);

    try {
      await updateReportStatus(reportId, statusId, profile.id);
      await resource.refresh();
    } catch (error) {
      Alert.alert("Report update failed", error instanceof Error ? error.message : "Try again.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <ScreenShell
      title="Reports"
      subtitle="Resolve, dismiss, or monitor submitted complaints."
      isRefreshing={resource.isRefreshing}
      onRefresh={resource.refresh}
    >
      {resource.isLoading ? <LoadingState /> : null}
      {resource.error ? <ErrorState message={resource.error} onRetry={resource.refresh} /> : null}
      {reports.length > 0 ? (
        reports.map((report) => (
          <View key={report.id} className={updatingId === report.id ? "opacity-60" : ""}>
            <ReportCard
              report={report}
              onResolve={() => handleReport(report.id, STATUS.REPORT_RESOLVED)}
              onDismiss={() => handleReport(report.id, STATUS.REPORT_DISMISSED)}
            />
          </View>
        ))
      ) : (
        <EmptyState
          icon={FileText}
          title="No reports pending"
          description="Submitted reports and safety issues will appear here."
        />
      )}
    </ScreenShell>
  );
}

export function ProfileScreen() {
  const { profile, logout, isLoading, refreshProfile } = useAuth();
  const driverResource = useAsyncResource(
    () =>
      profile?.role_id === STATUS.ROLE_DRIVER
        ? getDriverDashboard(profile?.id ?? "")
        : Promise.resolve({ driver: null, requests: [], reports: [] }),
    [profile?.id, profile?.role_id]
  );
  const driver = driverResource.data?.driver ?? null;
  const role =
    profile?.role_id === STATUS.ROLE_ADMIN
      ? "Administrator"
      : profile?.role_id === STATUS.ROLE_DRIVER
        ? "Driver"
        : "Passenger";
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [city, setCity] = useState(profile?.city ?? "");
  const [vehicleTypeId, setVehicleTypeId] = useState<1000 | 2000>(1000);
  const [plateNumber, setPlateNumber] = useState("");
  const [bikeColour, setBikeColour] = useState("Blue");

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
    setCity(profile?.city ?? "");
  }, [profile?.city, profile?.full_name, profile?.phone]);

  useEffect(() => {
    if (!driver) {
      return;
    }

    setVehicleTypeId(driver.vehicleTypeId === 2000 ? 2000 : 1000);
    setPlateNumber(driver.plateNumber ?? "");
    setBikeColour(bikeColourFromModel(driver.vehicleModel));
  }, [driver]);

  async function handleSaveProfile() {
    if (!profile?.id) {
      return;
    }

    const cleanName = fullName.trim();
    const cleanPhone = normalizePhone(phone);

    if (cleanName.length < 3) {
      Alert.alert("Name needed", "Enter at least 3 characters for your full name.");
      return;
    }

    if (cleanPhone && cleanPhone.length !== 9) {
      Alert.alert("Phone number invalid", "Use a valid 9-digit Cameroon phone number.");
      return;
    }

    setSaving(true);

    try {
      await updateProfile({
        profileId: profile.id,
        fullName: cleanName,
        phone: cleanPhone || null,
        city,
      });

      if (driver) {
        await updateDriverVehicle({
          driverProfileId: driver.id,
          vehicleId: driver.vehicleId,
          vehicleTypeId,
          plateNumber,
          colour: vehicleTypeId === 2000 ? bikeColour : null,
        });
        await driverResource.refresh();
      }

      await refreshProfile();
      setEditing(false);
      Alert.alert("Profile updated", "Your account details have been saved.");
    } catch (error) {
      Alert.alert("Profile update failed", error instanceof Error ? error.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenShell title="Profile" subtitle="Manage account details and app preferences.">
      <View className="rounded-2xl border border-divider bg-surface p-5">
        <View className="flex-row items-center">
          <View className="mr-4 h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <UserRound color={colors.primary} size={30} />
          </View>
          <View className="flex-1">
            <Text className="font-jakarta-bold text-lg text-text">
              {profile?.full_name ?? "TransTrak user"}
            </Text>
            <Text className="mt-1 font-jakarta text-sm text-textSecondary">
              {profile?.phone ?? "Phone not added"}
            </Text>
          </View>
        </View>
        <View className="mt-5 flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-background p-4">
            <Text className="font-jakarta text-sm text-textSecondary">Role</Text>
            <Text className="mt-1 font-jakarta-semibold text-base text-text">{role}</Text>
          </View>
          <View className="flex-1 rounded-2xl bg-background p-4">
            <Text className="font-jakarta text-sm text-textSecondary">City</Text>
            <Text className="mt-1 font-jakarta-semibold text-base text-text">
              {profile?.city ?? "Not set"}
            </Text>
          </View>
        </View>
      </View>

      <View className="rounded-2xl border border-divider bg-surface p-4">
        <SectionTitle
          title="Profile management"
          action={
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setEditing((current) => !current)}
              className="h-9 w-9 items-center justify-center rounded-full bg-primary/10"
            >
              {editing ? (
                <X color={colors.primary} size={18} />
              ) : (
                <Edit3 color={colors.primary} size={18} />
              )}
            </TouchableOpacity>
          }
        />
        {editing ? (
          <View className="mt-4">
            <Text className="mb-1.5 font-jakarta-semibold text-sm text-text">Full name</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Full name"
              placeholderTextColor={colors.textSecondary}
              className="mb-4 h-12 rounded-xl border border-divider bg-background px-4 font-jakarta text-text"
            />

            <Text className="mb-1.5 font-jakarta-semibold text-sm text-text">Phone number</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="6 XX XX XX XX"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
              className="mb-4 h-12 rounded-xl border border-divider bg-background px-4 font-jakarta text-text"
            />

            <Text className="mb-1.5 font-jakarta-semibold text-sm text-text">City</Text>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="Buea"
              placeholderTextColor={colors.textSecondary}
              className="h-12 rounded-xl border border-divider bg-background px-4 font-jakarta text-text"
            />

            {driver ? (
              <View className="mt-5 rounded-2xl bg-background p-4">
                <Text className="mb-3 font-jakarta-bold text-base text-text">Vehicle details</Text>
                <View className="mb-4 flex-row gap-3">
                  <PrimaryButton
                    label="Taxi"
                    onPress={() => setVehicleTypeId(1000)}
                    tone={vehicleTypeId === 1000 ? "primary" : "outline"}
                  />
                  <PrimaryButton
                    label="Bike"
                    onPress={() => setVehicleTypeId(2000)}
                    tone={vehicleTypeId === 2000 ? "primary" : "outline"}
                  />
                </View>
                <Text className="mb-1.5 font-jakarta-semibold text-sm text-text">
                  Plate number
                </Text>
                <TextInput
                  value={plateNumber}
                  onChangeText={setPlateNumber}
                  placeholder="CE 1234 AB"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="characters"
                  className="mb-4 h-12 rounded-xl border border-divider bg-surface px-4 font-jakarta text-text"
                />
                {vehicleTypeId === 1000 ? (
                  <View className="rounded-xl border border-warning bg-warning/10 p-3">
                    <Text className="font-jakarta-semibold text-sm text-text">
                      Taxi colour is fixed as yellow.
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text className="mb-2 font-jakarta-semibold text-sm text-text">
                      Bike colour
                    </Text>
                    <View className="flex-row flex-wrap gap-3">
                      {BIKE_COLOURS.map((colour) => {
                        const selected = colour.name === bikeColour;

                        return (
                          <TouchableOpacity
                            key={colour.name}
                            activeOpacity={0.8}
                            onPress={() => setBikeColour(colour.name)}
                            className="h-10 w-10 rounded-full"
                            style={{
                              backgroundColor: colour.hex,
                              borderColor: selected ? colors.primary : colors.divider,
                              borderWidth: selected ? 3 : 1,
                            }}
                          />
                        );
                      })}
                    </View>
                  </>
                )}
              </View>
            ) : null}

            <View className="mt-5 flex-row gap-3">
              <PrimaryButton label="Save changes" loading={saving} onPress={handleSaveProfile} />
              <PrimaryButton
                label="Cancel"
                disabled={saving}
                onPress={() => setEditing(false)}
                tone="outline"
              />
            </View>
          </View>
        ) : (
          <View className="mt-4 gap-3">
            <View className="rounded-xl bg-background p-3">
              <Text className="font-jakarta text-xs text-textSecondary">Full name</Text>
              <Text className="mt-1 font-jakarta-semibold text-sm text-text">
                {profile?.full_name ?? "Not set"}
              </Text>
            </View>
            <View className="rounded-xl bg-background p-3">
              <Text className="font-jakarta text-xs text-textSecondary">Phone</Text>
              <Text className="mt-1 font-jakarta-semibold text-sm text-text">
                {profile?.phone ?? "Not set"}
              </Text>
            </View>
            {driver ? (
              <View className="rounded-xl bg-background p-3">
                <Text className="font-jakarta text-xs text-textSecondary">Vehicle</Text>
                <Text className="mt-1 font-jakarta-semibold text-sm text-text">
                  {driver.vehicleLabel}
                  {driver.plateNumber ? ` - ${driver.plateNumber}` : ""}
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </View>

      <View className="rounded-2xl border border-divider bg-surface p-4">
        <SectionTitle title="Account actions" />
        <View className="mt-4 flex-row">
          <PrimaryButton
            label={isLoading ? "Logging out..." : "Log out"}
            loading={isLoading}
            onPress={logout}
            tone="danger"
          />
        </View>
      </View>
    </ScreenShell>
  );
}

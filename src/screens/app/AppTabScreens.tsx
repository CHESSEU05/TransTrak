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
import {
  AlertTriangle,
  Bike,
  Car,
  ChevronRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Edit3,
  FileText,
  FileUp,
  HelpCircle,
  Info,
  LocateFixed,
  LockKeyhole,
  MapPin,
  Navigation,
  Phone,
  RadioTower,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  ScrollText,
  UserRound,
  Users,
  X,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RouteMap } from "../../components/maps/RouteMap";
import { colors } from "../../constants/colors";
import { useAuth } from "../../context/AuthContext";
import {
  createReport,
  createTransportRequest,
  getAdminDashboard,
  getDriverDashboard,
  getPassengerDashboard,
  listRouteMatchedDrivers,
  recordDriverLocationUpdate,
  REPORT_TYPES,
  saveDriverRoute,
  STATUS,
  submitDriverVerification,
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
  DriverVerificationSummary,
  RoutePointInput,
  ReportSummary,
  TransportRequestSummary,
} from "../../services/app/appService";
import {
  computeRouteMetrics,
  decodeRoutePolyline,
  geocodeAddress,
  getPlaceDetails,
  isGooglePlacesConfigured,
  type RouteMetrics,
  searchPlacePredictions,
} from "../../services/location/googlePlacesService";
import { getCurrentDevicePlace, type PlaceSelection } from "../../services/location/locationService";
import { supabase } from "../../services/supabase/client";
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

function useRealtimeRefresh(topics: (string | null | undefined)[], refresh: () => Promise<void>) {
  const uniqueTopics = Array.from(new Set(topics.filter((topic): topic is string => Boolean(topic))));
  const topicKey = uniqueTopics.join("|");

  useEffect(() => {
    if (uniqueTopics.length === 0) {
      return undefined;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    const channels = uniqueTopics.map((topic) =>
      supabase
        .channel(topic, { config: { private: true } })
        .on("broadcast", { event: "*" }, () => {
          if (timer) {
            clearTimeout(timer);
          }

          timer = setTimeout(() => {
            refresh();
          }, 250);
        })
        .subscribe()
    );

    return () => {
      if (timer) {
        clearTimeout(timer);
      }

      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, topicKey]);
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
      return { label: "Accepted", color: colors.success, bg: colors.successSoft };
    case STATUS.REQUEST_REJECTED:
      return { label: "Rejected", color: colors.danger, bg: colors.dangerSoft };
    case STATUS.REQUEST_CANCELLED:
      return { label: "Cancelled", color: colors.danger, bg: colors.dangerSoft };
    case STATUS.REQUEST_COMPLETED:
      return { label: "Completed", color: colors.success, bg: colors.successSoft };
    default:
      return { label: "Pending", color: colors.warning, bg: colors.warningSoft };
  }
}

function getVerificationStatus(statusId: number) {
  switch (statusId) {
    case STATUS.VERIFICATION_APPROVED:
      return { label: "Approved", color: colors.success, bg: colors.successSoft };
    case STATUS.VERIFICATION_REJECTED:
      return { label: "Rejected", color: colors.danger, bg: colors.dangerSoft };
    default:
      return { label: "Pending", color: colors.warning, bg: colors.warningSoft };
  }
}

function getAvailabilityStatus(statusId: number) {
  switch (statusId) {
    case STATUS.AVAILABILITY_ONLINE:
      return { label: "Online", color: colors.success, bg: colors.successSoft };
    case STATUS.AVAILABILITY_BUSY:
      return { label: "Busy", color: colors.warning, bg: colors.warningSoft };
    default:
      return { label: "Offline", color: colors.textSecondary, bg: "#F3F4F6" };
  }
}

function getReportStatus(statusId: number) {
  switch (statusId) {
    case STATUS.REPORT_IN_REVIEW:
      return { label: "In Review", color: colors.warning, bg: colors.warningSoft };
    case STATUS.REPORT_RESOLVED:
      return { label: "Resolved", color: colors.success, bg: colors.successSoft };
    case STATUS.REPORT_DISMISSED:
      return { label: "Dismissed", color: colors.danger, bg: colors.dangerSoft };
    default:
      return { label: "Open", color: colors.danger, bg: colors.dangerSoft };
  }
}

function getAccountStatus(statusId: number) {
  switch (statusId) {
    case STATUS.ACCOUNT_SUSPENDED:
      return { label: "Suspended", color: colors.warning, bg: colors.warningSoft };
    case STATUS.ACCOUNT_BLOCKED:
      return { label: "Blocked", color: colors.danger, bg: colors.dangerSoft };
    case STATUS.ACCOUNT_INACTIVE:
      return { label: "Inactive", color: colors.textSecondary, bg: "#F3F4F6" };
    default:
      return { label: "Active", color: colors.success, bg: colors.successSoft };
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

function reportTypeLabel(typeId: number) {
  return REPORT_TYPES.find((type) => type.id === typeId)?.label ?? "Other concern";
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

function toRoutePoint(place: PlaceSelection): RoutePointInput {
  return {
    latitude: place.latitude,
    longitude: place.longitude,
    name: place.name,
  };
}

function toCoordinate(place?: PlaceSelection | null) {
  return place
    ? {
        latitude: place.latitude,
        longitude: place.longitude,
      }
    : null;
}

function routeCoordinatesFromPolyline(polyline?: string | null) {
  if (!polyline) {
    return [];
  }

  try {
    return decodeRoutePolyline(polyline);
  } catch {
    return [];
  }
}

function formatDistanceMeters(value?: number | null) {
  if (!value) {
    return "--";
  }

  return value >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${Math.round(value)} m`;
}

function formatDurationSeconds(value?: number | null) {
  if (!value) {
    return "--";
  }

  const minutes = Math.max(1, Math.round(value / 60));

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function RouteMetricsCard({ metrics }: { metrics: RouteMetrics | null }) {
  if (!metrics) {
    return null;
  }

  return (
    <View className="gap-3 rounded-2xl border border-primary/20 bg-primarySoft p-3">
      <View className="flex-row items-center justify-between">
        <Text className="font-jakarta-bold text-sm text-primary">Google route preview</Text>
        <StatusBadge bg={colors.infoSoft} color={colors.info} label="Traffic-aware" />
      </View>
      <View className="flex-row gap-3">
      <View className="flex-1 rounded-xl bg-surface p-3">
        <Text className="font-jakarta text-xs text-textSecondary">Distance</Text>
        <Text className="mt-1 font-jakarta-bold text-base text-text">
          {formatDistanceMeters(metrics.distanceMeters)}
        </Text>
      </View>
      <View className="flex-1 rounded-xl bg-surface p-3">
        <Text className="font-jakarta text-xs text-textSecondary">ETA</Text>
        <Text className="mt-1 font-jakarta-bold text-base text-text">
          {formatDurationSeconds(metrics.durationSeconds)}
        </Text>
      </View>
      </View>
    </View>
  );
}

function MapLegend() {
  const items = [
    { label: "Pickup", color: colors.success },
    { label: "Destination", color: colors.primary },
    { label: "Taxi", color: colors.taxi },
    { label: "Bike", color: colors.bike },
    { label: "Busy", color: colors.warning },
  ];

  return (
    <View className="flex-row flex-wrap gap-2 rounded-2xl border border-divider bg-surface px-3 py-3">
      {items.map((item) => (
        <View key={item.label} className="flex-row items-center rounded-full bg-background px-3 py-2">
          <View
            className="mr-2 h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <Text className="font-jakarta-bold text-xs text-textSecondary">{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function friendlyAppError(error: unknown, fallback = "Something went wrong. Please try again.") {
  const message = error instanceof Error ? error.message : fallback;
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "The email or password is not correct. Please check both and try again.";
  }

  if (normalized.includes("network request failed") || normalized.includes("failed to fetch")) {
    return "We could not reach the server. Check your internet connection and try again.";
  }

  if (normalized.includes("row-level security") || normalized.includes("permission denied")) {
    return "This action is not allowed for your current account status.";
  }

  return message || fallback;
}

function InlineNotice({
  message,
  tone = "info",
}: {
  message: string;
  tone?: "danger" | "info" | "success" | "warning";
}) {
  const palette = {
    danger: { bg: colors.dangerSoft, border: colors.danger, icon: colors.danger },
    info: { bg: colors.primarySoft, border: colors.primary, icon: colors.primary },
    success: { bg: colors.successSoft, border: colors.success, icon: colors.success },
    warning: { bg: colors.warningSoft, border: colors.warning, icon: colors.warning },
  }[tone];

  return (
    <View
      className="flex-row items-start rounded-2xl border p-3"
      style={{ backgroundColor: palette.bg, borderColor: palette.border }}
    >
      <Info color={palette.icon} size={18} />
      <Text className="ml-2 flex-1 font-jakarta text-sm text-text">{message}</Text>
    </View>
  );
}

function LocationCard({
  loading,
  message,
  onRefresh,
  place,
}: {
  loading?: boolean;
  message?: string | null;
  onRefresh: () => void;
  place?: PlaceSelection | null;
}) {
  return (
    <View className="rounded-2xl border border-divider bg-surface p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-success/10">
            <MapPin color={colors.success} size={19} />
          </View>
          <View className="flex-1">
            <Text className="font-jakarta-bold text-base text-text">Current location</Text>
            <Text className="mt-1 font-jakarta text-sm text-textSecondary">
              {place?.name ?? message ?? "Share location to show nearby transport."}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onRefresh}
          className="h-10 w-10 items-center justify-center rounded-full bg-primary/10"
        >
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <LocateFixed color={colors.primary} size={19} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function useCurrentLocationOnDemand() {
  const [place, setPlace] = useState<PlaceSelection | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async (requestPermission = true) => {
    setLoading(true);

    try {
      const result = await getCurrentDevicePlace({ requestPermission });

      if (result.status === "granted") {
        setPlace(result.place);
        setMessage(null);
      } else {
        setMessage(result.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh(false);
  }, [refresh]);

  return { loading, message, place, refresh };
}

function PlaceInput({
  label,
  onChangeText,
  onSelect,
  onUseCurrentLocation,
  placeholder,
  selected,
  value,
}: {
  label: string;
  onChangeText?: (value: string) => void;
  onSelect: (place: PlaceSelection, typedValue: string) => void;
  onUseCurrentLocation?: () => Promise<void>;
  placeholder: string;
  selected?: boolean;
  value: string;
}) {
  const [text, setText] = useState(value);
  const [predictions, setPredictions] = useState<
    { description: string; id: string; name: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(value);
  }, [value]);

  useEffect(() => {
    let cancelled = false;

    async function loadPredictions() {
      if (!text.trim() || (selected && text.trim() === value.trim())) {
        setPredictions([]);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextPredictions = await searchPlacePredictions(text);

        if (!cancelled) {
          setPredictions(nextPredictions);
        }
      } catch (predictionError) {
        if (!cancelled) {
          setError(friendlyAppError(predictionError));
          setPredictions([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    const timer = setTimeout(loadPredictions, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [selected, text, value]);

  async function selectPrediction(placeId: string) {
    setLoading(true);
    setError(null);

    try {
      const place = await getPlaceDetails(placeId);
      setText(place.name);
      setPredictions([]);
      onSelect(place, place.name);
    } catch (selectionError) {
      setError(friendlyAppError(selectionError));
    } finally {
      setLoading(false);
    }
  }

  async function resolveTypedAddress() {
    setLoading(true);
    setError(null);

    try {
      const place = await geocodeAddress(text);
      setText(place.name);
      setPredictions([]);
      onSelect(place, place.name);
    } catch (geocodeError) {
      setError(friendlyAppError(geocodeError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      <View className="flex-row items-center justify-between">
        <Text className="font-jakarta-semibold text-sm text-text">{label}</Text>
        {loading ? <ActivityIndicator color={colors.primary} /> : null}
      </View>
      <TextInput
        value={text}
        onChangeText={(nextText) => {
          setText(nextText);
          setError(null);
          onChangeText?.(nextText);
        }}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        className={`mt-2 h-12 rounded-xl border bg-background px-4 font-jakarta text-text ${
          selected ? "border-success" : "border-divider"
        }`}
      />
      <View className="mt-2 flex-row flex-wrap gap-2">
        {selected ? (
          <View className="flex-row items-center rounded-full bg-success/10 px-3 py-2">
            <CheckCircle2 color={colors.success} size={15} />
            <Text className="ml-1 font-jakarta-bold text-xs text-success">Mapped</Text>
          </View>
        ) : null}
        {onUseCurrentLocation ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onUseCurrentLocation}
            className="flex-row items-center rounded-full bg-success/10 px-3 py-2"
          >
            <LocateFixed color={colors.success} size={15} />
            <Text className="ml-1 font-jakarta-bold text-xs text-success">Use current</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={resolveTypedAddress}
          className="flex-row items-center rounded-full bg-accentSoft px-3 py-2"
        >
          <Search color={colors.primary} size={15} />
          <Text className="ml-1 font-jakarta-bold text-xs text-primary">Find address</Text>
        </TouchableOpacity>
      </View>
      {!isGooglePlacesConfigured() ? (
        <Text className="mt-2 font-jakarta text-xs text-warning">
          Google Maps key is missing, so suggestions are disabled until the key is configured.
        </Text>
      ) : null}
      {error ? <Text className="mt-2 font-jakarta text-xs text-danger">{error}</Text> : null}
      {predictions.length > 0 ? (
        <View className="mt-2 overflow-hidden rounded-xl border border-divider bg-surface">
          {predictions.map((prediction) => (
            <TouchableOpacity
              key={prediction.id}
              activeOpacity={0.8}
              onPress={() => selectPrediction(prediction.id)}
              className="border-b border-divider px-3 py-3"
            >
              <View className="flex-row items-start">
                <View className="mr-2 mt-0.5 h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                  <MapPin color={colors.primary} size={14} />
                </View>
                <View className="flex-1">
                  <Text className="font-jakarta-bold text-sm text-text">{prediction.name}</Text>
                  <Text className="mt-0.5 font-jakarta text-xs text-textSecondary">
                    {prediction.description}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

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
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background p-safe">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 166, 190) }}
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
  tone = "primary",
  value,
}: {
  icon: LucideIcon;
  label: string;
  tone?: "primary" | "success" | "warning" | "danger" | "info" | "violet";
  value: string;
}) {
  const palette = {
    danger: { color: colors.danger, bg: colors.dangerSoft },
    info: { color: colors.info, bg: colors.infoSoft },
    primary: { color: colors.primary, bg: colors.primarySoft },
    success: { color: colors.success, bg: colors.successSoft },
    violet: { color: colors.violet, bg: colors.violetSoft },
    warning: { color: colors.warning, bg: colors.warningSoft },
  }[tone];

  return (
    <View className="flex-1 rounded-2xl border border-divider bg-surface p-4">
      <View
        className="mb-3 h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: palette.bg }}
      >
        <Icon color={palette.color} size={18} />
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
  tone?: "primary" | "danger" | "outline" | "warning";
}) {
  const isOutline = tone === "outline";
  const bg =
    tone === "danger" ? colors.danger : tone === "warning" ? colors.warning : colors.primary;

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
  canRequest = true,
  driver,
  onViewDetails,
  onRequest,
  requesting,
}: {
  canRequest?: boolean;
  driver: DriverSummary;
  onViewDetails?: () => void;
  onRequest?: () => void;
  requesting?: boolean;
}) {
  const availability = getAvailabilityStatus(driver.availabilityStatusId);
  const busy = driver.availabilityStatusId === STATUS.AVAILABILITY_BUSY;

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
          {typeof driver.distanceToPickupKm === "number" ? (
            <Text className="mt-1 font-jakarta text-xs text-textSecondary">
              {driver.distanceToPickupKm.toFixed(1)} km from pickup
              {typeof driver.routeAlignmentScore === "number"
                ? ` - ${driver.routeAlignmentScore.toFixed(0)}% route match`
                : ""}
            </Text>
          ) : null}
          {busy ? (
            <Text className="mt-1 font-jakarta-bold text-xs text-warning">
              Nearby but busy right now
            </Text>
          ) : null}
        </View>
      </View>
      {onRequest || onViewDetails ? (
        <View className="mt-4 flex-row gap-3">
          {onViewDetails ? (
            <PrimaryButton label="View details" onPress={onViewDetails} tone="outline" />
          ) : null}
          {onRequest ? (
            <PrimaryButton
              disabled={!canRequest || busy}
              label={busy ? "Busy" : "Send request"}
              loading={requesting}
              onPress={onRequest}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function DriverDetailPanel({
  canRequest = true,
  driver,
  onClose,
  onRequest,
  requesting,
}: {
  canRequest?: boolean;
  driver: DriverSummary;
  onClose: () => void;
  onRequest: () => void;
  requesting?: boolean;
}) {
  const availability = getAvailabilityStatus(driver.availabilityStatusId);
  const verification = getVerificationStatus(driver.verificationStatusId);
  const busy = driver.availabilityStatusId === STATUS.AVAILABILITY_BUSY;

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
        <RouteMap
          destination={
            driver.activeRoute
              ? {
                  latitude: driver.activeRoute.destination_latitude,
                  longitude: driver.activeRoute.destination_longitude,
                }
              : null
          }
          destinationName={driver.activeRoute?.destination_name ?? "Destination"}
          drivers={[driver]}
          pickup={
            driver.activeRoute
              ? {
                  latitude: driver.activeRoute.start_latitude,
                  longitude: driver.activeRoute.start_longitude,
                }
              : null
          }
          pickupName={driver.activeRoute?.start_name ?? "Pickup"}
          routeCoordinates={routeCoordinatesFromPolyline(driver.activeRoute?.route_polyline)}
        />
      </View>

      <View className="mt-4 flex-row gap-3">
        <PrimaryButton
          disabled={!canRequest || busy}
          label={busy ? "Driver busy" : "Send request"}
          loading={requesting}
          onPress={onRequest}
        />
      </View>
    </View>
  );
}

function RequestRouteMap({
  drivers,
  request,
}: {
  drivers: DriverSummary[];
  request: TransportRequestSummary;
}) {
  const [routeCoordinates, setRouteCoordinates] = useState<RouteMetrics["coordinates"]>([]);

  const pickup = {
    latitude: request.pickupLatitude,
    longitude: request.pickupLongitude,
  };
  const destination = {
    latitude: request.destinationLatitude,
    longitude: request.destinationLongitude,
  };

  useEffect(() => {
    let cancelled = false;

    async function loadRoute() {
      try {
        const metrics = await computeRouteMetrics({
          origin: pickup,
          destination,
        });

        if (!cancelled) {
          setRouteCoordinates(metrics?.coordinates ?? []);
        }
      } catch {
        if (!cancelled) {
          setRouteCoordinates([]);
        }
      }
    }

    loadRoute();

    return () => {
      cancelled = true;
    };
  }, [
    destination.latitude,
    destination.longitude,
    pickup.latitude,
    pickup.longitude,
  ]);

  return (
    <RouteMap
      destination={destination}
      destinationName={request.destinationName}
      drivers={drivers}
      pickup={pickup}
      pickupName={request.pickupName}
      routeCoordinates={routeCoordinates}
    />
  );
}

function RequestCard({
  canRespond,
  isUpdating,
  onAccept,
  onCancel,
  onComplete,
  onReject,
  onShareLocation,
  request,
}: {
  canRespond?: boolean;
  isUpdating?: boolean;
  onAccept?: () => void;
  onCancel?: () => void;
  onComplete?: () => void;
  onReject?: () => void;
  onShareLocation?: () => void;
  request: TransportRequestSummary;
}) {
  const status = getRequestStatus(request.requestStatusId);
  const mapDriver =
    request.driverProfileId &&
    typeof request.driverCurrentLatitude === "number" &&
    typeof request.driverCurrentLongitude === "number"
      ? ({
          id: request.driverProfileId,
          profileId: request.driverProfileId,
          name: request.driverName,
          phone: null,
          avatarUrl: null,
          availabilityStatusId: STATUS.AVAILABILITY_ONLINE,
          verificationStatusId: STATUS.VERIFICATION_APPROVED,
          currentLatitude: request.driverCurrentLatitude,
          currentLongitude: request.driverCurrentLongitude,
          lastLocationAt: null,
          vehicleId: null,
          vehicleTypeId: request.vehicleTypeId,
          vehicleStatusId: null,
          vehicleModel: null,
          vehicleLabel: request.vehicleLabel,
          plateNumber: request.plateNumber,
          activeRoute: null,
        } satisfies DriverSummary)
      : null;

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
      {request.requestStatusId === STATUS.REQUEST_ACCEPTED ||
      request.requestStatusId === STATUS.REQUEST_PENDING ? (
        <View className="mt-4">
          <RequestRouteMap request={request} drivers={mapDriver ? [mapDriver] : []} />
        </View>
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
        {onShareLocation ? (
          <PrimaryButton
            label="Share location"
            loading={isUpdating}
            onPress={onShareLocation}
            tone="outline"
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
      <View className="mt-3 flex-row flex-wrap gap-2">
        <StatusBadge
          bg={colors.primarySoft}
          color={colors.primary}
          label={reportTypeLabel(report.reportTypeId)}
        />
        {report.transportRequestId ? (
          <StatusBadge bg={colors.accentSoft} color={colors.accent} label="Trip linked" />
        ) : null}
      </View>
      <Text className="mt-2 font-jakarta text-xs text-textSecondary">
        {formatShortDate(report.createdAt)}
      </Text>
      {report.resolutionNote ? (
        <View className="mt-3 rounded-xl bg-successSoft p-3">
          <Text className="font-jakarta-bold text-xs text-success">Admin resolution</Text>
          <Text className="mt-1 font-jakarta text-sm text-text">{report.resolutionNote}</Text>
          {report.resolvedAt ? (
            <Text className="mt-1 font-jakarta text-xs text-textSecondary">
              {formatShortDate(report.resolvedAt)}
            </Text>
          ) : null}
        </View>
      ) : null}
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

function DriverVerificationPanel({
  driver,
  onSubmitted,
  verification,
}: {
  driver: DriverSummary | null;
  onSubmitted: () => Promise<void>;
  verification: DriverVerificationSummary | null;
}) {
  const [documentUrl, setDocumentUrl] = useState(verification?.documentUrl ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setDocumentUrl(verification?.documentUrl ?? "");
  }, [verification?.documentUrl]);

  if (!driver) {
    return null;
  }

  const status = getVerificationStatus(verification?.statusId ?? driver.verificationStatusId);

  async function handleSubmit() {
    if (!driver) {
      return;
    }

    if (!documentUrl.trim()) {
      Alert.alert("Document needed", "Add a public document link for admin verification.");
      return;
    }

    setIsSubmitting(true);

    try {
      await submitDriverVerification({
        driverProfileId: driver.id,
        documentUrl,
      });
      await onSubmitted();
      Alert.alert("Verification submitted", "The administrator can now review your document.");
    } catch (error) {
      Alert.alert("Verification failed", friendlyAppError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View className="rounded-2xl border border-divider bg-surface p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 flex-row pr-3">
          <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <FileUp color={colors.primary} size={19} />
          </View>
          <View className="flex-1">
            <Text className="font-jakarta-bold text-base text-text">Driver verification</Text>
            <Text className="mt-1 font-jakarta text-sm text-textSecondary">
              Submit your license, ID card, or vehicle document link for admin approval.
            </Text>
          </View>
        </View>
        <StatusBadge {...status} />
      </View>

      {verification?.rejectionReason ? (
        <View className="mt-3">
          <InlineNotice message={verification.rejectionReason} tone="danger" />
        </View>
      ) : null}

      {verification?.reviewedAt ? (
        <Text className="mt-3 font-jakarta text-xs text-textSecondary">
          Last reviewed {formatShortDate(verification.reviewedAt)}
        </Text>
      ) : null}

      <Text className="mt-4 font-jakarta-semibold text-sm text-text">Document URL</Text>
      <TextInput
        value={documentUrl}
        onChangeText={setDocumentUrl}
        placeholder="https://..."
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        keyboardType="url"
        className="mt-2 h-12 rounded-xl border border-divider bg-background px-4 font-jakarta text-text"
      />
      <View className="mt-4 flex-row gap-3">
        <PrimaryButton
          label={verification?.documentUrl ? "Resubmit" : "Submit"}
          loading={isSubmitting}
          onPress={handleSubmit}
        />
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onSubmitted}
          className="h-12 w-12 items-center justify-center rounded-xl bg-primary/10"
        >
          <RefreshCw color={colors.primary} size={19} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ReportComposer({
  onSubmitted,
  reporterId,
  requests,
  role,
}: {
  onSubmitted: () => Promise<void>;
  reporterId: string;
  requests: TransportRequestSummary[];
  role: "Passenger" | "Driver";
}) {
  const [title, setTitle] = useState("Route issue");
  const [description, setDescription] = useState("");
  const [reportTypeId, setReportTypeId] = useState<number>(REPORT_TYPES[0].id);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedRequest = requests.find((request) => request.id === selectedRequestId) ?? null;
  const reportedUserId =
    role === "Passenger"
      ? selectedRequest?.driverProfileUserId ?? null
      : selectedRequest?.passengerId ?? null;

  async function handleSubmit() {
    if (!title.trim() || description.trim().length < 10) {
      Alert.alert("Report details needed", "Add a title and at least 10 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      await createReport({
        reporterId,
        reportedUserId: reportedUserId ?? undefined,
        reportTypeId,
        transportRequestId: selectedRequest?.id,
        title,
        description,
      });
      setDescription("");
      setSelectedRequestId(null);
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
      <Text className="mt-4 font-jakarta-semibold text-sm text-text">Report type</Text>
      <View className="mt-2 flex-row flex-wrap gap-2">
        {REPORT_TYPES.map((type) => {
          const selected = reportTypeId === type.id;

          return (
            <TouchableOpacity
              key={type.id}
              activeOpacity={0.8}
              onPress={() => {
                setReportTypeId(type.id);
                setTitle(type.label);
              }}
              className={`rounded-full px-3 py-2 ${selected ? "bg-primary" : "bg-background"}`}
            >
              <Text
                className={`font-jakarta-bold text-xs ${
                  selected ? "text-white" : "text-textSecondary"
                }`}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Short title"
        placeholderTextColor={colors.textSecondary}
        className="mt-4 h-12 rounded-xl border border-divider bg-background px-4 font-jakarta text-text"
      />
      <Text className="mt-4 font-jakarta-semibold text-sm text-text">
        Related transport request
      </Text>
      <View className="mt-2 gap-2">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setSelectedRequestId(null)}
          className={`rounded-xl border px-3 py-3 ${
            selectedRequestId === null ? "border-primary bg-primarySoft" : "border-divider bg-background"
          }`}
        >
          <Text className="font-jakarta-bold text-sm text-text">No related request</Text>
          <Text className="mt-0.5 font-jakarta text-xs text-textSecondary">
            Use this for account, platform, or general safety reports.
          </Text>
        </TouchableOpacity>
        {requests.slice(0, 5).map((request) => {
          const selected = selectedRequestId === request.id;

          return (
            <TouchableOpacity
              key={request.id}
              activeOpacity={0.8}
              onPress={() => setSelectedRequestId(request.id)}
              className={`rounded-xl border px-3 py-3 ${
                selected ? "border-primary bg-primarySoft" : "border-divider bg-background"
              }`}
            >
              <Text className="font-jakarta-bold text-sm text-text">
                {request.pickupName} to {request.destinationName}
              </Text>
              <Text className="mt-0.5 font-jakarta text-xs text-textSecondary">
                {role === "Passenger"
                  ? `Driver: ${request.driverName}`
                  : `Passenger: ${request.passengerName}`}{" "}
                - {formatShortDate(request.requestedAt)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {selectedRequest ? (
        <InlineNotice
          message={
            reportedUserId
              ? "This report will be linked to the selected request and associated user."
              : "This report will be linked to the selected request. The related user is not available yet."
          }
          tone={reportedUserId ? "success" : "warning"}
        />
      ) : null}
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
  const currentLocation = useCurrentLocationOnDemand();
  const resource = useAsyncResource(
    () => getPassengerDashboard(profile?.id ?? ""),
    [profile?.id]
  );

  const data = resource.data;
  const activeRequest = data?.requests.find((request) =>
    request.requestStatusId === STATUS.REQUEST_PENDING ||
    request.requestStatusId === STATUS.REQUEST_ACCEPTED
  );
  useRealtimeRefresh(
    [
      "drivers:available",
      profile?.id ? `user:${profile.id}` : null,
      activeRequest ? `request:${activeRequest.id}` : null,
    ],
    resource.refresh
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
          <LocationCard
            loading={currentLocation.loading}
            message={currentLocation.message}
            onRefresh={() => currentLocation.refresh(true)}
            place={currentLocation.place}
          />
          <View className="flex-row gap-3">
            <StatCard
              icon={Car}
              label="Nearby drivers"
              tone="success"
              value={`${data.availableDrivers.length}`}
            />
            <StatCard
              icon={ClipboardList}
              label="Requests"
              tone="info"
              value={`${data.requests.length}`}
            />
          </View>
          <RouteMap
            drivers={data.availableDrivers}
            pickup={
              currentLocation.place
                ? {
                    latitude: currentLocation.place.latitude,
                    longitude: currentLocation.place.longitude,
                  }
                : null
            }
            pickupName={currentLocation.place?.name ?? "Current location"}
          />
          <MapLegend />
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
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [pickupPlace, setPickupPlace] = useState<PlaceSelection | null>(null);
  const [destinationPlace, setDestinationPlace] = useState<PlaceSelection | null>(null);
  const [drivers, setDrivers] = useState<DriverSummary[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [routeMetrics, setRouteMetrics] = useState<RouteMetrics | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<DriverSummary | null>(null);
  useRealtimeRefresh(["drivers:available"], resource.refresh);

  useEffect(() => {
    let cancelled = false;

    async function loadMatches() {
      if (!pickupPlace || !destinationPlace) {
        setDrivers([]);
        setRouteMetrics(null);
        setMatchError(null);
        return;
      }

      setIsMatching(true);
      setMatchError(null);

      try {
        const metrics = await computeRouteMetrics({
          origin: toRoutePoint(pickupPlace),
          destination: toRoutePoint(destinationPlace),
        });
        const matchedDrivers = await listRouteMatchedDrivers({
          pickup: toRoutePoint(pickupPlace),
          destination: toRoutePoint(destinationPlace),
          limit: 12,
        });

        if (!cancelled) {
          setRouteMetrics(metrics);
          setDrivers(matchedDrivers);
        }
      } catch (error) {
        if (!cancelled) {
          setDrivers([]);
          setMatchError(friendlyAppError(error));
        }
      } finally {
        if (!cancelled) {
          setIsMatching(false);
        }
      }
    }

    loadMatches();
    return () => {
      cancelled = true;
    };
  }, [destinationPlace, pickupPlace]);

  async function useCurrentPickup() {
    const result = await getCurrentDevicePlace({ requestPermission: true });

    if (result.status !== "granted") {
      Alert.alert("Location needed", result.message);
      return;
    }

    setPickupPlace(result.place);
    setPickup(result.place.name);
  }

  async function handleSendRequest(driver: DriverSummary) {
    if (!profile?.id) {
      return;
    }

    if (!pickupPlace || !destinationPlace) {
      Alert.alert(
        "Mapped route needed",
        "Choose a pickup and destination from Google Maps or use Find address before sending a request."
      );
      return;
    }

    if (driver.availabilityStatusId === STATUS.AVAILABILITY_BUSY) {
      Alert.alert("Driver busy", "This driver is nearby but currently handling another trip.");
      return;
    }

    setSelectedDriverId(driver.id);

    try {
      await createTransportRequest({
        passengerId: profile.id,
        driverProfileId: driver.id,
        pickup: toRoutePoint(pickupPlace),
        destination: toRoutePoint(destinationPlace),
        passengerNote: routeMetrics
          ? `Route-aware request. Estimated trip: ${formatDistanceMeters(
              routeMetrics.distanceMeters
            )}, ${formatDurationSeconds(routeMetrics.durationSeconds)}.`
          : "Route-aware request from passenger search.",
      });
      await resource.refresh();
      Alert.alert("Request sent", `${driver.name} can now accept or reject your request.`);
    } catch (error) {
      Alert.alert("Request failed", error instanceof Error ? error.message : "Try again.");
    } finally {
      setSelectedDriverId(null);
    }
  }

  return (
    <ScreenShell
      title="Search"
      subtitle="Set pickup and destination, then choose a matched driver."
      isRefreshing={resource.isRefreshing}
      onRefresh={resource.refresh}
    >
      <View className="rounded-2xl border border-divider bg-surface p-4">
        <Text className="font-jakarta-bold text-base text-text">Where are you going?</Text>
        <View className="mt-4 gap-4">
          <PlaceInput
            label="Pickup"
            onChangeText={(value) => {
              setPickup(value);
              setPickupPlace(null);
              setDrivers([]);
            }}
            onSelect={(place, typedValue) => {
              setPickupPlace(place);
              setPickup(typedValue);
            }}
            onUseCurrentLocation={useCurrentPickup}
            placeholder="Pickup location"
            selected={Boolean(pickupPlace)}
            value={pickup}
          />
          <PlaceInput
            label="Destination"
            onChangeText={(value) => {
              setDestination(value);
              setDestinationPlace(null);
              setDrivers([]);
            }}
            onSelect={(place, typedValue) => {
              setDestinationPlace(place);
              setDestination(typedValue);
            }}
            placeholder="Where are you going?"
            selected={Boolean(destinationPlace)}
            value={destination}
          />
        </View>
        <InlineNotice
          message="Drivers are shown only after both places are mapped, then sorted by route alignment and distance to pickup."
          tone="info"
        />
      </View>
      <RouteMap
        destination={
          destinationPlace
            ? {
                latitude: destinationPlace.latitude,
                longitude: destinationPlace.longitude,
              }
            : null
        }
        destinationName={destinationPlace?.name ?? (destination || "Destination")}
        drivers={drivers}
        pickup={toCoordinate(pickupPlace)}
        pickupName={pickupPlace?.name ?? (pickup || "Pickup")}
        routeCoordinates={routeMetrics?.coordinates ?? []}
      />
      <MapLegend />
      <RouteMetricsCard metrics={routeMetrics} />
      {resource.isLoading ? <LoadingState /> : null}
      {resource.error ? <ErrorState message={resource.error} onRetry={resource.refresh} /> : null}
      {isMatching ? <LoadingState /> : null}
      {matchError ? <ErrorState message={matchError} onRetry={resource.refresh} /> : null}
      {selectedDriver ? (
        <DriverDetailPanel
          canRequest={selectedDriver.availabilityStatusId === STATUS.AVAILABILITY_ONLINE}
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
              canRequest={driver.availabilityStatusId === STATUS.AVAILABILITY_ONLINE}
              requesting={selectedDriverId === driver.id}
              onRequest={() => handleSendRequest(driver)}
            />
          ))}
        </>
      ) : (
        <EmptyState
          icon={Car}
          title={pickupPlace && destinationPlace ? "No route-matched drivers yet" : "Map your route"}
          description={
            pickupPlace && destinationPlace
              ? "No verified online driver currently matches this pickup and destination."
              : "Choose a pickup and destination to find drivers whose route can serve you."
          }
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
  useRealtimeRefresh(
    [
      profile?.id ? `user:${profile.id}` : null,
      ...requests
        .filter((request) =>
          request.requestStatusId === STATUS.REQUEST_PENDING ||
          request.requestStatusId === STATUS.REQUEST_ACCEPTED
        )
        .map((request) => `request:${request.id}`),
    ],
    resource.refresh
  );

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
  useRealtimeRefresh(
    [
      profile?.id ? `user:${profile.id}` : null,
      ...reports.map((report) => `report:${report.id}`),
    ],
    refresh
  );

  return (
    <ScreenShell
      title="Reports"
      subtitle="Submit and follow up on safety or service reports."
      isRefreshing={refreshing}
      onRefresh={refresh}
    >
      {profile?.id ? (
        <ReportComposer
          reporterId={profile.id}
          requests={role === "Driver" ? driverResource.data?.requests ?? [] : resource.data?.requests ?? []}
          role={role}
          onSubmitted={refresh}
        />
      ) : null}
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
  const acceptedRequest = resource.data?.requests.find(
    (request) => request.requestStatusId === STATUS.REQUEST_ACCEPTED
  );
  useRealtimeRefresh(
    [
      profile?.id ? `user:${profile.id}` : null,
      driver ? `driver:${driver.id}` : null,
      acceptedRequest ? `request:${acceptedRequest.id}` : null,
    ],
    resource.refresh
  );

  async function handleAvailability(statusId: number) {
    if (!driver) {
      return;
    }

    if (!canOperate) {
      Alert.alert(
        "Verification pending",
        "Admin approval is required before you can go online, mark busy, or receive requests."
      );
      return;
    }

    setIsUpdating(true);

    try {
      let latitude: number | undefined;
      let longitude: number | undefined;

      if (
        statusId === STATUS.AVAILABILITY_ONLINE ||
        statusId === STATUS.AVAILABILITY_BUSY
      ) {
        const result = await getCurrentDevicePlace({ requestPermission: true });

        if (result.status !== "granted") {
          Alert.alert("Location needed", result.message);
          return;
        }

        latitude = result.place.latitude;
        longitude = result.place.longitude;
      }

      await updateDriverAvailability({
        driverProfileId: driver.id,
        availabilityStatusId: statusId,
        latitude,
        longitude,
      });

      if (typeof latitude === "number" && typeof longitude === "number") {
        await recordDriverLocationUpdate({
          driverProfileId: driver.id,
          latitude,
          longitude,
          transportRequestId: acceptedRequest?.id ?? null,
        });
      }

      await resource.refresh();
    } catch (error) {
      Alert.alert("Availability update failed", friendlyAppError(error));
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
            <StatCard
              icon={ClipboardList}
              label="Requests"
              tone="violet"
              value={`${pendingRequests.length}`}
            />
            <StatCard
              icon={RadioTower}
              label="Availability"
              tone={
                driver.availabilityStatusId === STATUS.AVAILABILITY_BUSY
                  ? "warning"
                  : driver.availabilityStatusId === STATUS.AVAILABILITY_ONLINE
                    ? "success"
                    : "info"
              }
              value={getAvailabilityStatus(driver.availabilityStatusId).label}
            />
          </View>
          <RouteMap
            drivers={[driver]}
            pickup={
              typeof driver.currentLatitude === "number" &&
              typeof driver.currentLongitude === "number"
                ? {
                    latitude: driver.currentLatitude,
                    longitude: driver.currentLongitude,
                  }
                : null
            }
            pickupName="Your shared location"
          />
          <MapLegend />
          <View className="rounded-2xl border border-divider bg-surface p-4">
            <SectionTitle title="Availability" />
            <View className="mt-4 flex-row gap-3">
              <PrimaryButton
                disabled={!canOperate}
                label="Online"
                loading={isUpdating}
                onPress={() => handleAvailability(STATUS.AVAILABILITY_ONLINE)}
              />
              <PrimaryButton
                disabled={!canOperate}
                label="Busy"
                loading={isUpdating}
                onPress={() => handleAvailability(STATUS.AVAILABILITY_BUSY)}
                tone="warning"
              />
              <PrimaryButton
                disabled={!canOperate}
                label="Offline"
                loading={isUpdating}
                onPress={() => handleAvailability(STATUS.AVAILABILITY_OFFLINE)}
                tone="outline"
              />
            </View>
            <Text className="mt-3 font-jakarta text-xs text-textSecondary">
              Busy keeps your last shared location visible to passengers, but they cannot send a
              request until you are online again.
            </Text>
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
  const [startName, setStartName] = useState("");
  const [destinationName, setDestinationName] = useState("");
  const [startPlace, setStartPlace] = useState<PlaceSelection | null>(null);
  const [destinationPlace, setDestinationPlace] = useState<PlaceSelection | null>(null);
  const [routeMetrics, setRouteMetrics] = useState<RouteMetrics | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  useRealtimeRefresh([driver ? `driver:${driver.id}` : null], resource.refresh);

  useEffect(() => {
    if (driver?.activeRoute) {
      const activeStart = {
        latitude: driver.activeRoute.start_latitude,
        longitude: driver.activeRoute.start_longitude,
        name: driver.activeRoute.start_name ?? "Route start",
        source: "google" as const,
      };
      const activeDestination = {
        latitude: driver.activeRoute.destination_latitude,
        longitude: driver.activeRoute.destination_longitude,
        name: driver.activeRoute.destination_name ?? "Route destination",
        source: "google" as const,
      };

      setStartName(activeStart.name);
      setDestinationName(activeDestination.name);
      setStartPlace(activeStart);
      setDestinationPlace(activeDestination);
      setRouteMetrics(
        driver.activeRoute.route_polyline
          ? {
              coordinates: routeCoordinatesFromPolyline(driver.activeRoute.route_polyline),
              distanceMeters: 0,
              durationSeconds: 0,
              encodedPolyline: driver.activeRoute.route_polyline,
            }
          : null
      );
    }
  }, [driver?.activeRoute]);

  useEffect(() => {
    let cancelled = false;

    async function loadRoutePreview() {
      if (!startPlace || !destinationPlace) {
        setRouteMetrics(null);
        setRouteError(null);
        return;
      }

      try {
        setRouteError(null);
        const metrics = await computeRouteMetrics({
          origin: toRoutePoint(startPlace),
          destination: toRoutePoint(destinationPlace),
        });

        if (!cancelled) {
          setRouteMetrics(metrics);
        }
      } catch (error) {
        if (!cancelled) {
          setRouteMetrics(null);
          setRouteError(friendlyAppError(error));
        }
      }
    }

    loadRoutePreview();
    return () => {
      cancelled = true;
    };
  }, [destinationPlace, startPlace]);

  async function useCurrentRouteStart() {
    const result = await getCurrentDevicePlace({ requestPermission: true });

    if (result.status !== "granted") {
      Alert.alert("Location needed", result.message);
      return;
    }

    setStartPlace(result.place);
    setStartName(result.place.name);
  }

  async function handleSaveRoute() {
    if (!driver) {
      return;
    }

    if (!canOperate) {
      Alert.alert("Verification pending", "Routes can be activated after admin approval.");
      return;
    }

    if (!startPlace || !destinationPlace) {
      Alert.alert(
        "Mapped route needed",
        "Choose a start and destination from Google Maps or use Find address before saving."
      );
      return;
    }

    setIsSaving(true);

    try {
      await saveDriverRoute({
        driverProfileId: driver.id,
        start: toRoutePoint(startPlace),
        destination: toRoutePoint(destinationPlace),
        routePolyline: routeMetrics?.encodedPolyline ?? null,
      });
      await resource.refresh();
      Alert.alert("Route active", "Passengers can now match with this route.");
    } catch (error) {
      Alert.alert("Route save failed", friendlyAppError(error));
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
        <View className="mt-4 gap-4">
          <PlaceInput
            label="Start location"
            onChangeText={(value) => {
              setStartName(value);
              setStartPlace(null);
            }}
            onSelect={(place, typedValue) => {
              setStartPlace(place);
              setStartName(typedValue);
            }}
            onUseCurrentLocation={useCurrentRouteStart}
            placeholder="Where will you start?"
            selected={Boolean(startPlace)}
            value={startName}
          />
          <PlaceInput
            label="Destination"
            onChangeText={(value) => {
              setDestinationName(value);
              setDestinationPlace(null);
            }}
            onSelect={(place, typedValue) => {
              setDestinationPlace(place);
              setDestinationName(typedValue);
            }}
            placeholder="Where are you heading?"
            selected={Boolean(destinationPlace)}
            value={destinationName}
          />
        </View>
        {routeError ? (
          <View className="mt-4">
            <InlineNotice message={routeError} tone="warning" />
          </View>
        ) : null}
        <View className="mt-4">
          <RouteMetricsCard metrics={routeMetrics} />
        </View>
        <View className="mt-4 flex-row">
          <PrimaryButton
            disabled={!canOperate}
            label="Save route"
            loading={isSaving}
            onPress={handleSaveRoute}
          />
        </View>
      </View>
      <RouteMap
        destination={
          destinationPlace
            ? {
                latitude: destinationPlace.latitude,
                longitude: destinationPlace.longitude,
              }
            : null
        }
        destinationName={destinationPlace?.name ?? (destinationName || "Destination")}
        drivers={driver ? [driver] : []}
        pickup={toCoordinate(startPlace)}
        pickupName={startPlace?.name ?? (startName || "Start")}
        routeCoordinates={routeMetrics?.coordinates ?? []}
      />
      <MapLegend />
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
  const requests = resource.data?.requests ?? [];
  useRealtimeRefresh(
    [
      profile?.id ? `user:${profile.id}` : null,
      driver ? `driver:${driver.id}` : null,
      ...requests
        .filter((request) =>
          request.requestStatusId === STATUS.REQUEST_PENDING ||
          request.requestStatusId === STATUS.REQUEST_ACCEPTED
        )
        .map((request) => `request:${request.id}`),
    ],
    resource.refresh
  );

  async function shareRequestLocation(requestId: string) {
    if (!driver) {
      return;
    }

    setUpdatingId(requestId);

    try {
      const result = await getCurrentDevicePlace({ requestPermission: true });

      if (result.status !== "granted") {
        Alert.alert("Location needed", result.message);
        return;
      }

      await recordDriverLocationUpdate({
        driverProfileId: driver.id,
        latitude: result.place.latitude,
        longitude: result.place.longitude,
        transportRequestId: requestId,
      });
      await resource.refresh();
    } catch (error) {
      Alert.alert("Location update failed", friendlyAppError(error));
    } finally {
      setUpdatingId(null);
    }
  }

  async function respond(requestId: string, statusId: number) {
    setUpdatingId(requestId);

    try {
      await updateTransportRequestStatus(requestId, statusId);

      if (statusId === STATUS.REQUEST_ACCEPTED && driver) {
        const result = await getCurrentDevicePlace({ requestPermission: true });

        if (result.status === "granted") {
          await recordDriverLocationUpdate({
            driverProfileId: driver.id,
            latitude: result.place.latitude,
            longitude: result.place.longitude,
            transportRequestId: requestId,
          });
        } else {
          Alert.alert("Location needed", result.message);
        }
      }

      await resource.refresh();
    } catch (error) {
      Alert.alert("Request update failed", friendlyAppError(error));
    } finally {
      setUpdatingId(null);
    }
  }

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
            onShareLocation={
              request.requestStatusId === STATUS.REQUEST_ACCEPTED
                ? () => shareRequestLocation(request.id)
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
  useRealtimeRefresh(["admin:drivers", "admin:reports"], resource.refresh);

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
            <StatCard icon={Users} label="Users" tone="info" value={`${data.totalUsers}`} />
            <StatCard
              icon={Car}
              label="Active drivers"
              tone="success"
              value={`${data.activeDrivers}`}
            />
          </View>
          <View className="flex-row gap-3">
            <StatCard
              icon={Clock3}
              label="Pending drivers"
              tone="warning"
              value={`${data.pendingDrivers}`}
            />
            <StatCard
              icon={AlertTriangle}
              label="Pending reports"
              tone="danger"
              value={`${data.pendingReports}`}
            />
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
  useRealtimeRefresh(["admin:drivers"], resource.refresh);

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
  useRealtimeRefresh(["admin:drivers"], resource.refresh);

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
  const [resolutionNote, setResolutionNote] = useState("");
  useRealtimeRefresh(
    ["admin:reports", ...reports.map((report) => `report:${report.id}`)],
    resource.refresh
  );

  async function handleReport(reportId: string, statusId: number) {
    if (!profile?.id) {
      return;
    }

    const cleanNote = resolutionNote.trim();

    if (cleanNote.length < 8) {
      Alert.alert(
        "Resolution note needed",
        "Add a short admin note before resolving or dismissing this report."
      );
      return;
    }

    setUpdatingId(reportId);

    try {
      await updateReportStatus(reportId, statusId, profile.id, cleanNote);
      setResolutionNote("");
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
      <View className="rounded-2xl border border-divider bg-surface p-4">
        <Text className="font-jakarta-bold text-base text-text">Resolution note</Text>
        <Text className="mt-1 font-jakarta text-sm text-textSecondary">
          This note is saved to the report and shown when the case is resolved or dismissed.
        </Text>
        <TextInput
          value={resolutionNote}
          onChangeText={setResolutionNote}
          multiline
          placeholder="Example: Driver contacted and warning issued."
          placeholderTextColor={colors.textSecondary}
          className="mt-3 min-h-[86px] rounded-xl border border-divider bg-background px-4 py-3 font-jakarta text-text"
          textAlignVertical="top"
        />
      </View>
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

type ProfileSectionKey = "about" | "help" | "permissions" | "privacy" | "terms";

type ProfileSectionConfig = {
  key: ProfileSectionKey;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  color: string;
  bg: string;
};

const PROFILE_SECTIONS: ProfileSectionConfig[] = [
  {
    key: "help",
    title: "Help center",
    subtitle: "Support topics for requests, routes, reports, and account issues.",
    icon: HelpCircle,
    color: colors.info,
    bg: colors.infoSoft,
  },
  {
    key: "privacy",
    title: "Privacy & security",
    subtitle: "Location sharing, account access, and safety controls.",
    icon: LockKeyhole,
    color: colors.violet,
    bg: colors.violetSoft,
  },
  {
    key: "terms",
    title: "Terms",
    subtitle: "Platform responsibilities for passengers, drivers, and admins.",
    icon: ScrollText,
    color: colors.primary,
    bg: colors.primarySoft,
  },
  {
    key: "permissions",
    title: "Permissions",
    subtitle: "Location and notifications needed for live transport tracking.",
    icon: SlidersHorizontal,
    color: colors.warning,
    bg: colors.warningSoft,
  },
  {
    key: "about",
    title: "About TransTrak",
    subtitle: "Academic prototype for local transport visibility in Cameroon.",
    icon: Info,
    color: colors.success,
    bg: colors.successSoft,
  },
];

function ProfileSettingsItem({
  item,
  onPress,
}: {
  item: ProfileSectionConfig;
  onPress: () => void;
}) {
  const Icon = item.icon;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className="flex-row items-center rounded-2xl border border-divider bg-background p-3"
    >
      <View
        className="mr-3 h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: item.bg }}
      >
        <Icon color={item.color} size={19} />
      </View>
      <View className="flex-1">
        <Text className="font-jakarta-bold text-sm text-text">{item.title}</Text>
        <Text className="mt-0.5 font-jakarta text-xs text-textSecondary">{item.subtitle}</Text>
      </View>
      <ChevronRight color={colors.textSecondary} size={18} />
    </TouchableOpacity>
  );
}

function ProfileSectionPanel({
  onClose,
  role,
  section,
}: {
  onClose: () => void;
  role: string;
  section: ProfileSectionConfig;
}) {
  const content: Record<ProfileSectionKey, string[]> = {
    about: [
      "TransTrak supports route-aware matching between passengers and nearby local transport.",
      "The prototype focuses on Cameroon transport patterns, driver verification, reports, and live location visibility.",
      `Current account role: ${role}.`,
    ],
    help: [
      "Passengers can map pickup and destination, choose a route-matched driver, then track an accepted trip.",
      "Drivers should keep availability accurate, share an active route, and respond quickly to requests.",
      "Reports should include the linked trip when the issue concerns a specific transport request.",
    ],
    permissions: [
      "Location access is needed to show nearby drivers, compute pickup distance, and update live trip progress.",
      "Notification permission is useful for new requests, accepted trips, verification updates, and report decisions.",
      "If location is not shared, the app shows a polite message instead of static or misleading map data.",
    ],
    privacy: [
      "Your live location is used for transport discovery, matching, and active trip tracking.",
      "Driver verification details are reviewed by administrators and should only be used for platform safety.",
      "Use logout on shared devices and report suspicious activity from the reports screen.",
    ],
    terms: [
      "Passengers should send requests only for real pickup and destination plans.",
      "Drivers should not accept requests while unavailable, unsafe, or already handling another passenger.",
      "Administrators should resolve reports with clear notes and fair moderation decisions.",
    ],
  };

  const Icon = section.icon;

  return (
    <View className="rounded-2xl border border-divider bg-surface p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-row flex-1 items-center pr-3">
          <View
            className="mr-3 h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: section.bg }}
          >
            <Icon color={section.color} size={21} />
          </View>
          <View className="flex-1">
            <Text className="font-jakarta-bold text-base text-text">{section.title}</Text>
            <Text className="mt-0.5 font-jakarta text-xs text-textSecondary">
              {section.subtitle}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onClose}
          className="h-9 w-9 items-center justify-center rounded-full bg-background"
        >
          <X color={colors.textSecondary} size={17} />
        </TouchableOpacity>
      </View>
      <View className="mt-4 gap-3">
        {content[section.key].map((line) => (
          <View key={line} className="rounded-xl bg-background p-3">
            <Text className="font-jakarta text-sm text-text">{line}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function ProfileScreen() {
  const { profile, logout, isLoading, refreshProfile } = useAuth();
  const driverResource = useAsyncResource(
    () =>
      profile?.role_id === STATUS.ROLE_DRIVER
        ? getDriverDashboard(profile?.id ?? "")
        : Promise.resolve({ driver: null, requests: [], reports: [], verification: null }),
    [profile?.id, profile?.role_id]
  );
  const driver = driverResource.data?.driver ?? null;
  const verification = driverResource.data?.verification ?? null;
  const refreshDriverDashboard = driverResource.refresh;
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
  const [activeSectionKey, setActiveSectionKey] = useState<ProfileSectionKey | null>(null);
  const activeSection =
    PROFILE_SECTIONS.find((section) => section.key === activeSectionKey) ?? null;
  const refreshProfileScreen = useCallback(async () => {
    await refreshProfile();
    await refreshDriverDashboard();
  }, [refreshDriverDashboard, refreshProfile]);

  useRealtimeRefresh(
    [
      profile?.id ? `user:${profile.id}` : null,
      driver ? `driver:${driver.id}` : null,
    ],
    refreshProfileScreen
  );

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

      {driver ? (
        <DriverVerificationPanel
          driver={driver}
          verification={verification}
          onSubmitted={driverResource.refresh}
        />
      ) : null}

      <View className="rounded-2xl border border-divider bg-surface p-4">
        <SectionTitle title="Account center" />
        <View className="mt-4 gap-3">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setActiveSectionKey(null);
              setEditing(true);
            }}
            className="flex-row items-center rounded-2xl border border-divider bg-background p-3"
          >
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-primarySoft">
              <Edit3 color={colors.primary} size={19} />
            </View>
            <View className="flex-1">
              <Text className="font-jakarta-bold text-sm text-text">Edit profile</Text>
              <Text className="mt-0.5 font-jakarta text-xs text-textSecondary">
                Update name, phone, city, and driver vehicle details.
              </Text>
            </View>
            <ChevronRight color={colors.textSecondary} size={18} />
          </TouchableOpacity>
          {PROFILE_SECTIONS.map((section) => (
            <ProfileSettingsItem
              key={section.key}
              item={section}
              onPress={() => setActiveSectionKey(section.key)}
            />
          ))}
        </View>
      </View>

      {activeSection ? (
        <ProfileSectionPanel
          role={role}
          section={activeSection}
          onClose={() => setActiveSectionKey(null)}
        />
      ) : null}

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
              placeholder="City"
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

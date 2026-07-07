import { Text, View } from "react-native";
import { MapPin } from "lucide-react-native";

import { colors } from "../../constants/colors";
import type { DriverSummary } from "../../services/app/appService";

type Coordinate = {
  latitude: number;
  longitude: number;
};

type RouteMapProps = {
  destination?: Coordinate | null;
  drivers?: DriverSummary[];
  destinationName?: string;
  pickup?: Coordinate | null;
  pickupName?: string;
};

export function RouteMap({
  destination,
  drivers = [],
  destinationName = "Destination",
  pickup,
  pickupName = "Pickup",
}: RouteMapProps) {
  const hasMapData =
    Boolean(pickup) ||
    Boolean(destination) ||
    drivers.some(
      (driver) =>
        typeof driver.currentLatitude === "number" &&
        typeof driver.currentLongitude === "number"
    );

  return (
    <View className="overflow-hidden rounded-2xl border border-divider bg-surface">
      <View className="h-52 items-center justify-center bg-primary/10 px-6">
        <MapPin color={colors.primary} size={28} />
        <Text className="mt-3 text-center font-jakarta-bold text-text">
          {hasMapData ? "Map preview is enabled on mobile." : "Location not available yet"}
        </Text>
        <Text className="mt-1 text-center font-jakarta text-sm text-textSecondary">
          {hasMapData
            ? `${drivers.length} driver${drivers.length === 1 ? "" : "s"} visible for this route.`
            : "Share your location or choose mapped places to show nearby transport."}
        </Text>
      </View>
      <View className="flex-row border-t border-divider px-4 py-3">
        <View className="flex-1">
          <Text className="font-jakarta text-xs text-textSecondary">Pickup</Text>
          <Text className="font-jakarta-semibold text-sm text-text">{pickupName}</Text>
        </View>
        <View className="flex-1">
          <Text className="font-jakarta text-xs text-textSecondary">Destination</Text>
          <Text className="font-jakarta-semibold text-sm text-text">{destinationName}</Text>
        </View>
      </View>
    </View>
  );
}

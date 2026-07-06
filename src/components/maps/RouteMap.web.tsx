import { Text, View } from "react-native";
import { MapPin } from "lucide-react-native";

import { colors } from "../../constants/colors";
import { PLACES } from "../../services/app/appService";
import type { DriverSummary } from "../../services/app/appService";

type RouteMapProps = {
  drivers?: DriverSummary[];
  destinationName?: string;
  pickupName?: string;
};

export function RouteMap({
  drivers = [],
  destinationName = PLACES.destination.name,
  pickupName = PLACES.pickup.name,
}: RouteMapProps) {
  return (
    <View className="overflow-hidden rounded-2xl border border-divider bg-surface">
      <View className="h-52 items-center justify-center bg-primary/10 px-6">
        <MapPin color={colors.primary} size={28} />
        <Text className="mt-3 text-center font-jakarta-bold text-text">
          Map preview is enabled on mobile.
        </Text>
        <Text className="mt-1 text-center font-jakarta text-sm text-textSecondary">
          {drivers.length} driver{drivers.length === 1 ? "" : "s"} visible for this route.
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

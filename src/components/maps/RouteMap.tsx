import { Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import type { Region } from "react-native-maps";

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
  const region: Region = {
    latitude: PLACES.pickup.latitude,
    longitude: PLACES.pickup.longitude,
    latitudeDelta: 0.035,
    longitudeDelta: 0.035,
  };

  const route = [
    {
      latitude: PLACES.pickup.latitude,
      longitude: PLACES.pickup.longitude,
    },
    {
      latitude: PLACES.driver.latitude,
      longitude: PLACES.driver.longitude,
    },
    {
      latitude: PLACES.destination.latitude,
      longitude: PLACES.destination.longitude,
    },
  ];

  return (
    <View className="overflow-hidden rounded-2xl border border-divider bg-surface">
      <MapView
        initialRegion={region}
        pointerEvents="none"
        style={{ height: 210, width: "100%" }}
      >
        <Marker
          coordinate={{
            latitude: PLACES.pickup.latitude,
            longitude: PLACES.pickup.longitude,
          }}
          pinColor={colors.success}
          title={pickupName}
        />
        <Marker
          coordinate={{
            latitude: PLACES.destination.latitude,
            longitude: PLACES.destination.longitude,
          }}
          pinColor={colors.primary}
          title={destinationName}
        />
        {drivers.slice(0, 4).map((driver) => (
          <Marker
            key={driver.id}
            coordinate={{
              latitude: driver.currentLatitude,
              longitude: driver.currentLongitude,
            }}
            pinColor={driver.vehicleTypeId === 2000 ? colors.warning : colors.accent}
            title={driver.name}
            description={driver.vehicleLabel}
          />
        ))}
        <Polyline coordinates={route} strokeColor={colors.primary} strokeWidth={4} />
      </MapView>
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

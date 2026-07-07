import { Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import type { Region } from "react-native-maps";

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
  const driverMarkers = drivers.filter(
    (driver) =>
      typeof driver.currentLatitude === "number" &&
      typeof driver.currentLongitude === "number"
  );
  const firstCoordinate =
    pickup ??
    destination ??
    (driverMarkers[0]
      ? {
          latitude: driverMarkers[0].currentLatitude as number,
          longitude: driverMarkers[0].currentLongitude as number,
        }
      : null);

  if (!firstCoordinate) {
    return (
      <View className="overflow-hidden rounded-2xl border border-divider bg-surface">
        <View className="h-52 items-center justify-center bg-primary/10 px-6">
          <Text className="text-center font-jakarta-bold text-base text-text">
            Location not available yet
          </Text>
          <Text className="mt-2 text-center font-jakarta text-sm text-textSecondary">
            Share your location or choose a mapped pickup and destination to show the live map.
          </Text>
        </View>
      </View>
    );
  }

  const region: Region = {
    latitude: firstCoordinate.latitude,
    longitude: firstCoordinate.longitude,
    latitudeDelta: 0.035,
    longitudeDelta: 0.035,
  };

  const route = [pickup, destination].filter(
    (coordinate): coordinate is Coordinate => Boolean(coordinate)
  );

  return (
    <View className="overflow-hidden rounded-2xl border border-divider bg-surface">
      <MapView
        initialRegion={region}
        showsUserLocation
        style={{ height: 210, width: "100%" }}
      >
        {pickup ? (
          <Marker coordinate={pickup} pinColor={colors.success} title={pickupName} />
        ) : null}
        {destination ? (
          <Marker coordinate={destination} pinColor={colors.primary} title={destinationName} />
        ) : null}
        {driverMarkers.slice(0, 8).map((driver) => (
          <Marker
            key={driver.id}
            coordinate={{
              latitude: driver.currentLatitude as number,
              longitude: driver.currentLongitude as number,
            }}
            pinColor={driver.vehicleTypeId === 2000 ? colors.warning : colors.accent}
            title={driver.name}
            description={driver.vehicleLabel}
          />
        ))}
        {route.length > 1 ? (
          <Polyline coordinates={route} strokeColor={colors.primary} strokeWidth={4} />
        ) : null}
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

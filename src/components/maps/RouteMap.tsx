import { Text, View } from "react-native";
import { Bike, Car } from "lucide-react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import type { Region } from "react-native-maps";

import { colors } from "../../constants/colors";
import { STATUS, type DriverSummary } from "../../services/app/appService";

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
  routeCoordinates?: Coordinate[];
};

function DriverMarkerIcon({ driver }: { driver: DriverSummary }) {
  const isBike = driver.vehicleTypeId === 2000;
  const isBusy = driver.availabilityStatusId === STATUS.AVAILABILITY_BUSY;
  const Icon = isBike ? Bike : Car;
  const backgroundColor = isBusy ? colors.warning : isBike ? colors.bike : colors.taxi;
  const iconColor = isBike || isBusy ? "#FFFFFF" : colors.text;

  return (
    <View className="items-center">
      <View
        className="h-9 w-9 items-center justify-center rounded-full border-2 border-white"
        style={{
          backgroundColor,
          shadowColor: colors.text,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 4,
        }}
      >
        <Icon color={iconColor} size={19} strokeWidth={2.6} />
      </View>
      <View
        style={{
          borderLeftColor: "transparent",
          borderLeftWidth: 6,
          borderRightColor: "transparent",
          borderRightWidth: 6,
          borderTopColor: backgroundColor,
          borderTopWidth: 8,
          height: 0,
          marginTop: -1,
          width: 0,
        }}
      />
    </View>
  );
}

export function RouteMap({
  destination,
  drivers = [],
  destinationName = "Destination",
  pickup,
  pickupName = "Pickup",
  routeCoordinates = [],
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

  const route = routeCoordinates.length > 1 ? routeCoordinates : [pickup, destination].filter(
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
            anchor={{ x: 0.5, y: 1 }}
            key={driver.id}
            coordinate={{
              latitude: driver.currentLatitude as number,
              longitude: driver.currentLongitude as number,
            }}
            title={driver.name}
            description={`${driver.vehicleLabel} - ${
              driver.availabilityStatusId === STATUS.AVAILABILITY_BUSY ? "Busy" : "Available"
            }`}
          >
            <DriverMarkerIcon driver={driver} />
          </Marker>
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

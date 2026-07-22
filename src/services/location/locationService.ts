import * as Location from "expo-location";

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type PlaceSelection = Coordinates & {
  address?: string | null;
  name: string;
  source: "device" | "google";
};

export type DevicePlaceResult =
  | {
      place: PlaceSelection;
      status: "granted";
    }
  | {
      message: string;
      status: "denied" | "unavailable";
    };

function compact(parts: (string | null | undefined)[]) {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(", ");
}

function formatAddress(address?: Location.LocationGeocodedAddress) {
  if (!address) {
    return null;
  }

  return compact([
    address.name,
    address.street,
    address.district,
    address.city,
    address.region,
    address.country,
  ]);
}

export async function getCurrentDevicePlace(options?: {
  requestPermission?: boolean;
}): Promise<DevicePlaceResult> {
  const requestPermission = options?.requestPermission ?? true;
  let permission = await Location.getForegroundPermissionsAsync();

  if (permission.status !== "granted" && requestPermission) {
    permission = await Location.requestForegroundPermissionsAsync();
  }

  if (permission.status !== "granted") {
    return {
      status: "denied",
      message:
        "Location is not shared yet. Enable location access to show nearby transport and use your exact pickup point.",
    };
  }

  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const coords = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };

    let address: string | null = null;

    try {
      const [firstAddress] = await Location.reverseGeocodeAsync(coords);
      address = formatAddress(firstAddress);
    } catch {
      address = null;
    }

    return {
      status: "granted",
      place: {
        ...coords,
        address,
        name: address || "Current location",
        source: "device",
      },
    };
  } catch {
    return {
      status: "unavailable",
      message:
        "We could not read your location right now. Check GPS/location settings and try again.",
    };
  }
}

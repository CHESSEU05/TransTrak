import type { Coordinates, PlaceSelection } from "./locationService";

export type PlacePrediction = {
  description: string;
  id: string;
  name: string;
};

export type RouteMetrics = {
  coordinates: Coordinates[];
  distanceMeters: number;
  durationSeconds: number;
  encodedPolyline: string | null;
};

type GoogleAutocompleteSuggestion = {
  placePrediction?: {
    placeId?: string;
    structuredFormat?: {
      mainText?: {
        text?: string;
      };
      secondaryText?: {
        text?: string;
      };
    };
    text?: {
      text?: string;
    };
  };
};

type GooglePlaceDetails = {
  displayName?: {
    text?: string;
  };
  formattedAddress?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
};

const GOOGLE_PLACES_BASE_URL = "https://places.googleapis.com/v1";
const GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const GOOGLE_ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";
const LOCATION_BIAS_RADIUS_METERS = 40000;

function apiKey() {
  return process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
}

export function isGooglePlacesConfigured() {
  return apiKey().length > 0;
}

function ensureApiKey() {
  const key = apiKey();

  if (!key) {
    throw new Error(
      "Google Maps is not configured yet. Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to enable place suggestions and address lookup."
    );
  }

  return key;
}

async function parseGoogleError(response: Response) {
  try {
    const body = (await response.json()) as {
      error?: {
        message?: string;
        status?: string;
      };
      error_message?: string;
      status?: string;
    };

    return body.error?.message ?? body.error_message ?? body.status;
  } catch {
    return null;
  }
}

function locationBias(origin?: Coordinates) {
  if (!origin) {
    return null;
  }

  return {
    circle: {
      center: {
        latitude: origin.latitude,
        longitude: origin.longitude,
      },
      radius: LOCATION_BIAS_RADIUS_METERS,
    },
  };
}

export function decodeRoutePolyline(encoded: string) {
  const coordinates: Coordinates[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    latitude += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    longitude += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push({
      latitude: latitude / 100000,
      longitude: longitude / 100000,
    });
  }

  return coordinates;
}

function parseDurationSeconds(duration?: string) {
  const match = duration?.match(/^(\d+(?:\.\d+)?)s$/);

  return match ? Math.round(Number(match[1])) : 0;
}

export async function searchPlacePredictions(input: string, origin?: Coordinates) {
  const trimmed = input.trim();

  if (trimmed.length < 2 || !isGooglePlacesConfigured()) {
    return [];
  }

  const requestBody = {
    includedRegionCodes: ["cm"],
    input: trimmed,
    ...(origin ? { locationBias: locationBias(origin) } : {}),
  };

  const response = await fetch(`${GOOGLE_PLACES_BASE_URL}/places:autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": ensureApiKey(),
      "X-Goog-FieldMask":
        "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error((await parseGoogleError(response)) ?? "Unable to load place suggestions.");
  }

  const body = (await response.json()) as {
    suggestions?: GoogleAutocompleteSuggestion[];
  };

  return (body.suggestions ?? [])
    .map<PlacePrediction | null>((suggestion) => {
      const prediction = suggestion.placePrediction;
      const id = prediction?.placeId;

      if (!id) {
        return null;
      }

      const name =
        prediction.structuredFormat?.mainText?.text ??
        prediction.text?.text ??
        "Suggested place";
      const secondary = prediction.structuredFormat?.secondaryText?.text;

      return {
        id,
        name,
        description: secondary ? `${name}, ${secondary}` : name,
      };
    })
    .filter((prediction): prediction is PlacePrediction => Boolean(prediction));
}

export async function getPlaceDetails(placeId: string): Promise<PlaceSelection> {
  const response = await fetch(`${GOOGLE_PLACES_BASE_URL}/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": ensureApiKey(),
      "X-Goog-FieldMask": "displayName,formattedAddress,location",
    },
  });

  if (!response.ok) {
    throw new Error((await parseGoogleError(response)) ?? "Unable to load this place.");
  }

  const details = (await response.json()) as GooglePlaceDetails;
  const latitude = details.location?.latitude;
  const longitude = details.location?.longitude;

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    throw new Error("This place does not include a usable map location.");
  }

  return {
    latitude,
    longitude,
    address: details.formattedAddress ?? null,
    name: details.displayName?.text ?? details.formattedAddress ?? "Selected place",
    source: "google",
  };
}

export async function geocodeAddress(input: string): Promise<PlaceSelection> {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Enter a location before searching.");
  }

  const params = new URLSearchParams({
    address: `${trimmed}, Cameroon`,
    key: ensureApiKey(),
    region: "cm",
  });

  const response = await fetch(`${GOOGLE_GEOCODE_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error((await parseGoogleError(response)) ?? "Unable to find this location.");
  }

  const body = (await response.json()) as {
    results?: {
      formatted_address?: string;
      geometry?: {
        location?: {
          lat?: number;
          lng?: number;
        };
      };
    }[];
    status?: string;
  };
  const result = body.results?.[0];
  const latitude = result?.geometry?.location?.lat;
  const longitude = result?.geometry?.location?.lng;

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    throw new Error("We could not locate that address. Choose a suggestion or refine the text.");
  }

  return {
    latitude,
    longitude,
    address: result?.formatted_address ?? null,
    name: result?.formatted_address ?? trimmed,
    source: "google",
  };
}

export async function computeRouteMetrics(input: {
  destination: Coordinates;
  origin: Coordinates;
}): Promise<RouteMetrics | null> {
  if (!isGooglePlacesConfigured()) {
    return null;
  }

  const response = await fetch(GOOGLE_ROUTES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": ensureApiKey(),
      "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
    },
    body: JSON.stringify({
      computeAlternativeRoutes: false,
      destination: {
        location: {
          latLng: {
            latitude: input.destination.latitude,
            longitude: input.destination.longitude,
          },
        },
      },
      origin: {
        location: {
          latLng: {
            latitude: input.origin.latitude,
            longitude: input.origin.longitude,
          },
        },
      },
      routingPreference: "TRAFFIC_AWARE",
      travelMode: "DRIVE",
      units: "METRIC",
    }),
  });

  if (!response.ok) {
    throw new Error((await parseGoogleError(response)) ?? "Unable to compute this route.");
  }

  const body = (await response.json()) as {
    routes?: {
      distanceMeters?: number;
      duration?: string;
      polyline?: {
        encodedPolyline?: string;
      };
    }[];
  };
  const route = body.routes?.[0];

  if (!route) {
    return null;
  }

  const encodedPolyline = route.polyline?.encodedPolyline ?? null;

  return {
    coordinates: encodedPolyline ? decodeRoutePolyline(encodedPolyline) : [input.origin, input.destination],
    distanceMeters: route.distanceMeters ?? 0,
    durationSeconds: parseDurationSeconds(route.duration),
    encodedPolyline,
  };
}

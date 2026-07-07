import type { Coordinates, PlaceSelection } from "./locationService";

export type PlacePrediction = {
  description: string;
  id: string;
  name: string;
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
const CAMEROON_CENTER = { latitude: 5.7609, longitude: 12.7396 };

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
  const center = origin ?? CAMEROON_CENTER;

  return {
    circle: {
      center: {
        latitude: center.latitude,
        longitude: center.longitude,
      },
      radius: origin ? 40000 : 900000,
    },
  };
}

export async function searchPlacePredictions(input: string, origin?: Coordinates) {
  const trimmed = input.trim();

  if (trimmed.length < 2 || !isGooglePlacesConfigured()) {
    return [];
  }

  const response = await fetch(`${GOOGLE_PLACES_BASE_URL}/places:autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": ensureApiKey(),
      "X-Goog-FieldMask":
        "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text",
    },
    body: JSON.stringify({
      includedRegionCodes: ["cm"],
      input: trimmed,
      locationBias: locationBias(origin),
    }),
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

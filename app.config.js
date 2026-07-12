const requiredEasEnv = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY",
];

module.exports = ({ config }) => {
  const missing = requiredEasEnv.filter((key) => !process.env[key]);

  if (process.env.EAS_BUILD === "true" && missing.length > 0) {
    throw new Error(
      `Missing EAS environment variable(s): ${missing.join(
        ", "
      )}. Add them before creating the standalone APK.`
    );
  }

  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        ...(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
          ? {
              googleMaps: {
                apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
              },
            }
          : {}),
      },
    },
  };
};

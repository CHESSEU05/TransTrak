import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { createBottomTabNavigator, type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import {
  Car,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  Home,
  MapPin,
  MapPinned,
  Search,
  ShieldAlert,
  User,
  Users,
  X,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../constants/colors";
import { useAuth } from "../context/AuthContext";
import {
  AdminDashboardScreen,
  AdminDriversScreen,
  AdminReportsScreen,
  AdminUsersScreen,
} from "../screens/app/admin";
import {
  DriverHomeScreen,
  DriverReportsScreen,
  DriverRequestsScreen,
  DriverRouteScreen,
} from "../screens/app/driver";
import {
  PassengerHomeScreen,
  PassengerReportsScreen,
  PassengerRequestsScreen,
  PassengerSearchScreen,
} from "../screens/app/passenger";
import {
  ProfileScreen,
} from "../screens/app/shared";
import {
  getDriverDashboard,
  recordDriverLocationUpdate,
  STATUS,
  updateTransportRequestStatus,
} from "../services/app/appService";
import type { TransportRequestSummary } from "../services/app/appService";
import { getCurrentDevicePlace } from "../services/location/locationService";
import { supabase } from "../services/supabase/client";

type MainTabParamList = {
  PassengerHome: undefined;
  PassengerSearch: undefined;
  PassengerRequests: undefined;
  PassengerReports: undefined;
  DriverHome: undefined;
  DriverRoute: undefined;
  DriverRequests: undefined;
  DriverReports: undefined;
  AdminDashboard: undefined;
  AdminUsers: undefined;
  AdminDrivers: undefined;
  AdminReports: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function FloatingTabBar({ descriptors, navigation, state }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      className="absolute left-4 right-4"
      style={{ bottom: Math.max(insets.bottom + 14, 30) }}
    >
      <View
        className="flex-row items-center justify-around rounded-full border border-divider bg-surface px-2 py-2"
        style={{
          shadowColor: colors.text,
          shadowOpacity: 0.16,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 10,
        }}
      >
        {state.routes.map((route, index) => {
          const options = descriptors[route.key].options;
          const focused = state.index === index;
          const color = focused ? colors.primary : colors.textSecondary;
          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : options.title ?? route.name;

          function handlePress() {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          }

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              activeOpacity={0.82}
              onPress={handlePress}
              className={`min-h-[54px] flex-1 items-center justify-center rounded-full ${
                focused ? "bg-primary/10" : ""
              }`}
            >
              {options.tabBarIcon?.({ focused, color, size: 22 })}
              <Text
                numberOfLines={1}
                className={`mt-1 font-jakarta-semibold text-[10px] ${
                  focused ? "text-primary" : "text-textSecondary"
                }`}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function profileScreen() {
  return (
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        tabBarLabel: "Profile",
        tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
      }}
    />
  );
}

function formatRequestTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function IncomingDriverRequestsModal({ profileId }: { profileId: string }) {
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissedRequestIds, setDismissedRequestIds] = useState<string[]>([]);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<TransportRequestSummary[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const cardWidth = Math.max(300, Math.min(width - 40, 430));

  const refresh = useCallback(async () => {
    setIsLoading((current) => current || pendingRequests.length === 0);

    try {
      const dashboard = await getDriverDashboard(profileId);
      const nextDriverId = dashboard.driver?.id ?? null;
      const nextRequests = dashboard.requests.filter(
        (request) =>
          request.requestStatusId === STATUS.REQUEST_PENDING &&
          !dismissedRequestIds.includes(request.id)
      );

      setDriverId(nextDriverId);
      setPendingRequests(nextRequests);
      setActiveIndex((current) =>
        nextRequests.length === 0 ? 0 : Math.min(current, nextRequests.length - 1)
      );
    } catch (error) {
      console.warn(
        "Unable to refresh incoming requests:",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setIsLoading(false);
    }
  }, [dismissedRequestIds, pendingRequests.length, profileId]);

  useEffect(() => {
    refresh();

    const userChannel = supabase
      .channel(`user:${profileId}`, { config: { private: true } })
      .on("broadcast", { event: "*" }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(userChannel);
    };
  }, [profileId, refresh]);

  useEffect(() => {
    if (!driverId) {
      return undefined;
    }

    const driverChannel = supabase
      .channel(`driver:${driverId}`, { config: { private: true } })
      .on("broadcast", { event: "*" }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(driverChannel);
    };
  }, [driverId, refresh]);

  function dismissRequest(requestId: string) {
    setDismissedRequestIds((current) =>
      current.includes(requestId) ? current : [...current, requestId]
    );
    setPendingRequests((current) => current.filter((request) => request.id !== requestId));
    setActiveIndex(0);
  }

  async function respondToRequest(request: TransportRequestSummary, statusId: number) {
    if (!driverId) {
      return;
    }

    setUpdatingId(request.id);

    try {
      await updateTransportRequestStatus(request.id, statusId);

      if (statusId === STATUS.REQUEST_ACCEPTED) {
        const result = await getCurrentDevicePlace({ requestPermission: true });

        if (result.status === "granted") {
          await recordDriverLocationUpdate({
            driverProfileId: driverId,
            latitude: result.place.latitude,
            longitude: result.place.longitude,
            transportRequestId: request.id,
          });
        } else {
          Alert.alert("Location not shared", result.message);
        }
      }

      dismissRequest(request.id);
      await refresh();
    } catch (error) {
      Alert.alert(
        "Request update failed",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  if (pendingRequests.length === 0) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View className="flex-1 items-center justify-center bg-black/45 px-5">
        <View
          className="overflow-hidden rounded-2xl border border-divider bg-surface"
          style={{ width: cardWidth }}
        >
          <View className="flex-row items-start justify-between border-b border-divider p-4">
            <View className="flex-1 pr-3">
              <Text className="font-jakarta-bold text-lg text-text">Incoming request</Text>
              <Text className="mt-1 font-jakarta text-sm text-textSecondary">
                {pendingRequests.length === 1
                  ? "A passenger is requesting your route."
                  : `${pendingRequests.length} passengers are waiting. Swipe to review each one.`}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => dismissRequest(pendingRequests[activeIndex]?.id)}
              className="h-9 w-9 items-center justify-center rounded-full bg-background"
            >
              <X color={colors.textSecondary} size={17} />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / cardWidth));
            }}
          >
            {pendingRequests.map((request) => {
              const updating = updatingId === request.id;

              return (
                <View key={request.id} className="p-4" style={{ width: cardWidth }}>
                  <View className="flex-row items-center">
                    <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                      <User color={colors.primary} size={21} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-jakarta-bold text-base text-text">
                        {request.passengerName}
                      </Text>
                      <View className="mt-1 flex-row items-center">
                        <Clock3 color={colors.textSecondary} size={14} />
                        <Text className="ml-1 font-jakarta text-xs text-textSecondary">
                          {formatRequestTime(request.requestedAt)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="mt-4 gap-3">
                    <View className="flex-row items-start rounded-xl bg-background p-3">
                      <MapPin color={colors.success} size={17} />
                      <View className="ml-2 flex-1">
                        <Text className="font-jakarta text-xs text-textSecondary">Pickup</Text>
                        <Text className="mt-1 font-jakarta-bold text-sm text-text">
                          {request.pickupName}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-start rounded-xl bg-background p-3">
                      <MapPinned color={colors.primary} size={17} />
                      <View className="ml-2 flex-1">
                        <Text className="font-jakarta text-xs text-textSecondary">Destination</Text>
                        <Text className="mt-1 font-jakarta-bold text-sm text-text">
                          {request.destinationName}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {request.passengerNote ? (
                    <Text className="mt-3 font-jakarta text-xs text-textSecondary">
                      {request.passengerNote}
                    </Text>
                  ) : null}

                  <View className="mt-5 flex-row gap-3">
                    <TouchableOpacity
                      activeOpacity={0.85}
                      disabled={updating}
                      onPress={() => respondToRequest(request, STATUS.REQUEST_ACCEPTED)}
                      className={`h-12 flex-1 flex-row items-center justify-center rounded-xl bg-primary ${
                        updating ? "opacity-50" : ""
                      }`}
                    >
                      {updating ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <CheckCircle2 color="#FFFFFF" size={17} />
                          <Text className="ml-2 font-jakarta-bold text-sm text-white">Accept</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      disabled={updating}
                      onPress={() => respondToRequest(request, STATUS.REQUEST_REJECTED)}
                      className={`h-12 flex-1 items-center justify-center rounded-xl border border-danger ${
                        updating ? "opacity-50" : ""
                      }`}
                    >
                      <Text className="font-jakarta-bold text-sm text-danger">Reject</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => dismissRequest(request.id)}
                    className="mt-3 h-10 items-center justify-center rounded-xl bg-background"
                  >
                    <Text className="font-jakarta-bold text-xs text-textSecondary">
                      Review later in Requests
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>

          {pendingRequests.length > 1 ? (
            <View className="flex-row items-center justify-center gap-2 pb-4">
              {pendingRequests.map((request, index) => (
                <View
                  key={request.id}
                  className={`h-2 rounded-full ${
                    index === activeIndex ? "w-6 bg-primary" : "w-2 bg-divider"
                  }`}
                />
              ))}
            </View>
          ) : null}

          {isLoading ? (
            <View className="absolute inset-0 items-center justify-center bg-surface/70">
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

export function MainTabs() {
  const { profile } = useAuth();
  const isDriver = profile?.role_id === STATUS.ROLE_DRIVER;
  const isAdmin = profile?.role_id === STATUS.ROLE_ADMIN;

  return (
    <>
      <Tab.Navigator
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        {isAdmin ? (
          <>
            <Tab.Screen
              name="AdminDashboard"
              component={AdminDashboardScreen}
              options={{
                tabBarLabel: "Home",
                tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
              }}
            />
            <Tab.Screen
              name="AdminUsers"
              component={AdminUsersScreen}
              options={{
                tabBarLabel: "Users",
                tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
              }}
            />
            <Tab.Screen
              name="AdminDrivers"
              component={AdminDriversScreen}
              options={{
                tabBarLabel: "Drivers",
                tabBarIcon: ({ color, size }) => <Car color={color} size={size} />,
              }}
            />
            <Tab.Screen
              name="AdminReports"
              component={AdminReportsScreen}
              options={{
                tabBarLabel: "Reports",
                tabBarIcon: ({ color, size }) => <ShieldAlert color={color} size={size} />,
              }}
            />
            {profileScreen()}
          </>
        ) : isDriver ? (
          <>
            <Tab.Screen
              name="DriverHome"
              component={DriverHomeScreen}
              options={{
                tabBarLabel: "Home",
                tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
              }}
            />
            <Tab.Screen
              name="DriverRoute"
              component={DriverRouteScreen}
              options={{
                tabBarLabel: "Route",
                tabBarIcon: ({ color, size }) => <MapPinned color={color} size={size} />,
              }}
            />
            <Tab.Screen
              name="DriverRequests"
              component={DriverRequestsScreen}
              options={{
                tabBarLabel: "Requests",
                tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} />,
              }}
            />
            <Tab.Screen
              name="DriverReports"
              component={DriverReportsScreen}
              options={{
                tabBarLabel: "Reports",
                tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />,
              }}
            />
            {profileScreen()}
          </>
        ) : (
          <>
            <Tab.Screen
              name="PassengerHome"
              component={PassengerHomeScreen}
              options={{
                tabBarLabel: "Home",
                tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
              }}
            />
            <Tab.Screen
              name="PassengerSearch"
              component={PassengerSearchScreen}
              options={{
                tabBarLabel: "Search",
                tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
              }}
            />
            <Tab.Screen
              name="PassengerRequests"
              component={PassengerRequestsScreen}
              options={{
                tabBarLabel: "Requests",
                tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} />,
              }}
            />
            <Tab.Screen
              name="PassengerReports"
              component={PassengerReportsScreen}
              options={{
                tabBarLabel: "Reports",
                tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />,
              }}
            />
            {profileScreen()}
          </>
        )}
      </Tab.Navigator>
      {isDriver && profile?.id ? <IncomingDriverRequestsModal profileId={profile.id} /> : null}
    </>
  );
}

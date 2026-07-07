import { Text, TouchableOpacity, View } from "react-native";
import { createBottomTabNavigator, type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import {
  Car,
  ClipboardList,
  FileText,
  Home,
  MapPinned,
  Search,
  ShieldAlert,
  User,
  Users,
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
import { STATUS } from "../services/app/appService";

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

export function MainTabs() {
  const { profile } = useAuth();
  const isDriver = profile?.role_id === STATUS.ROLE_DRIVER;
  const isAdmin = profile?.role_id === STATUS.ROLE_ADMIN;

  return (
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
  );
}

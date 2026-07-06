import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { RegistrationDraft, UserRoleId } from "../types/auth";
import { DriverRegistrationScreen } from "../screens/auth/DriverRegistrationScreen";
import { LoginScreen } from "../screens/auth/LoginScreen";
import OnboardingScreen from "../screens/intro/OnboardingScreen";
import { PermissionsSetupScreen } from "../screens/intro/PermissionsSetupScreen";
import { RoleSelectionScreen } from "../screens/intro/RoleSelectionScreen";
import { RegisterScreen } from "../screens/auth/RegisterScreen";
import { TermsPrivacyScreen } from "../screens/intro/TermsPrivacyScreen";
import { WelcomeScreen } from "../screens/intro/WelcomeScreen";

export type AuthStackParamList = {
  Onboarding: undefined;
  Welcome: undefined;
  RoleSelection: undefined;
  Register: { roleId: UserRoleId };
  DriverRegistration: { draft: RegistrationDraft };
  PermissionsSetup: { draft: RegistrationDraft };
  TermsPrivacy: { draft: RegistrationDraft };
  Login: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Onboarding"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen
        name="DriverRegistration"
        component={DriverRegistrationScreen}
      />
      <Stack.Screen
        name="PermissionsSetup"
        component={PermissionsSetupScreen}
      />
      <Stack.Screen name="TermsPrivacy" component={TermsPrivacyScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

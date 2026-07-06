import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { AccountCreatedScreen } from '../screens/auth/AccountCreatedScreen';
import { AuthNavigator } from './AuthNavigator';
import { MainTabs } from './MainTabs';

export function AppNavigator() {
  const { session, profile, isLoading, shouldShowRegistrationSuccess } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session && profile ? (
        shouldShowRegistrationSuccess ? (
          <AccountCreatedScreen />
        ) : (
          <MainTabs />
        )
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import { useEffect, useState } from 'react';
import { Image, Platform, ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Bell, CheckCircle2, MapPin, XCircle } from 'lucide-react-native';

import Button from '../../components/ui/Button';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

type PermissionsSetupNavProp = NativeStackNavigationProp<AuthStackParamList, 'PermissionsSetup'>;
type PermissionsSetupRouteProp = RouteProp<AuthStackParamList, 'PermissionsSetup'>;
type PermissionState = 'checking' | 'granted' | 'denied' | 'idle' | 'unsupported';

function permissionCopy(status: PermissionState, required = false) {
  if (status === 'checking') {
    return 'Checking...';
  }

  if (status === 'granted') {
    return 'Allowed';
  }

  if (status === 'denied') {
    return required ? 'Required' : 'Not allowed';
  }

  if (status === 'unsupported') {
    return 'Use dev build';
  }

  return 'Allow';
}

export function PermissionsSetupScreen() {
  const navigation = useNavigation<PermissionsSetupNavProp>();
  const { params } = useRoute<PermissionsSetupRouteProp>();

  const [locationStatus, setLocationStatus] = useState<PermissionState>('checking');
  const [notificationStatus, setNotificationStatus] = useState<PermissionState>('checking');

  const notificationsUnsupported = Constants.appOwnership === 'expo' && Platform.OS === 'android';
  const locationAllowed = locationStatus === 'granted';
  const notificationsAllowed = notificationStatus === 'granted';

  useEffect(() => {
    let mounted = true;

    async function loadPermissions() {
      const locationPermission = await Location.getForegroundPermissionsAsync();
      const notificationPermission = notificationsUnsupported
        ? null
        : await import('expo-notifications').then((Notifications) =>
            Notifications.getPermissionsAsync()
          );

      if (!mounted) {
        return;
      }

      setLocationStatus(locationPermission.status === 'granted' ? 'granted' : 'idle');
      setNotificationStatus(
        notificationsUnsupported
          ? 'unsupported'
          : notificationPermission?.status === 'granted'
            ? 'granted'
            : 'idle'
      );
    }

    loadPermissions().catch(() => {
      if (mounted) {
        setLocationStatus('idle');
        setNotificationStatus('idle');
      }
    });

    return () => {
      mounted = false;
    };
  }, [notificationsUnsupported]);

  async function handleAllowLocation() {
    setLocationStatus('checking');

    const permission = await Location.requestForegroundPermissionsAsync();
    setLocationStatus(permission.status === 'granted' ? 'granted' : 'denied');
  }

  async function handleAllowNotifications() {
    if (notificationsUnsupported) {
      setNotificationStatus('unsupported');
      return;
    }

    setNotificationStatus('checking');

    const Notifications = await import('expo-notifications');
    const permission = await Notifications.requestPermissionsAsync();
    setNotificationStatus(permission.status === 'granted' ? 'granted' : 'denied');
  }

  function goToTerms() {
    if (!locationAllowed) {
      setLocationStatus((current) => (current === 'checking' ? current : 'denied'));
      return;
    }

    navigation.navigate('TermsPrivacy', params);
  }

  return (
    <View className="flex-1 bg-background p-safe">
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center px-6 pt-8">
          <Image
            source={require('../../assets/images/permission-illustration.png')}
            className="mb-6 h-48 w-48"
            resizeMode="contain"
          />
          <Text className="mb-1 text-center font-jakarta-bold text-2xl text-text">
            Let us set things up
          </Text>
          <Text className="text-center font-jakarta text-base text-textSecondary">
            Location is required for nearby transport and live tracking. Notifications are recommended for trip updates.
          </Text>
        </View>

        <View className="flex-1 justify-center px-6 py-8">
          <View
            className={`mb-4 rounded-2xl border bg-surface p-5 ${
              locationStatus === 'denied' ? 'border-danger' : 'border-divider'
            }`}
          >
            <View className="mb-3 flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <MapPin size={20} color="#007FFF" />
              </View>
              <View className="flex-1">
                <Text className="font-jakarta-bold text-base text-text">Location Access</Text>
                <Text className="font-jakarta text-xs text-danger">Required</Text>
              </View>
              {locationAllowed ? (
                <CheckCircle2 size={20} color="#2ECC71" />
              ) : locationStatus === 'denied' ? (
                <XCircle size={20} color="#E74C3C" />
              ) : null}
            </View>
            <Text className="mb-4 font-jakarta text-sm text-textSecondary">
              Allow location access so TransTrak can find nearby taxis/bikes, match routes, and track accepted trips.
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleAllowLocation}
              disabled={locationStatus === 'checking' || locationAllowed}
              className={`h-12 items-center justify-center rounded-xl ${
                locationAllowed ? 'bg-success/15' : 'bg-accent'
              }`}
            >
              <Text className={`font-jakarta-bold text-sm ${locationAllowed ? 'text-success' : 'text-white'}`}>
                {permissionCopy(locationStatus, true)}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="rounded-2xl border border-divider bg-surface p-5">
            <View className="mb-3 flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Bell size={20} color="#007FFF" />
              </View>
              <View className="flex-1">
                <Text className="font-jakarta-bold text-base text-text">Notifications</Text>
                <Text className="font-jakarta text-xs text-textSecondary">Recommended</Text>
              </View>
              {notificationsAllowed ? <CheckCircle2 size={20} color="#2ECC71" /> : null}
            </View>
            <Text className="mb-4 font-jakarta text-sm text-textSecondary">
              {notificationsUnsupported
                ? 'Expo Go on Android cannot test remote push notifications for this SDK. Use a development build for the full notification flow.'
                : 'Enable notifications to receive trip requests, driver responses, verification updates, and report updates.'}
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleAllowNotifications}
              disabled={notificationStatus === 'checking' || notificationsAllowed || notificationsUnsupported}
              className={`h-12 items-center justify-center rounded-xl ${
                notificationsAllowed ? 'bg-success/15' : 'bg-accent'
              }`}
            >
              <Text className={`font-jakarta-bold text-sm ${notificationsAllowed ? 'text-success' : 'text-white'}`}>
                {permissionCopy(notificationStatus)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {locationStatus === 'denied' ? (
          <Text className="mb-3 px-6 text-center font-jakarta text-xs text-danger">
            Location permission is required before you can continue.
          </Text>
        ) : null}

        <View className="px-6">
          <Button
            label="Continue"
            onPress={goToTerms}
            disabled={!locationAllowed}
            className="mb-3"
          />
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={notificationsUnsupported ? undefined : handleAllowNotifications}
            className="self-center"
          >
            <Text className="font-jakarta-semibold text-sm text-textSecondary">
              {notificationsAllowed
                ? 'Notifications enabled'
                : notificationsUnsupported
                  ? 'Notifications require a development build'
                  : 'Allow notifications later'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

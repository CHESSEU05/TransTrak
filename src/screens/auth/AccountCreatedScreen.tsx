import { useEffect, useRef } from "react";
import { Animated, Image, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { Check, Lock, ShieldCheck, Star, Users } from "lucide-react-native";

import Button from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";

const FEATURES = [
  { icon: Users, label: "Friendly\nDrivers" },
  { icon: ShieldCheck, label: "Safety\nFirst" },
  { icon: Star, label: "Fair\nRatings" },
  { icon: Lock, label: "Secure\nRequests" },
];

export function AccountCreatedScreen() {
  const { profile, completeRegistrationCelebration } = useAuth();
  const isDriver = profile?.role_id === 2000;
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  const nextSteps = isDriver
    ? ["Complete your driver profile", "Upload your vehicle documents", "Go online and accept your first ride"]
    : ["Complete your profile", "Find and track your first ride"];

  return (
    <View className="flex-1 bg-background p-safe">
      <StatusBar barStyle="dark-content" />

      <View className="flex-1 items-center px-6 pt-10">
        <Image
          source={require("../../assets/images/confetti-decoration.png")}
          className="absolute top-0 h-40 w-full"
          resizeMode="contain"
        />

        <Animated.View
          style={{ transform: [{ scale }] }}
          className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-success"
        >
          <Check size={40} color="#FFFFFF" strokeWidth={3} />
        </Animated.View>

        <Text className="mb-1 text-center font-jakarta-bold text-2xl text-text">
          Account created!
        </Text>
        <Text className="mb-2 text-center font-jakarta-semibold text-base text-accent">
          Welcome to TransTrak
        </Text>
        <Text className="mb-8 text-center font-jakarta text-sm text-textSecondary">
          You are all set to explore safe and reliable {isDriver ? "rides for your passengers" : "rides"} in your
          area.
        </Text>

        <View className="mb-8 w-full flex-row justify-between">
          {FEATURES.map(({ icon: Icon, label }) => (
            <View key={label} className="items-center" style={{ width: "23%" }}>
              <View className="mb-2 h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Icon size={20} color="#007FFF" />
              </View>
              <Text className="text-center font-jakarta text-xs text-textSecondary">{label}</Text>
            </View>
          ))}
        </View>

        <View className="mb-8 w-full rounded-2xl border border-divider bg-surface p-5">
          <Text className="mb-3 font-jakarta-bold text-base text-text">What is next?</Text>
          {nextSteps.map((step) => (
            <View key={step} className="mb-2 flex-row items-center">
              <View className="mr-2.5 h-4 w-4 items-center justify-center rounded-full bg-success/15">
                <Check size={10} color="#2ECC71" strokeWidth={3} />
              </View>
              <Text className="flex-1 font-jakarta text-sm text-text">{step}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="px-6 pb-6">
        <Button label="Go to Home" onPress={completeRegistrationCelebration} className="mb-4" />
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={completeRegistrationCelebration}
          className="self-center"
        >
          <Text className="font-jakarta-semibold text-sm text-primary">Explore the app</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

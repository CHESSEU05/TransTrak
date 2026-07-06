import { useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import CustomButton from "../../components/ui/CustomButton";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";

type WelcomeNavProp = NativeStackNavigationProp<AuthStackParamList, "Welcome">;

const COUNTRIES = ["Cameroon"];

export function WelcomeScreen() {
  const navigation = useNavigation<WelcomeNavProp>();
  const [country] = useState(COUNTRIES[0]);

  return (
    <View className="flex-1 bg-background p-safe">
      <View className="flex-1 items-center justify-center px-8">
        <View className="mb-3 mt-5 items-center justify-center rounded-2xl">
          <Image
            source={require("../../assets/icons/transtrak-mark.png")}
            className="h-[180px] w-[250px]"
            resizeMode="contain"
          />

          <Text className="mb-5 font-dmserif text-xl text-primary">
            Track. Connect. Move Safely.
          </Text>
        </View>

        <Text className="mb-1 text-center font-jakarta text-lg text-accent">
          Your journey, our priority.
        </Text>
        <Text className="text-center font-jakarta text-lg text-textSecondary">
          Let us get you moving.
        </Text>
      </View>

      <View className="items-center justify-center px-10 pb-5 pt-5">
        <CustomButton
          title="Get Started"
          onPress={() => navigation.navigate("RoleSelection")}
          bgVariant="accent"
          className="mb-3"
        />

        <CustomButton
          title="Log In"
          onPress={() => navigation.navigate("Login")}
          bgVariant="outline"
          textVariant="primary"
        />

        <TouchableOpacity activeOpacity={0.7} className="mt-5 flex-row items-center self-center">
          <Text className="mr-1 font-jakarta text-sm text-textSecondary">{country}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

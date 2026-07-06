import { useRef, useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Swiper from "react-native-swiper";

import CustomButton from "../../components/ui/CustomButton";
import { onboarding } from "../../constants/auth";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";

type OnboardingNavProp = NativeStackNavigationProp<AuthStackParamList, "Onboarding">;

export default function OnboardingScreen() {
  const navigation = useNavigation<OnboardingNavProp>();
  const swiperRef = useRef<Swiper>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const isLastSlide = activeIndex === onboarding.length - 1;

  function goToWelcome() {
    navigation.navigate("Welcome");
  }

  function handleNext() {
    if (isLastSlide) {
      goToWelcome();
      return;
    }

    swiperRef.current?.scrollBy(1);
  }

  return (
    <View className="flex-1 bg-white p-safe">
      <TouchableOpacity onPress={goToWelcome} className="w-full items-end p-3">
        <Text className="font-jakarta-bold text-base text-text">Skip</Text>
      </TouchableOpacity>

      <View className="w-full flex-1">
        <Swiper
          ref={swiperRef}
          loop={false}
          containerStyle={{ flex: 1 }}
          dot={<View className="mx-1 h-[5px] w-[35px] rounded-full bg-divider" />}
          activeDot={<View className="mx-1 h-[5px] w-[35px] rounded-full bg-primary" />}
          onIndexChanged={setActiveIndex}
        >
          {onboarding.map((item) => (
            <View key={item.id} className="flex-1 items-center justify-center px-5">
              <Image
                source={item.image}
                className="h-[240px] w-full"
                resizeMode="contain"
              />
              <View className="mt-10 w-full items-center justify-center">
                <Text className="mx-5 mb-3 text-center font-dmserif text-3xl text-text">
                  {item.title}
                </Text>
                <Text className="mx-8 text-center font-jakarta-medium text-lg text-textSecondary">
                  {item.description}
                </Text>
              </View>
            </View>
          ))}
        </Swiper>
      </View>

      <View className="items-center px-6 pb-5">
        <CustomButton title={isLastSlide ? "Get Started" : "Next"} onPress={handleNext} />
      </View>
    </View>
  );
}

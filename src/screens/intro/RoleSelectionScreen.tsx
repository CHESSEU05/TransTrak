import { Image, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CheckCircle2, ChevronRight } from "lucide-react-native";

import BackButton from "../../components/ui/BackButton";
import { roleOptions } from "../../constants/auth";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";
import type { UserRoleId } from "../../types/auth";

type RoleSelectionNavProp = NativeStackNavigationProp<AuthStackParamList, "RoleSelection">;

export function RoleSelectionScreen() {
  const navigation = useNavigation<RoleSelectionNavProp>();

  function handleSelectRole(roleId: UserRoleId) {
    navigation.navigate("Register", { roleId });
  }

  return (
    <View className="flex-1 bg-white p-safe">
      <View className="px-5 pb-3 pt-3">
        <BackButton onPress={() => navigation.goBack()} />
      </View>

      <View className="px-5 pt-5">
        <Text className="mb-1 font-jakarta-extrabold text-2xl text-text">
          Choose your role
        </Text>
        <Text className="font-jakarta-medium text-base text-textSecondary">
          Select how you want to use TransTrak.
        </Text>
      </View>

      <View className="flex-1 justify-center px-6">
        {roleOptions.map((option) => (
          <TouchableOpacity
            key={option.roleId}
            activeOpacity={0.85}
            onPress={() => handleSelectRole(option.roleId)}
            className={`mb-4 rounded-2xl border bg-surface p-4 ${option.tint} ${option.border}`}
          >
            <View className="flex-row items-center">
              <Image
                source={option.image}
                className="mr-5 h-[112px] w-[112px] rounded-full"
                resizeMode="contain"
              />
              <View className="flex-1">
                <Text className="mb-1 font-jakarta-bold text-lg text-text">
                  {option.title}
                </Text>
                <Text className="font-jakarta-medium text-sm leading-5 text-textSecondary">
                  {option.description}
                </Text>
              </View>
              <ChevronRight size={20} color={option.accent} />
            </View>
            {option.highlights ? (
              <View className="mt-4 gap-2">
                {option.highlights.map((highlight) => (
                  <View key={highlight} className="flex-row items-center">
                    <CheckCircle2 size={15} color={option.accent} />
                    <Text className="ml-2 font-jakarta-semibold text-xs text-text">
                      {highlight}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

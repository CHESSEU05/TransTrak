import React, { useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import type { TextFieldProps } from "../../types/type";

/**
 * Labeled input used on Register, Login and Driver Registration screens.
 * Pass `isPassword` to render a masked field with a show/hide toggle,
 * matching the "Password" / "Confirm password" fields in the mockups.
 */
export default function TextField({
  label,
  icon: Icon,
  isPassword = false,
  error,
  containerClassName = "",
  ...rest
}: TextFieldProps) {
  const [secure, setSecure] = useState(isPassword);

  return (
    <View className={`mb-4 ${containerClassName}`}>
      <Text className="mb-1.5 font-jakarta-semibold text-sm text-text">
        {label}
      </Text>
      <View
        className={`h-14 flex-row items-center rounded-xl border bg-surface px-4 ${
          error ? "border-danger" : "border-divider"
        }`}
      >
        {Icon ? (
          <Icon size={18} color="#6B7280" style={{ marginRight: 10 }} />
        ) : null}
        <TextInput
          className="flex-1 font-jakarta text-base text-text"
          placeholderTextColor="#6B7280"
          secureTextEntry={secure}
          {...rest}
        />
        {isPassword ? (
          <TouchableOpacity
            onPress={() => setSecure((prev) => !prev)}
            hitSlop={8}
          >
            {secure ? (
              <EyeOff size={18} color="#6B7280" />
            ) : (
              <Eye size={18} color="#6B7280" />
            )}
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? (
        <Text className="mt-1 font-jakarta text-xs text-red-500">{error}</Text>
      ) : null}
    </View>
  );
}

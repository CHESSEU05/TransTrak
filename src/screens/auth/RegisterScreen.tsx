import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Lock, Mail, Phone, User } from "lucide-react-native";

import BackButton from "../../components/ui/BackButton";
import Button from "../../components/ui/Button";
import TextField from "../../components/ui/TextField";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";
import type { RegistrationDraft } from "../../types/auth";

type RegisterNavProp = NativeStackNavigationProp<AuthStackParamList, "Register">;
type RegisterRouteProp = RouteProp<AuthStackParamList, "Register">;

type RegisterForm = {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type RegisterErrors = Partial<Record<keyof RegisterForm, string>>;

const initialForm: RegisterForm = {
  fullName: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
};

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function validateRegisterForm(form: RegisterForm): RegisterErrors {
  const errors: RegisterErrors = {};
  const fullName = form.fullName.trim();
  const phone = normalizePhone(form.phone);
  const email = form.email.trim();

  if (!fullName) {
    errors.fullName = "Enter your full name.";
  } else if (fullName.length < 3) {
    errors.fullName = "Use at least 3 characters.";
  }

  if (!phone) {
    errors.phone = "Enter your phone number.";
  } else if (phone.length !== 9) {
    errors.phone = "Use a valid 9-digit Cameroon phone number.";
  }

  if (!email) {
    errors.email = "Enter your email address.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!form.password) {
    errors.password = "Create a password.";
  } else if (form.password.length < 6) {
    errors.password = "Use at least 6 characters.";
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = "Confirm your password.";
  } else if (form.confirmPassword !== form.password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

export function RegisterScreen() {
  const navigation = useNavigation<RegisterNavProp>();
  const { params } = useRoute<RegisterRouteProp>();
  const { roleId } = params;

  const [form, setForm] = useState<RegisterForm>(initialForm);
  const [touched, setTouched] = useState<Partial<Record<keyof RegisterForm, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const errors = useMemo(() => validateRegisterForm(form), [form]);

  function updateField(field: keyof RegisterForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function markTouched(field: keyof RegisterForm) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function fieldError(field: keyof RegisterForm) {
    return touched[field] || submitAttempted ? errors[field] : undefined;
  }

  function handleRegister() {
    setSubmitAttempted(true);

    if (Object.keys(errors).length > 0) {
      return;
    }

    const draft: RegistrationDraft = {
      roleId,
      fullName: form.fullName.trim(),
      phone: normalizePhone(form.phone),
      email: form.email.trim(),
      password: form.password,
    };

    if (roleId === 2000) {
      navigation.navigate("DriverRegistration", { draft });
    } else {
      navigation.navigate("PermissionsSetup", { draft });
    }
  }

  return (
    <View className="flex-1 bg-background p-safe">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="px-6 pb-2 pt-2">
            <BackButton onPress={() => navigation.goBack()} />
          </View>

          <View className="flex-1 px-6 pt-4">
            <Text className="mb-1 font-jakarta-bold text-2xl text-text">
              Create your account
            </Text>
            <Text className="mb-6 font-jakarta text-base text-textSecondary">
              Join TransTrak with details we can verify later.
            </Text>

            <TextField
              label="Full name"
              icon={User}
              placeholder="Enter your full name"
              value={form.fullName}
              onChangeText={(value) => updateField("fullName", value)}
              onBlur={() => markTouched("fullName")}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              error={fieldError("fullName")}
            />

            <TextField
              label="Phone number"
              icon={Phone}
              placeholder="6 XX XX XX XX"
              value={form.phone}
              onChangeText={(value) => updateField("phone", value)}
              onBlur={() => markTouched("phone")}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              maxLength={14}
              error={fieldError("phone")}
            />

            <TextField
              label="Email address"
              icon={Mail}
              placeholder="Enter your email"
              value={form.email}
              onChangeText={(value) => updateField("email", value)}
              onBlur={() => markTouched("email")}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              error={fieldError("email")}
            />

            <TextField
              label="Password"
              icon={Lock}
              placeholder="Create a password"
              value={form.password}
              onChangeText={(value) => updateField("password", value)}
              onBlur={() => markTouched("password")}
              autoComplete="new-password"
              textContentType="newPassword"
              isPassword
              error={fieldError("password")}
            />

            <TextField
              label="Confirm password"
              icon={Lock}
              placeholder="Confirm your password"
              value={form.confirmPassword}
              onChangeText={(value) => updateField("confirmPassword", value)}
              onBlur={() => markTouched("confirmPassword")}
              autoComplete="new-password"
              textContentType="newPassword"
              isPassword
              error={fieldError("confirmPassword")}
            />

            <Button label="Continue" onPress={handleRegister} className="mt-4" />

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate("Login")}
              className="mt-6 self-center"
            >
              <Text className="font-jakarta text-sm text-textSecondary">
                Already have an account?{" "}
                <Text className="font-jakarta-semibold text-primary">Log In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

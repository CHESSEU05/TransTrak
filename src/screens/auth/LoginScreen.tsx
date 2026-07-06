import { useMemo, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Lock, Mail } from "lucide-react-native";

import BackButton from "../../components/ui/BackButton";
import Button from "../../components/ui/Button";
import TextField from "../../components/ui/TextField";
import { useAuth } from "../../context/AuthContext";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";

type LoginNavProp = NativeStackNavigationProp<AuthStackParamList, "Login">;

type LoginForm = {
  email: string;
  password: string;
};

type LoginErrors = Partial<Record<keyof LoginForm, string>>;

function validateLoginForm(form: LoginForm): LoginErrors {
  const errors: LoginErrors = {};
  const email = form.email.trim();

  if (!email) {
    errors.email = "Enter your email address.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!form.password) {
    errors.password = "Enter your password.";
  }

  return errors;
}

export function LoginScreen() {
  const navigation = useNavigation<LoginNavProp>();
  const { login } = useAuth();

  const [form, setForm] = useState<LoginForm>({ email: "", password: "" });
  const [touched, setTouched] = useState<Partial<Record<keyof LoginForm, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const errors = useMemo(() => validateLoginForm(form), [form]);

  function updateField(field: keyof LoginForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError(null);
  }

  function markTouched(field: keyof LoginForm) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function fieldError(field: keyof LoginForm) {
    return touched[field] || submitAttempted ? errors[field] : undefined;
  }

  async function handleLogin() {
    setSubmitAttempted(true);
    setFormError(null);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      await login({
        email: form.email.trim(),
        password: form.password,
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to log in. Please check your details.");
    } finally {
      setSubmitting(false);
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
            <Text className="mb-1 font-jakarta-bold text-2xl text-text">Welcome back</Text>
            <Text className="mb-8 font-jakarta text-base text-textSecondary">
              Log in to continue to TransTrak.
            </Text>

            <TextField
              label="Email address"
              icon={Mail}
              placeholder="Enter email address"
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
              placeholder="Enter your password"
              value={form.password}
              onChangeText={(value) => updateField("password", value)}
              onBlur={() => markTouched("password")}
              autoComplete="current-password"
              textContentType="password"
              isPassword
              error={fieldError("password")}
            />

            <TouchableOpacity activeOpacity={0.7} className="mb-6 self-end">
              <Text className="font-jakarta-semibold text-sm text-primary">Forgot password?</Text>
            </TouchableOpacity>

            {formError ? (
              <View className="mb-4 rounded-xl border border-danger bg-danger/10 px-4 py-3">
                <Text className="font-jakarta text-sm text-danger">{formError}</Text>
              </View>
            ) : null}

            <Button
              label="Log In"
              onPress={handleLogin}
              loading={submitting}
              disabled={submitting}
              className="mb-6"
            />

            <View className="mb-6 flex-row items-center">
              <View className="h-px flex-1 bg-divider" />
              <Text className="mx-3 font-jakarta text-xs text-textSecondary">or continue with</Text>
              <View className="h-px flex-1 bg-divider" />
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              className="mb-3 h-14 flex-row items-center justify-center rounded-2xl border border-divider bg-surface"
            >
              <Image
                source={require("../../assets/icons/google-icon.png")}
                className="mr-3 h-5 w-5"
                resizeMode="contain"
              />
              <Text className="font-jakarta-semibold text-base text-text">Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              className="mb-8 h-14 flex-row items-center justify-center rounded-2xl border border-divider bg-surface"
            >
              <Image
                source={require("../../assets/icons/apple-icon.png")}
                className="mr-3 h-5 w-5"
                resizeMode="contain"
              />
              <Text className="font-jakarta-semibold text-base text-text">Continue with Apple</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate("RoleSelection")}
              className="mb-6 self-center"
            >
              <Text className="font-jakarta text-sm text-textSecondary">
                Do not have an account?{" "}
                <Text className="font-jakarta-semibold text-primary">Register</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

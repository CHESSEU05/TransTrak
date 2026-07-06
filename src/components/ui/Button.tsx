import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger-outline';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

const CONTAINER_STYLES: Record<ButtonVariant, string> = {
  primary: 'bg-accent',
  outline: 'bg-transparent border border-accent',
  ghost: 'bg-transparent',
  'danger-outline': 'bg-transparent border border-danger',
};

const LABEL_STYLES: Record<ButtonVariant, string> = {
  primary: 'text-white',
  outline: 'text-accent',
  ghost: 'text-accent',
  'danger-outline': 'text-danger',
};

const SPINNER_COLOR: Record<ButtonVariant, string> = {
  primary: '#FFFFFF',
  outline: '#004D99',
  ghost: '#004D99',
  'danger-outline': '#E74C3C',
};

/**
 * Primary action button used across TransTrak's onboarding, auth and setup flows.
 * Defaults to the solid "primary" (accent navy) style used for main CTAs
 * such as "Log In", "Register", "Continue" and "Agree & Continue".
 */
export default function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled = false,
  className = '',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={isDisabled}
      className={`h-14 w-full flex-row items-center justify-center rounded-2xl ${CONTAINER_STYLES[variant]} ${
        isDisabled ? 'opacity-50' : ''
      } ${className}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={SPINNER_COLOR[variant]} />
      ) : (
        <Text className={`font-jakarta-bold text-base ${LABEL_STYLES[variant]}`}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

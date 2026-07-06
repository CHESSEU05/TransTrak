import type { ComponentType } from "react";
import type { TextInputProps, TouchableOpacityProps } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import type { UserRoleId } from "./auth";

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  bgVariant?:
    "primary" | "accent" | "secondary" | "danger" | "success" | "outline";
  textVariant?: "default" | "primary" | "secondary" | "danger" | "success";
  IconLeft?: ComponentType;
  IconRight?: ComponentType;
  className?: string;
}

export interface RoleOptions {
  roleId: UserRoleId;
  title: string;
  description: string;
  highlights?: string[];
  image: ReturnType<typeof require>;
  tint: string;
  border: string;
  accent: string;
}

export interface TextFieldProps extends TextInputProps {
  label: string;
  icon?: LucideIcon;
  isPassword?: boolean;
  error?: string;
  containerClassName?: string;
}

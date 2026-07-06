import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Check } from 'lucide-react-native';

interface CheckboxProps {
  checked: boolean;
  onToggle: () => void;
  label?: string;
  className?: string;
}

export default function Checkbox({ checked, onToggle, label, className = '' }: CheckboxProps) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.75}
      className={`flex-row items-center ${className}`}
    >
      <View
        className={`h-5 w-5 items-center justify-center rounded-md border ${
          checked ? 'border-primary bg-primary' : 'border-divider bg-surface'
        }`}
      >
        {checked ? <Check size={13} color="#FFFFFF" strokeWidth={3} /> : null}
      </View>
      {label ? (
        <Text className="ml-2.5 flex-1 font-jakarta text-sm text-textSecondary">{label}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

import React, { useState } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';

interface SelectFieldProps {
  label?: string;
  placeholder?: string;
  value: string | null;
  options: string[];
  onSelect: (value: string) => void;
  containerClassName?: string;
}

/**
 * Tappable field that opens a bottom-sheet-style option list.
 * Used for "Vehicle type" on Driver Registration and similar single-choice pickers.
 */
export default function SelectField({
  label,
  placeholder = 'Select an option',
  value,
  options,
  onSelect,
  containerClassName = '',
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <View className={`mb-4 ${containerClassName}`}>
      {label ? <Text className="mb-1.5 font-jakarta-semibold text-sm text-text">{label}</Text> : null}

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setOpen(true)}
        className="h-14 flex-row items-center justify-between rounded-xl border border-divider bg-surface px-4"
      >
        <Text className={`font-jakarta text-base ${value ? 'text-text' : 'text-textSecondary'}`}>
          {value ?? placeholder}
        </Text>
        <ChevronDown size={18} color="#6B7280" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-text/40" onPress={() => setOpen(false)}>
          <Pressable className="rounded-t-3xl bg-surface px-5 pb-8 pt-4">
            <View className="mb-3 h-1.5 w-12 self-center rounded-full bg-divider" />
            {label ? <Text className="mb-3 font-jakarta-bold text-lg text-text">{label}</Text> : null}
            {options.map((option) => {
              const selected = option === value;
              return (
                <TouchableOpacity
                  key={option}
                  activeOpacity={0.7}
                  onPress={() => {
                    onSelect(option);
                    setOpen(false);
                  }}
                  className="flex-row items-center justify-between border-b border-divider py-4"
                >
                  <Text
                    className={`font-jakarta text-base ${selected ? 'text-primary font-jakarta-semibold' : 'text-text'}`}
                  >
                    {option}
                  </Text>
                  {selected ? <Check size={18} color="#007FFF" /> : null}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

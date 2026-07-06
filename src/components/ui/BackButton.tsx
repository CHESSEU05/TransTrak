import React from 'react';
import { TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';

export default function BackButton({ className = '', ...rest }: TouchableOpacityProps & { className?: string }) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      hitSlop={10}
      className={`h-10 w-10 items-center justify-center rounded-full bg-surface ${className}`}
      style={{
        shadowColor: '#1F2937',
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
      {...rest}
    >
      <ArrowLeft size={20} color="#1F2937" />
    </TouchableOpacity>
  );
}

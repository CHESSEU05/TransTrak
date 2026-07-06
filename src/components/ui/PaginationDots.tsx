import React from 'react';
import { View } from 'react-native';

interface PaginationDotsProps {
  total: number;
  activeIndex: number;
  className?: string;
}

export default function PaginationDots({ total, activeIndex, className = '' }: PaginationDotsProps) {
  return (
    <View className={`flex-row items-center ${className}`}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          className={`mr-1.5 h-2 rounded-full ${
            index === activeIndex ? 'w-5 bg-primary' : 'w-2 bg-divider'
          }`}
        />
      ))}
    </View>
  );
}

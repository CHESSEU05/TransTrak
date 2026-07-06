import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ShieldCheck } from 'lucide-react-native';

import BackButton from '../../components/ui/BackButton';
import Button from '../../components/ui/Button';
import SelectField from '../../components/ui/SelectField';
import TextField from '../../components/ui/TextField';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import type { DriverVehicleInput, RegistrationDraft } from '../../types/auth';

type DriverRegNavProp = NativeStackNavigationProp<AuthStackParamList, 'DriverRegistration'>;
type DriverRegRouteProp = RouteProp<AuthStackParamList, 'DriverRegistration'>;

type VehicleTypeOption = {
  label: string;
  value: DriverVehicleInput['vehicleTypeId'];
};

const VEHICLE_TYPES: VehicleTypeOption[] = [
  { label: 'Taxi', value: 1000 },
  { label: 'Bike', value: 2000 },
];

interface ColorOption {
  name: string;
  hex: string;
}

const VEHICLE_COLORS: ColorOption[] = [
  { name: 'Black', hex: '#1F2937' },
  { name: 'Red', hex: '#E74C3C' },
  { name: 'Blue', hex: '#007FFF' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Grey', hex: '#9CA3AF' },
  { name: 'Green', hex: '#16A34A' },
  { name: 'Yellow', hex: '#FACC15' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Purple', hex: '#7C3AED' },
  { name: 'Brown', hex: '#92400E' },
  { name: 'Silver', hex: '#D1D5DB' },
];

export function DriverRegistrationScreen() {
  const navigation = useNavigation<DriverRegNavProp>();
  const { params } = useRoute<DriverRegRouteProp>();
  const { draft } = params;

  const [selectedVehicleLabel, setSelectedVehicleLabel] = useState<string | null>(null);
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleColor, setVehicleColor] = useState<string>(VEHICLE_COLORS[2].name);

  const selectedVehicle = VEHICLE_TYPES.find(
    (vehicleType) => vehicleType.label === selectedVehicleLabel
  );
  const isBike = selectedVehicle?.value === 2000;

  const isFormValid = !!selectedVehicle && plateNumber.trim().length > 0;

  const handleContinue = () => {
    if (!selectedVehicle) {
      return;
    }

    const updatedDraft: RegistrationDraft = {
      ...draft,
      vehicle: {
        vehicleTypeId: selectedVehicle.value,
        plateNumber: plateNumber.trim().toUpperCase(),
        colour: isBike ? vehicleColor : undefined,
      },
    };

    navigation.navigate('PermissionsSetup', { draft: updatedDraft });
  };

  return (
    <View className="flex-1 bg-background p-safe">
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="px-6 pb-2 pt-2">
          <BackButton onPress={() => navigation.goBack()} />
        </View>

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
          className="px-6 pt-4"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text className="mb-1 font-jakarta-bold text-2xl text-text">
            Tell us about your vehicle
          </Text>

          <Text className="mb-6 font-jakarta text-base text-textSecondary">
            This helps us verify your driver account and match passengers with the right transport type.
          </Text>

          <SelectField
            label="Vehicle type"
            placeholder="Select vehicle type"
            options={VEHICLE_TYPES.map((vehicleType) => vehicleType.label)}
            value={selectedVehicleLabel}
            onSelect={setSelectedVehicleLabel}
          />

          <TextField
            label="Plate number"
            placeholder="CE 1234 AB"
            value={plateNumber}
            onChangeText={setPlateNumber}
            autoCapitalize="characters"
            returnKeyType="done"
          />

          {selectedVehicle?.value === 1000 ? (
            <View className="mb-6 rounded-2xl border border-warning bg-warning/10 p-4">
              <Text className="font-jakarta-bold text-sm text-text">Taxi colour</Text>
              <Text className="mt-1 font-jakarta text-sm text-textSecondary">
                Local taxis are recorded as yellow by default, so no colour picker is needed.
              </Text>
            </View>
          ) : null}

          {isBike ? (
            <>
              <Text className="mb-2 font-jakarta-semibold text-sm text-text">
                Bike colour
              </Text>

              <View className="mb-6 flex-row flex-wrap gap-3">
                {VEHICLE_COLORS.map((color) => {
                  const selected = color.name === vehicleColor;

                  return (
                    <TouchableOpacity
                      key={color.name}
                      activeOpacity={0.8}
                      accessibilityLabel={`${color.name} bike colour`}
                      onPress={() => setVehicleColor(color.name)}
                      className="h-11 w-11 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: color.hex,
                        borderWidth: selected ? 3 : 1,
                        borderColor: selected ? '#007FFF' : '#E5E7EB',
                      }}
                    />
                  );
                })}
              </View>
            </>
          ) : null}

          <View className="mb-8 flex-row items-start rounded-2xl bg-warning/10 p-4">
            <ShieldCheck size={20} color="#F39C12" style={{ marginRight: 10, marginTop: 2 }} />

            <Text className="flex-1 font-jakarta text-sm text-text">
              Verification required. You can enter the dashboard after sign up, but going online and accepting requests unlock after admin approval.
            </Text>
          </View>

          <Button
            label="Continue"
            onPress={handleContinue}
            disabled={!isFormValid}
            className="mb-8"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

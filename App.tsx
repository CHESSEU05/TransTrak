import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { testSupabaseConnection } from './src/services/supabase/testConnection';

export default function App() {
  useEffect(() => {
    testSupabaseConnection();
  }, []);

  return (
    <View style={styles.container}>
      <Text>TransTrak Supabase Setup</Text>
      <Text>Check terminal logs for connection status.</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
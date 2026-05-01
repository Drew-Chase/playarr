import { Stack } from 'expo-router';
import React from 'react';

export default function MainLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="movie/[id]" />
      <Stack.Screen name="show/[id]" />
      <Stack.Screen name="player/[id]" options={{ animation: 'fade' }} />
      <Stack.Screen
        name="request/[id]"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack>
  );
}

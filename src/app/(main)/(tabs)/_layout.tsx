import { Tabs } from 'expo-router';
import React from 'react';

export default function TabsLayout() {
  // Visual tabs are hidden on TV -- TopNav handles navigation visually.
  // Expo Router tabs provide the route structure.
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="movies" options={{ title: 'Movies' }} />
      <Tabs.Screen name="shows" options={{ title: 'TV Shows' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}

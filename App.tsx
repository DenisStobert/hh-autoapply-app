import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';
import { navigationRef } from './NavigationService';
import { resetTo } from './NavigationService';
import { registerBackgroundTask } from './backgroundTasks';

import JobSearchScreen from './screens/JobSearchScreen';
import LoginScreen from './screens/LoginScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import SplashScreen from './screens/SplashScreen';
import ApplicationsHistoryScreen from './screens/ApplicationsHistoryScreen';
import ProfileScreen from './screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

type LinkingEvent = {
  url: string;
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#aaa',
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: '#2a2a2a',
          borderTopColor: '#444',
          borderTopWidth: 1,
          height: 90,
          paddingBottom: 10,
          paddingTop: 3,
          zIndex: 1,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: 3,
        },
        tabBarIcon: ({ color, focused }) => {
          let iconName: any = 'search-outline';
          if (route.name === 'Поиск') iconName = focused ? 'search' : 'search-outline';
          else if (route.name === 'Избранное') iconName = focused ? 'star' : 'star-outline';
          else if (route.name === 'Отклики') iconName = focused ? 'send' : 'send-outline';
          else if (route.name === 'Профиль') iconName = focused ? 'person' : 'person-outline';

          return <Ionicons name={iconName} size={28} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Поиск" component={JobSearchScreen} />
      <Tab.Screen name="Избранное" component={FavoritesScreen} />
      <Tab.Screen name="Отклики" component={ApplicationsHistoryScreen} />
      <Tab.Screen name="Профиль" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
const handleDeepLink = async (event: LinkingEvent) => {
  const url = event.url;
  console.log('📬 Пришёл диплинк:', url);

  if (url.includes('auth-success')) {
    const parsedUrl = new URL(url);
    const accessToken = parsedUrl.searchParams.get('access_token');
    const refreshToken = parsedUrl.searchParams.get('refresh_token');

    if (accessToken && refreshToken) {
      await AsyncStorage.setItem('authToken', accessToken);
      await AsyncStorage.setItem('refreshToken', refreshToken);
    
      console.log('✅ Токены сохранены, ждём 200мс и переходим в SplashScreen');
    
      setTimeout(() => {
        resetTo('SplashScreen');
      }, 200);
    } else {
      console.error('❗️Access token or refresh token missing in deep link');
    }
  }
}; 

    Linking.getInitialURL()
      .then((url) => {
        if (url) {
          console.log('🔗 Initial URL при старте приложения:', url);
          handleDeepLink({ url });
        }
      })
      .catch((err) => console.error('Ошибка при получении initial URL', err));

    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const checkAuthStatus = async () => {
      const accessToken = await AsyncStorage.getItem('authToken');
      if (accessToken) {
        setIsAuthenticated(true); // Если токен есть, считаем пользователя авторизованным
      }
    };

    checkAuthStatus(); // Проверим статус авторизации при запуске приложения
  }, []);

  useEffect(() => {
    registerBackgroundTask();
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="SplashScreen">
        <Stack.Screen name="SplashScreen" component={SplashScreen} />
        <Stack.Screen name="LoginScreen">
          {(props) => <LoginScreen {...props} onLoginSuccess={() => setIsAuthenticated(true)} />}
        </Stack.Screen>
        <Stack.Screen name="MainTabs" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
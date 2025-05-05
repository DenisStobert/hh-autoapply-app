import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { API_URL } from '../config'; // Убедись, что этот путь корректный

export default function SplashScreen() {
  const navigation = useNavigation<any>();

  useEffect(() => {
    const checkTokenAndNavigate = async () => {
      const token = await AsyncStorage.getItem('authToken');
      console.log('🧪 Токен, который будем проверять:', token);

      if (token) {
        try {
          const response = await fetch(`${API_URL}/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            // ✅ Токен валиден
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs' }],
            });
            return;
          } else {
            console.warn('❌ Токен просрочен или недействителен');
          }
        } catch (error) {
          console.error('Ошибка при проверке токена:', error);
        }

        // ❌ Удаляем невалидный токен
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('refreshToken');
      }

      // Навигация на логин, если токена нет или он просрочен
      navigation.reset({
        index: 0,
        routes: [{ name: 'LoginScreen' }],
      });
    };

    checkTokenAndNavigate();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>aa</Text>
      <ActivityIndicator size="large" color="#fff" style={{ marginTop: 20 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#DA2D2D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#fff',
  },
});

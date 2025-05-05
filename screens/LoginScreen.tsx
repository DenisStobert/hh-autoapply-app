import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Linking } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { API_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

type RootStackParamList = {
  LoginScreen: undefined;
  MainTabs: undefined;
};

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'LoginScreen'>;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
  onLoginSuccess: () => void;  // НОВОЕ
}

export default function LoginScreen({ navigation, onLoginSuccess }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const authUrl = `${API_URL}/auth`;

    setLoading(true);
    try {
      await Linking.openURL(authUrl);

      // Поскольку это диплинк, когда мы получим access_token в url, AsyncStorage уже сохранит токен
    } catch (error) {
      console.error("Ошибка при открытии ссылки или авторизации", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AutoApply</Text>
      <Button title="Войти через hh.ru" onPress={handleLogin} disabled={loading} />
      {loading && <Text>Загрузка...</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, marginBottom: 20 },
});
